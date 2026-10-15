"""Cancel online-payment orders that were never paid, so their stock goes back on sale."""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import Order
from .services import CheckoutError, cancel_order

logger = logging.getLogger(__name__)


def expire_unpaid_orders(older_than_minutes=None):
    """Cancel pending online orders older than the limit. Returns how many were cancelled."""
    minutes = older_than_minutes if older_than_minutes is not None else settings.UNPAID_ORDER_EXPIRY_MINUTES
    cutoff = timezone.now() - timedelta(minutes=minutes)
    stale = (Order.objects.filter(status='pending', payment__payment_method='online', created_at__lt=cutoff)
             .exclude(payment_status='paid'))
    cancelled = 0
    for order in stale:
        try:
            cancel_order(order, None, reason='Online payment was not completed in time')
            cancelled += 1
        except CheckoutError:
            logger.info('Order %s could not be expired (status changed meanwhile)', order.order_number)
        except Exception:
            logger.exception('Could not expire order %s', order.order_number)
    if cancelled:
        logger.info('Cancelled %s unpaid online order(s); stock restored', cancelled)
    return cancelled
