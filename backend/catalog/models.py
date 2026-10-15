"""
Catalog app models for products, categories, and variants
"""

from django.db import models
from django.utils.text import slugify
from core.models import TimeStampedModel, SoftDeleteModel, ActiveManager
import uuid


class Category(TimeStampedModel):
    """Product categories with hierarchical structure"""
    name = models.CharField(max_length=255, unique=True, db_index=True)
    slug = models.SlugField(unique=True, max_length=255, db_index=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='children'
    )
    image_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True, db_index=True)
    display_order = models.PositiveIntegerField(default=0)
    meta_description = models.CharField(max_length=255, blank=True)
    meta_keywords = models.CharField(max_length=255, blank=True)

    objects = models.Manager()

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Product(SoftDeleteModel):
    """Products in the catalog"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('discontinued', 'Discontinued'),
    ]

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    name = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True)
    brand = models.CharField(max_length=255, blank=True, db_index=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    country_of_origin = models.CharField(max_length=2, default='IN', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    meta_description = models.CharField(max_length=255, blank=True)
    meta_keywords = models.CharField(max_length=255, blank=True)

    objects = ActiveManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['category']),
            models.Index(fields=['status']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['brand']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ProductVariant(TimeStampedModel):
    """Variants of a product (size, color, configuration, etc.)"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=255)  # e.g., "Black - Adjustable"
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['product', 'name']
        unique_together = ('product', 'sku')
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['sku']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.name}"


class SKU(TimeStampedModel):
    """Stock keeping unit with pricing"""
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='skus')
    sku_code = models.CharField(max_length=100, unique=True, db_index=True)
    barcode = models.CharField(max_length=100, unique=True, null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Maximum Retail Price')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=[('active', 'Active'), ('inactive', 'Inactive')],
        default='active',
        db_index=True
    )
    weight_kg = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)

    class Meta:
        ordering = ['variant', 'sku_code']
        indexes = [
            models.Index(fields=['sku_code']),
            models.Index(fields=['variant']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return self.sku_code


class ProductAttribute(TimeStampedModel):
    """Flexible attributes for products"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='attributes')
    name = models.CharField(max_length=255)  # e.g., "Material", "Brim", "Closure"
    value = models.CharField(max_length=255)  # e.g., "Cotton Twill", "Curved", "Buckle strap"
    unit = models.CharField(max_length=50, blank=True)  # e.g., "cm", ""
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['product', 'display_order', 'name']
        verbose_name_plural = 'Product Attributes'
        indexes = [
            models.Index(fields=['product']),
        ]

    def __str__(self):
        return f"{self.name}: {self.value} {self.unit}".strip()


class ProductMedia(TimeStampedModel):
    """Images, videos, PDFs for products"""
    MEDIA_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('pdf', 'PDF'),
        ('manual', 'Manual'),
        ('certificate', 'Certificate'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='media')
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.CASCADE,
        related_name='media',
        null=True,
        blank=True
    )
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES, db_index=True)
    file_url = models.URLField()
    alt_text = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_primary = models.BooleanField(default=False)

    class Meta:
        ordering = ['product', 'display_order']
        verbose_name_plural = 'Product Media'
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['media_type']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.media_type}"


class ProductCompliance(TimeStampedModel):
    """Compliance information for products (certifications, etc.)"""
    CERTIFICATION_TYPES = [
        ('bis', 'BIS'),
        ('isc', 'ISC'),
        ('iso', 'ISO'),
        ('qco', 'QCO'),
        ('other', 'Other'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='compliance')
    certification_type = models.CharField(max_length=20, choices=CERTIFICATION_TYPES, db_index=True)
    certification_number = models.CharField(max_length=100, unique=True)
    certificate_url = models.URLField(blank=True, null=True)
    issuing_body = models.CharField(max_length=255)
    valid_from = models.DateField()
    valid_until = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['product', '-valid_from']
        verbose_name_plural = 'Product Compliance'
        indexes = [
            models.Index(fields=['product']),
            models.Index(fields=['certification_type']),
        ]

    def __str__(self):
        return f"{self.product.name} - {self.certification_type}"
