"""
Refunds app models
"""

from django.db import models
from core.models import TimeStampedModel


class RefundTransaction(TimeStampedModel):
    """Refund transactions"""
    refund = models.ForeignKey('payments.Refund', on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')]
    )
    gateway_reference_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Refund Transaction {self.id}"
