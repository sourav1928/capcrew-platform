"""
Promotions app models
"""

from django.db import models
from core.models import TimeStampedModel, ActiveManager


class Promotion(TimeStampedModel):
    """Promotional campaigns"""
    PROMOTION_TYPES = [
        ('product_discount', 'Product Discount'),
        ('category_discount', 'Category Discount'),
        ('buy_x_get_y', 'Buy X Get Y'),
        ('free_shipping', 'Free Shipping'),
        ('quantity_discount', 'Quantity Discount'),
    ]

    DISCOUNT_TYPES = [
        ('fixed', 'Fixed Amount'),
        ('percentage', 'Percentage'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    promotion_type = models.CharField(max_length=50, choices=PROMOTION_TYPES)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True, db_index=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField(null=True, blank=True)
    priority = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name


class PromotionRule(TimeStampedModel):
    """Rules for promotions"""
    promotion = models.ForeignKey(Promotion, on_delete=models.CASCADE, related_name='rules')
    min_quantity = models.PositiveIntegerField(null=True, blank=True)
    max_quantity = models.PositiveIntegerField(null=True, blank=True)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    applicable_categories = models.JSONField(default=list)
    applicable_products = models.JSONField(default=list)

    class Meta:
        ordering = ['promotion']

    def __str__(self):
        return f"Rule for {self.promotion.name}"
