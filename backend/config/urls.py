"""
URL configuration for CapCrew platform.
"""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django admin (address is configurable: DJANGO_ADMIN_URL in backend/.env)
    path(settings.ADMIN_URL, admin.site.urls),

    # API v1
    path('api/v1/', include('api.urls')),

    # Apps
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/catalog/', include('catalog.urls')),
    path('api/v1/cart/', include('cart.urls')),
    path('api/v1/wishlist/', include('wishlist.urls')),
    path('api/v1/checkout/', include('checkout.urls')),
    path('api/v1/orders/', include('orders.urls')),
    path('api/v1/payments/', include('payments.urls')),
    path('api/v1/shipping/', include('shipping.urls')),
    path('api/v1/returns/', include('returns.urls')),
    path('api/v1/refunds/', include('refunds.urls')),
    path('api/v1/warranty/', include('warranty.urls')),
    path('api/v1/reviews/', include('reviews.urls')),
    path('api/v1/coupons/', include('coupons.urls')),
    path('api/v1/support/', include('support.urls')),
    path('api/v1/cms/', include('cms.urls')),
    path('api/v1/invoices/', include('invoicing.urls')),
    path('api/v1/analytics/', include('analytics.urls')),
    path('api/v1/admin/', include('adminapi.urls')),
    path('api/v1/store/', include('core.urls')),
]

# API documentation pages: development only (ENABLE_API_DOCS=True to turn on elsewhere)
if settings.ENABLE_API_DOCS:
    urlpatterns += [
        path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
        path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema')),
    ]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
