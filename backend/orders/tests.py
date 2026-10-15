"""End-to-end tests for the checkout flow (quote -> place -> pay -> cancel)."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from coupons.models import Coupon
from inventory.models import Inventory, Warehouse
from orders.models import Order

ADDRESS = {
    'full_name': 'Sourav Kumar', 'phone': '9876543210', 'line1': '12 MG Road',
    'city': 'Gurugram', 'state': 'Haryana', 'postal_code': '122001',
}


class CheckoutFlowTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('a@b.com', 'a@b.com', 'pw123456', first_name='Sourav')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        cat = Category.objects.create(name='Boards', slug='boards')
        self.product = Product.objects.create(category=cat, name='ProExtend 4', slug='proextend-4',
                                              description='d', status='active')
        variant = ProductVariant.objects.create(product=self.product, name='Std', sku='V1')
        self.sku = SKU.objects.create(variant=variant, sku_code='PE4-STD', base_price=Decimal('499.00'),
                                      mrp=Decimal('699.00'))
        self.cheap = SKU.objects.create(
            variant=ProductVariant.objects.create(product=self.product, name='Mini', sku='V2'),
            sku_code='PE4-MINI', base_price=Decimal('100.00'), mrp=Decimal('150.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        self.inv = Inventory.objects.create(sku=self.sku, warehouse=wh, quantity_on_hand=5)
        Inventory.objects.create(sku=self.cheap, warehouse=wh, quantity_on_hand=10)

    def items(self, qty=1, code='PE4-STD'):
        return [{'sku_code': code, 'quantity': qty}]

    # ---- catalog ---------------------------------------------------------
    def test_catalog_lists_real_price_and_sku(self):
        res = APIClient().get('/api/v1/catalog/products/')
        self.assertEqual(res.status_code, 200)
        p = res.data['results'][0]
        self.assertEqual(p['sku_code'], 'PE4-MINI')           # cheapest in-stock SKU
        self.assertEqual(Decimal(str(p['min_price'])), Decimal('100.00'))
        self.assertTrue(p['in_stock'])

    # ---- quote -----------------------------------------------------------
    def test_quote_totals_and_shipping(self):
        res = self.client.post('/api/v1/orders/quote/', {'items': self.items(1, 'PE4-MINI')}, format='json')
        t = res.data['data']['totals']
        self.assertEqual(Decimal(str(t['subtotal'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(t['shipping'])), Decimal('50.00'))   # below free-shipping threshold
        self.assertEqual(Decimal(str(t['total'])), Decimal('150.00'))
        res = self.client.post('/api/v1/orders/quote/', {'items': self.items(2)}, format='json')
        t = res.data['data']['totals']
        self.assertEqual(Decimal(str(t['total'])), Decimal('998.00'))     # free shipping
        self.assertEqual(Decimal(str(t['gst_included'])), Decimal('152.24'))

    def test_quote_flags_insufficient_stock(self):
        res = self.client.post('/api/v1/orders/quote/', {'items': self.items(9)}, format='json')
        data = res.data['data']
        self.assertFalse(data['can_place'])
        self.assertEqual(data['issues'][0]['code'], 'insufficient_stock')
        self.assertEqual(data['issues'][0]['available_quantity'], 5)

    def test_client_cannot_set_price(self):
        items = [{'sku_code': 'PE4-STD', 'quantity': 1, 'unit_price': 1}]
        res = self.client.post('/api/v1/orders/place/', {
            'items': items, 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(str(res.data['data']['order']['subtotal'])), Decimal('499.00'))

    # ---- place order (COD) -----------------------------------------------
    def test_place_cod_order_deducts_stock_and_confirms(self):
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(2), 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        order = res.data['data']['order']
        self.assertEqual(order['status'], 'confirmed')
        self.assertEqual(order['shipping_address']['city'], 'Gurugram')
        self.assertEqual(order['payment']['method'], 'cod')
        self.assertIsNone(res.data['data']['payment_intent'])
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 3)
        # shows up in My Orders
        lst = self.client.get('/api/v1/orders/')
        self.assertEqual(lst.status_code, 200)
        self.assertEqual(lst.data['results'][0]['items'][0]['product_name'], 'ProExtend 4')
        detail = self.client.get(f"/api/v1/orders/{order['order_number']}/")
        self.assertEqual(detail.status_code, 200)

    def test_cannot_oversell(self):
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(6), 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.data['code'], 'cart_issues')
        self.assertEqual(Order.objects.count(), 0)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 5)

    def test_idempotent_double_submit(self):
        body = {'items': self.items(1), 'address': ADDRESS, 'payment_method': 'cod', 'idempotency_key': 'k1'}
        r1 = self.client.post('/api/v1/orders/place/', body, format='json')
        r2 = self.client.post('/api/v1/orders/place/', body, format='json')
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(Order.objects.count(), 1)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 4)

    def test_address_validation(self):
        bad = dict(ADDRESS, phone='123', postal_code='12')
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address': bad, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('phone', res.data['errors'])
        self.assertIn('postal_code', res.data['errors'])

    def test_cod_limit(self):
        from core.models import StoreConfig
        cfg = StoreConfig.load()
        cfg.cod_max_order_value = 300
        cfg.save()
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'cod_unavailable')

    def test_requires_login(self):
        res = APIClient().post('/api/v1/orders/place/', {'items': self.items(1)}, format='json')
        self.assertIn(res.status_code, (401, 403))

    # ---- coupons ---------------------------------------------------------
    def make_coupon(self, **kw):
        defaults = dict(code='SAVE10', discount_type='percentage', discount_value=Decimal('10'),
                        min_order_value=Decimal('0'), valid_from=timezone.now() - timedelta(days=1),
                        valid_until=timezone.now() + timedelta(days=1), is_active=True)
        defaults.update(kw)
        return Coupon.objects.create(**defaults)

    def test_coupon_applies_and_is_single_use(self):
        self.make_coupon()
        q = self.client.post('/api/v1/orders/quote/', {'items': self.items(1), 'coupon_code': 'save10'}, format='json')
        self.assertEqual(Decimal(str(q.data['data']['totals']['discount'])), Decimal('49.90'))
        body = {'items': self.items(1), 'address': ADDRESS, 'payment_method': 'cod', 'coupon_code': 'SAVE10'}
        res = self.client.post('/api/v1/orders/place/', body, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['data']['order']['coupon_code'], 'SAVE10')
        again = self.client.post('/api/v1/orders/quote/', {'items': self.items(1), 'coupon_code': 'SAVE10'}, format='json')
        self.assertIn('already used', again.data['data']['coupon_error'])

    def test_invalid_coupon_does_not_break_quote(self):
        q = self.client.post('/api/v1/orders/quote/', {'items': self.items(1), 'coupon_code': 'NOPE'}, format='json')
        self.assertEqual(q.status_code, 200)
        self.assertTrue(q.data['data']['coupon_error'])

    # ---- online payment --------------------------------------------------
    def test_online_payment_flow(self):
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address': ADDRESS, 'payment_method': 'online'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        order = res.data['data']['order']
        intent = res.data['data']['payment_intent']
        self.assertEqual(order['status'], 'pending')
        self.assertTrue(order['needs_payment'])
        self.assertEqual(intent['provider'], 'mock')
        # failure then retry
        f = self.client.post('/api/v1/payments/failed/', {'order_number': order['order_number'], 'reason': 'cancelled'}, format='json')
        self.assertEqual(f.status_code, 200)
        retry = self.client.post('/api/v1/payments/initiate/', {'order_number': order['order_number']}, format='json')
        self.assertEqual(retry.status_code, 200, retry.data)
        gid = retry.data['data']['gateway_order_id']
        bad = self.client.post('/api/v1/payments/verify/', {
            'order_number': order['order_number'], 'gateway_order_id': 'wrong'}, format='json')
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post('/api/v1/payments/verify/', {
            'order_number': order['order_number'], 'gateway_order_id': gid, 'gateway_payment_id': 'pay_1'}, format='json')
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(ok.data['data']['payment_status'], 'paid')
        self.assertEqual(ok.data['data']['status'], 'confirmed')

    def test_cannot_pay_someone_elses_order(self):
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address': ADDRESS, 'payment_method': 'online'}, format='json')
        number = res.data['data']['order']['order_number']
        other = APIClient()
        other.force_authenticate(User.objects.create_user('x@y.com', 'x@y.com', 'pw123456'))
        r = other.post('/api/v1/payments/initiate/', {'order_number': number}, format='json')
        self.assertEqual(r.status_code, 404)
        self.assertEqual(other.get(f'/api/v1/orders/{number}/').status_code, 404)

    # ---- cancel ----------------------------------------------------------
    def test_cancel_restocks_and_frees_coupon(self):
        self.make_coupon()
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(2), 'address': ADDRESS, 'payment_method': 'cod', 'coupon_code': 'SAVE10'}, format='json')
        number = res.data['data']['order']['order_number']
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 3)
        c = self.client.post(f'/api/v1/orders/{number}/cancel/', {'reason': 'changed mind'}, format='json')
        self.assertEqual(c.status_code, 200, c.data)
        self.assertEqual(c.data['data']['status'], 'cancelled')
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 5)
        again = self.client.post(f'/api/v1/orders/{number}/cancel/', {}, format='json')
        self.assertEqual(again.status_code, 400)

    # ---- addresses -------------------------------------------------------
    def test_saved_addresses(self):
        self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address': ADDRESS, 'payment_method': 'cod'}, format='json')
        lst = self.client.get('/api/v1/auth/addresses/')
        self.assertEqual(len(lst.data['data']), 1)
        self.assertTrue(lst.data['data'][0]['is_default'])
        aid = lst.data['data'][0]['id']
        res = self.client.post('/api/v1/orders/place/', {
            'items': self.items(1), 'address_id': aid, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.client.delete(f'/api/v1/auth/addresses/{aid}/').status_code, 200)
        self.assertEqual(len(self.client.get('/api/v1/auth/addresses/').data['data']), 0)
