"""Rate limits and lock-outs for login, sign-up and email codes (OTP)."""
import hashlib
import ipaddress
import logging

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework.throttling import BaseThrottle, SimpleRateThrottle

logger = logging.getLogger(__name__)

# Per visitor (IP address) or per email address. Change any of them in settings.py: AUTH_THROTTLE_RATES = {'login_ip': '30/min'}
DEFAULT_RATES = {
    'otp_send_ip': '10/hour',      # asking for verification emails
    'otp_send_email': '3/hour',    # ... for the same email address
    'otp_verify_ip': '30/hour',    # trying codes
    'register_ip': '20/hour',      # creating accounts
    'login_ip': '15/min',          # login attempts
}
OTP_MAX_ATTEMPTS = 5               # wrong codes allowed per email before its codes are cancelled
OTP_ATTEMPT_WINDOW = 10 * 60
LOGIN_MAX_FAILS_PER_PAIR = 5       # wrong passwords per (email + IP) before a lock-out
LOGIN_MAX_FAILS_PER_EMAIL = 30     # wrong passwords per email per hour from anywhere
LOGIN_LOCK_SECONDS = 15 * 60


def client_ip(request):
    """The visitor's IP address, honouring NUM_PROXIES so it cannot be faked with a header."""
    ident = BaseThrottle().get_ident(request)
    try:
        return str(ipaddress.ip_address(ident))
    except ValueError:
        return None


def _h(value):
    return hashlib.sha256(str(value).encode('utf-8')).hexdigest()[:32]


def _hit(key, window):
    """Atomically add 1 to a counter that expires after `window` seconds. Returns the new count."""
    try:
        if cache.add(key, 1, window):
            return 1
        return int(cache.incr(key) or 0)
    except ValueError:                      # key expired between add and incr
        cache.set(key, 1, window)
        return 1
    except Exception:
        logger.warning('Rate-limit cache unavailable', exc_info=True)
        return 0


def _count(key):
    try:
        return int(cache.get(key, 0) or 0)
    except Exception:
        logger.warning('Rate-limit cache unavailable', exc_info=True)
        return 0


# ---------------- DRF throttles ----------------
def _email_from(request):
    try:
        return str(request.data.get('email', '') or '').strip().lower()[:254]
    except Exception:
        return ''


class _Throttle(SimpleRateThrottle):
    def get_rate(self):
        rates = {**DEFAULT_RATES, **getattr(settings, 'AUTH_THROTTLE_RATES', {})}
        return rates[self.scope]


class _IPThrottle(_Throttle):
    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}


class _EmailThrottle(_Throttle):
    def get_cache_key(self, request, view):
        email = _email_from(request)
        if not email:
            return None
        return self.cache_format % {'scope': self.scope, 'ident': _h(email)}


class OTPSendIPThrottle(_IPThrottle):
    scope = 'otp_send_ip'


class OTPSendEmailThrottle(_EmailThrottle):
    scope = 'otp_send_email'


class OTPVerifyIPThrottle(_IPThrottle):
    scope = 'otp_verify_ip'


class RegisterIPThrottle(_IPThrottle):
    scope = 'register_ip'


class LoginIPThrottle(_IPThrottle):
    scope = 'login_ip'


# ---------------- wrong-OTP counter ----------------
def otp_attempts_exceeded(email):
    return _count('otp_fail:' + _h(email)) >= OTP_MAX_ATTEMPTS


def otp_attempt_failed(email):
    """Count a wrong code. After too many, every unused code for this email is cancelled (a new one must be requested)."""
    if _hit('otp_fail:' + _h(email), OTP_ATTEMPT_WINDOW) >= OTP_MAX_ATTEMPTS:
        from .models import OTP
        OTP.objects.filter(email=email, is_used=False).update(is_used=True, used_at=timezone.now())


def otp_attempts_reset(email):
    try:
        cache.delete('otp_fail:' + _h(email))
    except Exception:
        pass


# ---------------- login lock-out ----------------
def _login_keys(email, ip):
    return 'login_fail_pair:' + _h(f'{email}|{ip}'), 'login_fail_email:' + _h(email)


def login_blocked(email, ip):
    pair, per_email = _login_keys(email, ip)
    return _count(pair) >= LOGIN_MAX_FAILS_PER_PAIR or _count(per_email) >= LOGIN_MAX_FAILS_PER_EMAIL


def login_failed(email, ip):
    pair, per_email = _login_keys(email, ip)
    _hit(pair, LOGIN_LOCK_SECONDS)
    _hit(per_email, 3600)


def login_succeeded(email, ip):
    pair, _ = _login_keys(email, ip)
    try:
        cache.delete(pair)
    except Exception:
        pass
