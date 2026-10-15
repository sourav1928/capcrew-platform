"""Saved address endpoints for the logged-in customer."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .address_utils import AddressValidationError, clean_address, find_or_create_address, INDIAN_STATES
from .models import Address


def _serialize(a):
    return {
        'id': str(a.id), 'full_name': a.full_name, 'phone': a.phone, 'line1': a.line1,
        'line2': a.line2, 'city': a.city, 'state': a.state, 'postal_code': a.postal_code,
        'country': a.country, 'is_default': a.is_default,
    }


class AddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = Address.objects.filter(user=request.user)
        return Response({
            'success': True,
            'data': [_serialize(a) for a in addresses],
            'states': INDIAN_STATES,
        })

    def post(self, request):
        try:
            cleaned = clean_address(request.data)
        except AddressValidationError as exc:
            return Response({'success': False, 'message': str(exc), 'errors': exc.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        address = find_or_create_address(request.user, cleaned)
        return Response({'success': True, 'data': _serialize(address)}, status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, address_id):
        address = Address.objects.filter(user=request.user, id=address_id).first()
        if not address:
            return Response({'success': False, 'message': 'Address not found'},
                            status=status.HTTP_404_NOT_FOUND)
        was_default = address.is_default
        address.soft_delete()
        if was_default:
            nxt = Address.objects.filter(user=request.user).first()
            if nxt:
                nxt.is_default = True
                nxt.save(update_fields=['is_default', 'updated_at'])
        return Response({'success': True, 'message': 'Address removed'})
