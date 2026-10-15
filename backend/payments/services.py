"""Payment gateway abstraction: Razorpay (when configured) or a built-in test gateway."""
import hashlib
import hmac
import json
import logging
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from orders.models import OrderStatusHistory
from orders.services import CheckoutError, send_confirmation_email
from .models import Payment, PaymentAttempt, PaymentTransaction

logger = logging.getLogger(__name__)


def razorpay_configured():
    return (
        getattr(settings, 'PAYMENT_PROVIDER', 'mock') == 'razorpay'
        and bool(getattr(settings, 'RAZORPAY_KEY_ID', ''))
        and bool(getattr(settings, 'RAZORPAY_KEY_SECRET', ''))
    )


def mock_payments_allowed():
    """The fake gateway always says "paid". It may only run on a developer's computer (ALLOW_MOCK_PAYMENTS)."""
    return getattr(settings, 'PAYMENT_PROVIDER', 'mock') == 'mock' and bool(getattr(settings, 'ALLOW_MOCK_PAYMENTS', False))


def _unavailable():
    return CheckoutError('Online payment is not available right now. Please choose Cash on Delivery or try again later.',
                         'payments_unavailable', status_code=503)


def _client():
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _ensure_payable(order):
    payment = getattr(order, 'payment', None)
    if payment is None or payment.payment_method != 'online':
        raise CheckoutError('This order is not an online-payment order.', 'not_online')
    if payment.status == 'paid':
        raise CheckoutError('This order is already paid.', 'already_paid')
    if order.status not in ('pending',):
        raise CheckoutError('This order can no longer be paid for.', 'not_payable')
    return payment


def create_payment_intent(order):
    """Create a gateway order for the customer to pay. Safe to call again for retries."""
    payment = _ensure_payable(order)
    user = order.user
    amount_paise = int((payment.amount * 100).to_integral_value())
    if razorpay_configured():
        data = _client().order.create({
            'amount': amount_paise, 'currency': payment.currency,
            'receipt': order.order_number, 'payment_capture': 1,
        })
        payment.gateway_order_id = data['id']
        provider = 'razorpay'
    elif mock_payments_allowed():
        payment.gateway_order_id = f'mock_order_{uuid.uuid4().hex[:16]}'
        provider = 'mock'
    else:
        raise _unavailable()
    payment.status = 'pending'
    payment.save(update_fields=['gateway_order_id', 'status', 'updated_at'])
    PaymentAttempt.objects.create(
        payment=payment, attempt_number=payment.attempts.count() + 1, status='pending')
    return {
        'provider': provider,
        'order_number': order.order_number,
        'gateway_order_id': payment.gateway_order_id,
        'amount': payment.amount,
        'amount_paise': amount_paise,
        'currency': payment.currency,
        'key_id': getattr(settings, 'RAZORPAY_KEY_ID', '') if provider == 'razorpay' else '',
        'business_name': getattr(settings, 'BUSINESS_NAME', 'CapCrew'),
        'prefill': {
            'name': (user.first_name or '') if user else '',
            'email': (user.email or '') if user else '',
            'contact': order.shipping_address.phone if order.shipping_address else '',
        },
    }


def _latest_attempt(payment):
    return payment.attempts.order_by('-attempt_number').first()


def confirm_payment(order, gateway_order_id, gateway_payment_id, signature=''):
    """Verify a successful payment and mark the order paid/confirmed. Idempotent."""
    payment = getattr(order, 'payment', None)
    if payment is None:
        raise CheckoutError('Payment not found for this order.', 'payment_not_found', status_code=404)
    if payment.status == 'paid':
        return order
    if not gateway_order_id or gateway_order_id != payment.gateway_order_id:
        raise CheckoutError('Payment details do not match this order.', 'payment_mismatch')

    if razorpay_configured():
        import razorpay
        try:
            _client().utility.verify_payment_signature({
                'razorpay_order_id': gateway_order_id,
                'razorpay_payment_id': gateway_payment_id,
                'razorpay_signature': signature,
            })
        except razorpay.errors.SignatureVerificationError:
            raise CheckoutError('Payment signature could not be verified.', 'bad_signature')
    elif not mock_payments_allowed():
        raise _unavailable()
    # (mock gateway: accepted as-is. It is only reachable when ALLOW_MOCK_PAYMENTS is on, i.e. on a developer's computer.)

    _mark_paid(order, payment, gateway_payment_id or f'mock_pay_{uuid.uuid4().hex[:12]}')
    return order


def _mark_paid(order, payment, gateway_payment_id):
    """Record a successful payment exactly once (safe if the browser callback and the webhook arrive together)."""
    with transaction.atomic():
        locked = Payment.objects.select_for_update().get(pk=payment.pk)
        if locked.status == 'paid':
            return False
        locked.status = 'paid'
        locked.gateway_payment_id = gateway_payment_id
        locked.save(update_fields=['status', 'gateway_payment_id', 'updated_at'])
        PaymentTransaction.objects.create(
            payment=locked, transaction_type='debit', amount=locked.amount,
            gateway_reference_id=gateway_payment_id, response_code='OK',
            response_message='Payment captured')
        attempt = _latest_attempt(locked)
        if attempt:
            attempt.status = 'success'
            attempt.save(update_fields=['status', 'updated_at'])
        old = order.status
        order.payment_status = 'paid'
        order.status = 'confirmed'
        order.confirmed_at = order.confirmed_at or timezone.now()
        order.save()
        OrderStatusHistory.objects.create(
            order=order, old_status=old, new_status='confirmed', reason='Payment received',
            changed_by=order.user)
        transaction.on_commit(lambda: send_confirmation_email(order.id))
    return True


def handle_razorpay_webhook(raw_body, signature):
    """Razorpay tells us a payment succeeded even if the customer closed the browser. Returns (http_status, message)."""
    secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')
    if not secret:
        return 503, 'Webhook is not configured'
    expected = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        return 400, 'Invalid signature'
    try:
        event = json.loads(raw_body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        return 400, 'Invalid body'
    if event.get('event') not in ('payment.captured', 'order.paid'):
        return 200, 'Ignored'
    entity = (((event.get('payload') or {}).get('payment') or {}).get('entity')) or {}
    gateway_order_id, gateway_payment_id = entity.get('order_id'), entity.get('id')
    if not gateway_order_id or not gateway_payment_id:
        return 200, 'Ignored'
    payment = Payment.objects.select_related('order').filter(gateway_order_id=gateway_order_id).first()
    if payment is None:
        return 200, 'Unknown order'
    if payment.status == 'paid':
        return 200, 'Already processed'
    expected_paise = int((payment.amount * 100).to_integral_value())
    if entity.get('status') != 'captured' or int(entity.get('amount') or 0) != expected_paise or entity.get('currency') != payment.currency:
        logger.error('Webhook for order %s does not match the amount/status we expect', payment.order.order_number)
        return 200, 'Mismatch (ignored)'
    order = payment.order
    if order.status != 'pending':
        logger.error('Payment %s was captured for order %s which is %s. Refund it manually.',
                     gateway_payment_id, order.order_number, order.status)
        return 200, 'Order is not pending'
    _mark_paid(order, payment, gateway_payment_id)
    return 200, 'OK'


def record_payment_failure(order, reason='', error_code=''):
    payment = getattr(order, 'payment', None)
    if payment is None or payment.status == 'paid':
        return order
    with transaction.atomic():
        payment.status = 'failed'
        payment.save(update_fields=['status', 'updated_at'])
        attempt = _latest_attempt(payment)
        if attempt:
            attempt.status = 'failed'
            attempt.error_code = str(error_code or '')[:100]
            attempt.error_message = str(reason or '')[:500]
            attempt.save(update_fields=['status', 'error_code', 'error_message', 'updated_at'])
        order.payment_status = 'failed'
        order.save(update_fields=['payment_status', 'updated_at'])
    return order
