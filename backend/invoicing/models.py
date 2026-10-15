"""
Invoicing app models
"""

from django.db import models
from core.models import TimeStampedModel


class Invoice(TimeStampedModel):
    """Invoices"""
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    invoice_date = models.DateField()
    seller_details = models.JSONField()
    buyer_details = models.JSONField()
    items = models.JSONField()
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2)
    shipping = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    pdf_url = models.URLField(blank=True, null=True)

    class Meta:
        ordering = ['-invoice_date']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number}"
