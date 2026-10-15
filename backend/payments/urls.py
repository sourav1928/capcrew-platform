"""payments app URLs"""
from django.urls import path
from .views import InitiatePaymentView, VerifyPaymentView, PaymentFailedView, RazorpayWebhookView

urlpatterns = [
    path('initiate/', InitiatePaymentView.as_view(), name='payment-initiate'),
    path('verify/', VerifyPaymentView.as_view(), name='payment-verify'),
    path('failed/', PaymentFailedView.as_view(), name='payment-failed'),
    path('webhook/razorpay/', RazorpayWebhookView.as_view(), name='payment-webhook-razorpay'),
]
