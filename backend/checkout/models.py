"""
Checkout app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel


class CheckoutSession(TimeStampedModel):
    """Checkout session tracking"""
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=255, unique=True, db_index=True)
    cart_snapshot = models.JSONField()
    status = models.CharField(
        max_length=20,
        choices=[
            ('initiated', 'Initiated'),
            ('address_entered', 'Address Entered'),
            ('shipping_selected', 'Shipping Selected'),
            ('payment_started', 'Payment Started'),
            ('completed', 'Completed'),
            ('abandoned', 'Abandoned'),
        ],
        default='initiated',
        db_index=True
    )
    expired_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Checkout {self.session_id}"
