"""Sign-up, email codes (OTP) and login, with abuse protection."""
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.email_service import brevo_service
from . import security
from .models import OTP, Profile

logger = logging.getLogger(__name__)

ALLOWED_OTP_PURPOSES = {'email_verification'}


def _fail(message, code=status.HTTP_400_BAD_REQUEST, **extra):
    return Response({'success': False, 'message': message, **extra}, status=code)


def _clean_email(raw):
    return str(raw or '').lower().strip()[:254]


def _valid_email(email):
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False


def _too_many_codes():
    return _fail('Too many wrong codes. Please request a new code and try again.', status.HTTP_429_TOO_MANY_REQUESTS)


class SendOTPView(APIView):
    """Email a 6-digit code to verify an address during sign-up."""
    permission_classes = [AllowAny]
    throttle_classes = [security.OTPSendIPThrottle, security.OTPSendEmailThrottle]

    def post(self, request):
        email = _clean_email(request.data.get('email'))
        purpose = str(request.data.get('purpose') or 'email_verification')

        if not email:
            return _fail('Email is required')
        if not _valid_email(email):
            return _fail('Please enter a valid email address')
        if purpose not in ALLOWED_OTP_PURPOSES:
            return _fail('This kind of code is not supported')
        if User.objects.filter(email__iexact=email).exists():
            return _fail('Email already registered')

        minutes = int(getattr(settings, 'OTP_EXPIRY_MINUTES', 5))
        otp_code = str(secrets.randbelow(900000) + 100000)   # cryptographically secure
        try:
            with transaction.atomic():
                # only the newest code works
                OTP.objects.filter(email=email, purpose=purpose, is_used=False).update(is_used=True, used_at=timezone.now())
                otp = OTP.objects.create(
                    email=email, otp_code=otp_code, purpose=purpose,
                    expires_at=timezone.now() + timedelta(minutes=minutes),
                    ip_address=security.client_ip(request),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:500])
        except Exception:
            logger.exception('Failed to create OTP record')
            return _fail('Failed to generate OTP. Please try again.', status.HTTP_500_INTERNAL_SERVER_ERROR)
        security.otp_attempts_reset(email)

        sent = False
        try:
            result = brevo_service.send_otp_email(email=email, otp=otp_code, user_name=email.split('@')[0].title())
            sent = bool(result and result.get('success'))
        except Exception:
            logger.exception('Exception while sending OTP email')
        # NOTE: the code itself is never written to the logs

        data = {'email': email, 'purpose': purpose, 'expires_in_minutes': minutes}
        if sent:
            return Response({'success': True, 'message': 'OTP sent to your email', 'data': data})
        if settings.EXPOSE_OTP_IN_RESPONSE:
            # Development only: lets you sign up on your own computer without an email service.
            return Response({'success': True,
                             'message': f'Email sending failed - use this code for testing: {otp_code}',
                             'data': {**data, 'otp': otp_code}})
        otp.delete()
        return _fail('We could not send the verification email right now. Please try again in a few minutes.',
                     status.HTTP_503_SERVICE_UNAVAILABLE)


class VerifyOTPView(APIView):
    """Check a code without creating an account."""
    permission_classes = [AllowAny]
    throttle_classes = [security.OTPVerifyIPThrottle]

    def post(self, request):
        email = _clean_email(request.data.get('email'))
        otp_code = str(request.data.get('otp') or '')[:6]
        purpose = str(request.data.get('purpose') or 'email_verification')
        if not email or not otp_code:
            return _fail('Email and OTP are required')
        if security.otp_attempts_exceeded(email):
            return _too_many_codes()

        otp = OTP.objects.filter(email=email, otp_code=otp_code, purpose=purpose, is_used=False).order_by('-created_at').first()
        if otp is None:
            security.otp_attempt_failed(email)
            return _fail('Invalid OTP')
        if not otp.is_valid():
            return _fail('OTP has expired')

        otp.mark_as_used()
        security.otp_attempts_reset(email)
        return Response({'success': True, 'message': 'OTP verified successfully',
                         'data': {'email': email, 'verified': True}})


class RegisterView(APIView):
    """Create an account. The email code and the password arrive together and are checked in this one request."""
    permission_classes = [AllowAny]
    throttle_classes = [security.RegisterIPThrottle, security.OTPVerifyIPThrottle]

    def post(self, request):
        email = _clean_email(request.data.get('email'))
        password = str(request.data.get('password') or '')
        otp_code = str(request.data.get('otp') or '')[:6]
        first_name = str(request.data.get('first_name') or '').strip()[:150]
        last_name = str(request.data.get('last_name') or '').strip()[:150]

        if not (email and password and otp_code):
            return _fail('Email, password, and OTP are required')
        if not _valid_email(email):
            return _fail('Please enter a valid email address')
        try:   # the same strength rules the Django admin uses (length, common passwords, similarity...)
            validate_password(password, user=User(username=email, email=email, first_name=first_name, last_name=last_name))
        except ValidationError as exc:
            return _fail(' '.join(exc.messages), errors=list(exc.messages))
        if security.otp_attempts_exceeded(email):
            return _too_many_codes()

        otp = OTP.objects.filter(email=email, otp_code=otp_code, purpose='email_verification',
                                 is_used=False).order_by('-created_at').first()
        if otp is None:
            security.otp_attempt_failed(email)
            return _fail('OTP not verified or invalid')
        if not otp.is_valid():
            return _fail('OTP has expired. Please request a new one.')
        if User.objects.filter(email__iexact=email).exists():
            return _fail('Email already registered')

        try:
            with transaction.atomic():
                user = User.objects.create_user(username=email, email=email, password=password,
                                                first_name=first_name, last_name=last_name)
                Profile.objects.create(user=user, is_email_verified=True)
                otp.mark_as_used()
        except IntegrityError:
            return _fail('Email already registered')
        except Exception:
            logger.exception('Registration error')
            return _fail('Registration failed', status.HTTP_500_INTERNAL_SERVER_ERROR)

        security.otp_attempts_reset(email)
        token = str(RefreshToken.for_user(user).access_token)
        return Response({
            'success': True, 'message': 'Registration successful', 'token': token,
            'data': {'id': user.id, 'email': user.email, 'first_name': user.first_name,
                     'last_name': user.last_name, 'username': user.username},
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Log in with email and password."""
    permission_classes = [AllowAny]
    throttle_classes = [security.LoginIPThrottle]

    def post(self, request):
        email = _clean_email(request.data.get('email'))
        password = str(request.data.get('password') or '')
        if not email or not password:
            return _fail('Email and password are required')

        ip = security.client_ip(request) or 'unknown'
        if security.login_blocked(email, ip):
            response = _fail('Too many failed attempts. Please wait 15 minutes and try again.',
                             status.HTTP_429_TOO_MANY_REQUESTS)
            response['Retry-After'] = str(security.LOGIN_LOCK_SECONDS)
            return response

        user = authenticate(request, username=email, password=password)
        if user is None:
            security.login_failed(email, ip)
            logger.warning('Failed login attempt from %s', ip)
            return _fail('Invalid email or password', status.HTTP_401_UNAUTHORIZED)

        security.login_succeeded(email, ip)
        token = str(RefreshToken.for_user(user).access_token)
        return Response({
            'success': True, 'message': 'Login successful', 'token': token,
            'data': {'id': user.id, 'email': user.email, 'first_name': user.first_name,
                     'last_name': user.last_name, 'username': user.username, 'is_staff': user.is_staff},
        })
