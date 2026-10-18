"""Security tests: headers, who-can-see-what, admin lock-down, injection, start-up safety checks."""
import re

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import get_resolver
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from core.checks import live_site_recommendations, unsafe_live_settings
from decimal import Decimal
from inventory.models import Inventory, Warehouse

PASSWORD = 'Zq7!trailblazer'
ADDRESS = {'full_name': 'Asha Rao', 'phone': '9876543210', 'line1': '12 MG Road',
           'city': 'Gurugram', 'state': 'Haryana', 'postal_code': '122001'}


def url_paths(prefix):
    """Every route that starts with `prefix`, with <converters> filled with dummy values."""
    found = []

    def walk(patterns, base=''):
        for p in patterns:
            route = base + str(p.pattern)
            if hasattr(p, 'url_patterns'):
                walk(p.url_patterns, route)
            else:
                found.append(route)
    walk(get_resolver().url_patterns)
    out = []
    for route in found:
        if route.startswith(prefix):
            route = re.sub(r'<uuid:\w+>', '00000000-0000-0000-0000-000000000001', route)
            route = re.sub(r'<int:\w+>', '1', route)
            route = re.sub(r'<(?:str|slug|path|uuid)?:?\w+>', 'x', route)
            out.append('/' + route)
    return out


class HeaderTests(TestCase):
    def test_api_replies_carry_security_headers(self):
        res = APIClient().get('/api/v1/catalog/products/')
        self.assertEqual(res['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(res['Content-Security-Policy'], "default-src 'none'; frame-ancestors 'none'")
        self.assertEqual(res['X-Frame-Options'], 'DENY')
        self.assertIn('application/json', res['Content-Type'])
        self.assertNotIn('X-XSS-Protection', res)       # the old header is obsolete and can itself cause problems

    def test_requests_with_a_login_token_are_never_cached(self):
        res = APIClient().get('/api/v1/orders/', HTTP_AUTHORIZATION='Bearer abc')
        self.assertEqual(res['Cache-Control'], 'private, no-store')


class AccessControlTests(TestCase):
    def setUp(self):
        cache.clear()
        self.alice = User.objects.create_user('alice@example.com', 'alice@example.com', PASSWORD)
        self.bob = User.objects.create_user('bob@example.com', 'bob@example.com', PASSWORD)
        cat = Category.objects.create(name='Caps', slug='caps')
        product = Product.objects.create(category=cat, name='Cap', slug='cap', description='d', status='active')
        sku = SKU.objects.create(variant=ProductVariant.objects.create(product=product, name='Black', sku='V1'),
                                 sku_code='CC-1', base_price=Decimal('499.00'), mrp=Decimal('699.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=20)

    def client_for(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_customers_cannot_see_or_touch_each_others_orders(self):
        alice, bob = self.client_for(self.alice), self.client_for(self.bob)
        placed = alice.post('/api/v1/orders/place/', {'items': [{'sku_code': 'CC-1', 'quantity': 1}],
                                                      'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(placed.status_code, 201, placed.data)
        number = placed.data['data']['order']['order_number']
        self.assertEqual(alice.get(f'/api/v1/orders/{number}/').status_code, 200)
        for path in (f'/api/v1/orders/{number}/', f'/api/v1/orders/{number}/items/', f'/api/v1/orders/{number}/status_history/'):
            self.assertEqual(bob.get(path).status_code, 404, path)
        self.assertEqual(bob.post(f'/api/v1/orders/{number}/cancel/', {}, format='json').status_code, 404)
        self.assertEqual(bob.patch(f'/api/v1/orders/{number}/update_status/', {'status': 'delivered'}, format='json').status_code, 403)
        self.assertEqual(bob.get('/api/v1/orders/').data['count'], 0)
        self.assertEqual(APIClient().get(f'/api/v1/orders/{number}/').status_code, 401)

    def test_every_admin_endpoint_refuses_visitors_and_ordinary_customers(self):
        paths = url_paths('api/v1/admin/')
        self.assertGreater(len(paths), 20)                    # make sure the route walk really found them
        anonymous, customer = APIClient(), self.client_for(self.alice)
        for path in paths:
            for method in ('get', 'post', 'patch', 'delete'):
                for who, client in (('visitor', anonymous), ('customer', customer)):
                    if path.rstrip('/').endswith('/me') and who == 'customer':
                        continue                              # "who am I" is open to any logged-in user
                    res = getattr(client, method)(path, {}, format='json')
                    self.assertIn(res.status_code, (401, 403), f'{who} {method.upper()} {path} -> {res.status_code}')

    def test_staff_can_use_the_admin_api(self):
        staff = User.objects.create_user('staff@example.com', 'staff@example.com', PASSWORD, is_staff=True)
        self.assertEqual(self.client_for(staff).get('/api/v1/admin/products/').status_code, 200)


class InjectionTests(TestCase):
    PAYLOADS = ["' OR 1=1 --", "'; DROP TABLE catalog_product; --", '" OR ""="', '%00', "<script>alert(1)</script>", '../../etc/passwd']

    def setUp(self):
        cat = Category.objects.create(name='Caps', slug='caps')
        Product.objects.create(category=cat, name='Cap', slug='cap', description='d', status='active')

    def test_search_filter_and_ordering_inputs_cannot_break_out(self):
        for payload in self.PAYLOADS:
            for param in ('search', 'category', 'brand', 'ordering', 'min_price', 'max_price', 'page'):
                res = APIClient().get('/api/v1/catalog/products/', {param: payload})
                self.assertLess(res.status_code, 500, f'{param}={payload!r} -> {res.status_code}')
        self.assertEqual(Product.objects.count(), 1)           # the table is still there
        res = APIClient().get('/api/v1/catalog/products/', {'search': "' OR 1=1 --"})
        self.assertEqual(res.data['count'], 0)                 # injection did not match everything

    def test_scripts_in_a_contact_message_are_stored_as_plain_text(self):
        from support.models import ContactMessage
        res = APIClient().post('/api/v1/support/contact/', {
            'name': '<img src=x onerror=alert(1)>', 'email': 'x@example.com',
            'subject': '<script>1</script>', 'message': '<script>alert(1)</script> hello there'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertIn('application/json', res['Content-Type'])
        self.assertEqual(ContactMessage.objects.get().subject, '<script>1</script>')   # kept as text; the website escapes it


PLAIN_STATIC = {'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
               'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


@override_settings(STORAGES=PLAIN_STATIC)
class AdminLoginGuessingTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_the_django_admin_login_page_cuts_off_password_guessing(self):
        from django.test import Client
        statuses = [Client().post('/admin/login/', {'username': 'x', 'password': 'y'}).status_code for _ in range(12)]
        self.assertNotIn(429, statuses[:10])
        self.assertEqual(statuses[10:], [429, 429])
        self.assertEqual(Client().get('/admin/login/').status_code, 200)        # just looking at the page is never blocked


class StartupSafetyCheckTests(TestCase):
    @override_settings(LIVE_SITE=True, ALLOW_MOCK_PAYMENTS=True, EXPOSE_OTP_IN_RESPONSE=True)
    def test_a_live_site_with_fake_payments_or_open_codes_refuses_to_start(self):
        ids = {e.id for e in unsafe_live_settings(None)}
        self.assertEqual(ids, {'capcrew.E001', 'capcrew.E002'})

    @override_settings(LIVE_SITE=False, ALLOW_MOCK_PAYMENTS=True, EXPOSE_OTP_IN_RESPONSE=True)
    def test_the_same_switches_are_fine_while_developing(self):
        self.assertEqual(unsafe_live_settings(None), [])

    @override_settings(ADMIN_URL='admin/', PAYMENT_PROVIDER='mock', ALLOWED_HOSTS=['localhost'],
                       CORS_ALLOWED_ORIGINS=['http://localhost:5175'])
    def test_deploy_check_nags_about_default_admin_address_and_localhost_settings(self):
        ids = {w.id for w in live_site_recommendations(None)}
        self.assertTrue({'capcrew.W001', 'capcrew.W002', 'capcrew.W003', 'capcrew.W005'} <= ids)

    @override_settings(STORAGES={'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
                                 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}})
    def test_deploy_check_warns_when_photos_would_live_on_a_disk_that_may_be_wiped(self):
        self.assertIn('capcrew.W007', {w.id for w in live_site_recommendations(None)})

    @override_settings(STORAGES={'default': {'BACKEND': 'storages.backends.s3.S3Storage'},
                                 'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}})
    def test_no_photo_warning_when_s3_storage_is_used(self):
        self.assertNotIn('capcrew.W007', {w.id for w in live_site_recommendations(None)})
