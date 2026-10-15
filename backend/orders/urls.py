"""orders app URLs"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import OrderViewSet

router = SimpleRouter()
# Mounted at /api/v1/orders/ -> list at /api/v1/orders/, detail at /api/v1/orders/<order_number>/
router.register(r'', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]
