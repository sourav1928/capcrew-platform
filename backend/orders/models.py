"""
Orders app models
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel
from decimal import Decimal


class Order(TimeStampedModel):
    """Customer orders"""
    ORDER_STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('return_requested', 'Return Requested'),
        ('returned', 'Returned'),
    ]

    PAYMENT_STATUS = [
        ('pending', 'Pending'),
        ('authorized', 'Authorized'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]

    FULFILLMENT_STATUS = [
        ('pending', 'Pending'),
        ('picking', 'Picking'),
        ('packing', 'Packing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
    ]

    order_number = models.CharField(max_length=50, unique=True, db_index=True)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    status = models.CharField(max_length=20, choices=ORDER_STATUS, default='pending', db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    fulfillment_status = models.CharField(max_length=20, choices=FULFILLMENT_STATUS, default='pending')

    total_items = models.PositiveIntegerField(default=0)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    order_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    billing_address = models.ForeignKey(
        'accounts.Address',
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders_billing'
    )
    shipping_address = models.ForeignKey(
        'accounts.Address',
        on_delete=models.SET_NULL,
        null=True,
        related_name='orders_shipping'
    )

    shipping_method = models.CharField(max_length=100, blank=True)
    coupon = models.ForeignKey(
        'coupons.Coupon',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    notes = models.TextField(blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Order {self.order_number}"


class OrderItem(TimeStampedModel):
    """Individual items in an order (with snapshots)"""
    from catalog.models import SKU

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    sku = models.ForeignKey(SKU, on_delete=models.SET_NULL, null=True)

    # Snapshots (historical data)
    product_name = models.CharField(max_length=255)
    variant_name = models.CharField(max_length=255, blank=True)
    sku_code = models.CharField(max_length=100)

    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_per_item = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_per_item = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['sku']),
        ]

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"


class OrderAddress(TimeStampedModel):
    """Address snapshot for an order"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='addresses')
    address_type = models.CharField(max_length=10, choices=[('billing', 'Billing'), ('shipping', 'Shipping')])
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    line1 = models.CharField(max_length=255)
    line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2, default='IN')

    class Meta:
        ordering = ['address_type']
        unique_together = ('order', 'address_type')

    def __str__(self):
        return f"{self.full_name}, {self.city} ({self.address_type})"


class OrderStatusHistory(TimeStampedModel):
    """Track order status changes"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_history')
    old_status = models.CharField(max_length=20, null=True, blank=True)
    new_status = models.CharField(max_length=20)
    reason = models.CharField(max_length=255, blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Order Status Histories'
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.order.order_number}: {self.old_status} → {self.new_status}"
