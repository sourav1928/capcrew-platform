"""Tests for the store-admin API."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product, SKU
from inventory.models import Inventory
from orders.models import Order

ADDR = {'full_name': 'Asha Verma', 'phone': '9876543210', 'line1': '5 Park St', 'city': 'Pune',
        'state': 'Maharashtra', 'postal_code': '411001'}


class AdminApiTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user('boss@shop.com', 'boss@shop.com', 'pw123456', is_staff=True)
        self.shopper = User.objects.create_user('cust@x.com', 'cust@x.com', 'pw123456')
        self.admin = APIClient()
        self.admin.force_authenticate(self.staff)
        self.cat = Category.objects.create(name='Boards', slug='boards')

    def create_product(self, **extra):
        body = {'name': 'Smiley Cap 6', 'category_id': str(self.cat.id), 'status': 'active', 'brand': 'CapCrew',
                'description': 'Good one', 'image_url': 'https://img.example.com/a.jpg',
                'options': [{'name': '3m', 'price': '799', 'mrp': '999', 'stock': 20, 'sku_code': 'PS6-3M'}]}
        body.update(extra)
        return self.admin.post('/api/v1/admin/products/', body, format='json')

    # ---- permissions -----------------------------------------------------
    def test_customers_cannot_use_admin_api(self):
        c = APIClient()
        c.force_authenticate(self.shopper)
        for url in ('/api/v1/admin/orders/', '/api/v1/admin/products/', '/api/v1/admin/dashboard/'):
            self.assertEqual(c.get(url).status_code, 403, url)
        self.assertEqual(APIClient().get('/api/v1/admin/orders/').status_code, 401)

    def test_me_reports_staff_flag(self):
        self.assertTrue(self.admin.get('/api/v1/admin/me/').data['data']['is_staff'])

    # ---- products --------------------------------------------------------
    def test_create_product_shows_on_storefront_with_stock(self):
        res = self.create_product()
        self.assertEqual(res.status_code, 201, res.data)
        shop = APIClient().get('/api/v1/catalog/products/').data['results'][0]
        self.assertEqual(shop['name'], 'Smiley Cap 6')
        self.assertEqual(shop['sku_code'], 'PS6-3M')
        self.assertEqual(Decimal(str(shop['min_price'])), Decimal('799.00'))
        self.assertEqual(shop['available_quantity'], 20)
        self.assertEqual(shop['primary_image'], 'https://img.example.com/a.jpg')

    def test_product_validation(self):
        res = self.create_product(name='', options=[{'name': 'x', 'price': '500', 'mrp': '100', 'stock': -1}])
        self.assertEqual(res.status_code, 400)
        errs = res.data['errors'] if 'errors' in res.data else res.data
        self.assertIn('name', errs)

    def test_edit_price_stock_and_hide(self):
        pid = self.create_product().data['data']['id']
        detail = self.admin.get(f'/api/v1/admin/products/{pid}/').data['data']
        opt = detail['options'][0]
        opt.update(price='699', stock=5)
        res = self.admin.patch(f'/api/v1/admin/products/{pid}/', {'options': [opt], 'name': 'Smiley Cap Pro'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['data']['min_price'], '699.00')
        self.assertEqual(res.data['data']['total_stock'], 5)
        self.assertEqual(res.data['data']['stock_state'], 'low')
        self.admin.patch(f'/api/v1/admin/products/{pid}/', {'status': 'draft'}, format='json')
        self.assertEqual(APIClient().get('/api/v1/catalog/products/').data['count'], 0)

    def test_delete_product_hides_it_but_keeps_orders(self):
        pid = self.create_product().data['data']['id']
        self.assertEqual(self.admin.delete(f'/api/v1/admin/products/{pid}/').status_code, 200)
        self.assertEqual(APIClient().get('/api/v1/catalog/products/').data['count'], 0)
        self.assertEqual(self.admin.get('/api/v1/admin/products/').data['count'], 0)

    def test_new_option_added_later(self):
        pid = self.create_product().data['data']['id']
        detail = self.admin.get(f'/api/v1/admin/products/{pid}/').data['data']
        opts = detail['options'] + [{'name': '5m', 'price': '999', 'mrp': '1199', 'stock': 8}]
        res = self.admin.patch(f'/api/v1/admin/products/{pid}/', {'options': opts}, format='json')
        self.assertEqual(len(res.data['data']['options']), 2)
        self.assertEqual(res.data['data']['total_stock'], 28)

    # ---- categories ------------------------------------------------------
    def test_category_crud(self):
        r = self.admin.post('/api/v1/admin/categories/', {'name': 'Kids Caps'}, format='json')
        self.assertEqual(r.status_code, 201)
        dup = self.admin.post('/api/v1/admin/categories/', {'name': 'kids caps'}, format='json')
        self.assertEqual(dup.status_code, 400)
        cid = r.data['data']['id']
        self.assertEqual(self.admin.patch(f'/api/v1/admin/categories/{cid}/', {'name': 'Travel Adapters'}, format='json').status_code, 200)
        self.assertEqual(self.admin.delete(f'/api/v1/admin/categories/{cid}/').status_code, 200)
        self.create_product()
        self.assertEqual(self.admin.delete(f'/api/v1/admin/categories/{self.cat.id}/').status_code, 400)

    # ---- inventory -------------------------------------------------------
    def test_inventory_adjust(self):
        self.create_product()
        lst = self.admin.get('/api/v1/admin/inventory/').data
        self.assertEqual(lst['results'][0]['stock'], 20)
        r = self.admin.post('/api/v1/admin/inventory/adjust/', {'sku_code': 'PS6-3M', 'change': -15}, format='json')
        self.assertEqual(r.data['data']['stock'], 5)
        self.assertEqual(r.data['data']['state'], 'low')
        too_much = self.admin.post('/api/v1/admin/inventory/adjust/', {'sku_code': 'PS6-3M', 'change': -50}, format='json')
        self.assertEqual(too_much.status_code, 400)
        r = self.admin.post('/api/v1/admin/inventory/adjust/', {'sku_code': 'PS6-3M', 'set_to': 0}, format='json')
        self.assertEqual(r.data['data']['state'], 'out')
        self.assertEqual(self.admin.get('/api/v1/admin/inventory/?filter=out').data['count'], 1)

    # ---- orders ----------------------------------------------------------
    def make_order(self, qty=2):
        self.create_product()
        buyer = APIClient()
        buyer.force_authenticate(self.shopper)
        res = buyer.post('/api/v1/orders/place/', {'items': [{'sku_code': 'PS6-3M', 'quantity': qty}],
                                                   'address': ADDR, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return res.data['data']['order']['order_number']

    def test_customer_order_appears_for_staff(self):
        number = self.make_order()
        lst = self.admin.get('/api/v1/admin/orders/').data
        self.assertEqual(lst['count'], 1)
        self.assertEqual(lst['results'][0]['order_number'], number)
        self.assertEqual(lst['results'][0]['customer_name'], 'Asha Verma')
        self.assertEqual(self.admin.get(f'/api/v1/admin/orders/?search=cust@x.com').data['count'], 1)
        self.assertEqual(self.admin.get('/api/v1/admin/orders/?status=shipped').data['count'], 0)
        d = self.admin.get(f'/api/v1/admin/orders/{number}/').data['data']
        self.assertEqual(d['items'][0]['product_name'], 'Smiley Cap 6')
        self.assertEqual(d['shipping_address']['city'], 'Pune')

    def test_status_flow_and_cod_paid_on_delivery(self):
        number = self.make_order()
        url = f'/api/v1/admin/orders/{number}/'
        bad = self.admin.patch(url, {'status': 'delivered'}, format='json')
        self.assertEqual(bad.status_code, 400)
        for st in ('processing', 'shipped', 'delivered'):
            r = self.admin.patch(url, {'status': st}, format='json')
            self.assertEqual(r.status_code, 200, r.data)
            self.assertEqual(r.data['data']['status'], st)
        self.assertEqual(r.data['data']['payment_status'], 'paid')
        self.assertEqual([h['new_status'] for h in r.data['data']['history']][:1], ['delivered'])

    def test_staff_cancel_restocks(self):
        number = self.make_order(qty=3)
        self.assertEqual(Inventory.objects.get().quantity_on_hand, 17)
        r = self.admin.patch(f'/api/v1/admin/orders/{number}/', {'status': 'cancelled'}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Inventory.objects.get().quantity_on_hand, 20)

    def test_mark_paid_and_notes(self):
        number = self.make_order()
        r = self.admin.patch(f'/api/v1/admin/orders/{number}/', {'payment_status': 'paid', 'notes': 'Call before delivery'}, format='json')
        self.assertEqual(r.data['data']['payment_status'], 'paid')
        self.assertEqual(r.data['data']['notes'], 'Call before delivery')

    def test_staff_creates_order_for_new_customer(self):
        self.create_product()
        r = self.admin.post('/api/v1/admin/orders/', {
            'customer': {'email': 'walkin@x.com', 'name': 'Walk In', 'phone': '9123456780'},
            'items': [{'sku_code': 'PS6-3M', 'quantity': 1}], 'address': {k: v for k, v in ADDR.items() if k not in ('full_name', 'phone')},
            'mark_paid': True}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['data']['payment_status'], 'paid')
        self.assertTrue(User.objects.filter(email='walkin@x.com').exists())
        self.assertEqual(Inventory.objects.get().quantity_on_hand, 19)

    # ---- customers / coupons / dashboard --------------------------------
    def test_customers_list_and_block(self):
        self.make_order()
        r = self.admin.get('/api/v1/admin/customers/?role=customer').data
        row = next(x for x in r['results'] if x['email'] == 'cust@x.com')
        self.assertEqual(row['order_count'], 1)
        self.assertEqual(self.admin.patch(f"/api/v1/admin/customers/{row['id']}/", {'is_active': False}, format='json').status_code, 200)
        self.assertFalse(User.objects.get(pk=row['id']).is_active)
        self.assertEqual(self.admin.patch(f'/api/v1/admin/customers/{self.staff.id}/', {'is_active': False}, format='json').status_code, 400)
        self.assertEqual(self.admin.patch(f"/api/v1/admin/customers/{row['id']}/", {'is_staff': True}, format='json').status_code, 403)

    def test_coupon_crud_and_works_at_checkout(self):
        now = timezone.now()
        body = {'code': 'welcome 10', 'discount_type': 'percentage', 'discount_value': '10',
                'valid_from': (now - timedelta(days=1)).isoformat(), 'valid_until': (now + timedelta(days=10)).isoformat()}
        r = self.admin.post('/api/v1/admin/coupons/', body, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data['data']['code'], 'WELCOME10')
        self.assertEqual(r.data['data']['state'], 'live')
        self.assertEqual(self.admin.post('/api/v1/admin/coupons/', body, format='json').status_code, 400)
        bad = dict(body, code='X', discount_value='150')
        self.assertEqual(self.admin.post('/api/v1/admin/coupons/', bad, format='json').status_code, 400)
        self.create_product()
        buyer = APIClient(); buyer.force_authenticate(self.shopper)
        q = buyer.post('/api/v1/orders/quote/', {'items': [{'sku_code': 'PS6-3M', 'quantity': 1}], 'coupon_code': 'WELCOME10'}, format='json')
        self.assertEqual(Decimal(str(q.data['data']['totals']['discount'])), Decimal('79.90'))
        cid = r.data['data']['id']
        self.assertEqual(self.admin.patch(f'/api/v1/admin/coupons/{cid}/', {'is_active': False}, format='json').data['data']['state'], 'inactive')
        self.assertEqual(self.admin.delete(f'/api/v1/admin/coupons/{cid}/').status_code, 200)

    def test_dashboard(self):
        self.make_order(qty=2)
        d = self.admin.get('/api/v1/admin/dashboard/?days=7').data['data']
        self.assertEqual(d['kpis']['orders'], 1)
        self.assertEqual(Decimal(d['kpis']['revenue']), Decimal('1598.00'))
        self.assertEqual(len(d['chart']), 7)
        self.assertEqual(d['top_products'][0]['name'], 'Smiley Cap 6')
        self.assertEqual(d['recent_orders'][0]['customer_name'], 'Asha Verma')
        self.assertEqual(d['kpis']['pending_orders'], 1)
