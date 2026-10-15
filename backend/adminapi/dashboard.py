"""Dashboard numbers and the 'who am I' endpoint."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from orders.models import Order, OrderItem
from .catalog import LOW_STOCK, sku_stock
from .common import IsStoreStaff, ok
from .orders import order_queryset, serialize_order
from catalog.models import SKU

SALES_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered']


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        return ok({
            'id': u.id, 'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
            'username': u.username, 'is_staff': u.is_staff, 'is_superuser': u.is_superuser,
        })


class DashboardView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        try:
            days = max(1, min(int(request.query_params.get('days', 30)), 365))
        except ValueError:
            days = 30
        now = timezone.now()
        start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
        prev_start = start - timedelta(days=days)
        sales = Order.objects.filter(status__in=SALES_STATUSES)

        def window(qs, a, b):
            qs = qs.filter(created_at__gte=a, created_at__lt=b)
            agg = qs.aggregate(revenue=Sum('order_total'), count=Count('id'))
            return Decimal(agg['revenue'] or 0), agg['count'] or 0

        revenue, order_count = window(sales, start, now + timedelta(seconds=1))
        prev_revenue, prev_count = window(sales, prev_start, start)

        def change(cur, prev):
            if not prev:
                return None
            return round((float(cur) - float(prev)) / float(prev) * 100, 1)

        per_day = {
            r['d']: r for r in sales.filter(created_at__gte=start)
            .annotate(d=TruncDate('created_at')).values('d')
            .annotate(revenue=Sum('order_total'), orders=Count('id'))
        }
        chart = []
        for i in range(days):
            day = (start + timedelta(days=i)).date()
            row = per_day.get(day)
            chart.append({'date': day.isoformat(), 'revenue': str(row['revenue'] if row else 0),
                          'orders': row['orders'] if row else 0})

        top = (OrderItem.objects.filter(order__status__in=SALES_STATUSES, order__created_at__gte=start)
               .values('product_name').annotate(units=Sum('quantity'), revenue=Sum('line_total'))
               .order_by('-revenue')[:5])

        low = []
        for sku in SKU.objects.select_related('variant__product').prefetch_related('inventory').filter(
                status='active', variant__product__is_deleted=False, variant__product__status='active'):
            s = sku_stock(sku)
            if s <= LOW_STOCK:
                low.append({'sku_code': sku.sku_code, 'product_name': sku.variant.product.name,
                            'variant_name': sku.variant.name, 'stock': s})
        low.sort(key=lambda x: x['stock'])

        by_status = {r['status']: r['n'] for r in Order.objects.values('status').annotate(n=Count('id'))}
        recent = order_queryset().order_by('-created_at')[:6]
        return ok({
            'days': days,
            'kpis': {
                'revenue': str(revenue), 'revenue_change': change(revenue, prev_revenue),
                'orders': order_count, 'orders_change': change(order_count, prev_count),
                'avg_order_value': str((revenue / order_count).quantize(Decimal('0.01')) if order_count else 0),
                'new_customers': User.objects.filter(date_joined__gte=start, is_staff=False).count(),
                'pending_orders': by_status.get('pending', 0) + by_status.get('confirmed', 0),
                'low_stock_items': len(low),
                'total_customers': User.objects.filter(is_staff=False).count(),
            },
            'chart': chart,
            'top_products': [{'name': t['product_name'], 'units': t['units'], 'revenue': str(t['revenue'])} for t in top],
            'low_stock': low[:8],
            'orders_by_status': by_status,
            'recent_orders': [serialize_order(o) for o in recent],
        })
