"""Abandoned online-payment orders are cancelled and their stock goes back on sale."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant, SKU
from inventory.models import Inventory, Warehouse
from orders.expiry import expire_unpaid_orders
from orders.models import Order

ADDRESS = {'full_name': 'Asha Rao', 'phone': '9876543210', 'line1': '12 MG Road',
           'city': 'Gurugram', 'state': 'Haryana', 'postal_code': '122001'}


class ExpireUnpaidOrdersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('a@example.com', 'a@example.com', 'Zq7!trailblazer')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        cat = Category.objects.create(name='Caps', slug='caps')
        product = Product.objects.create(category=cat, name='Cap', slug='cap', description='d', status='active')
        sku = SKU.objects.create(variant=ProductVariant.objects.create(product=product, name='Black', sku='V1'),
                                 sku_code='CC-1', base_price=Decimal('499.00'), mrp=Decimal('699.00'))
        wh = Warehouse.objects.create(name='W', code='W1', address='x', city='c', state='s', postal_code='1')
        self.inv = Inventory.objects.create(sku=sku, warehouse=wh, quantity_on_hand=10)

    def place(self, method):
        res = self.client.post('/api/v1/orders/place/', {'items': [{'sku_code': 'CC-1', 'quantity': 2}],
                                                         'address': ADDRESS, 'payment_method': method}, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        return Order.objects.get(order_number=res.data['data']['order']['order_number'])

    def age(self, order, minutes):
        Order.objects.filter(pk=order.pk).update(created_at=timezone.now() - timedelta(minutes=minutes))

    def stock(self):
        self.inv.refresh_from_db()
        return self.inv.quantity_on_hand

    def test_old_unpaid_online_order_is_cancelled_and_stock_returns(self):
        order = self.place('online')
        self.assertEqual(self.stock(), 8)
        self.age(order, 90)
        self.assertEqual(expire_unpaid_orders(), 1)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')
        self.assertEqual(self.stock(), 10)

    def test_recent_paid_and_cash_on_delivery_orders_are_left_alone(self):
        recent = self.place('online')
        paid = self.place('online')
        self.age(paid, 90)
        Order.objects.filter(pk=paid.pk).update(payment_status='paid', status='confirmed')
        cod = self.place('cod')
        self.age(cod, 500)
        self.assertEqual(expire_unpaid_orders(), 0)
        for o, status in ((recent, 'pending'), (paid, 'confirmed'), (cod, 'confirmed')):
            o.refresh_from_db()
            self.assertEqual(o.status, status)

    def test_command_and_second_run_are_safe(self):
        order = self.place('online')
        self.age(order, 90)
        call_command('expire_unpaid_orders')
        self.assertEqual(self.stock(), 10)
        call_command('expire_unpaid_orders')                 # nothing left to do, nothing doubled
        self.assertEqual(self.stock(), 10)
