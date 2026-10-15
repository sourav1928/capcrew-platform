"""
Inventory app models for stock management
"""

from django.db import models
from django.contrib.auth.models import User
from core.models import TimeStampedModel, ActiveManager
from decimal import Decimal


class Warehouse(TimeStampedModel):
    """Physical warehouses for inventory"""
    name = models.CharField(max_length=255, db_index=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=2, default='IN')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Inventory(TimeStampedModel):
    """Stock levels by warehouse"""
    from catalog.models import SKU

    sku = models.ForeignKey(SKU, on_delete=models.CASCADE, related_name='inventory')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='inventory')
    quantity_on_hand = models.PositiveIntegerField(default=0)
    quantity_reserved = models.PositiveIntegerField(default=0)
    quantity_damaged = models.PositiveIntegerField(default=0)
    last_counted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('sku', 'warehouse')
        ordering = ['sku', 'warehouse']
        verbose_name_plural = 'Inventory'
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['warehouse']),
        ]

    def __str__(self):
        return f"{self.sku.sku_code} @ {self.warehouse.code}"

    @property
    def quantity_available(self):
        """Available quantity = on_hand - reserved"""
        return max(0, self.quantity_on_hand - self.quantity_reserved)

    def can_reserve(self, quantity):
        """Check if quantity can be reserved"""
        return self.quantity_available >= quantity


class InventoryTransaction(TimeStampedModel):
    """Audit trail of inventory changes"""
    TRANSACTION_TYPES = [
        ('purchase', 'Purchase'),
        ('sale', 'Sale'),
        ('return', 'Return'),
        ('damage', 'Damage'),
        ('adjustment', 'Adjustment'),
        ('transfer', 'Transfer'),
        ('reservation', 'Reservation'),
        ('release', 'Release'),
    ]

    inventory = models.ForeignKey(Inventory, on_delete=models.PROTECT, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    quantity_change = models.IntegerField()  # Can be negative
    reference_type = models.CharField(max_length=50, blank=True)  # order, return, purchase_order
    reference_id = models.CharField(max_length=100, blank=True, db_index=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['inventory']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.inventory.sku.sku_code} - {self.transaction_type} ({self.quantity_change})"


class StockReservation(TimeStampedModel):
    """Reserved stock for cart items"""
    RESERVATION_STATUS = [
        ('reserved', 'Reserved'),
        ('confirmed', 'Confirmed'),
        ('released', 'Released'),
        ('expired', 'Expired'),
    ]

    from catalog.models import SKU

    sku = models.ForeignKey(SKU, on_delete=models.CASCADE, related_name='reservations')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT)
    cart_item = models.OneToOneField(
        'cart.CartItem',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_reservation'
    )
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stock_reservations'
    )
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=RESERVATION_STATUS, default='reserved', db_index=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['warehouse']),
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"Reservation: {self.sku.sku_code} x{self.quantity} ({self.status})"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at
