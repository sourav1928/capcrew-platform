"""
Base models with common fields
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid


class TimeStampedModel(models.Model):
    """
    An abstract base model that provides self-updating
    ``created`` and ``modified`` fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class SoftDeleteModel(TimeStampedModel):
    """
    Model with soft delete functionality
    """
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()


class ActiveQuerySet(models.QuerySet):
    """QuerySet that excludes soft-deleted items by default"""

    def active(self):
        return self.filter(is_deleted=False)

    def deleted(self):
        return self.filter(is_deleted=True)


class ActiveManager(models.Manager):
    """Manager that excludes soft-deleted items by default"""

    def get_queryset(self):
        return ActiveQuerySet(self.model, using=self._db).active()

    def all_with_deleted(self):
        return ActiveQuerySet(self.model, using=self._db)


def payments_available():
    """Online payment can only be offered when a real gateway is set up (or fake payments are allowed in development)."""
    from django.conf import settings
    provider = getattr(settings, 'PAYMENT_PROVIDER', 'mock')
    if provider == 'razorpay':
        return bool(getattr(settings, 'RAZORPAY_KEY_ID', '') and getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
    return provider == 'mock' and bool(getattr(settings, 'ALLOW_MOCK_PAYMENTS', False))


class StoreConfig(models.Model):
    """
    Store-wide settings the owner can change from the admin panel (single row, id=1).
    Anything a shop owner may want to change without touching code lives here.
    """
    # Tax
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18)
    prices_include_gst = models.BooleanField(
        default=True, help_text='On: listed prices already include GST. Off: GST is added at checkout.')
    # Delivery
    free_shipping_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=500)
    shipping_flat_fee = models.DecimalField(max_digits=10, decimal_places=2, default=50)
    # Payments
    cod_enabled = models.BooleanField(default=True)
    cod_max_order_value = models.DecimalField(max_digits=12, decimal_places=2, default=100000)
    online_payments_enabled = models.BooleanField(default=True)
    # Cart
    max_qty_per_item = models.PositiveIntegerField(default=10)
    # Contact details shown in the website footer
    support_email = models.EmailField(blank=True, default='support@capcrew.com')
    support_phone = models.CharField(max_length=30, blank=True, default='+91 98765 43210')
    store_address = models.CharField(max_length=300, blank=True, default='CapCrew Inc., Bangalore, India')
    # Business details printed on invoices
    legal_name = models.CharField(max_length=200, blank=True, default='')
    gstin = models.CharField(max_length=20, blank=True, default='')
    business_state = models.CharField(max_length=60, blank=True, default='')
    invoice_note = models.CharField(max_length=300, blank=True, default='Thank you for shopping with us!')
    # Banner across the top of the website
    announcement_enabled = models.BooleanField(default=False)
    announcement_text = models.CharField(max_length=200, blank=True, default='')

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'auth.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        verbose_name = 'Store settings'
        verbose_name_plural = 'Store settings'

    def __str__(self):
        return 'Store settings'

    @classmethod
    def load(cls):
        """The single settings row (created with sensible defaults on first use)."""
        obj = cls.objects.filter(pk=1).first()
        if obj:
            return obj
        from django.conf import settings
        obj, _ = cls.objects.get_or_create(pk=1, defaults={
            'gst_percent': getattr(settings, 'GST_PERCENT', 18),
            'free_shipping_threshold': getattr(settings, 'FREE_SHIPPING_THRESHOLD', 500),
            'shipping_flat_fee': getattr(settings, 'SHIPPING_FLAT_FEE', 50),
            'cod_enabled': getattr(settings, 'ENABLE_COD', True),
            'cod_max_order_value': getattr(settings, 'MAX_COD_ORDER_VALUE', 100000),
            'max_qty_per_item': getattr(settings, 'MAX_QTY_PER_ITEM', 10),
        })
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1  # always exactly one row
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):  # never allow deleting the only settings row
        pass

    def public_dict(self):
        """What the shop front-end is allowed to know."""
        return {
            'gst_percent': str(self.gst_percent),
            'prices_include_gst': self.prices_include_gst,
            'free_shipping_threshold': str(self.free_shipping_threshold),
            'shipping_flat_fee': str(self.shipping_flat_fee),
            'cod_enabled': self.cod_enabled,
            'cod_max_order_value': str(self.cod_max_order_value),
            'online_payments_enabled': self.online_payments_enabled and payments_available(),
            'max_qty_per_item': self.max_qty_per_item,
            'support_email': self.support_email,
            'support_phone': self.support_phone,
            'store_address': self.store_address,
            'store_name': self.legal_name,
            'announcement': self.announcement_text if self.announcement_enabled and self.announcement_text.strip() else '',
        }
