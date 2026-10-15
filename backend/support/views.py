"""Support views: public contact form."""
import logging

from django.conf import settings
from django.core.mail import EmailMessage
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import ContactMessage
from .serializers import ContactMessageSerializer

logger = logging.getLogger(__name__)

THANKS = 'Thank you! We have received your message and will reply by email within 24 hours.'


class ContactThrottle(AnonRateThrottle):
    scope = 'contact'
    rate = '5/hour'  # stops one visitor from flooding the inbox


class ContactView(APIView):
    """POST /api/v1/support/contact/ - saves the message and emails the store owner."""
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle]

    def post(self, request):
        ser = ContactMessageSerializer(data=request.data)
        if not ser.is_valid():
            first = next(iter(ser.errors.values()))[0]
            return Response({'success': False, 'message': str(first), 'errors': ser.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        if data.get('website'):  # honeypot filled -> pretend success, store nothing
            return Response({'success': True, 'message': THANKS}, status=status.HTTP_201_CREATED)

        ContactMessage.objects.create(
            name=data['name'].strip(), email=data['email'], subject=data['subject'].strip(), message=data['message'].strip())
        try:  # the message is already saved, so an email hiccup must not lose it
            EmailMessage(
                subject=f"[{getattr(settings, 'BUSINESS_NAME', 'Store')}] Contact form: {data['subject'] or 'New message'}",
                body=f"From: {data['name']} <{data['email']}>\n\n{data['message']}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[settings.BUSINESS_EMAIL],
                reply_to=[data['email']],
            ).send(fail_silently=False)
        except Exception:
            logger.exception('Could not email a contact-form message (it was saved)')
        return Response({'success': True, 'message': THANKS}, status=status.HTTP_201_CREATED)
