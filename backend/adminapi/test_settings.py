"""Tests for editable store settings (GST, delivery, COD, banner)."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from core.models import StoreConfig
from inventory.models import Inventory, Warehouse

ADDR = {'full_name': 'Asha Verma', 'phone': '9876543210', 'line1': '5 Park St', 'city': 'Pune',
        'state': 'Maharashtra', 'postal_code': '411001'}


class StoreSettingsTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user('owner@shop.com', 'owner@shop.com', 'pw123456', is_staff=True, is_superuser=True)
        self.staff = User.objects.create_user('staff@shop.com', 'staff@shop.com', 'pw123456', is_staff=True)
        self.buyer = User.objects.create_user('b@x.com', 'b@x.com', 'pw123456')
        self.admin = APIClient(); self.admin.force_authenticate(self.owner)
        self.shopper = APIClient(); self.shopper.force_authenticate(self.buyer)
        cat = Category.objects.create(name='Boards', slug='boards')
        product = Product.objects.create(category=cat, name='Strip', slug='strip', description='d', status='active')
        sku = SKU.objects.create(variant=ProductVariant.objects.create(product=product, name='Std', sku='V1'),
                                 sku_code='STRIP-1', base_price=Decimal('1000.00'), mrp=Decimal('1200.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=50)

    def quote(self, qty=1, code=''):
        r = self.shopper.post('/api/v1/orders/quote/', {'items': [{'sku_code': 'STRIP-1', 'quantity': qty}], 'coupon_code': code}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        return r.data['data']

    def test_public_config_has_defaults(self):
        d = APIClient().get('/api/v1/store/config/').data['data']
        self.assertEqual(Decimal(d['gst_percent']), Decimal('18'))
        self.assertEqual(Decimal(d['free_shipping_threshold']), Decimal('500'))
        self.assertEqual(Decimal(d['shipping_flat_fee']), Decimal('50'))
        self.assertTrue(d['cod_enabled'])
        self.assertEqual(d['announcement'], '')

    def test_only_staff_can_read_and_only_owner_can_change(self):
        self.assertEqual(self.shopper.get('/api/v1/admin/settings/').status_code, 403)
        staff = APIClient(); staff.force_authenticate(self.staff)
        self.assertEqual(staff.get('/api/v1/admin/settings/').status_code, 200)
        self.assertEqual(staff.patch('/api/v1/admin/settings/', {'gst_percent': 5}, format='json').status_code, 403)
        self.assertEqual(self.admin.patch('/api/v1/admin/settings/', {'gst_percent': 5}, format='json').status_code, 200)

    def test_gst_change_inclusive_shows_different_tax_same_total(self):
        before = self.quote()['totals']
        self.assertEqual(Decimal(str(before['gst_amount'])), Decimal('152.54'))
        self.admin.patch('/api/v1/admin/settings/', {'gst_percent': '5'}, format='json')
        after = self.quote()['totals']
        self.assertEqual(Decimal(str(after['gst_amount'])), Decimal('47.62'))
        self.assertEqual(Decimal(str(after['total'])), Decimal(str(before['total'])))
        self.assertTrue(after['prices_include_gst'])

    def test_gst_added_on_top_changes_total(self):
        self.admin.patch('/api/v1/admin/settings/', {'gst_percent': '10', 'prices_include_gst': False}, format='json')
        t = self.quote()['totals']
        self.assertEqual(Decimal(str(t['gst_amount'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(t['total'])), Decimal('1100.00'))
        res = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'STRIP-1', 'quantity': 1}],
                                                          'address': ADDR, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        order = res.data['data']['order']
        self.assertEqual(Decimal(str(order['order_total'])), Decimal('1100.00'))
        self.assertFalse(order['prices_include_gst'])
        self.assertEqual(Decimal(str(order['tax_amount'])), Decimal('100.00'))

    def test_free_delivery_and_fee_are_editable(self):
        self.admin.patch('/api/v1/admin/settings/', {'free_shipping_threshold': '2000', 'shipping_flat_fee': '99'}, format='json')
        t = self.quote()['totals']
        self.assertEqual(Decimal(str(t['shipping'])), Decimal('99.00'))
        self.assertEqual(Decimal(str(t['total'])), Decimal('1099.00'))
        self.assertEqual(Decimal(str(self.quote(qty=3)['totals']['shipping'])), Decimal('0.00'))

    def test_cod_can_be_limited_or_switched_off(self):
        self.admin.patch('/api/v1/admin/settings/', {'cod_max_order_value': '500'}, format='json')
        opts = {o['id']: o for o in self.quote()['payment_options']}
        self.assertFalse(opts['cod']['enabled'])
        self.assertIn('500', opts['cod']['reason'])
        self.admin.patch('/api/v1/admin/settings/', {'cod_max_order_value': '100000', 'cod_enabled': False}, format='json')
        res = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'STRIP-1', 'quantity': 1}],
                                                          'address': ADDR, 'payment_method': 'cod'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'cod_unavailable')

    def test_online_payment_can_be_switched_off(self):
        self.admin.patch('/api/v1/admin/settings/', {'online_payments_enabled': False}, format='json')
        res = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'STRIP-1', 'quantity': 1}],
                                                          'address': ADDR, 'payment_method': 'online'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data['code'], 'online_unavailable')

    def test_max_quantity_per_item_is_editable(self):
        self.admin.patch('/api/v1/admin/settings/', {'max_qty_per_item': 2}, format='json')
        q = self.quote(qty=5)
        self.assertFalse(q['can_place'])
        self.assertEqual(q['issues'][0]['available_quantity'], 2)

    def test_validation(self):
        bad = self.admin.patch('/api/v1/admin/settings/', {
            'gst_percent': '150', 'shipping_flat_fee': '-5', 'max_qty_per_item': 0, 'support_email': 'nope',
            'announcement_enabled': True, 'announcement_text': ''}, format='json')
        self.assertEqual(bad.status_code, 400)
        errs = bad.data['errors'] if 'errors' in bad.data else bad.data
        for key in ('gst_percent', 'shipping_flat_fee', 'max_qty_per_item', 'support_email', 'announcement_text'):
            self.assertIn(key, errs, key)
        self.assertEqual(StoreConfig.load().gst_percent, Decimal('18'))   # nothing was saved

    def test_announcement_banner(self):
        self.admin.patch('/api/v1/admin/settings/', {'announcement_enabled': True, 'announcement_text': 'Diwali sale: 10% off'}, format='json')
        self.assertEqual(APIClient().get('/api/v1/store/config/').data['data']['announcement'], 'Diwali sale: 10% off')
        self.admin.patch('/api/v1/admin/settings/', {'announcement_enabled': False}, format='json')
        self.assertEqual(APIClient().get('/api/v1/store/config/').data['data']['announcement'], '')

    def test_settings_row_cannot_be_duplicated_or_deleted(self):
        StoreConfig.load().delete()
        self.assertEqual(StoreConfig.objects.count(), 1)
        StoreConfig(gst_percent=3).save()
        self.assertEqual(StoreConfig.objects.count(), 1)
