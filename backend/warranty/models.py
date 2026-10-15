"""
Warranty app models
"""

from django.db import models
from core.models import TimeStampedModel


class Warranty(TimeStampedModel):
    """Product warranties"""
    WARRANTY_TYPES = [
        ('manufacturer', 'Manufacturer'),
        ('extended', 'Extended'),
    ]

    order_item = models.OneToOneField('orders.OrderItem', on_delete=models.CASCADE, related_name='warranty')
    warranty_type = models.CharField(max_length=20, choices=WARRANTY_TYPES)
    coverage_start = models.DateField()
    coverage_end = models.DateField()
    coverage_description = models.TextField()
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name_plural = 'Warranties'
        ordering = ['-created_at']

    def __str__(self):
        return f"Warranty {self.id}"


class WarrantyClaim(TimeStampedModel):
    """Warranty claims"""
    CLAIM_STATUS = [
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    RESOLUTION_TYPES = [
        ('repair', 'Repair'),
        ('replacement', 'Replacement'),
        ('refund', 'Refund'),
    ]

    claim_number = models.CharField(max_length=50, unique=True, db_index=True)
    warranty = models.ForeignKey(Warranty, on_delete=models.CASCADE, related_name='claims')
    status = models.CharField(max_length=20, choices=CLAIM_STATUS, default='submitted', db_index=True)
    issue_description = models.TextField()
    claim_date = models.DateTimeField(auto_now_add=True)
    resolution_type = models.CharField(max_length=20, choices=RESOLUTION_TYPES, null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-claim_date']

    def __str__(self):
        return f"Claim {self.claim_number}"


class WarrantyAttachment(TimeStampedModel):
    """Attachments for warranty claims"""
    warranty_claim = models.ForeignKey(WarrantyClaim, on_delete=models.CASCADE, related_name='attachments')
    file_url = models.URLField()
    file_type = models.CharField(max_length=50)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Attachment {self.id}"
