"""accounts app URLs"""
from django.urls import path
from .views import SendOTPView, VerifyOTPView, RegisterView, LoginView
from .address_views import AddressListCreateView, AddressDetailView

urlpatterns = [
    path('send-otp/', SendOTPView.as_view(), name='send-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('addresses/', AddressListCreateView.as_view(), name='addresses'),
    path('addresses/<uuid:address_id>/', AddressDetailView.as_view(), name='address-detail'),
]


