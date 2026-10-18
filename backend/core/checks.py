"""Safety checks for a live site. They run on `manage.py check`, and the errors stop the server from starting."""
from django.conf import settings
from django.core.checks import Error, Warning, register


def _live():
    return getattr(settings, 'LIVE_SITE', not settings.DEBUG)


@register()
def unsafe_live_settings(app_configs, **kwargs):
    problems = []
    if _live() and getattr(settings, 'ALLOW_MOCK_PAYMENTS', False):
        problems.append(Error(
            'ALLOW_MOCK_PAYMENTS is on while DEBUG is off.',
            hint='Fake payments would let anyone get free orders. Remove ALLOW_MOCK_PAYMENTS from backend/.env.',
            id='capcrew.E001'))
    if _live() and getattr(settings, 'EXPOSE_OTP_IN_RESPONSE', False):
        problems.append(Error(
            'EXPOSE_OTP_IN_RESPONSE is on while DEBUG is off.',
            hint='This would reveal email verification codes to anyone. Remove it from backend/.env.',
            id='capcrew.E002'))
    if getattr(settings, 'ENVIRONMENT', '') == 'production' and not _live():
        problems.append(Error(
            'ENVIRONMENT=production but DEBUG=True.',
            hint='Set DEBUG=False in backend/.env. Debug mode shows internal details to visitors.',
            id='capcrew.E003'))
    return problems


@register(deploy=True)
def live_site_recommendations(app_configs, **kwargs):
    """Extra warnings shown by `python manage.py check --deploy`."""
    notes = []
    if settings.ADMIN_URL == 'admin/':
        notes.append(Warning('The Django admin is at the default address /admin/.',
                             hint='Set DJANGO_ADMIN_URL=some-secret-path/ in backend/.env.', id='capcrew.W001'))
    origins = list(getattr(settings, 'CORS_ALLOWED_ORIGINS', []))
    if any('localhost' in o or '127.0.0.1' in o for o in origins):
        notes.append(Warning('CORS_ALLOWED_ORIGINS / ADMIN_FRONTEND_ORIGINS still list localhost.',
                             hint='Use only your real https:// website addresses.', id='capcrew.W002'))
    hosts = [h for h in settings.ALLOWED_HOSTS if h not in ('localhost', '127.0.0.1', '0.0.0.0', '[::1]')]
    if not hosts:
        notes.append(Warning('ALLOWED_HOSTS only lists local addresses.',
                             hint='Set ALLOWED_HOSTS=api.yourshop.com in backend/.env.', id='capcrew.W003'))
    if settings.PAYMENT_PROVIDER == 'razorpay' and not settings.RAZORPAY_WEBHOOK_SECRET:
        notes.append(Warning('RAZORPAY_WEBHOOK_SECRET is empty.',
                             hint='Without the webhook, a customer who pays but closes the browser leaves an unpaid-looking order.',
                             id='capcrew.W004'))
    if settings.PAYMENT_PROVIDER != 'razorpay':
        notes.append(Warning('PAYMENT_PROVIDER is not razorpay, so online payment is switched off (Cash on Delivery still works).',
                             id='capcrew.W005'))
    if getattr(settings, 'REST_FRAMEWORK', {}).get('NUM_PROXIES', 0) == 0:
        notes.append(Warning('NUM_PROXIES is 0.',
                             hint='Behind nginx set NUM_PROXIES=1, otherwise every visitor looks like the same IP address to the rate limiter.',
                             id='capcrew.W006'))
    if 'FileSystemStorage' in settings.STORAGES.get('default', {}).get('BACKEND', ''):
        notes.append(Warning('Uploaded product photos are saved on this server\'s own disk.',
                             hint='On hosts such as Render the disk is erased on every restart, so photos vanish. '
                                  'Set USE_S3=True and the AWS_* variables (see deploy/DEPLOYMENT.md). '
                                  'Ignore this only on a server with a permanent disk.', id='capcrew.W007'))
    return notes
