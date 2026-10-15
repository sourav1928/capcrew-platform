"""cms app URLs"""
from django.urls import path

from .views import HomeContentView, PublicPageView

urlpatterns = [
    path("home/", HomeContentView.as_view()),
    path("pages/<slug:slug>/", PublicPageView.as_view()),
]
