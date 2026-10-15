"""Customers and coupons for store staff."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.views import APIView

from coupons.models import Coupon, CouponUsage
from orders.models import Order
from .common import IsStoreStaff, fail, ok, paginate, raise_if, to_decimal, to_int


# ------------------------------------------------------------------ customers
def serialize_customer(u):
    spent = getattr(u, 'spent', None)
    return {
        'id': u.id, 'name': u.get_full_name() or u.email.split('@')[0], 'email': u.email,
        'is_active': u.is_active, 'is_staff': u.is_staff,
        'joined': u.date_joined.isoformat(),
        'order_count': getattr(u, 'order_count', 0) or 0,
        'total_spent': str(spent if spent is not None else Decimal('0')),
        'last_login': u.last_login.isoformat() if u.last_login else None,
    }


def customer_qs():
    valid = Q(orders__status__in=['confirmed', 'processing', 'shipped', 'delivered'])
    return User.objects.annotate(
        order_count=Count('orders', distinct=True),
        spent=Sum('orders__order_total', filter=valid),
    )


class CustomerListView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        qs = customer_qs().order_by('-date_joined')
        p = request.query_params
        search = (p.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))
        if p.get('status') == 'active':
            qs = qs.filter(is_active=True)
        elif p.get('status') == 'blocked':
            qs = qs.filter(is_active=False)
        if p.get('role') == 'staff':
            qs = qs.filter(is_staff=True)
        elif p.get('role') == 'customer':
            qs = qs.filter(is_staff=False)
        return paginate(qs, request, serialize_customer)


class CustomerDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request, pk):
        u = customer_qs().filter(pk=pk).first()
        if not u:
            return fail('Customer not found', 404)
        orders = Order.objects.filter(user=u).order_by('-created_at')[:20]
        data = serialize_customer(u)
        data['orders'] = [{
            'order_number': o.order_number, 'status': o.status, 'status_display': o.get_status_display(),
            'order_total': str(o.order_total), 'created_at': o.created_at.isoformat(),
        } for o in orders]
        return ok(data)

    def patch(self, request, pk):
        u = User.objects.filter(pk=pk).first()
        if not u:
            return fail('Customer not found', 404)
        if 'is_active' in request.data:
            if u.pk == request.user.pk and not request.data['is_active']:
                return fail('You cannot block your own account.')
            if u.is_superuser and not request.user.is_superuser:
                return fail('Only a superuser can change a superuser.', 403)
            u.is_active = bool(request.data['is_active'])
            u.save(update_fields=['is_active'])
        if 'is_staff' in request.data:
            # Only superusers may grant or remove admin-panel access
            if not request.user.is_superuser:
                return fail('Only a superuser can give or remove admin access.', 403)
            if u.pk == request.user.pk and not request.data['is_staff']:
                return fail('You cannot remove your own admin access.')
            u.is_staff = bool(request.data['is_staff'])
            u.save(update_fields=['is_staff'])
        return ok(serialize_customer(customer_qs().get(pk=pk)), 'Customer updated')


# -------------------------------------------------------------------- coupons
def serialize_coupon(c):
    now = timezone.now()
    state = 'inactive' if not c.is_active else ('scheduled' if c.valid_from > now else ('expired' if c.valid_until < now else 'live'))
    return {
        'id': str(c.id), 'code': c.code, 'description': c.description,
        'discount_type': c.discount_type, 'discount_value': str(c.discount_value),
        'max_discount_amount': str(c.max_discount_amount) if c.max_discount_amount is not None else None,
        'min_order_value': str(c.min_order_value),
        'max_usage_limit': c.max_usage_limit, 'usage_per_user_limit': c.usage_per_user_limit,
        'is_first_order_only': c.is_first_order_only, 'is_active': c.is_active,
        'valid_from': c.valid_from.isoformat(), 'valid_until': c.valid_until.isoformat(),
        'times_used': c.usages.count(), 'state': state,
    }


def save_coupon(c, d, creating):
    errors = {}
    code = str(d.get('code', c.code if (not c._state.adding) else '') or '').strip().upper().replace(' ', '')
    if not code:
        errors['code'] = 'Coupon code is required'
    elif Coupon.objects.filter(code__iexact=code).exclude(pk=c.pk).exists():
        errors['code'] = 'This code already exists'
    dtype = d.get('discount_type', c.discount_type if (not c._state.adding) else 'percentage')
    if dtype not in ('percentage', 'fixed'):
        errors['discount_type'] = 'Choose percentage or fixed amount'
    value = to_decimal(d.get('discount_value', c.discount_value if (not c._state.adding) else None), 'discount_value', errors, minimum=Decimal('0.01'))
    if value is not None and dtype == 'percentage' and value > 100:
        errors['discount_value'] = 'A percentage cannot be above 100'
    max_disc = to_decimal(d.get('max_discount_amount', c.max_discount_amount if (not c._state.adding) else None), 'max_discount_amount', errors, required=False)
    min_order = to_decimal(d.get('min_order_value', c.min_order_value if (not c._state.adding) else 0) or 0, 'min_order_value', errors)
    max_use = to_int(d.get('max_usage_limit', c.max_usage_limit if (not c._state.adding) else None), 'max_usage_limit', errors, minimum=1, required=False)
    per_user = to_int(d.get('usage_per_user_limit', c.usage_per_user_limit if (not c._state.adding) else 1), 'usage_per_user_limit', errors, minimum=1)
    start = parse_datetime(str(d.get('valid_from') or '')) if d.get('valid_from') else (c.valid_from if (not c._state.adding) else timezone.now())
    end = parse_datetime(str(d.get('valid_until') or '')) if d.get('valid_until') else (c.valid_until if (not c._state.adding) else None)
    if start is None:
        errors['valid_from'] = 'Enter a valid start date'
    if end is None:
        errors['valid_until'] = 'Enter an end date'
    elif start and end <= start:
        errors['valid_until'] = 'End date must be after the start date'
    raise_if(errors)
    for tz_field in ('start', 'end'):
        pass
    if timezone.is_naive(start):
        start = timezone.make_aware(start)
    if timezone.is_naive(end):
        end = timezone.make_aware(end)
    c.code, c.discount_type, c.discount_value = code, dtype, value
    c.description = str(d.get('description', c.description) or '')[:1000]
    c.max_discount_amount = max_disc
    c.min_order_value, c.max_usage_limit, c.usage_per_user_limit = min_order, max_use, per_user
    c.is_first_order_only = bool(d.get('is_first_order_only', c.is_first_order_only))
    c.is_active = d.get('is_active', c.is_active if (not c._state.adding) else True) is not False
    c.valid_from, c.valid_until = start, end
    c.save()
    return c


class CouponListCreateView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        qs = Coupon.objects.all().order_by('-created_at')
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(code__icontains=search) | Q(description__icontains=search))
        return paginate(qs, request, serialize_coupon, default_size=50)

    def post(self, request):
        return ok(serialize_coupon(save_coupon(Coupon(), request.data, True)), 'Coupon created', status=201)


class CouponDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def patch(self, request, pk):
        c = Coupon.objects.filter(pk=pk).first()
        if not c:
            return fail('Coupon not found', 404)
        return ok(serialize_coupon(save_coupon(c, request.data, False)), 'Coupon saved')

    def delete(self, request, pk):
        c = Coupon.objects.filter(pk=pk).first()
        if not c:
            return fail('Coupon not found', 404)
        if c.usages.exists():
            c.is_active = False
            c.save(update_fields=['is_active', 'updated_at'])
            return ok(message='This coupon was already used, so it was switched off instead of deleted.')
        c.delete()
        return ok(message='Coupon deleted')
