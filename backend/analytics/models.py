"""
Analytics app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel


class AnalyticsEvent(TimeStampedModel):
    """User event tracking"""
    EVENT_TYPES = [
        ('page_view', 'Page View'),
        ('add_to_cart', 'Add to Cart'),
        ('checkout_started', 'Checkout Started'),
        ('purchase', 'Purchase'),
        ('product_view', 'Product View'),
        ('search', 'Search'),
        ('review_submitted', 'Review Submitted'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    event_data = models.JSONField(default=dict, blank=True)
    page_url = models.URLField(blank=True)
    referrer = models.URLField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]
        verbose_name_plural = 'Analytics Events'

    def __str__(self):
        return f"{self.event_type} - {self.created_at}"


class AuditLog(TimeStampedModel):
    """Audit trail for sensitive operations"""
    ACTIONS = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTIONS)
    entity_type = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=255, db_index=True)
    old_values = models.JSONField(null=True, blank=True)
    new_values = models.JSONField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.action} {self.entity_type} {self.entity_id}"


class FraudFlag(TimeStampedModel):
    """Fraud detection flags"""
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    FLAG_TYPES = [
        ('high_value_order', 'High Value Order'),
        ('frequent_failures', 'Frequent Payment Failures'),
        ('suspicious_pattern', 'Suspicious Pattern'),
        ('multiple_returns', 'Multiple Returns'),
        ('high_refund_rate', 'High Refund Rate'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    flag_type = models.CharField(max_length=50, choices=FLAG_TYPES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS)
    reason = models.TextField()
    is_resolved = models.BooleanField(default=False, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_resolved']),
        ]

    def __str__(self):
        return f"{self.flag_type} - {self.severity}"
