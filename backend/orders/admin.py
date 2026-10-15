"""Admin configuration"""
from django.contrib import admin
from .models import Order, OrderItem, OrderAddress, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    """Inline admin for order items"""
    model = OrderItem
    fields = ['product_name', 'variant_name', 'sku_code', 'quantity', 'unit_price', 'line_total']
    readonly_fields = ['product_name', 'variant_name', 'sku_code', 'created_at']
    extra = 0


class OrderAddressInline(admin.TabularInline):
    """Inline admin for order addresses"""
    model = OrderAddress
    fields = ['address_type', 'full_name', 'phone', 'line1', 'city', 'state', 'postal_code']
    extra = 0


class OrderStatusHistoryInline(admin.TabularInline):
    """Inline admin for order status history"""
    model = OrderStatusHistory
    fields = ['old_status', 'new_status', 'reason', 'changed_by', 'created_at']
    readonly_fields = ['old_status', 'new_status', 'changed_by', 'created_at']
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    """Admin for orders"""
    list_display = ['order_number', 'user', 'status', 'payment_status', 'order_total', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at']
    search_fields = ['order_number', 'user__email', 'user__first_name']
    readonly_fields = ['order_number', 'created_at', 'updated_at', 'confirmed_at']

    fieldsets = (
        ('Order Info', {
            'fields': ('order_number', 'user', 'created_at', 'updated_at', 'confirmed_at')
        }),
        ('Status', {
            'fields': ('status', 'payment_status', 'fulfillment_status')
        }),
        ('Totals', {
            'fields': ('total_items', 'subtotal', 'discount_amount', 'tax_amount', 'shipping_cost', 'order_total')
        }),
        ('Shipping', {
            'fields': ('shipping_method', 'billing_address', 'shipping_address')
        }),
        ('Additional', {
            'fields': ('coupon', 'notes'),
            'classes': ('collapse',)
        }),
    )

    inlines = [OrderItemInline, OrderAddressInline, OrderStatusHistoryInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    """Admin for order items"""
    list_display = ['product_name', 'variant_name', 'quantity', 'unit_price', 'line_total', 'order']
    list_filter = ['created_at']
    search_fields = ['product_name', 'sku_code', 'order__order_number']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(OrderAddress)
class OrderAddressAdmin(admin.ModelAdmin):
    """Admin for order addresses"""
    list_display = ['order', 'address_type', 'full_name', 'city', 'state']
    list_filter = ['address_type']
    search_fields = ['order__order_number', 'full_name', 'city']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    """Admin for order status history"""
    list_display = ['order', 'old_status', 'new_status', 'changed_by', 'created_at']
    list_filter = ['created_at', 'new_status']
    search_fields = ['order__order_number', 'reason']
    readonly_fields = ['created_at', 'updated_at']
