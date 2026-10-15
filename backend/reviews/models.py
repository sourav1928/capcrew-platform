"""
Reviews app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel, SoftDeleteModel, ActiveManager


class Review(SoftDeleteModel):
    """Product reviews"""
    order_item = models.OneToOneField('orders.OrderItem', on_delete=models.CASCADE, related_name='review')
    product = models.ForeignKey('catalog.Product', on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_verified_purchase = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=False, db_index=True)
    helpful_count = models.PositiveIntegerField(default=0)
    unhelpful_count = models.PositiveIntegerField(default=0)

    objects = ActiveManager()

    class Meta:
        ordering = ['-created_at']
        unique_together = ('order_item', 'user')
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['user']),
            models.Index(fields=['is_approved']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.rating}★"


class ReviewImage(TimeStampedModel):
    """Images for reviews"""
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='images')
    image_url = models.URLField()

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Image for Review {self.review.id}"


class ReviewReport(TimeStampedModel):
    """Reports for inappropriate reviews"""
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='reports')
    reported_by = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[('reported', 'Reported'), ('investigating', 'Investigating'), ('resolved', 'Resolved')],
        default='reported'
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report for Review {self.review.id}"


class ReviewResponse(TimeStampedModel):
    """Seller/Admin responses to reviews"""
    review = models.OneToOneField(Review, on_delete=models.CASCADE, related_name='response')
    responded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    response_text = models.TextField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Response to Review {self.review.id}"
