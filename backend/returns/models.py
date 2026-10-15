"""
Returns app models
"""

from django.db import models
from core.models import TimeStampedModel


class Return(TimeStampedModel):
    """Product returns"""
    RETURN_STATUS = [
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('picked_up', 'Picked Up'),
        ('received', 'Received'),
        ('inspecting', 'Inspecting'),
        ('completed', 'Completed'),
    ]

    return_number = models.CharField(max_length=50, unique=True, db_index=True)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='returns')
    status = models.CharField(max_length=20, choices=RETURN_STATUS, default='requested', db_index=True)
    reason = models.CharField(max_length=255)
    description = models.TextField()
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['return_number']),
            models.Index(fields=['order']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Return {self.return_number}"


class ReturnItem(TimeStampedModel):
    """Items in a return"""
    return_obj = models.ForeignKey(Return, on_delete=models.CASCADE, related_name='items')
    order_item = models.ForeignKey('orders.OrderItem', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2)
    inspection_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending'
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['order_item']

    def __str__(self):
        return f"Return Item - {self.order_item.product_name}"


class ReturnAddress(TimeStampedModel):
    """Return shipping address"""
    return_obj = models.OneToOneField(Return, on_delete=models.CASCADE, related_name='address')
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2, default='IN')
    phone = models.CharField(max_length=20)

    class Meta:
        verbose_name_plural = 'Return Addresses'

    def __str__(self):
        return f"Return Address - {self.return_obj.return_number}"
