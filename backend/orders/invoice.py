"""GST tax invoice built from a saved order (no PDF library needed - the browser prints it)."""
from decimal import Decimal, ROUND_HALF_UP

from core.models import StoreConfig

TWO = Decimal('0.01')


def _q(v):
    return Decimal(v).quantize(TWO, rounding=ROUND_HALF_UP)


_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
         'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']


def _below_thousand(n):
    words = []
    if n >= 100:
        words.append(_ONES[n // 100] + ' hundred')
        n %= 100
    if n >= 20:
        words.append(_TENS[n // 10] + (' ' + _ONES[n % 10] if n % 10 else ''))
    elif n > 0:
        words.append(_ONES[n])
    return ' '.join(words)


def amount_in_words(amount):
    """1234.50 -> 'Rupees One Thousand Two Hundred Thirty Four and Fifty Paise Only' (Indian grouping)."""
    amount = _q(amount)
    rupees, paise = int(amount), int((amount - int(amount)) * 100)
    if rupees == 0 and paise == 0:
        return 'Rupees Zero Only'
    parts = []
    for value, name in ((10_000_000, 'crore'), (100_000, 'lakh'), (1000, 'thousand')):
        if rupees >= value:
            parts.append(_below_thousand(rupees // value) + ' ' + name)
            rupees %= value
    if rupees:
        parts.append(_below_thousand(rupees))
    text = 'Rupees ' + ' '.join(parts).strip() if parts else 'Rupees Zero'
    if paise:
        text += ' and ' + _below_thousand(paise) + ' Paise'
    return ' '.join(w.capitalize() for w in text.split()) + ' Only'


def build_invoice(order):
    cfg = StoreConfig.load()
    items = list(order.items.all().order_by('created_at'))
    ship = next((a for a in order.addresses.all() if a.address_type == 'shipping'), None)
    bill = next((a for a in order.addresses.all() if a.address_type == 'billing'), None) or ship

    subtotal = _q(order.subtotal)
    discount = _q(order.discount_amount)
    shipping = _q(order.shipping_cost)
    tax_total = _q(order.tax_amount)
    total = _q(order.order_total)
    goods_after_discount = subtotal - discount
    inclusive = (goods_after_discount + shipping) == total

    # The rate actually used for this order (so a later change in settings never alters an old invoice)
    base = (goods_after_discount - tax_total) if inclusive else goods_after_discount
    rate = _q(tax_total * 100 / base) if base > 0 else Decimal('0')

    # Share the coupon discount across lines in proportion to their value
    lines, allocated = [], Decimal('0')
    for idx, it in enumerate(items):
        gross = _q(it.line_total)
        if idx == len(items) - 1:
            share = discount - allocated
        else:
            share = _q(discount * gross / subtotal) if subtotal else Decimal('0')
            allocated += share
        net = gross - share
        if inclusive:
            tax = _q(net * rate / (100 + rate)) if rate else Decimal('0')
            taxable = net - tax
        else:
            taxable = net
            tax = _q(net * rate / 100)
        lines.append({'name': it.product_name, 'variant': it.variant_name, 'sku': it.sku_code, 'qty': it.quantity,
                      'rate': _q(it.unit_price), 'discount': share, 'taxable': taxable, 'tax': tax})
    # Make the per-line tax add up exactly to the order's stored tax
    if lines:
        diff = tax_total - sum((l['tax'] for l in lines), Decimal('0'))
        lines[-1]['tax'] += diff
        lines[-1]['taxable'] -= diff if inclusive else Decimal('0')

    buyer_state = (ship.state if ship else '').strip().lower()
    seller_state = (cfg.business_state or '').strip().lower()
    intra = bool(seller_state and buyer_state and seller_state == buyer_state)
    half = _q(tax_total / 2)
    taxable_total = sum((l['taxable'] for l in lines), Decimal('0'))

    def addr(a):
        if not a:
            return None
        return {'name': a.full_name, 'phone': a.phone,
                'lines': [x for x in (a.line1, a.line2, f'{a.city}, {a.state} - {a.postal_code}') if x]}

    payment = getattr(order, 'payment', None)
    when = order.confirmed_at or order.created_at
    return {
        'invoice_number': f'INV-{order.order_number}',
        'order_number': order.order_number,
        'date': when.isoformat(),
        'seller': {
            'name': cfg.legal_name or 'CapCrew',
            'address': cfg.store_address, 'email': cfg.support_email, 'phone': cfg.support_phone,
            'gstin': cfg.gstin, 'state': cfg.business_state,
        },
        'bill_to': addr(bill), 'ship_to': addr(ship),
        'customer_email': order.user.email if order.user else '',
        'payment_method': 'Cash on Delivery' if (payment and payment.payment_method == 'cod') else 'Online payment',
        'payment_status': order.get_payment_status_display(),
        'lines': [{k: (str(v) if isinstance(v, Decimal) else v) for k, v in l.items()} for l in lines],
        'gst_rate': str(rate),
        'tax_type': 'cgst_sgst' if intra else 'igst',
        'cgst': str(half) if intra else '0.00',
        'sgst': str(tax_total - half) if intra else '0.00',
        'igst': '0.00' if intra else str(tax_total),
        'totals': {
            'subtotal': str(subtotal), 'discount': str(discount), 'taxable': str(_q(taxable_total)),
            'tax': str(tax_total), 'shipping': str(shipping), 'total': str(total),
        },
        'prices_include_gst': inclusive,
        'amount_in_words': amount_in_words(total),
        'coupon_code': order.coupon.code if order.coupon else None,
        'note': cfg.invoice_note,
        'is_paid': order.payment_status == 'paid',
        'status': order.status,
    }
