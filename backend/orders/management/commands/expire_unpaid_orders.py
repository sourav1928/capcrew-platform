"""Run this every 10 minutes (cron) on a live site:  python manage.py expire_unpaid_orders"""
from django.core.management.base import BaseCommand

from orders.expiry import expire_unpaid_orders


class Command(BaseCommand):
    help = 'Cancel online-payment orders that were not paid in time and put their stock back on sale.'

    def add_arguments(self, parser):
        parser.add_argument('--minutes', type=int, default=None,
                            help='Override UNPAID_ORDER_EXPIRY_MINUTES (default 60).')

    def handle(self, *args, **opts):
        count = expire_unpaid_orders(opts['minutes'])
        self.stdout.write(self.style.SUCCESS(f'Cancelled {count} unpaid online order(s).'))
