"""Tests: photo upload, tracking numbers, GST invoices, editable homepage/pages."""
import io
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductMedia, ProductVariant, SKU
from core.models import StoreConfig
from inventory.models import Inventory, Warehouse
from orders.invoice import amount_in_words

ADDR = {'full_name': 'Asha Verma', 'phone': '9876543210', 'line1': '5 Park St', 'city': 'Pune',
        'state': 'Maharashtra', 'postal_code': '411001'}
PNG = b'\x89PNG\r\n\x1a\n' + b'0' * 64
TMP = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TMP)
class GrowthTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TMP, ignore_errors=True)

    def setUp(self):
        self.owner = User.objects.create_user('o@shop.com', 'o@shop.com', 'pw123456', is_staff=True, is_superuser=True)
        self.buyer = User.objects.create_user('b@x.com', 'b@x.com', 'pw123456')
        self.admin = APIClient(); self.admin.force_authenticate(self.owner)
        self.shopper = APIClient(); self.shopper.force_authenticate(self.buyer)
        self.cat = Category.objects.create(name='Boards', slug='boards')
        self.product = Product.objects.create(category=self.cat, name='Strip', slug='strip', description='d', status='active')
        sku = SKU.objects.create(variant=ProductVariant.objects.create(product=self.product, name='Std', sku='V1'),
                                 sku_code='STRIP-1', base_price=Decimal('1180.00'), mrp=Decimal('1400.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=50)

    def order(self, qty=1, state='Maharashtra', coupon=''):
        addr = dict(ADDR, state=state)
        r = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'STRIP-1', 'quantity': qty}], 'address': addr,
                                                        'payment_method': 'cod', 'coupon_code': coupon}, format='json')
        self.assertEqual(r.status_code, 201, r.data)
        return r.data['data']['order']['order_number']

    # ---- upload ------------------------------------------------------------
    def test_upload_accepts_real_images_only(self):
        ok = self.admin.post('/api/v1/admin/uploads/', {'file': SimpleUploadedFile('shot.png', PNG, 'image/png')}, format='multipart')
        self.assertEqual(ok.status_code, 201, ok.data)
        self.assertTrue(ok.data['data']['url'].startswith('http'))
        self.assertTrue(ok.data['data']['url'].endswith('.png'))
        fake = self.admin.post('/api/v1/admin/uploads/', {'file': SimpleUploadedFile('virus.png', b'MZ' + b'0' * 50, 'image/png')}, format='multipart')
        self.assertEqual(fake.status_code, 400)
        big = self.admin.post('/api/v1/admin/uploads/', {'file': SimpleUploadedFile('big.png', PNG + b'0' * (5 * 1024 * 1024), 'image/png')}, format='multipart')
        self.assertEqual(big.status_code, 400)
        self.assertEqual(self.shopper.post('/api/v1/admin/uploads/', {'file': SimpleUploadedFile('a.png', PNG)}, format='multipart').status_code, 403)

    def test_product_gallery_order_and_main_photo(self):
        body = {'name': 'Plain Cap', 'category_id': str(self.cat.id), 'status': 'active', 'description': 'x',
                'images': ['https://x.test/a.jpg', 'https://x.test/b.jpg'],
                'options': [{'name': 'Std', 'price': '100', 'mrp': '120', 'stock': 5}]}
        res = self.admin.post('/api/v1/admin/products/', body, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data['data']['images'], ['https://x.test/a.jpg', 'https://x.test/b.jpg'])
        self.assertEqual(res.data['data']['image_url'], 'https://x.test/a.jpg')
        pid = res.data['data']['id']
        res = self.admin.patch(f'/api/v1/admin/products/{pid}/', {'images': ['https://x.test/b.jpg', 'https://x.test/c.jpg']}, format='json')
        self.assertEqual(res.data['data']['images'], ['https://x.test/b.jpg', 'https://x.test/c.jpg'])
        self.assertEqual(ProductMedia.objects.filter(product_id=pid).count(), 2)
        shop = APIClient().get('/api/v1/catalog/products/').data['results']
        self.assertIn('https://x.test/b.jpg', [p['primary_image'] for p in shop])
        bad = self.admin.patch(f'/api/v1/admin/products/{pid}/', {'images': ['javascript:alert(1)']}, format='json')
        self.assertEqual(bad.status_code, 400)

    # ---- tracking ----------------------------------------------------------
    def test_ship_with_tracking_shows_to_customer(self):
        n = self.order()
        url = f'/api/v1/admin/orders/{n}/'
        self.admin.patch(url, {'status': 'processing'}, format='json')
        missing = self.admin.patch(url, {'status': 'shipped', 'tracking': {'courier': 'Delhivery'}}, format='json')
        self.assertEqual(missing.status_code, 400)
        r = self.admin.patch(url, {'status': 'shipped', 'tracking': {'courier': 'Delhivery', 'tracking_number': 'DL12345'}}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data['data']['shipment']['tracking_url'], 'https://www.delhivery.com/track/package/DL12345')
        mine = self.shopper.get(f'/api/v1/orders/{n}/').data
        self.assertEqual(mine['shipment']['courier'], 'Delhivery')
        self.assertEqual(mine['shipment']['tracking_number'], 'DL12345')
        # fix a typo in the number later
        r = self.admin.patch(url, {'tracking': {'courier': 'Delhivery', 'tracking_number': 'DL99999'}}, format='json')
        self.assertEqual(r.data['data']['shipment']['tracking_number'], 'DL99999')
        self.admin.patch(url, {'status': 'delivered'}, format='json')
        self.assertEqual(self.shopper.get(f'/api/v1/orders/{n}/').data['shipment']['status'], 'delivered')

    def test_tracking_number_must_be_unique_and_own_delivery_allowed(self):
        a, b = self.order(), self.order()
        for n in (a, b):
            self.admin.patch(f'/api/v1/admin/orders/{n}/', {'status': 'processing'}, format='json')
        self.admin.patch(f'/api/v1/admin/orders/{a}/', {'status': 'shipped', 'tracking': {'courier': 'DTDC', 'tracking_number': 'X1'}}, format='json')
        dup = self.admin.patch(f'/api/v1/admin/orders/{b}/', {'status': 'shipped', 'tracking': {'courier': 'DTDC', 'tracking_number': 'X1'}}, format='json')
        self.assertEqual(dup.status_code, 400)
        own = self.admin.patch(f'/api/v1/admin/orders/{b}/', {'status': 'shipped', 'tracking': {'courier': 'Own delivery'}}, format='json')
        self.assertEqual(own.status_code, 200, own.data)

    # ---- invoice -----------------------------------------------------------
    def test_invoice_gst_split_same_state_vs_other_state(self):
        cfg = StoreConfig.load(); cfg.legal_name, cfg.gstin, cfg.business_state = 'Shop Pvt Ltd', '27ABCDE1234F1Z5', 'Maharashtra'; cfg.save()
        n = self.order(qty=1)
        inv = self.shopper.get(f'/api/v1/orders/{n}/invoice/').data['data']
        self.assertEqual(inv['tax_type'], 'cgst_sgst')
        self.assertEqual(Decimal(inv['gst_rate']), Decimal('18.00'))
        self.assertEqual(Decimal(inv['totals']['tax']), Decimal('180.00'))
        self.assertEqual(Decimal(inv['cgst']) + Decimal(inv['sgst']), Decimal('180.00'))
        self.assertEqual(Decimal(inv['totals']['taxable']), Decimal('1000.00'))
        self.assertEqual(inv['seller']['gstin'], '27ABCDE1234F1Z5')
        far = self.order(qty=1, state='Karnataka')
        inv2 = self.admin.get(f'/api/v1/admin/orders/{far}/invoice/').data['data']
        self.assertEqual(inv2['tax_type'], 'igst')
        self.assertEqual(Decimal(inv2['igst']), Decimal('180.00'))

    def test_invoice_unchanged_after_gst_setting_changes(self):
        n = self.order()
        before = self.shopper.get(f'/api/v1/orders/{n}/invoice/').data['data']
        self.admin.patch('/api/v1/admin/settings/', {'gst_percent': '5'}, format='json')
        after = self.shopper.get(f'/api/v1/orders/{n}/invoice/').data['data']
        self.assertEqual(before['gst_rate'], after['gst_rate'])
        self.assertEqual(before['totals'], after['totals'])

    def test_invoice_with_discount_adds_up(self):
        from coupons.models import Coupon
        Coupon.objects.create(code='TEN', discount_type='percentage', discount_value=10, valid_from=timezone.now() - timedelta(days=1),
                              valid_until=timezone.now() + timedelta(days=1))
        n = self.order(qty=3, coupon='TEN')
        inv = self.shopper.get(f'/api/v1/orders/{n}/invoice/').data['data']
        t = inv['totals']
        self.assertEqual(Decimal(t['taxable']) + Decimal(t['tax']) + Decimal(t['shipping']), Decimal(t['total']))
        self.assertEqual(sum(Decimal(l['tax']) for l in inv['lines']), Decimal(t['tax']))
        self.assertEqual(sum(Decimal(l['discount']) for l in inv['lines']), Decimal(t['discount']))

    def test_invoice_not_for_unconfirmed_or_other_customer(self):
        n = self.order()
        other = APIClient(); other.force_authenticate(User.objects.create_user('z@z.com', 'z@z.com', 'pw123456'))
        self.assertEqual(other.get(f'/api/v1/orders/{n}/invoice/').status_code, 404)
        res = self.shopper.post('/api/v1/orders/place/', {'items': [{'sku_code': 'STRIP-1', 'quantity': 1}], 'address': ADDR, 'payment_method': 'online'}, format='json')
        pend = res.data['data']['order']['order_number']
        self.assertEqual(self.shopper.get(f'/api/v1/orders/{pend}/invoice/').status_code, 400)

    def test_amount_in_words(self):
        self.assertEqual(amount_in_words(Decimal('1180.00')), 'Rupees One Thousand One Hundred Eighty Only')
        self.assertEqual(amount_in_words(Decimal('100000')), 'Rupees One Lakh Only')
        self.assertEqual(amount_in_words(Decimal('2550.50')), 'Rupees Two Thousand Five Hundred Fifty And Fifty Paise Only')

    def test_business_details_validated(self):
        bad = self.admin.patch('/api/v1/admin/settings/', {'gstin': '123', 'business_state': 'Atlantis'}, format='json')
        self.assertEqual(bad.status_code, 400)
        good = self.admin.patch('/api/v1/admin/settings/', {'legal_name': 'Shop Pvt Ltd', 'gstin': '27abcde1234f1z5', 'business_state': 'maharashtra'}, format='json')
        self.assertEqual(good.status_code, 200, good.data)
        self.assertEqual(good.data['data']['gstin'], '27ABCDE1234F1Z5')
        self.assertEqual(good.data['data']['business_state'], 'Maharashtra')

    # ---- homepage + pages --------------------------------------------------
    def test_banners_show_on_shop_only_when_live(self):
        now = timezone.now()
        mk = lambda **k: self.admin.post('/api/v1/admin/banners/', dict({'title': 'Diwali Sale', 'subtitle': 'Up to 30% off', 'image_url': 'https://x.test/h.jpg',
                                                                         'link_url': '/products', 'button_text': 'Shop now'}, **k), format='json')
        a = mk(); self.assertEqual(a.status_code, 201, a.data)
        mk(title='Later', valid_from=(now + timedelta(days=5)).isoformat())
        mk(title='Old', valid_from=(now - timedelta(days=9)).isoformat(), valid_until=(now - timedelta(days=1)).isoformat())
        off = mk(title='Off', is_active=False)
        home = APIClient().get('/api/v1/cms/home/').data['data']
        self.assertEqual([b['title'] for b in home['banners']], ['Diwali Sale'])
        self.assertEqual(home['banners'][0]['link_url'], '/products')
        bad = mk(title='Bad', link_url='javascript:alert(1)'); self.assertEqual(bad.status_code, 400)
        noimg = mk(title='NoPic', image_url=''); self.assertEqual(noimg.status_code, 400)
        bid = a.data['data']['id']
        self.assertEqual(self.admin.patch(f'/api/v1/admin/banners/{bid}/', {'title': 'Big Sale'}, format='json').data['data']['title'], 'Big Sale')
        self.assertEqual(self.admin.delete(f'/api/v1/admin/banners/{bid}/').status_code, 200)
        self.assertEqual(APIClient().get('/api/v1/cms/home/').data['data']['banners'], [])

    def test_featured_products(self):
        self.assertEqual(APIClient().get('/api/v1/cms/home/').data['data']['featured'], [])
        r = self.admin.put('/api/v1/admin/featured/', {'product_ids': [str(self.product.id)]}, format='json')
        self.assertEqual(r.status_code, 200, r.data)
        feat = APIClient().get('/api/v1/cms/home/').data['data']['featured']
        self.assertEqual(feat[0]['name'], 'Strip')
        self.assertEqual(feat[0]['sku_code'], 'STRIP-1')
        draft = Product.objects.create(category=self.cat, name='Hidden', slug='hidden', description='d', status='draft')
        self.assertEqual(self.admin.put('/api/v1/admin/featured/', {'product_ids': [str(draft.id)]}, format='json').status_code, 400)

    def test_editable_pages(self):
        pages = self.admin.get('/api/v1/admin/pages/').data['data']
        self.assertEqual({p['slug'] for p in pages}, {'about', 'privacy-policy', 'terms-and-conditions'})
        self.assertEqual(APIClient().get('/api/v1/cms/pages/about/').status_code, 404)
        short = self.admin.put('/api/v1/admin/pages/about/', {'content': 'hi', 'is_published': True}, format='json')
        self.assertEqual(short.status_code, 400)
        ok = self.admin.put('/api/v1/admin/pages/about/', {'title': 'About us', 'content': 'We sell comfortable caps since 2010.', 'is_published': True}, format='json')
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertIn('comfortable caps', APIClient().get('/api/v1/cms/pages/about/').data['data']['content'])
        self.admin.put('/api/v1/admin/pages/about/', {'content': 'We sell comfortable caps since 2010.', 'is_published': False}, format='json')
        self.assertEqual(APIClient().get('/api/v1/cms/pages/about/').status_code, 404)
        self.assertEqual(self.admin.put('/api/v1/admin/pages/secret/', {'content': 'x' * 30}, format='json').status_code, 404)

    def test_customers_cannot_use_website_admin(self):
        for m, u in (('get', '/api/v1/admin/banners/'), ('get', '/api/v1/admin/pages/'), ('get', '/api/v1/admin/featured/')):
            self.assertEqual(getattr(self.shopper, m)(u).status_code, 403, u)
