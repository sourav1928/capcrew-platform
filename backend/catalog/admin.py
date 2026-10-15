"""Catalog admin"""
from django.contrib import admin
from .models import Category, Product, ProductVariant, SKU, ProductAttribute, ProductMedia, ProductCompliance


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'display_order']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['display_order', 'name']


class ProductAttributeInline(admin.TabularInline):
    model = ProductAttribute
    extra = 3


class ProductMediaInline(admin.TabularInline):
    model = ProductMedia
    extra = 2


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'category', 'brand', 'status', 'created_at']
    list_filter = ['status', 'category', 'brand', 'is_deleted']
    search_fields = ['name', 'slug', 'brand', 'description']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductAttributeInline, ProductMediaInline, ProductVariantInline]
    ordering = ['-created_at']


class SKUInline(admin.TabularInline):
    model = SKU
    extra = 1


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['product', 'name', 'sku', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'sku', 'product__name']
    inlines = [SKUInline]


@admin.register(SKU)
class SKUAdmin(admin.ModelAdmin):
    list_display = ['sku_code', 'variant', 'base_price', 'mrp', 'status']
    list_filter = ['status']
    search_fields = ['sku_code', 'barcode']


@admin.register(ProductCompliance)
class ProductComplianceAdmin(admin.ModelAdmin):
    list_display = ['product', 'certification_type', 'certification_number', 'valid_from', 'valid_until']
    list_filter = ['certification_type']
    search_fields = ['product__name', 'certification_number']
