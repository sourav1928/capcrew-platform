"""
Coupons app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel, ActiveManager


class Coupon(TimeStampedModel):
    """Discount coupons"""
    DISCOUNT_TYPES = [
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage'),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    max_discount_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_usage_limit = models.PositiveIntegerField(null=True, blank=True)
    usage_per_user_limit = models.PositiveIntegerField(default=1)
    is_first_order_only = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.discount_value}"


class CouponUsage(TimeStampedModel):
    """Track coupon usage"""
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    used_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-used_at']
        unique_together = ('coupon', 'user', 'order')
        indexes = [
            models.Index(fields=['coupon']),
            models.Index(fields=['user']),
        ]

    def __str__(self):
        return f"{self.coupon.code} used by {self.user.email}"


class CouponRestriction(TimeStampedModel):
    """Coupon restrictions by product/category"""
    RESTRICTION_TYPES = [
        ('category', 'Category'),
        ('product', 'Product'),
    ]

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='restrictions')
    restriction_type = models.CharField(max_length=20, choices=RESTRICTION_TYPES)
    category = models.ForeignKey('catalog.Category', on_delete=models.CASCADE, null=True, blank=True)
    product = models.ForeignKey('catalog.Product', on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        ordering = ['restriction_type']

    def __str__(self):
        return f"Restriction for {self.coupon.code}"
