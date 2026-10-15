"""Security tests for payments: no free orders, and a signature-checked Razorpay webhook."""
import hashlib
import hmac
import json
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from inventory.models import Inventory, Warehouse
from orders.models import Order
from payments.models import Payment, PaymentTransaction

ADDRESS = {'full_name': 'Asha Rao', 'phone': '9876543210', 'line1': '12 MG Road',
           'city': 'Gurugram', 'state': 'Haryana', 'postal_code': '122001'}
WEBHOOK = '/api/v1/payments/webhook/razorpay/'
SECRET = 'whsec_test_secret'
LIVE = dict(PAYMENT_PROVIDER='razorpay', RAZORPAY_KEY_ID='rzp_key', RAZORPAY_KEY_SECRET='rzp_secret',
            RAZORPAY_WEBHOOK_SECRET=SECRET, ALLOW_MOCK_PAYMENTS=False)


class PaymentTestBase(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('a@example.com', 'a@example.com', 'Zq7!trailblazer')
        self.other = User.objects.create_user('b@example.com', 'b@example.com', 'Zq7!trailblazer')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        cat = Category.objects.create(name='Caps', slug='caps')
        product = Product.objects.create(category=cat, name='Cap', slug='cap', description='d', status='active')
        variant = ProductVariant.objects.create(product=product, name='Black', sku='V1')
        sku = SKU.objects.create(variant=variant, sku_code='CC-1', base_price=Decimal('499.00'), mrp=Decimal('699.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=20)

    def place_online(self, client=None):
        """An online-payment order, created while the development gateway is allowed (as on a developer's computer)."""
        res = (client or self.client).post('/api/v1/orders/place/', {
            'items': [{'sku_code': 'CC-1', 'quantity': 1}], 'address': ADDRESS, 'payment_method': 'online'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return Order.objects.get(order_number=res.data['data']['order']['order_number'])

    def webhook(self, payload, secret=SECRET, signature=None):
        body = json.dumps(payload).encode()
        sig = signature if signature is not None else hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return Client().post(WEBHOOK, data=body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=sig)

    @staticmethod
    def captured(order_id, amount_paise, status='captured', currency='INR', pay_id='pay_TEST1'):
        return {'event': 'payment.captured', 'payload': {'payment': {'entity': {
            'id': pay_id, 'order_id': order_id, 'amount': amount_paise, 'currency': currency, 'status': status}}}}


class NoFreeOrdersTests(PaymentTestBase):
    def test_the_fake_gateway_cannot_mark_an_order_paid_on_a_live_site(self):
        order = self.place_online()                          # created while the development gateway was allowed
        intent = self.client.post('/api/v1/payments/initiate/', {'order_number': order.order_number}, format='json')
        mock_id = intent.data['data']['gateway_order_id']
        self.assertTrue(mock_id.startswith('mock_order_'))
        with self.settings(ALLOW_MOCK_PAYMENTS=False):      # ... now the same site is live
            for call in ('verify', 'initiate'):
                res = self.client.post(f'/api/v1/payments/{call}/', {
                    'order_number': order.order_number, 'gateway_order_id': mock_id,
                    'gateway_payment_id': 'x', 'signature': 'x'}, format='json')
                self.assertEqual(res.status_code, 503, (call, res.data))
                self.assertEqual(res.data['code'], 'payments_unavailable')
        order.refresh_from_db()
        self.assertNotEqual(order.payment_status, 'paid')
        self.assertEqual(order.status, 'pending')

    @override_settings(ALLOW_MOCK_PAYMENTS=False)
    def test_online_orders_cannot_even_be_placed_without_a_real_gateway(self):
        res = self.client.post('/api/v1/orders/place/', {
            'items': [{'sku_code': 'CC-1', 'quantity': 1}], 'address': ADDRESS, 'payment_method': 'online'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'online_unavailable')
        self.assertEqual(Order.objects.count(), 0)
        cod = self.client.post('/api/v1/orders/place/', {
            'items': [{'sku_code': 'CC-1', 'quantity': 1}], 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(cod.status_code, 201)                # Cash on Delivery keeps working

    @override_settings(ALLOW_MOCK_PAYMENTS=False)
    def test_the_website_is_told_online_payment_is_off(self):
        res = APIClient().get('/api/v1/store/config/')
        self.assertFalse(res.data['data']['online_payments_enabled'])

    def test_development_gateway_still_works_on_a_developers_computer(self):
        order = self.place_online()
        intent = self.client.post('/api/v1/payments/initiate/', {'order_number': order.order_number}, format='json')
        self.assertEqual(intent.status_code, 200)
        done = self.client.post('/api/v1/payments/verify/', {
            'order_number': order.order_number, 'gateway_order_id': intent.data['data']['gateway_order_id']}, format='json')
        self.assertEqual(done.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')

    def test_payment_calls_for_someone_elses_order_are_refused(self):
        order = self.place_online()
        stranger = APIClient()
        stranger.force_authenticate(self.other)
        for call in ('initiate', 'verify', 'failed'):
            res = stranger.post(f'/api/v1/payments/{call}/', {'order_number': order.order_number}, format='json')
            self.assertEqual(res.status_code, 404, call)
        self.assertEqual(APIClient().post('/api/v1/payments/verify/', {'order_number': order.order_number}, format='json').status_code, 401)


@override_settings(**LIVE)
class RazorpayWebhookTests(PaymentTestBase):
    def setUp(self):
        super().setUp()
        with override_settings(ALLOW_MOCK_PAYMENTS=True, PAYMENT_PROVIDER='mock'):
            self.order = self.place_online()
        self.payment = self.order.payment
        self.payment.gateway_order_id = 'order_ABC123'
        self.payment.save()
        self.paise = int(self.payment.amount * 100)

    def refresh(self):
        self.order.refresh_from_db()
        self.payment.refresh_from_db()

    def test_valid_signed_payment_confirms_the_order(self):
        res = self.webhook(self.captured('order_ABC123', self.paise))
        self.assertEqual(res.status_code, 200, res.content)
        self.refresh()
        self.assertEqual((self.order.status, self.order.payment_status, self.payment.status), ('confirmed', 'paid', 'paid'))
        self.assertEqual(self.payment.gateway_payment_id, 'pay_TEST1')

    def test_forged_or_unsigned_calls_are_rejected(self):
        payload = self.captured('order_ABC123', self.paise)
        for sig in ('not-a-real-signature', ''):
            self.assertEqual(self.webhook(payload, signature=sig).status_code, 400)
        self.assertEqual(self.webhook(payload, secret='attacker-guess').status_code, 400)
        self.refresh()
        self.assertEqual((self.order.status, self.payment.status), ('pending', 'pending'))

    @override_settings(RAZORPAY_WEBHOOK_SECRET='')
    def test_without_a_configured_secret_nothing_is_trusted(self):
        self.assertEqual(self.webhook(self.captured('order_ABC123', self.paise), secret='').status_code, 503)
        self.refresh()
        self.assertEqual(self.payment.status, 'pending')

    def test_replays_do_not_double_count(self):
        for _ in range(3):
            self.assertEqual(self.webhook(self.captured('order_ABC123', self.paise)).status_code, 200)
        self.assertEqual(PaymentTransaction.objects.filter(payment=self.payment).count(), 1)

    def test_wrong_amount_or_status_is_not_accepted(self):
        for payload in (self.captured('order_ABC123', self.paise - 100),
                        self.captured('order_ABC123', self.paise, status='failed'),
                        self.captured('order_ABC123', self.paise, currency='USD')):
            self.assertEqual(self.webhook(payload).status_code, 200)     # acknowledged so Razorpay stops retrying ...
            self.refresh()
            self.assertEqual(self.payment.status, 'pending')              # ... but the order is NOT marked paid

    def test_unknown_orders_and_other_events_are_ignored_quietly(self):
        self.assertEqual(self.webhook(self.captured('order_UNKNOWN', 100)).status_code, 200)
        self.assertEqual(self.webhook({'event': 'payment.failed', 'payload': {}}).status_code, 200)
        self.assertEqual(Client().post(WEBHOOK, data=b'not json', content_type='application/json',
                                       HTTP_X_RAZORPAY_SIGNATURE=hmac.new(SECRET.encode(), b'not json', hashlib.sha256).hexdigest()).status_code, 400)
        self.refresh()
        self.assertEqual(self.payment.status, 'pending')

    def test_a_cancelled_order_is_never_revived_by_a_late_payment(self):
        Order.objects.filter(pk=self.order.pk).update(status='cancelled')
        self.assertEqual(self.webhook(self.captured('order_ABC123', self.paise)).status_code, 200)
        self.refresh()
        self.assertEqual((self.order.status, self.payment.status), ('cancelled', 'pending'))

    def test_the_webhook_needs_no_login_but_only_accepts_post(self):
        self.assertEqual(Client().get(WEBHOOK).status_code, 405)
