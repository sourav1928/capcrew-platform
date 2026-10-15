from django.urls import path

from .views import StoreConfigPublicView

urlpatterns = [
    path('config/', StoreConfigPublicView.as_view(), name='store-config'),
]
