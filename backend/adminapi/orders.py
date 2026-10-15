"""Order management for store staff."""
import logging
from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView

from orders.models import Order, OrderStatusHistory
from orders.services import CheckoutError, cancel_order, place_order
from payments.models import Payment
from shipping.models import Shipment
from shipping.utils import auto_tracking_url, serialize_shipment
from .common import IsStoreStaff, fail, ok, paginate

logger = logging.getLogger(__name__)

# What a staff member may move an order to next
TRANSITIONS = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['processing', 'shipped', 'cancelled'],
    'processing': ['shipped', 'cancelled'],
    'shipped': ['delivered'],
    'delivered': ['return_requested'],
    'return_requested': ['returned'],
    'returned': [],
    'cancelled': [],
}
FULFILLMENT = {'processing': 'packing', 'shipped': 'shipped', 'delivered': 'delivered'}


def money(v):
    return str(Decimal(v).quantize(Decimal('0.01')))


def serialize_order(o, detail=False):
    payment = getattr(o, 'payment', None)
    customer = o.user
    ship = next((a for a in o.addresses.all() if a.address_type == 'shipping'), None)
    data = {
        'id': str(o.id),
        'order_number': o.order_number,
        'status': o.status,
        'status_display': o.get_status_display(),
        'payment_status': o.payment_status,
        'payment_status_display': o.get_payment_status_display(),
        'payment_method': payment.payment_method if payment else None,
        'total_items': o.total_items,
        'order_total': money(o.order_total),
        'created_at': o.created_at.isoformat(),
        'customer_name': (ship.full_name if ship else '') or (customer.get_full_name() if customer else ''),
        'customer_email': customer.email if customer else '',
        'customer_phone': ship.phone if ship else '',
        'city': ship.city if ship else '',
        'allowed_next_statuses': TRANSITIONS.get(o.status, []),
    }
    if detail:
        data.update({
            'prices_include_gst': (o.subtotal - o.discount_amount + o.shipping_cost) == o.order_total,
            'subtotal': money(o.subtotal), 'discount_amount': money(o.discount_amount),
            'tax_amount': money(o.tax_amount), 'shipping_cost': money(o.shipping_cost),
            'coupon_code': o.coupon.code if o.coupon else None,
            'shipment': serialize_shipment(getattr(o, 'shipment', None)),
            'notes': o.notes,
            'items': [{
                'id': str(i.id), 'product_name': i.product_name, 'variant_name': i.variant_name,
                'sku_code': i.sku_code, 'quantity': i.quantity, 'unit_price': money(i.unit_price),
                'line_total': money(i.line_total),
            } for i in o.items.all()],
            'shipping_address': {
                'full_name': ship.full_name, 'phone': ship.phone, 'line1': ship.line1, 'line2': ship.line2,
                'city': ship.city, 'state': ship.state, 'postal_code': ship.postal_code,
            } if ship else None,
            'history': [{
                'id': str(h.id), 'old_status': h.old_status, 'new_status': h.new_status, 'reason': h.reason,
                'by': h.changed_by.email if h.changed_by else 'System', 'at': h.created_at.isoformat(),
            } for h in o.status_history.all().order_by('-created_at')],
        })
    return data


def order_queryset():
    return (Order.objects.select_related('user', 'payment', 'coupon', 'shipment')
            .prefetch_related('addresses', 'items', 'status_history__changed_by'))


def save_tracking(order, data, staff, required=False):
    """Create/update the shipment (courier + tracking number) for an order."""
    from rest_framework.exceptions import ValidationError
    data = data or {}
    courier = str(data.get('courier') or '').strip()[:100]
    number = str(data.get('tracking_number') or '').strip()[:100]
    if not courier and not number:
        if required:
            return None
        return None
    errors = {}
    if not courier:
        errors['courier'] = 'Choose the courier company'
    if not number and courier.lower() != 'own delivery':
        errors['tracking_number'] = 'Enter the tracking number'
    if errors:
        raise ValidationError({'success': False, 'message': 'Please fill in the courier and tracking number.', 'errors': {f'tracking.{k}': v for k, v in errors.items()}})
    if not number:
        number = f'OWN-{order.order_number}'
    clash = Shipment.objects.filter(tracking_number=number).exclude(order=order).first()
    if clash:
        raise ValidationError({'success': False, 'message': 'That tracking number is already used on another order.',
                               'errors': {'tracking.tracking_number': 'Already used on another order'}})
    url = str(data.get('tracking_url') or '').strip()
    if url and not url.lower().startswith(('http://', 'https://')):
        raise ValidationError({'success': False, 'message': 'The tracking link must start with https://',
                               'errors': {'tracking.tracking_url': 'Must start with https://'}})
    eta = data.get('estimated_delivery') or None
    shipment = Shipment.objects.filter(order=order).first() or Shipment(order=order)
    shipment.courier_provider, shipment.tracking_number = courier, number
    shipment.tracking_url = url or auto_tracking_url(courier, number)
    shipment.estimated_delivery = eta
    if not shipment.shipped_at:
        shipment.shipped_at = timezone.now()
    if shipment.status == 'created':
        shipment.status = 'in_transit'
    shipment.save()
    return shipment


class OrderListCreateView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        qs = order_queryset().order_by('-created_at')
        p = request.query_params
        if p.get('status') and p['status'] != 'all':
            qs = qs.filter(status=p['status'])
        if p.get('payment_status') and p['payment_status'] != 'all':
            qs = qs.filter(payment_status=p['payment_status'])
        search = (p.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search) | Q(user__email__icontains=search)
                | Q(addresses__full_name__icontains=search) | Q(addresses__phone__icontains=search)
            ).distinct()
        return paginate(qs, request, serialize_order)

    def post(self, request):
        """Create an order on behalf of a customer (phone / walk-in orders)."""
        d = request.data
        customer = d.get('customer') or {}
        email = str(customer.get('email') or '').strip().lower()
        name = str(customer.get('name') or '').strip()
        if not email or '@' not in email:
            return fail('Enter the customer\'s email address.', errors={'customer.email': 'A valid email is required'})
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.create(username=email, email=email, first_name=name[:150])
            user.set_unusable_password()
            user.save(update_fields=['password'])
        address = dict(d.get('address') or {})
        address.setdefault('full_name', name)
        address.setdefault('phone', customer.get('phone', ''))
        try:
            order, _ = place_order(
                user, d.get('items'), address=address, payment_method='cod',
                notes=d.get('notes', ''), coupon_code=d.get('coupon_code', ''))
        except CheckoutError as exc:
            return fail(exc.message, status=exc.status_code, errors=exc.details.get('errors') or exc.details)
        if d.get('mark_paid'):
            _mark_paid(order, request.user)
        order = order_queryset().get(pk=order.pk)
        return ok(serialize_order(order, detail=True), 'Order created', status=201)


def _log(order, old, new, reason, user):
    OrderStatusHistory.objects.create(order=order, old_status=old, new_status=new, reason=reason, changed_by=user)


def _mark_paid(order, staff):
    with transaction.atomic():
        order.payment_status = 'paid'
        order.save()
        Payment.objects.filter(order=order).update(status='paid')
        _log(order, order.status, order.status, 'Payment marked as received', staff)


class OrderDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def get_order(self, number):
        return order_queryset().filter(order_number=number).first()

    def get(self, request, order_number):
        order = self.get_order(order_number)
        if not order:
            return fail('Order not found', 404)
        return ok(serialize_order(order, detail=True))

    def patch(self, request, order_number):
        order = self.get_order(order_number)
        if not order:
            return fail('Order not found', 404)
        d = request.data
        new_status = d.get('status')
        note = str(d.get('note') or '')[:255]

        if 'notes' in d:
            order.notes = str(d.get('notes') or '')[:1000]
            order.save()

        if new_status and new_status != order.status:
            if new_status not in TRANSITIONS.get(order.status, []):
                return fail(f'An order that is "{order.get_status_display()}" cannot be changed to "{new_status}".')
            if new_status == 'shipped':
                save_tracking(order, d.get('tracking'), request.user)
            if new_status == 'cancelled':
                try:
                    cancel_order(order, request.user, reason=note or 'Cancelled by store staff')
                except CheckoutError as exc:
                    return fail(exc.message, exc.status_code)
            else:
                with transaction.atomic():
                    old = order.status
                    order.status = new_status
                    if new_status in FULFILLMENT:
                        order.fulfillment_status = FULFILLMENT[new_status]
                    if new_status == 'confirmed' and not order.confirmed_at:
                        order.confirmed_at = timezone.now()
                    order.save()
                    _log(order, old, new_status, note or f'Marked {new_status} by staff', request.user)
                    # Cash on Delivery is collected when the parcel is handed over
                    pay = getattr(order, 'payment', None)
                    if new_status == 'delivered' and pay and pay.payment_method == 'cod' and order.payment_status != 'paid':
                        order.payment_status = 'paid'
                        order.save()
                        Payment.objects.filter(order=order).update(status='paid')

        if d.get('tracking') and order.status in ('shipped', 'delivered') and not (new_status == 'shipped'):
            save_tracking(order, d.get('tracking'), request.user)
        if new_status == 'delivered':
            Shipment.objects.filter(order=order).update(status='delivered', actual_delivery=timezone.now().date())

        if d.get('payment_status') == 'paid' and order.payment_status != 'paid':
            _mark_paid(order, request.user)

        order = self.get_order(order_number)
        return ok(serialize_order(order, detail=True), 'Order updated')


class OrderInvoiceView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request, order_number):
        from orders.invoice import build_invoice
        order = order_queryset().filter(order_number=order_number).first()
        if not order:
            return fail('Order not found', 404)
        return ok(build_invoice(order))


class OrderLabelView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request, order_number):
        from orders.label import LABEL_STATUSES, build_label
        order = order_queryset().filter(order_number=order_number).first()
        if not order:
            return fail('Order not found', 404)
        if order.status not in LABEL_STATUSES:
            return fail('A shipping label can only be printed for confirmed, packed or shipped orders.')
        return ok(build_label(order))


class BulkPrintView(APIView):
    """Labels or invoices for many orders at once (like a marketplace seller panel)."""
    permission_classes = [IsStoreStaff]
    MAX = 50

    def get(self, request):
        from orders.invoice import build_invoice
        from orders.label import LABEL_STATUSES, build_label
        doc = request.query_params.get('doc', 'label')
        if doc not in ('label', 'invoice'):
            return fail('Choose labels or invoices.')
        numbers = [n.strip() for n in (request.query_params.get('orders') or '').split(',') if n.strip()]
        numbers = list(dict.fromkeys(numbers))
        if not numbers:
            return fail('Select at least one order.')
        if len(numbers) > self.MAX:
            return fail(f'You can print up to {self.MAX} orders at a time.')
        found = {o.order_number: o for o in order_queryset().filter(order_number__in=numbers)}
        docs, skipped = [], []
        for n in numbers:
            o = found.get(n)
            if not o:
                skipped.append({'order_number': n, 'reason': 'Order not found'})
            elif doc == 'label' and o.status not in LABEL_STATUSES:
                skipped.append({'order_number': n, 'reason': f'{o.get_status_display()} orders do not need a label'})
            elif doc == 'invoice' and o.status in ('pending', 'cancelled'):
                skipped.append({'order_number': n, 'reason': f'No invoice for {o.get_status_display().lower()} orders'})
            else:
                docs.append(build_label(o) if doc == 'label' else build_invoice(o))
        return ok({'doc': doc, 'documents': docs, 'skipped': skipped})
