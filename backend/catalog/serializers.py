"""
Catalog serializers
"""
from rest_framework import serializers
from .models import Category, Product, ProductVariant, SKU, ProductAttribute, ProductMedia, ProductCompliance


class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'parent', 'children', 'display_order']

    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data


class CategoryListSerializer(serializers.ModelSerializer):
    """Lighter serializer for listing (no recursive children)"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'image_url', 'display_order']


class ProductAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAttribute
        fields = ['id', 'name', 'value', 'unit', 'display_order']


class ProductMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductMedia
        fields = ['id', 'media_type', 'file_url', 'alt_text', 'display_order', 'is_primary']


class ProductComplianceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCompliance
        fields = ['id', 'certification_type', 'certification_number', 'issuing_body', 'valid_from', 'valid_until']


def sku_available_quantity(sku):
    """Units that can be sold. Uses prefetched inventory when available."""
    return sum(max(0, inv.quantity_on_hand - inv.quantity_reserved) for inv in sku.inventory.all())


class SKUSerializer(serializers.ModelSerializer):
    available_quantity = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = SKU
        fields = ['id', 'sku_code', 'base_price', 'mrp', 'status', 'weight_kg', 'available_quantity', 'in_stock']

    def get_available_quantity(self, obj):
        return sku_available_quantity(obj)

    def get_in_stock(self, obj):
        return sku_available_quantity(obj) > 0


class ProductVariantSerializer(serializers.ModelSerializer):
    skus = SKUSerializer(many=True, read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)

    class Meta:
        model = ProductVariant
        fields = ['id', 'name', 'sku', 'description', 'is_active', 'skus', 'media']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    primary_image = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    mrp = serializers.SerializerMethodField()
    sku_code = serializers.SerializerMethodField()
    variant_name = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'short_description', 'brand',
            'category_name', 'category_slug', 'primary_image',
            'min_price', 'mrp', 'sku_code', 'variant_name',
            'in_stock', 'available_quantity', 'status'
        ]

    def _default_sku(self, obj):
        """Cheapest purchasable SKU (in stock preferred) - one SKU drives price, mrp and 'Add to cart'."""
        cache = getattr(obj, '_default_sku_cache', None)
        if cache is not None:
            return cache[0]
        candidates = [
            (sku, variant) for variant in obj.variants.all() if variant.is_active
            for sku in variant.skus.all() if sku.status == 'active'
        ]
        in_stock = [c for c in candidates if sku_available_quantity(c[0]) > 0]
        pool = in_stock or candidates
        best = min(pool, key=lambda c: c[0].base_price) if pool else None
        obj._default_sku_cache = (best,)
        return best

    def get_primary_image(self, obj):
        images = [m for m in obj.media.all() if m.media_type == 'image']
        if not images:
            return None
        primary = next((m for m in images if m.is_primary), images[0])
        return primary.file_url

    def get_min_price(self, obj):
        best = self._default_sku(obj)
        return best[0].base_price if best else None

    def get_mrp(self, obj):
        best = self._default_sku(obj)
        return best[0].mrp if best else None

    def get_sku_code(self, obj):
        best = self._default_sku(obj)
        return best[0].sku_code if best else None

    def get_variant_name(self, obj):
        best = self._default_sku(obj)
        return best[1].name if best else None

    def get_available_quantity(self, obj):
        best = self._default_sku(obj)
        return sku_available_quantity(best[0]) if best else 0

    def get_in_stock(self, obj):
        return self.get_available_quantity(obj) > 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full serializer for product detail page"""
    category = CategoryListSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    attributes = ProductAttributeSerializer(many=True, read_only=True)
    media = ProductMediaSerializer(many=True, read_only=True)
    compliance = ProductComplianceSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'short_description',
            'brand', 'manufacturer', 'country_of_origin', 'status',
            'category', 'variants', 'attributes', 'media', 'compliance',
            'meta_description', 'created_at', 'updated_at'
        ]
