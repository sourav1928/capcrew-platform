# Create your views here.


from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StoreConfig


class StoreConfigPublicView(APIView):
    """Public store settings the website needs (tax, delivery, COD, contact, banner)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        response = Response({'success': True, 'data': StoreConfig.load().public_dict()})
        response['Cache-Control'] = 'no-cache'
        return response
