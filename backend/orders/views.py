"""
Orders app views
"""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
import logging

from .models import Order, OrderItem, OrderAddress, OrderStatusHistory
from .serializers import (
    OrderListSerializer, OrderDetailSerializer, OrderItemSerializer,
    OrderAddressSerializer, OrderStatusHistorySerializer
)
from . import services
from .services import CheckoutError

logger = logging.getLogger(__name__)


class OrderFilter(django_filters.FilterSet):
    """Filter for orders"""
    status = django_filters.CharFilter(field_name='status')
    payment_status = django_filters.CharFilter(field_name='payment_status')
    date_from = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Order
        fields = ['status', 'payment_status']


class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for orders"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'order_number'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = OrderFilter
    search_fields = ['order_number', 'user__email', 'user__first_name']
    ordering_fields = ['created_at', 'order_total', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Users can only see their own orders"""
        user = self.request.user
        if user.is_staff:
            # Staff can see all orders
            return Order.objects.select_related(
                'user', 'billing_address', 'shipping_address', 'payment', 'coupon', 'shipment'
            ).prefetch_related(
                'items', 'items__sku', 'status_history', 'addresses'
            )
        else:
            # Regular users can only see their own orders
            return Order.objects.filter(user=user).select_related(
                'user', 'billing_address', 'shipping_address', 'payment', 'coupon', 'shipment'
            ).prefetch_related(
                'items', 'items__sku', 'status_history', 'addresses'
            )

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderDetailSerializer

    @action(detail=True, methods=['get'])
    def items(self, request, order_number=None):
        """Get items for a specific order"""
        order = self.get_object()
        items = order.items.all()
        serializer = OrderItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def status_history(self, request, order_number=None):
        """Get status history for a specific order"""
        order = self.get_object()
        history = order.status_history.all()
        serializer = OrderStatusHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, order_number=None):
        """Cancel an order (if still allowed) and return its stock"""
        order = self.get_object()
        try:
            services.cancel_order(
                order, request.user,
                reason=str(request.data.get('reason', ''))[:255],
                notes=str(request.data.get('notes', ''))[:1000])
        except CheckoutError as exc:
            return Response({'success': False, 'message': exc.message, 'code': exc.code},
                            status=exc.status_code)
        order = self.get_queryset().get(pk=order.pk)
        return Response({'success': True, 'message': 'Order cancelled',
                         'data': OrderDetailSerializer(order, context={'request': request}).data})

    @action(detail=True, methods=['get'])
    def invoice(self, request, order_number=None):
        """GST invoice data for one of the customer's own orders (only once the order is confirmed)"""
        from .invoice import build_invoice
        order = self.get_object()
        if order.status == 'pending':
            return Response({'success': False, 'message': 'The invoice is available once your order is confirmed.'},
                            status=status.HTTP_400_BAD_REQUEST)
        return Response({'success': True, 'data': build_invoice(order)})

    @action(detail=False, methods=['post'])
    def quote(self, request):
        """Server-side price breakdown for the checkout page"""
        try:
            data = services.quote(request.user, request.data.get('items'), request.data.get('coupon_code', ''))
        except CheckoutError as exc:
            return Response({'success': False, 'message': exc.message, 'code': exc.code, 'details': exc.details},
                            status=exc.status_code)
        return Response({'success': True, 'data': data})

    @action(detail=False, methods=['post'])
    def place(self, request):
        """Create an order from the cart"""
        payload = request.data
        try:
            order, created = services.place_order(
                request.user,
                payload.get('items'),
                address=payload.get('address'),
                address_id=payload.get('address_id') or None,
                payment_method=payload.get('payment_method', 'cod'),
                coupon_code=payload.get('coupon_code', ''),
                notes=payload.get('notes', ''),
                idempotency_key=payload.get('idempotency_key', ''),
            )
        except CheckoutError as exc:
            body = {'success': False, 'message': exc.message, 'code': exc.code, 'details': exc.details}
            if 'errors' in exc.details:
                body['errors'] = exc.details['errors']
            return Response(body, status=exc.status_code)

        order = self.get_queryset().get(pk=order.pk)
        data = {'order': OrderDetailSerializer(order, context={'request': request}).data, 'payment_intent': None}
        if order.payment.payment_method == 'online' and order.payment.status != 'paid':
            from payments.services import create_payment_intent
            try:
                data['payment_intent'] = create_payment_intent(order)
            except Exception:
                # The order exists; the customer can retry payment from the order page.
                import logging
                logging.getLogger(__name__).exception('Could not start payment for %s', order.order_number)
        return Response({'success': True, 'message': 'Order placed', 'data': data},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminUser])
    def update_status(self, request, order_number=None):
        """Admin: update order status and/or payment status"""
        order = self.get_object()
        new_status = request.data.get('status')
        new_payment_status = request.data.get('payment_status')
        notes = request.data.get('notes', '')

        valid_statuses = [s[0] for s in Order.ORDER_STATUS]
        valid_payment_statuses = [s[0] for s in Order.PAYMENT_STATUS]

        if new_status and new_status not in valid_statuses:
            return Response(
                {'success': False, 'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_payment_status and new_payment_status not in valid_payment_statuses:
            return Response(
                {'success': False, 'message': f'Invalid payment status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = order.status
        if new_status and new_status != old_status:
            order.status = new_status
            OrderStatusHistory.objects.create(
                order=order,
                old_status=old_status,
                new_status=new_status,
                changed_by=request.user,
                reason='Admin status update',
                notes=notes,
            )
            logger.info(f"Admin {request.user.email} changed order {order.order_number} status: {old_status} → {new_status}")

        if new_payment_status:
            order.payment_status = new_payment_status

        order.save()
        return Response({
            'success': True,
            'message': 'Order updated',
            'data': OrderDetailSerializer(order, context={'request': request}).data
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get order summary for current user"""
        queryset = self.get_queryset()

        summary = {
            'total_orders': queryset.count(),
            'pending_orders': queryset.filter(status='pending').count(),
            'confirmed_orders': queryset.filter(status='confirmed').count(),
            'processing_orders': queryset.filter(status='processing').count(),
            'shipped_orders': queryset.filter(status='shipped').count(),
            'delivered_orders': queryset.filter(status='delivered').count(),
            'cancelled_orders': queryset.filter(status='cancelled').count(),
            'total_spent': sum(order.order_total for order in queryset),
        }

        return Response(summary)
