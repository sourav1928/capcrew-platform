"""Shared helpers for the store-admin API."""
from decimal import Decimal, InvalidOperation

from django.core.paginator import EmptyPage, Paginator
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission
from rest_framework.response import Response


class IsStoreStaff(BasePermission):
    """Only logged-in staff members (is_staff) may use the admin API."""
    message = 'You do not have permission to use the admin panel.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.is_staff)


def paginate(queryset, request, serializer, default_size=20):
    try:
        size = max(1, min(int(request.query_params.get('page_size', default_size)), 100))
        page_no = max(1, int(request.query_params.get('page', 1)))
    except (TypeError, ValueError):
        size, page_no = default_size, 1
    paginator = Paginator(queryset, size)
    try:
        page = paginator.page(page_no)
    except EmptyPage:
        page = paginator.page(paginator.num_pages)
    return Response({
        'success': True,
        'count': paginator.count,
        'page': page.number,
        'pages': paginator.num_pages,
        'page_size': size,
        'results': [serializer(obj) for obj in page.object_list],
    })


def ok(data=None, message='', status=200):
    body = {'success': True}
    if message:
        body['message'] = message
    if data is not None:
        body['data'] = data
    return Response(body, status=status)


def fail(message, status=400, errors=None):
    body = {'success': False, 'message': message}
    if errors:
        body['errors'] = errors
    return Response(body, status=status)


def to_decimal(value, field, errors, minimum=Decimal('0'), required=True):
    if value in (None, ''):
        if required:
            errors[field] = 'This field is required'
        return None
    try:
        number = Decimal(str(value)).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        errors[field] = 'Enter a valid number'
        return None
    if number < minimum:
        errors[field] = f'Must be at least {minimum}'
        return None
    return number


def to_int(value, field, errors, minimum=0, required=True):
    if value in (None, ''):
        if required:
            errors[field] = 'This field is required'
        return None
    try:
        number = int(value)
    except (TypeError, ValueError):
        errors[field] = 'Enter a whole number'
        return None
    if number < minimum:
        errors[field] = f'Must be at least {minimum}'
        return None
    return number


def raise_if(errors, message='Please correct the highlighted fields.'):
    if errors:
        raise ValidationError({'success': False, 'message': message, 'errors': errors})
