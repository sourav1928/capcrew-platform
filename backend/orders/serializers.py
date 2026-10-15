"""
Orders app serializers
"""
from rest_framework import serializers
from .models import Order, OrderItem, OrderAddress, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items"""
    product_name = serializers.CharField(read_only=True)
    variant_name = serializers.CharField(read_only=True)
    sku_code = serializers.CharField(read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'sku', 'product_name', 'variant_name', 'sku_code',
            'quantity', 'unit_price', 'discount_per_item', 'tax_per_item',
            'line_total', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrderAddressSerializer(serializers.ModelSerializer):
    """Serializer for order addresses"""

    class Meta:
        model = OrderAddress
        fields = [
            'id', 'address_type', 'full_name', 'phone', 'line1', 'line2',
            'city', 'state', 'postal_code', 'country'
        ]


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for order status history"""
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'old_status', 'new_status', 'reason', 'changed_by',
            'changed_by_name', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OrderListSerializer(serializers.ModelSerializer):
    """List view serializer for orders"""
    user_email = serializers.CharField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    payment_method = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user_email', 'status', 'status_display',
            'payment_status', 'payment_status_display', 'payment_method', 'total_items',
            'order_total', 'items', 'created_at', 'confirmed_at'
        ]
        read_only_fields = fields

    def get_payment_method(self, obj):
        payment = getattr(obj, 'payment', None)
        return payment.payment_method if payment else None


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer for orders"""
    items = OrderItemSerializer(many=True, read_only=True)
    billing_address = serializers.SerializerMethodField()
    shipping_address = serializers.SerializerMethodField()
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    fulfillment_status_display = serializers.CharField(source='get_fulfillment_status_display', read_only=True)
    payment = serializers.SerializerMethodField()
    coupon_code = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    needs_payment = serializers.SerializerMethodField()
    prices_include_gst = serializers.SerializerMethodField()
    shipment = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user_email', 'status', 'status_display',
            'payment_status', 'payment_status_display', 'fulfillment_status',
            'fulfillment_status_display', 'total_items', 'subtotal',
            'discount_amount', 'tax_amount', 'shipping_cost', 'order_total',
            'shipping_method', 'notes', 'items', 'billing_address',
            'shipping_address', 'status_history', 'payment', 'coupon_code',
            'can_cancel', 'needs_payment', 'prices_include_gst', 'shipment', 'created_at', 'confirmed_at'
        ]
        read_only_fields = fields

    def get_shipment(self, obj):
        from shipping.utils import serialize_shipment
        return serialize_shipment(getattr(obj, 'shipment', None))

    def get_prices_include_gst(self, obj):
        # GST was added on top only if the total is bigger than goods + delivery
        return (obj.subtotal - obj.discount_amount + obj.shipping_cost) == obj.order_total

    def _address(self, obj, kind):
        snap = next((a for a in obj.addresses.all() if a.address_type == kind), None)
        return OrderAddressSerializer(snap).data if snap else None

    def get_billing_address(self, obj):
        return self._address(obj, 'billing')

    def get_shipping_address(self, obj):
        return self._address(obj, 'shipping')

    def get_payment(self, obj):
        payment = getattr(obj, 'payment', None)
        if not payment:
            return None
        return {'method': payment.payment_method, 'status': payment.status, 'amount': payment.amount}

    def get_coupon_code(self, obj):
        return obj.coupon.code if obj.coupon else None

    def get_can_cancel(self, obj):
        return obj.status in ('pending', 'confirmed', 'processing')

    def get_needs_payment(self, obj):
        payment = getattr(obj, 'payment', None)
        return bool(
            payment and payment.payment_method == 'online'
            and payment.status in ('pending', 'failed') and obj.status == 'pending'
        )
