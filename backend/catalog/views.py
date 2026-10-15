"""
Catalog views
"""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as django_filters
from django.db.models import Prefetch
from inventory.models import Inventory

from .models import Category, Product
from .serializers import (
    CategorySerializer, CategoryListSerializer,
    ProductListSerializer, ProductDetailSerializer
)


class ProductFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(method='filter_min_price')
    max_price = django_filters.NumberFilter(method='filter_max_price')
    category = django_filters.CharFilter(field_name='category__slug')
    brand = django_filters.CharFilter(field_name='brand', lookup_expr='icontains')

    class Meta:
        model = Product
        fields = ['category', 'brand', 'status']

    def filter_min_price(self, queryset, name, value):
        return queryset.filter(variants__skus__base_price__gte=value).distinct()

    def filter_max_price(self, queryset, name, value):
        return queryset.filter(variants__skus__base_price__lte=value).distinct()


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'display_order']
    ordering = ['display_order']

    def get_queryset(self):
        # Return only root categories (no parent) by default
        if self.action == 'list':
            return Category.objects.filter(parent=None, is_active=True)
        return Category.objects.filter(is_active=True)

    def get_serializer_class(self):
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @action(detail=False, methods=['get'])
    def all(self, request):
        """Return all categories flat"""
        categories = Category.objects.filter(is_active=True)
        serializer = CategoryListSerializer(categories, many=True)
        return Response(serializer.data)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = 'slug'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'short_description', 'brand', 'variants__sku']
    ordering_fields = ['name', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        return Product.objects.filter(
            status='active',
            is_deleted=False
        ).select_related('category').prefetch_related(
            'variants__skus',
            Prefetch(
                'variants__skus__inventory',
                queryset=Inventory.objects.filter(warehouse__is_active=True),
            ),
            'media',
            'attributes',
            'compliance'
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductDetailSerializer

    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Return featured products"""
        products = self.get_queryset()[:8]
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Return products filtered by category slug"""
        slug = request.query_params.get('slug')
        if not slug:
            return Response({'error': 'slug parameter required'}, status=400)
        products = self.get_queryset().filter(category__slug=slug)
        serializer = ProductListSerializer(products, many=True)
        return Response(serializer.data)
