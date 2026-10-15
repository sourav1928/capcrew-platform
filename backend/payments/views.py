"""Payment endpoints (online payments only; Cash on Delivery needs none)."""
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.services import CheckoutError
from orders.serializers import OrderDetailSerializer
from . import services


def _error(exc):
    return Response({'success': False, 'message': exc.message, 'code': exc.code, 'details': exc.details},
                    status=exc.status_code)


class _OrderPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def get_order(self, request):
        number = str(request.data.get('order_number') or '')
        return Order.objects.select_related('payment', 'user', 'shipping_address').filter(
            order_number=number, user=request.user).first()


class InitiatePaymentView(_OrderPaymentView):
    def post(self, request):
        order = self.get_order(request)
        if not order:
            return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            intent = services.create_payment_intent(order)
        except CheckoutError as exc:
            return _error(exc)
        return Response({'success': True, 'data': intent})


class VerifyPaymentView(_OrderPaymentView):
    def post(self, request):
        order = self.get_order(request)
        if not order:
            return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        try:
            services.confirm_payment(
                order,
                gateway_order_id=request.data.get('gateway_order_id'),
                gateway_payment_id=request.data.get('gateway_payment_id') or '',
                signature=request.data.get('signature') or '')
        except CheckoutError as exc:
            return _error(exc)
        order.refresh_from_db()
        return Response({'success': True, 'message': 'Payment successful',
                         'data': OrderDetailSerializer(order, context={'request': request}).data})


class PaymentFailedView(_OrderPaymentView):
    def post(self, request):
        order = self.get_order(request)
        if not order:
            return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        services.record_payment_failure(order, request.data.get('reason', ''), request.data.get('error_code', ''))
        return Response({'success': True, 'message': 'Payment failure recorded'})


class RazorpayWebhookView(APIView):
    """Called by Razorpay's servers (not by browsers). Trusted only if the signature matches our secret."""
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = []

    def post(self, request):
        code, message = services.handle_razorpay_webhook(request.body, request.META.get('HTTP_X_RAZORPAY_SIGNATURE', ''))
        return Response({'success': code == 200, 'message': message}, status=code)
