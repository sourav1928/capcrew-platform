"""Store-admin API routes (mounted at /api/v1/admin/)."""
from django.urls import path

from . import catalog, dashboard, orders, people, store_settings, uploads, website

urlpatterns = [
    path('me/', dashboard.MeView.as_view()),
    path('dashboard/', dashboard.DashboardView.as_view()),

    path('orders/', orders.OrderListCreateView.as_view()),
    path('orders/bulk-print/', orders.BulkPrintView.as_view()),
    path('orders/<str:order_number>/invoice/', orders.OrderInvoiceView.as_view()),
    path('orders/<str:order_number>/label/', orders.OrderLabelView.as_view()),
    path('orders/<str:order_number>/', orders.OrderDetailView.as_view()),

    path('products/', catalog.ProductListCreateView.as_view()),
    path('products/<uuid:pk>/', catalog.ProductDetailView.as_view()),
    path('categories/', catalog.CategoryListCreateView.as_view()),
    path('categories/<uuid:pk>/', catalog.CategoryDetailView.as_view()),

    path('inventory/', catalog.InventoryListView.as_view()),
    path('inventory/adjust/', catalog.InventoryAdjustView.as_view()),

    path('customers/', people.CustomerListView.as_view()),
    path('customers/<int:pk>/', people.CustomerDetailView.as_view()),

    path('settings/', store_settings.StoreSettingsView.as_view()),
    path('uploads/', uploads.ImageUploadView.as_view()),

    path('banners/', website.BannerListCreateView.as_view()),
    path('banners/<uuid:pk>/', website.BannerDetailView.as_view()),
    path('featured/', website.FeaturedProductsView.as_view()),
    path('pages/', website.PageListView.as_view()),
    path('pages/<slug:slug>/', website.PageDetailView.as_view()),

    path('coupons/', people.CouponListCreateView.as_view()),
    path('coupons/<uuid:pk>/', people.CouponDetailView.as_view()),
]
