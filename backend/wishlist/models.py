"""
Wishlist app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel


class Wishlist(TimeStampedModel):
    """User wishlists"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wishlist')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Wishlist for {self.user.email}"


class WishlistItem(TimeStampedModel):
    """Items in wishlists"""
    wishlist = models.ForeignKey(Wishlist, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('catalog.Product', on_delete=models.CASCADE)
    variant = models.ForeignKey(
        'catalog.ProductVariant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        unique_together = ('wishlist', 'product', 'variant')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.product.name} in wishlist"
