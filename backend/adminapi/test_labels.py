"""Tests for shipping labels and bulk printing."""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from core.models import StoreConfig
from inventory.models import Inventory, Warehouse

ADDR = {'full_name': 'Asha Verma', 'phone': '9876543210', 'line1': '5 Park St', 'line2': 'Near City Mall',
        'city': 'Pune', 'state': 'Maharashtra', 'postal_code': '411001'}


class LabelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user('o@shop.com', 'o@shop.com', 'pw123456', is_staff=True, is_superuser=True)
        self.buyer = User.objects.create_user('b@x.com', 'b@x.com', 'pw123456')
        self.admin = APIClient(); self.admin.force_authenticate(self.owner)
        self.shopper = APIClient(); self.shopper.force_authenticate(self.buyer)
        cat = Category.objects.create(name='Boards', slug='boards')
        p = Product.objects.create(category=cat, name='Strip 6', slug='strip', description='d', status='active')
        sku = SKU.objects.create(variant=ProductVariant.objects.create(product=p, name='3m', sku='V1'), sku_code='S-1',
                                 base_price=Decimal('800.00'), mrp=Decimal('900.00'), weight_kg=Decimal('0.450'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=50)
        cfg = StoreConfig.load(); cfg.legal_name = 'Shop Pvt Ltd'; cfg.gstin = '27ABCDE1234F1Z5'; cfg.store_address = '12 MG Road, Gurugram 122001'; cfg.save()

    def place(self, method='cod', qty=2):
        r = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'S-1', 'quantity': qty}], 'address': ADDR, 'payment_method': method}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        return r.data['data']['order']['order_number']

    def test_cod_label_shows_amount_to_collect(self):
        n = self.place('cod')
        d = self.admin.get(f'/api/v1/admin/orders/{n}/label/').data['data']
        self.assertEqual(d['payment_type'], 'COD')
        self.assertEqual(Decimal(d['cod_amount']), Decimal('1600.00'))
        self.assertEqual(d['ship_to']['pincode'], '411001')
        self.assertEqual(d['ship_to']['lines'], ['5 Park St', 'Near City Mall'])
        self.assertEqual(d['from']['name'], 'Shop Pvt Ltd')
        self.assertEqual(d['total_units'], 2)
        self.assertEqual(Decimal(d['weight_kg']), Decimal('0.900'))
        self.assertEqual(d['barcode_value'], n)          # no courier number yet -> order number

    def test_paid_order_is_prepaid_and_barcode_uses_tracking(self):
        n = self.place('cod')
        url = f'/api/v1/admin/orders/{n}/'
        self.admin.patch(url, {'payment_status': 'paid'}, format='json')
        self.admin.patch(url, {'status': 'processing'}, format='json')
        self.admin.patch(url, {'status': 'shipped', 'tracking': {'courier': 'Delhivery', 'tracking_number': '1234567890'}}, format='json')
        d = self.admin.get(f'{url}label/').data['data']
        self.assertEqual(d['payment_type'], 'PREPAID')
        self.assertEqual(d['cod_amount'], '0.00')
        self.assertEqual(d['courier'], 'Delhivery')
        self.assertEqual(d['barcode_value'], '1234567890')

    def test_label_not_for_pending_cancelled_or_delivered(self):
        n = self.place('online')
        self.assertEqual(self.admin.get(f'/api/v1/admin/orders/{n}/label/').status_code, 400)
        m = self.place('cod')
        self.admin.patch(f'/api/v1/admin/orders/{m}/', {'status': 'cancelled'}, format='json')
        self.assertEqual(self.admin.get(f'/api/v1/admin/orders/{m}/label/').status_code, 400)

    def test_bulk_print_labels_and_skips(self):
        a, b = self.place('cod'), self.place('cod')
        pending = self.place('online')
        r = self.admin.get('/api/v1/admin/orders/bulk-print/', {'doc': 'label', 'orders': f'{a},{b},{pending},NOPE'}).data['data']
        self.assertEqual([d['order_number'] for d in r['documents']], [a, b])
        self.assertEqual({s['order_number'] for s in r['skipped']}, {pending, 'NOPE'})

    def test_bulk_print_invoices(self):
        a = self.place('cod')
        r = self.admin.get('/api/v1/admin/orders/bulk-print/', {'doc': 'invoice', 'orders': a}).data['data']
        self.assertEqual(r['documents'][0]['invoice_number'], f'INV-{a}')

    def test_bulk_print_limits_and_permissions(self):
        self.assertEqual(self.admin.get('/api/v1/admin/orders/bulk-print/', {'doc': 'label', 'orders': ''}).status_code, 400)
        many = ','.join(f'X{i}' for i in range(60))
        self.assertEqual(self.admin.get('/api/v1/admin/orders/bulk-print/', {'doc': 'label', 'orders': many}).status_code, 400)
        self.assertEqual(self.admin.get('/api/v1/admin/orders/bulk-print/', {'doc': 'zzz', 'orders': 'a'}).status_code, 400)
        n = self.place('cod')
        self.assertEqual(self.shopper.get('/api/v1/admin/orders/bulk-print/', {'doc': 'label', 'orders': n}).status_code, 403)
        self.assertEqual(self.shopper.get(f'/api/v1/admin/orders/{n}/label/').status_code, 403)
