"""
Core middleware for request tracking, security headers, etc.
"""

import uuid
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger(__name__)


class RequestIDMiddleware(MiddlewareMixin):
    """Add unique request ID to all requests for tracing"""

    def process_request(self, request):
        request.request_id = str(uuid.uuid4())
        return None

    def process_response(self, request, response):
        request_id = getattr(request, 'request_id', 'unknown')
        response['X-Request-ID'] = request_id
        return response


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Adds browser security headers to every response."""

    DOC_PREFIXES = ('/api/v1/docs/', '/api/v1/redoc/', '/api/v1/schema/')

    def process_response(self, request, response):
        response['X-Content-Type-Options'] = 'nosniff'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

        path = request.path
        if path.startswith('/api/') and not path.startswith(self.DOC_PREFIXES):
            # API replies are data, never web pages: forbid scripts, framing and embedding outright
            response.setdefault('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")

        # Anything personal (logged-in requests, login/sign-up replies) must never be stored by browsers or proxies
        if request.META.get('HTTP_AUTHORIZATION') or path.startswith('/api/v1/auth/'):
            response.setdefault('Cache-Control', 'private, no-store')
        return response


class AdminLoginThrottleMiddleware:
    """Stops password guessing on the Django admin login page: 10 tries per 15 minutes per visitor."""

    LIMIT = 10
    WINDOW = 15 * 60

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        if request.method == 'POST' and request.path == f'/{settings.ADMIN_URL}login/':
            from accounts import security
            ip = security.client_ip(request) or 'unknown'
            if security._hit('admin_login:' + security._h(ip), self.WINDOW) > self.LIMIT:
                from django.http import HttpResponse
                response = HttpResponse('Too many login attempts. Please wait 15 minutes.', status=429, content_type='text/plain')
                response['Retry-After'] = str(self.WINDOW)
                return response
        return self.get_response(request)
