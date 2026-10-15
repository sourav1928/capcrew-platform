"""
Payments app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel
import uuid


class Payment(TimeStampedModel):
    """Payment records"""
    PAYMENT_METHOD = [
        ('online', 'Online'),
        ('cod', 'Cash on Delivery'),
    ]

    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('authorized', 'Authorized'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='payment'
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending', db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')

    # Gateway references
    gateway_order_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    gateway_payment_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True, default=uuid.uuid4)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['status']),
            models.Index(fields=['gateway_order_id']),
        ]

    def __str__(self):
        return f"Payment for {self.order.order_number}"


class PaymentAttempt(TimeStampedModel):
    """Payment attempts"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('success', 'Success'), ('failed', 'Failed')]
    )
    error_code = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('payment', 'attempt_number')

    def __str__(self):
        return f"{self.payment.order.order_number} - Attempt {self.attempt_number}"


class PaymentTransaction(TimeStampedModel):
    """Payment transactions"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(
        max_length=20,
        choices=[('debit', 'Debit'), ('credit', 'Credit'), ('refund', 'Refund')]
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    gateway_reference_id = models.CharField(max_length=255, blank=True)
    response_code = models.CharField(max_length=50, blank=True)
    response_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment']),
        ]

    def __str__(self):
        return f"{self.payment.order.order_number} - {self.transaction_type}"


class WebhookEvent(TimeStampedModel):
    """Webhook events from payment providers"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, null=True, blank=True, related_name='webhooks')
    event_type = models.CharField(max_length=100, db_index=True)
    raw_data = models.JSONField()
    signature = models.CharField(max_length=255, blank=True)
    is_processed = models.BooleanField(default=False, db_index=True)
    processing_error = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['is_processed']),
        ]

    def __str__(self):
        return f"{self.event_type} - {self.created_at}"


class Refund(TimeStampedModel):
    """Refunds"""
    REFUND_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(
        max_length=50,
        choices=[
            ('payment_error', 'Payment Error'),
            ('customer_request', 'Customer Request'),
            ('return_refund', 'Return Refund'),
        ]
    )
    status = models.CharField(max_length=20, choices=REFUND_STATUS, default='pending', db_index=True)
    gateway_refund_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['payment']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Refund {self.id} - {self.amount} INR"
