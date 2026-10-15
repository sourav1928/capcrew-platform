"""Security tests for sign-up, email codes (OTP) and login."""
import re
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import OTP

SEND, VERIFY, REGISTER, LOGIN = ('/api/v1/auth/send-otp/', '/api/v1/auth/verify-otp/',
                                 '/api/v1/auth/register/', '/api/v1/auth/login/')
STRONG = 'Zq7!trailblazer'


def post(url, data, **extra):
    return APIClient().post(url, data, format='json', **extra)


def make_otp(email='new@example.com', code='123456', **kw):
    return OTP.objects.create(email=email, otp_code=code, purpose='email_verification',
                              expires_at=kw.pop('expires_at', timezone.now() + timedelta(minutes=5)), **kw)


class SendOtpTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_code_is_six_digits_and_not_in_reply_or_logs_when_email_works(self):
        with patch('accounts.views.brevo_service') as brevo, self.assertNoLogs('accounts', level='DEBUG'):
            brevo.send_otp_email.return_value = {'success': True}
            res = post(SEND, {'email': 'New@Example.com'})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn('otp', res.data['data'])
        code = OTP.objects.get(email='new@example.com').otp_code
        self.assertRegex(code, r'^\d{6}$')
        self.assertNotIn(code, res.content.decode())

    @override_settings(EXPOSE_OTP_IN_RESPONSE=False)
    def test_code_is_never_revealed_when_email_fails_on_a_live_site(self):
        with patch('accounts.views.brevo_service') as brevo, self.assertNoLogs('accounts', level='DEBUG'):
            brevo.send_otp_email.return_value = {'success': False}
            res = post(SEND, {'email': 'new@example.com'})
        self.assertEqual(res.status_code, 503)
        self.assertFalse(res.data['success'])
        self.assertNotRegex(res.content.decode(), r'\d{6}')
        self.assertFalse(OTP.objects.filter(email='new@example.com').exists())

    @override_settings(EXPOSE_OTP_IN_RESPONSE=True)
    def test_development_mode_still_shows_the_code_so_you_can_test_locally(self):
        with patch('accounts.views.brevo_service') as brevo:
            brevo.send_otp_email.return_value = {'success': False}
            res = post(SEND, {'email': 'new@example.com'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['data']['otp'], OTP.objects.get(email='new@example.com').otp_code)

    def test_bad_input_is_rejected(self):
        self.assertEqual(post(SEND, {'email': 'nope'}).status_code, 400)
        self.assertEqual(post(SEND, {}).status_code, 400)
        self.assertEqual(post(SEND, {'email': 'a@example.com', 'purpose': 'password_reset'}).status_code, 400)
        User.objects.create_user('taken@example.com', 'taken@example.com', STRONG)
        self.assertEqual(post(SEND, {'email': 'TAKEN@example.com'}).status_code, 400)

    def test_only_the_newest_code_works(self):
        with patch('accounts.views.brevo_service') as brevo:
            brevo.send_otp_email.return_value = {'success': True}
            post(SEND, {'email': 'new@example.com'})
            first = OTP.objects.get(email='new@example.com', is_used=False).otp_code
            post(SEND, {'email': 'new@example.com'})
        self.assertEqual(OTP.objects.filter(email='new@example.com', is_used=False).count(), 1)
        newest = OTP.objects.get(email='new@example.com', is_used=False).otp_code
        if first != newest:
            self.assertEqual(post(VERIFY, {'email': 'new@example.com', 'otp': first}).status_code, 400)

    def test_email_bombing_is_limited(self):
        with patch('accounts.views.brevo_service') as brevo:
            brevo.send_otp_email.return_value = {'success': True}
            codes = [post(SEND, {'email': 'victim@example.com'}).status_code for _ in range(5)]
        self.assertEqual(codes[:3], [200, 200, 200])
        self.assertEqual(codes[3], 429)
        res = post(SEND, {'email': 'victim@example.com'})
        self.assertIn('Too many attempts', res.data['message'])      # readable message for the website


class VerifyAndRegisterTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_guessing_codes_is_cut_off_after_five_tries(self):
        make_otp(code='123456')
        for guess in ('000001', '000002', '000003', '000004', '000005'):
            self.assertEqual(post(VERIFY, {'email': 'new@example.com', 'otp': guess}).status_code, 400)
        res = post(VERIFY, {'email': 'new@example.com', 'otp': '123456'})   # even the right code is now refused
        self.assertEqual(res.status_code, 429)
        self.assertTrue(OTP.objects.get(email='new@example.com').is_used)  # the code was cancelled

    def test_guessing_through_register_is_cut_off_too(self):
        make_otp(code='123456')
        for guess in ('000001', '000002', '000003', '000004', '000005'):
            post(REGISTER, {'email': 'new@example.com', 'password': STRONG, 'otp': guess})
        res = post(REGISTER, {'email': 'new@example.com', 'password': STRONG, 'otp': '123456'})
        self.assertEqual(res.status_code, 429)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    def test_weak_passwords_are_rejected_and_the_code_is_kept(self):
        make_otp(code='123456')
        for weak in ('1234567', 'password123', 'short', 'new@example.com', '12345678'):
            res = post(REGISTER, {'email': 'new@example.com', 'password': weak, 'otp': '123456'})
            self.assertEqual(res.status_code, 400, weak)
            self.assertFalse(res.data['success'])
        self.assertFalse(OTP.objects.get(email='new@example.com').is_used)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    def test_register_works_and_the_code_cannot_be_reused(self):
        make_otp(code='123456')
        res = post(REGISTER, {'email': 'New@Example.com', 'password': STRONG, 'otp': '123456', 'first_name': 'Asha'})
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(res.data['token'])
        user = User.objects.get(email='new@example.com')
        self.assertEqual(user.username, 'new@example.com')       # the website logs in by email
        self.assertTrue(user.check_password(STRONG))
        again = post(REGISTER, {'email': 'new@example.com', 'password': STRONG, 'otp': '123456'})
        self.assertEqual(again.status_code, 400)

    def test_expired_code_is_rejected(self):
        make_otp(code='123456', expires_at=timezone.now() - timedelta(minutes=1))
        res = post(REGISTER, {'email': 'new@example.com', 'password': STRONG, 'otp': '123456'})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(email='new@example.com').exists())

    def test_overlong_names_cannot_crash_the_server(self):
        make_otp(code='123456')
        res = post(REGISTER, {'email': 'new@example.com', 'password': STRONG, 'otp': '123456', 'first_name': 'A' * 500})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(len(User.objects.get(email='new@example.com').first_name), 150)


class LoginTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('u@example.com', 'u@example.com', STRONG)

    def test_correct_login(self):
        res = post(LOGIN, {'email': 'U@Example.com', 'password': STRONG})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['token'])
        self.assertEqual(res['Cache-Control'], 'private, no-store')

    def test_unknown_email_and_wrong_password_look_identical(self):
        a = post(LOGIN, {'email': 'u@example.com', 'password': 'wrong-password'})
        b = post(LOGIN, {'email': 'nobody@example.com', 'password': 'wrong-password'})
        self.assertEqual((a.status_code, a.data['message']), (b.status_code, b.data['message']))
        self.assertEqual(a.status_code, 401)

    def test_five_wrong_passwords_lock_the_account_for_that_visitor(self):
        for _ in range(5):
            self.assertEqual(post(LOGIN, {'email': 'u@example.com', 'password': 'bad-password'}).status_code, 401)
        res = post(LOGIN, {'email': 'u@example.com', 'password': STRONG})      # right password, still locked out
        self.assertEqual(res.status_code, 429)
        self.assertIn('Too many', res.data['message'])
        self.assertEqual(res['Retry-After'], '900')
        # ... but the real owner on another network is not locked out by a stranger's guesses
        ok = post(LOGIN, {'email': 'u@example.com', 'password': STRONG}, REMOTE_ADDR='10.9.9.9')
        self.assertEqual(ok.status_code, 200)

    def test_successful_login_resets_the_failure_count(self):
        for _ in range(4):
            post(LOGIN, {'email': 'u@example.com', 'password': 'bad-password'})
        self.assertEqual(post(LOGIN, {'email': 'u@example.com', 'password': STRONG}).status_code, 200)
        for _ in range(4):
            self.assertEqual(post(LOGIN, {'email': 'u@example.com', 'password': 'bad-password'}).status_code, 401)

    @override_settings(AUTH_THROTTLE_RATES={'login_ip': '3/min'})
    def test_one_visitor_cannot_hammer_login_even_by_faking_a_forwarded_ip(self):
        statuses = [post(LOGIN, {'email': f'x{i}@example.com', 'password': 'bad-password'},
                         HTTP_X_FORWARDED_FOR=f'203.0.113.{i}').status_code for i in range(5)]
        self.assertEqual(statuses[:3], [401, 401, 401])
        self.assertEqual(statuses[3:], [429, 429])

    def test_inactive_accounts_cannot_log_in(self):
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertEqual(post(LOGIN, {'email': 'u@example.com', 'password': STRONG}).status_code, 401)
