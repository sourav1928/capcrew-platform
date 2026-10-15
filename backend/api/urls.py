"""Main API URLs"""
from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response

class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({
            'status': 'ok',
            'version': '1.0.0',
            'message': 'E-Commerce Platform API'
        })

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
]
