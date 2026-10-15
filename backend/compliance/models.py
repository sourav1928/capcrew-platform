"""
Compliance app models
"""

from django.db import models
from core.models import TimeStampedModel


class ProductCompliance(TimeStampedModel):
    """Product compliance tracking (separate from catalog.ProductCompliance for regulatory needs)"""
    COMPLIANCE_STATUS = [
        ('pending', 'Pending'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    ]

    product = models.ForeignKey('catalog.Product', on_delete=models.CASCADE, related_name='compliance_records')
    compliance_type = models.CharField(max_length=100)
    details = models.JSONField()
    documents = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=COMPLIANCE_STATUS, default='pending')
    verified_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Product Compliance Records'
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.compliance_type}"
