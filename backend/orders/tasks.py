"""Background job version of the unpaid-order clean-up (only used if you run Celery)."""
from celery import shared_task

from .expiry import expire_unpaid_orders as _expire


@shared_task
def expire_unpaid_orders():
    return _expire()
