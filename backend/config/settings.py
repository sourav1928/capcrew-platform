"""
Django settings for CapCrew platform.
Supports development, testing, staging, and production environments.
"""

import os
import socket
import sys
from pathlib import Path
from datetime import timedelta
from urllib.parse import urlparse

import environ
from django.core.exceptions import ImproperlyConfigured

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Initialize environment
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env')

# Security
SECRET_KEY = env('DJANGO_SECRET_KEY', default='dev-insecure-key-change-in-production')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1', '0.0.0.0'])

# Environment
ENVIRONMENT = env('ENVIRONMENT', default='development')
IS_TESTING = 'test' in sys.argv or bool(os.environ.get('PYTEST_CURRENT_TEST'))

# Refuse to start a live site with a missing or weak secret key (it signs every login token)
if not DEBUG and not IS_TESTING and (SECRET_KEY.startswith('dev-insecure') or len(SECRET_KEY) < 40):
    raise ImproperlyConfigured(
        'DJANGO_SECRET_KEY is missing or too short. Put a long random value in backend/.env '
        'before running with DEBUG=False.'
    )

# True when this is a real (non-debug) site as configured in .env. (Django's test runner flips settings.DEBUG, this stays put.)
LIVE_SITE = not DEBUG

# ---- Switches that must be OFF on a live site (they default to ON only while DEBUG=True) ----
ALLOW_MOCK_PAYMENTS = env.bool('ALLOW_MOCK_PAYMENTS', default=DEBUG)        # fake "payments" that always succeed
EXPOSE_OTP_IN_RESPONSE = env.bool('EXPOSE_OTP_IN_RESPONSE', default=DEBUG)  # show the OTP code in the API reply
ENABLE_API_DOCS = env.bool('ENABLE_API_DOCS', default=DEBUG)                # /api/v1/docs/ pages
# Address of the Django admin. On a live site set DJANGO_ADMIN_URL to something only you know.
ADMIN_URL = env('DJANGO_ADMIN_URL', default='admin/').strip('/') + '/'

# Application definition
INSTALLED_APPS = [
    # Django core
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'corsheaders',
    'rest_framework',
    'django_filters',
    'drf_spectacular',
    'django_celery_beat',
    'django_celery_results',
    'storages',

    # Domain-oriented apps
    'core',
    'accounts',
    'catalog',
    'inventory',
    'cart',
    'wishlist',
    'checkout',
    'orders',
    'payments',
    'shipping',
    'returns',
    'refunds',
    'warranty',
    'reviews',
    'coupons',
    'promotions',
    'cms',
    'support',
    'notifications',
    'compliance',
    'tax',
    'invoicing',
    'analytics',
    'adminapi',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'core.middleware.AdminLoginThrottleMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Static files in production
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.middleware.RequestIDMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default='postgresql://capcrew:capcrew@localhost:5432/capcrew_db'
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static and Media files
STATIC_URL = '/static/'
STATIC_ROOT = ROOT_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = ROOT_DIR / 'media'

# Storage (S3 or local)
if env.bool('USE_S3', default=False):
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
            'OPTIONS': {
                'bucket_name': env('AWS_STORAGE_BUCKET_NAME'),
                'region_name': env('AWS_S3_REGION_NAME', default='us-east-1'),
            },
        },
        'staticfiles': {
            'BACKEND': 'storages.backends.s3boto3.S3StaticStorage',
            'OPTIONS': {
                'bucket_name': env('AWS_STORAGE_BUCKET_NAME'),
                'region_name': env('AWS_S3_REGION_NAME', default='us-east-1'),
            },
        },
    }
else:
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
    }

# Default primary key field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    # General abuse protection for every endpoint (login/OTP have stricter limits of their own)
    'DEFAULT_THROTTLE_CLASSES': [] if IS_TESTING else [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': env('THROTTLE_ANON', default='120/min'),
        'user': env('THROTTLE_USER', default='600/min'),
    },
    # How many reverse proxies (nginx, a load balancer) sit in front of Django. 0 = none (local development).
    # Behind one nginx set NUM_PROXIES=1 so visitors cannot fake their IP address to dodge the limits.
    'NUM_PROXIES': env.int('NUM_PROXIES', default=0),
}

# Stricter limits for login / sign-up / OTP. Override any of them with AUTH_THROTTLE_RATES = {...}
AUTH_THROTTLE_RATES = {}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=['http://localhost:5175', 'http://localhost:3000']
)
CORS_ALLOW_CREDENTIALS = True

# The admin panel is a separate website (its own address). In production set e.g.
# ADMIN_FRONTEND_ORIGINS=https://admin.yourshop.com in .env
ADMIN_FRONTEND_ORIGINS = env.list(
    'ADMIN_FRONTEND_ORIGINS',
    default=['http://localhost:5176', 'http://127.0.0.1:5176']
)
CORS_ALLOWED_ORIGINS = list(dict.fromkeys(list(CORS_ALLOWED_ORIGINS) + list(ADMIN_FRONTEND_ORIGINS)))

# Cache (also stores the login / OTP rate-limit counters)
REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/3')


def _redis_reachable(url):
    try:
        u = urlparse(url)
        socket.create_connection((u.hostname or 'localhost', u.port or 6379), timeout=0.3).close()
        return True
    except OSError:
        return False


if DEBUG and not env.bool('FORCE_REDIS_CACHE', default=False) and not _redis_reachable(REDIS_URL):
    # Development convenience: no Redis running -> use memory instead of crashing.
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}
else:
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {'max_connections': 50},
                # A short Redis outage must not take the whole shop down
                'IGNORE_EXCEPTIONS': True,
            },
        }
    }
DJANGO_REDIS_LOG_IGNORED_EXCEPTIONS = True

# Session Configuration (cached_db keeps admin logins even if the cache is flushed)
SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# CSRF Configuration
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=CORS_ALLOWED_ORIGINS)
CSRF_TRUSTED_ORIGINS = list(dict.fromkeys(list(CSRF_TRUSTED_ORIGINS) + list(ADMIN_FRONTEND_ORIGINS)))

# Celery Configuration
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default='redis://localhost:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# Celery Beat Schedule
# Scheduled jobs (only run if you start Celery; on a simple server use cron instead, see deploy/DEPLOYMENT.md)
CELERY_BEAT_SCHEDULE = {
    'expire-unpaid-orders': {
        'task': 'orders.tasks.expire_unpaid_orders',
        'schedule': timedelta(minutes=10),
    },
}

# Email Configuration
EMAIL_BACKEND = env(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend'
)
EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@capcrew.local')

# Brevo Email Service (formerly Sendinblue)
# Get API key from: https://app.brevo.com/settings/keys/api
BREVO_API_KEY = env('BREVO_API_KEY', default='')
BREVO_ENABLED = env.bool('BREVO_ENABLED', default=False)

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID = env('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = env('RAZORPAY_KEY_SECRET', default='')
PAYMENT_PROVIDER = env('PAYMENT_PROVIDER', default='mock')  # 'razorpay' (live site) or 'mock' (development only)
# Razorpay Dashboard -> Webhooks: add https://<your-api>/api/v1/payments/webhook/razorpay/ and paste its secret here
RAZORPAY_WEBHOOK_SECRET = env('RAZORPAY_WEBHOOK_SECRET', default='')

# HTTPS and security headers. Everything below switches itself ON when DEBUG=False.
# (Headers like nosniff / CSP for API replies are added in core.middleware.SecurityHeadersMiddleware.)
SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=not DEBUG)
# nginx must send "X-Forwarded-Proto: https" (see deploy/nginx.conf.example) or this causes a redirect loop
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if env.bool('TRUST_PROXY_SSL_HEADER', default=not DEBUG) else None
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False)
SECURE_HSTS_PRELOAD = env.bool('SECURE_HSTS_PRELOAD', default=False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
X_FRAME_OPTIONS = 'DENY'

# Logging (the logs folder is created automatically)
(ROOT_DIR / 'logs').mkdir(parents=True, exist_ok=True)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'json': {
            '()': 'pythonjsonlogger.json.JsonFormatter',
            'format': '%(asctime)s %(name)s %(levelname)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': ROOT_DIR / 'logs' / 'django.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Sentry (Error Tracking) - Optional
if env.bool('SENTRY_ENABLED', default=False):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=env('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=ENVIRONMENT,
    )

# Specifications/OpenAPI
SPECTACULAR_SETTINGS = {
    'TITLE': 'E-Commerce Platform API',
    'DESCRIPTION': 'Production-grade D2C e-commerce platform API',
    'VERSION': '1.0.0',
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAdminUser'],
    'SERVERS': [
        {'url': 'http://localhost:8001', 'description': 'Development'},
        {'url': 'https://api.capcrew.local', 'description': 'Production'},
    ],
}

# Business Configuration
BUSINESS_NAME = env('BUSINESS_NAME', default='CapCrew')
BUSINESS_GST_IN = env('BUSINESS_GST_IN', default='')
BUSINESS_EMAIL = env('BUSINESS_EMAIL', default='support@capcrew.local')
BUSINESS_PHONE = env('BUSINESS_PHONE', default='')

# Platform Configuration
MAX_PRODUCT_IMAGES = env.int('MAX_PRODUCT_IMAGES', default=10)
MAX_UPLOAD_SIZE = env.int('MAX_UPLOAD_SIZE', default=5242880)  # 5MB
ALLOWED_UPLOAD_EXTENSIONS = env.list(
    'ALLOWED_UPLOAD_EXTENSIONS',
    default=['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx']
)

# Stock Management
STOCK_RESERVATION_EXPIRY_MINUTES = env.int('STOCK_RESERVATION_EXPIRY_MINUTES', default=15)
# Online orders still unpaid after this long are cancelled and their stock released (python manage.py expire_unpaid_orders)
UNPAID_ORDER_EXPIRY_MINUTES = env.int('UNPAID_ORDER_EXPIRY_MINUTES', default=60)
ALLOW_BACKORDER = env.bool('ALLOW_BACKORDER', default=False)

# Returns & Refunds
DEFAULT_RETURN_WINDOW_DAYS = env.int('DEFAULT_RETURN_WINDOW_DAYS', default=7)
DEFAULT_WARRANTY_DAYS = env.int('DEFAULT_WARRANTY_DAYS', default=365)

# COD Configuration
ENABLE_COD = env.bool('ENABLE_COD', default=True)
MAX_COD_ORDER_VALUE = env.float('MAX_COD_ORDER_VALUE', default=100000)  # 1 lakh

# OTP/2FA Configuration
OTP_EXPIRY_MINUTES = env.int('OTP_EXPIRY_MINUTES', default=5)
OTP_RESEND_LIMIT = env.int('OTP_RESEND_LIMIT', default=3)
