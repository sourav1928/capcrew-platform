"""
Give every SKU some stock so products can be bought.

    python manage.py seed_stock            # add stock only where a SKU has none (default 50 units)
    python manage.py seed_stock --qty 200  # choose the quantity
    python manage.py seed_stock --reset    # set every SKU to exactly --qty
"""
from django.core.management.base import BaseCommand

from catalog.models import SKU
from inventory.models import Inventory, InventoryTransaction, Warehouse


class Command(BaseCommand):
    help = 'Create a default warehouse and stock for all SKUs'

    def add_arguments(self, parser):
        parser.add_argument('--qty', type=int, default=50)
        parser.add_argument('--reset', action='store_true')

    def handle(self, *args, **opts):
        qty = opts['qty']
        warehouse, _ = Warehouse.objects.get_or_create(
            code='MAIN',
            defaults={'name': 'Main Warehouse', 'address': 'Demo warehouse', 'city': 'Gurugram',
                      'state': 'Haryana', 'postal_code': '122001', 'country': 'IN'})
        created = updated = 0
        for sku in SKU.objects.all():
            inv, was_created = Inventory.objects.get_or_create(
                sku=sku, warehouse=warehouse, defaults={'quantity_on_hand': qty})
            if was_created:
                created += 1
                InventoryTransaction.objects.create(
                    inventory=inv, transaction_type='purchase', quantity_change=qty,
                    reference_type='seed', notes='Initial demo stock')
            elif opts['reset']:
                diff = qty - inv.quantity_on_hand
                inv.quantity_on_hand = qty
                inv.quantity_reserved = 0
                inv.save()
                InventoryTransaction.objects.create(
                    inventory=inv, transaction_type='adjustment', quantity_change=diff,
                    reference_type='seed', notes='Stock reset')
                updated += 1
        self.stdout.write(self.style.SUCCESS(f'Stock ready: {created} created, {updated} reset (warehouse {warehouse.code}).'))
