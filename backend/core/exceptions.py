"""
Custom exception handler for REST API
"""

from rest_framework.exceptions import Throttled
from rest_framework.views import exception_handler
from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error responses
    """
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception - log it
        logger.error(
            f"Unhandled exception in {context['view'].__class__.__name__}",
            exc_info=True
        )
        return Response(
            {
                'success': False,
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'An internal server error occurred',
                    'details': {}
                }
            },
            status=500
        )

    # The website shows `message`; DRF's built-in errors only carry `detail`. Provide both.
    if isinstance(response.data, dict) and 'message' not in response.data and 'detail' in response.data:
        if isinstance(exc, Throttled):
            wait = int(exc.wait or 60)
            when = f'{max(1, round(wait / 60))} minute(s)' if wait >= 60 else f'{wait} seconds'
            response.data['message'] = f'Too many attempts. Please wait {when} and try again.'
        else:
            response.data['message'] = str(response.data['detail'])
        response.data.setdefault('success', False)

    # Format the error response
    if response.status_code >= 500:
        logger.error(f"Server error: {response.data}", exc_info=True)

    return response
