"""
Checkout engine: server-side pricing, coupon validation, stock allocation and order creation.

The browser only ever sends *what* the customer wants (sku_code + quantity). Prices, stock,
discounts, shipping and tax are always computed here, never trusted from the client.
"""
import logging
import secrets
import threading
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from accounts.address_utils import AddressValidationError, clean_address, find_or_create_address
from accounts.models import Address
from catalog.models import SKU
from coupons.models import Coupon, CouponUsage
from inventory.models import Inventory, InventoryTransaction
from .models import Order, OrderItem, OrderAddress, OrderStatusHistory

logger = logging.getLogger(__name__)

TWO_PLACES = Decimal('0.01')
CANCELLABLE_STATUSES = ('pending', 'confirmed', 'processing')


def money(value):
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def store_config():
    """Current store settings (editable by the owner in the admin panel)."""
    from core.models import StoreConfig
    return StoreConfig.load()


def gst_percent():
    return Decimal(str(store_config().gst_percent))


def free_shipping_threshold():
    return Decimal(str(store_config().free_shipping_threshold))


def shipping_fee():
    return Decimal(str(store_config().shipping_flat_fee))


def max_qty_per_item():
    return int(store_config().max_qty_per_item)


class CheckoutError(Exception):
    def __init__(self, message, code='checkout_error', details=None, status_code=400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}
        self.status_code = status_code


@dataclass
class Line:
    sku: SKU
    quantity: int
    unit_price: Decimal
    mrp: Decimal
    line_total: Decimal
    available: int

    @property
    def product(self):
        return self.sku.variant.product


# ---------------------------------------------------------------------------
# Stock
# ---------------------------------------------------------------------------
def inventory_rows(sku_ids, lock=False):
    qs = Inventory.objects.filter(sku_id__in=list(sku_ids), warehouse__is_active=True)
    if lock:
        qs = qs.select_for_update()
    rows = {}
    for inv in qs.order_by('id'):
        rows.setdefault(inv.sku_id, []).append(inv)
    return rows


def _available(rows):
    return sum(inv.quantity_available for inv in rows)


# ---------------------------------------------------------------------------
# Cart -> priced lines
# ---------------------------------------------------------------------------
def build_lines(raw_items, lock=False):
    """Return (lines, issues, rows). `issues` lists items that cannot be bought as requested."""
    if not isinstance(raw_items, list) or not raw_items:
        raise CheckoutError('Your cart is empty.', 'empty_cart')

    wanted = {}
    for item in raw_items:
        item = item if isinstance(item, dict) else {}
        code = str(item.get('sku_code') or '').strip()
        try:
            qty = int(item.get('quantity', 0))
        except (TypeError, ValueError):
            qty = 0
        if not code or qty < 1:
            raise CheckoutError('One of the cart items is invalid.', 'invalid_item')
        wanted[code] = wanted.get(code, 0) + qty
    if len(wanted) > 50:
        raise CheckoutError('Too many different items in one order (max 50).', 'too_many_items')

    skus = {
        s.sku_code: s
        for s in SKU.objects.select_related('variant__product').filter(sku_code__in=list(wanted))
    }
    rows = inventory_rows([s.id for s in skus.values()], lock=lock)

    lines, issues = [], []
    cap = max_qty_per_item()
    for code, qty in wanted.items():
        sku = skus.get(code)
        name = sku.variant.product.name if sku else code
        if (
            not sku or sku.status != 'active' or not sku.variant.is_active
            or sku.variant.product.status != 'active' or sku.variant.product.is_deleted
        ):
            issues.append({'sku_code': code, 'code': 'unavailable', 'available_quantity': 0,
                           'message': f'{name} is no longer available.'})
            continue
        available = _available(rows.get(sku.id, []))
        allowed = min(available, cap)
        if available <= 0:
            issues.append({'sku_code': code, 'code': 'out_of_stock', 'available_quantity': 0,
                           'message': f'{name} is out of stock.'})
        elif qty > allowed:
            issues.append({'sku_code': code, 'code': 'insufficient_stock', 'available_quantity': allowed,
                           'message': f'Only {allowed} of {name} can be ordered right now.'})
        else:
            price = money(sku.base_price)
            lines.append(Line(sku=sku, quantity=qty, unit_price=price, mrp=money(sku.mrp),
                              line_total=money(price * qty), available=available))
    return lines, issues, rows


# ---------------------------------------------------------------------------
# Coupons
# ---------------------------------------------------------------------------
def evaluate_coupon(code, lines, user):
    """Returns (coupon, discount). Raises CheckoutError(code='invalid_coupon') with a friendly message."""
    code = (code or '').strip()
    coupon = Coupon.objects.filter(code__iexact=code).first() if code else None
    if not coupon or not coupon.is_active:
        raise CheckoutError('This coupon code is not valid.', 'invalid_coupon')
    now = timezone.now()
    if now < coupon.valid_from:
        raise CheckoutError('This coupon is not active yet.', 'invalid_coupon')
    if now > coupon.valid_until:
        raise CheckoutError('This coupon has expired.', 'invalid_coupon')

    subtotal = sum((l.line_total for l in lines), Decimal('0'))
    restrictions = list(coupon.restrictions.all())
    if restrictions:
        category_ids = {r.category_id for r in restrictions if r.restriction_type == 'category'}
        product_ids = {r.product_id for r in restrictions if r.restriction_type == 'product'}
        eligible = [l for l in lines if l.product.category_id in category_ids or l.product.id in product_ids]
    else:
        eligible = list(lines)
    eligible_total = sum((l.line_total for l in eligible), Decimal('0'))
    if eligible_total <= 0:
        raise CheckoutError('This coupon does not apply to the items in your cart.', 'invalid_coupon')
    if subtotal < coupon.min_order_value:
        raise CheckoutError(
            f'Add items worth ₹{money(coupon.min_order_value - subtotal)} more to use this coupon.',
            'invalid_coupon')
    if coupon.max_usage_limit is not None and CouponUsage.objects.filter(coupon=coupon).count() >= coupon.max_usage_limit:
        raise CheckoutError('This coupon has reached its usage limit.', 'invalid_coupon')
    if user and user.is_authenticated:
        if CouponUsage.objects.filter(coupon=coupon, user=user).count() >= coupon.usage_per_user_limit:
            raise CheckoutError('You have already used this coupon.', 'invalid_coupon')
        if coupon.is_first_order_only and Order.objects.filter(user=user).exclude(status='cancelled').exists():
            raise CheckoutError('This coupon is only valid on your first order.', 'invalid_coupon')

    if coupon.discount_type == 'percentage':
        discount = eligible_total * coupon.discount_value / Decimal('100')
        if coupon.max_discount_amount:
            discount = min(discount, coupon.max_discount_amount)
    else:
        discount = coupon.discount_value
    return coupon, money(min(discount, eligible_total))


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------
def price_cart(lines, discount=Decimal('0'), cfg=None):
    cfg = cfg or store_config()
    subtotal = money(sum((l.line_total for l in lines), Decimal('0')))
    discount = money(min(discount, subtotal))
    goods_total = money(subtotal - discount)
    threshold = Decimal(str(cfg.free_shipping_threshold))
    shipping = Decimal('0') if (not lines or goods_total >= threshold) else Decimal(str(cfg.shipping_flat_fee))
    rate = Decimal(str(cfg.gst_percent))
    if cfg.prices_include_gst:
        # Listed prices already contain GST: show the tax part, don't add it again.
        gst_amount = money(goods_total * rate / (Decimal('100') + rate))
        payable = goods_total + shipping
    else:
        # Listed prices are before GST: add it on top.
        gst_amount = money(goods_total * rate / Decimal('100'))
        payable = goods_total + gst_amount + shipping
    mrp_total = sum((l.mrp * l.quantity for l in lines), Decimal('0'))
    return {
        'subtotal': subtotal,
        'discount': discount,
        'shipping': money(shipping),
        'gst_included': gst_amount,          # kept for older screens
        'gst_amount': gst_amount,
        'prices_include_gst': bool(cfg.prices_include_gst),
        'gst_percent': rate,
        'total': money(payable),
        'savings': money(max(Decimal('0'), mrp_total - subtotal) + discount),
        'free_shipping_threshold': threshold,
        'total_items': sum(l.quantity for l in lines),
    }


def payment_options(total, cfg=None):
    cfg = cfg or store_config()
    cod_enabled = bool(cfg.cod_enabled)
    cod_limit = Decimal(str(cfg.cod_max_order_value))
    cod_reason = ''
    if not cod_enabled:
        cod_reason = 'Cash on Delivery is currently unavailable.'
    elif total > cod_limit:
        cod_enabled = False
        cod_reason = f'Cash on Delivery is available up to ₹{money(cod_limit)}.'
    from core.models import payments_available
    # the shop switch AND a real payment gateway (the fake one only exists on a developer's computer)
    online_enabled = bool(cfg.online_payments_enabled) and payments_available()
    return [
        {'id': 'online', 'label': 'Pay online', 'description': 'UPI, cards, net banking, wallets',
         'enabled': online_enabled,
         'reason': '' if online_enabled else 'Online payment is temporarily unavailable.'},
        {'id': 'cod', 'label': 'Cash on Delivery', 'description': 'Pay when your order arrives',
         'enabled': cod_enabled, 'reason': cod_reason},
    ]


def quote(user, raw_items, coupon_code=''):
    """Full price breakdown for the checkout page (does not reserve or change anything)."""
    lines, issues, _ = build_lines(raw_items)
    coupon_info, coupon_error, discount = None, '', Decimal('0')
    if coupon_code and lines:
        try:
            coupon, discount = evaluate_coupon(coupon_code, lines, user)
            coupon_info = {'code': coupon.code, 'description': coupon.description, 'discount': discount}
        except CheckoutError as exc:
            coupon_error = exc.message
    totals = price_cart(lines, discount)
    return {
        'lines': [serialize_line(l) for l in lines],
        'issues': issues,
        'totals': totals,
        'coupon': coupon_info,
        'coupon_error': coupon_error,
        'payment_options': payment_options(totals['total']),
        'can_place': bool(lines) and not issues,
    }


def serialize_line(l):
    media = l.product.media.filter(media_type='image').order_by('-is_primary', 'display_order').first()
    return {
        'sku_code': l.sku.sku_code,
        'product_name': l.product.name,
        'product_slug': l.product.slug,
        'variant_name': l.sku.variant.name,
        'image': media.file_url if media else None,
        'quantity': l.quantity,
        'unit_price': l.unit_price,
        'mrp': l.mrp,
        'line_total': l.line_total,
        'available_quantity': min(l.available, max_qty_per_item()),
    }


# ---------------------------------------------------------------------------
# Order placement
# ---------------------------------------------------------------------------
def _new_order_number():
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(10):
        number = f"CC-{timezone.now():%y%m%d}-{''.join(secrets.choice(alphabet) for _ in range(6))}"
        if not Order.objects.filter(order_number=number).exists():
            return number
    raise CheckoutError('Could not generate an order number. Please try again.', 'order_number_failed', status_code=500)


def _log_status(order, old, new, reason, user=None):
    OrderStatusHistory.objects.create(order=order, old_status=old, new_status=new, reason=reason, changed_by=user)


def _deduct_stock(order, lines, rows, user):
    for line in lines:
        need = line.quantity
        for inv in sorted(rows.get(line.sku.id, []), key=lambda i: -i.quantity_available):
            take = min(need, inv.quantity_available)
            if take <= 0:
                continue
            inv.quantity_on_hand -= take
            inv.save(update_fields=['quantity_on_hand', 'updated_at'])
            InventoryTransaction.objects.create(
                inventory=inv, transaction_type='sale', quantity_change=-take,
                reference_type='order', reference_id=order.order_number,
                notes='Stock sold via checkout', created_by=user)
            need -= take
            if need == 0:
                break
        if need:
            raise CheckoutError(f'{line.product.name} just went out of stock.', 'insufficient_stock', status_code=409)


def place_order(user, raw_items, address=None, address_id=None, payment_method='cod',
                coupon_code='', notes='', idempotency_key=''):
    """Create an order atomically. Returns (order, created)."""
    from payments.models import Payment  # local import avoids circular dependency

    if payment_method not in ('cod', 'online'):
        raise CheckoutError('Choose a valid payment method.', 'invalid_payment_method')

    key = f'{user.id}:{str(idempotency_key)[:200]}' if idempotency_key else None
    if key:
        existing = Payment.objects.filter(idempotency_key=key).select_related('order').first()
        if existing:
            return existing.order, False

    # Resolve the delivery address
    if address_id:
        saved = Address.objects.filter(user=user, id=address_id).first()
        if not saved:
            raise CheckoutError('The selected address was not found.', 'address_not_found')
    else:
        try:
            saved = find_or_create_address(user, clean_address(address))
        except AddressValidationError as exc:
            raise CheckoutError(str(exc), 'invalid_address', details={'errors': exc.errors})

    with transaction.atomic():
        lines, issues, rows = build_lines(raw_items, lock=True)
        if issues or not lines:
            raise CheckoutError('Some items in your cart changed. Please review them.', 'cart_issues',
                                details={'issues': issues}, status_code=409)

        coupon, discount = None, Decimal('0')
        if coupon_code:
            coupon, discount = evaluate_coupon(coupon_code, lines, user)
        totals = price_cart(lines, discount)

        if payment_method == 'cod':
            option = next(o for o in payment_options(totals['total']) if o['id'] == 'cod')
            if not option['enabled']:
                raise CheckoutError(option['reason'] or 'Cash on Delivery is unavailable.', 'cod_unavailable')

        if payment_method == 'online':
            option = next(o for o in payment_options(totals['total']) if o['id'] == 'online')
            if not option['enabled']:
                raise CheckoutError(option['reason'], 'online_unavailable')

        is_cod = payment_method == 'cod'
        order = Order.objects.create(
            order_number=_new_order_number(), user=user,
            status='confirmed' if is_cod else 'pending',
            payment_status='pending', fulfillment_status='pending',
            total_items=totals['total_items'], subtotal=totals['subtotal'],
            discount_amount=totals['discount'], tax_amount=totals['gst_amount'],
            shipping_cost=totals['shipping'], order_total=totals['total'],
            billing_address=saved, shipping_address=saved,
            shipping_method='Standard Delivery', coupon=coupon,
            notes=str(notes or '')[:1000],
            confirmed_at=timezone.now() if is_cod else None,
        )

        rate = totals['gst_percent']
        inclusive = totals['prices_include_gst']
        for l in lines:
            OrderItem.objects.create(
                order=order, sku=l.sku, product_name=l.product.name, variant_name=l.sku.variant.name,
                sku_code=l.sku.sku_code, quantity=l.quantity, unit_price=l.unit_price,
                tax_per_item=money(l.unit_price * rate / (Decimal('100') + rate) if inclusive else l.unit_price * rate / Decimal('100')),
                line_total=l.line_total)
        for kind in ('shipping', 'billing'):
            OrderAddress.objects.create(
                order=order, address_type=kind, full_name=saved.full_name, phone=saved.phone,
                line1=saved.line1, line2=saved.line2, city=saved.city, state=saved.state,
                postal_code=saved.postal_code, country=saved.country)

        _deduct_stock(order, lines, rows, user)
        if coupon:
            CouponUsage.objects.create(coupon=coupon, user=user, order=order, discount_amount=totals['discount'])
        Payment.objects.create(
            order=order, payment_method=payment_method, status='pending', amount=totals['total'],
            idempotency_key=key or secrets.token_hex(16))
        _log_status(order, None, order.status, 'Order placed', user)

        if is_cod:
            transaction.on_commit(lambda: send_confirmation_email(order.id))
    return order, True


def cancel_order(order, user, reason='', notes=''):
    """Cancel an order and put its stock back."""
    if order.status not in CANCELLABLE_STATUSES:
        raise CheckoutError(f'This order can no longer be cancelled (status: {order.status}).', 'not_cancellable')
    with transaction.atomic():
        old = order.status
        sales = InventoryTransaction.objects.filter(
            reference_type='order', reference_id=order.order_number, transaction_type='sale'
        ).select_related('inventory')
        for sale in sales:
            inv = Inventory.objects.select_for_update().get(pk=sale.inventory_id)
            qty = -sale.quantity_change
            inv.quantity_on_hand += qty
            inv.save(update_fields=['quantity_on_hand', 'updated_at'])
            InventoryTransaction.objects.create(
                inventory=inv, transaction_type='return', quantity_change=qty,
                reference_type='order', reference_id=order.order_number,
                notes='Order cancelled', created_by=user)
        CouponUsage.objects.filter(order=order).delete()
        order.status = 'cancelled'
        if order.payment_status == 'paid':
            order.notes = (order.notes + '\nRefund pending for cancelled prepaid order.').strip()
        order.save()
        _log_status(order, old, 'cancelled', reason or 'Cancelled by customer', user)
    return order


def send_confirmation_email(order_id):
    """Fire-and-forget confirmation email so a slow mail API never delays checkout."""
    def _send():
        try:
            from core.email_service import brevo_service
            order = Order.objects.select_related('user').get(pk=order_id)
            if order.user and order.user.email:
                name = order.user.first_name or order.user.email.split('@')[0].title()
                brevo_service.send_order_confirmation(order.user.email, order.order_number, name)
        except Exception:
            logger.exception('Order confirmation email failed')
    threading.Thread(target=_send, daemon=True).start()
