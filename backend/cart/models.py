"""
Cart app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel


class Cart(TimeStampedModel):
    """Shopping cart for users and guests"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cart',
        null=True,
        blank=True
    )
    session_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    total_items = models.PositiveIntegerField(default=0)
    last_activity_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_activity_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['session_id']),
        ]

    def __str__(self):
        owner = self.user.email if self.user else f"Guest ({self.session_id})"
        return f"Cart: {owner}"


class CartItem(TimeStampedModel):
    """Individual items in cart"""
    from catalog.models import SKU

    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    sku = models.ForeignKey(SKU, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('cart', 'sku')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cart']),
            models.Index(fields=['sku']),
        ]

    def __str__(self):
        return f"{self.sku.sku_code} x{self.quantity}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity
