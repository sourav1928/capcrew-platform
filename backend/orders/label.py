"""Shipping label data (what goes on the sticker stuck to the outside of the parcel)."""
from decimal import Decimal

from core.models import StoreConfig

LABEL_STATUSES = ('confirmed', 'processing', 'shipped')


def build_label(order):
    cfg = StoreConfig.load()
    ship = next((a for a in order.addresses.all() if a.address_type == 'shipping'), None)
    shipment = getattr(order, 'shipment', None)
    payment = getattr(order, 'payment', None)
    items = list(order.items.all().select_related('sku'))

    weight = Decimal('0')
    weight_known = False
    for it in items:
        w = getattr(it.sku, 'weight_kg', None) if it.sku else None
        if w:
            weight += Decimal(w) * it.quantity
            weight_known = True

    is_cod = bool(payment and payment.payment_method == 'cod' and order.payment_status != 'paid')
    tracking = shipment.tracking_number if shipment and not shipment.tracking_number.startswith('OWN-') else ''
    lines = [x for x in (ship.line1, ship.line2) if x] if ship else []
    seller_name = cfg.legal_name or 'CapCrew'
    return {
        'order_number': order.order_number,
        'invoice_number': f'INV-{order.order_number}',
        'date': (order.confirmed_at or order.created_at).isoformat(),
        'courier': shipment.courier_provider if shipment else '',
        'tracking_number': tracking,
        # the barcode couriers scan: their tracking number once you have it, otherwise your order number
        'barcode_value': tracking or order.order_number,
        'payment_type': 'COD' if is_cod else 'PREPAID',
        'cod_amount': str(Decimal(order.order_total).quantize(Decimal('0.01'))) if is_cod else '0.00',
        'ship_to': {
            'name': ship.full_name if ship else '', 'phone': ship.phone if ship else '',
            'lines': lines, 'city': ship.city if ship else '', 'state': ship.state if ship else '',
            'pincode': ship.postal_code if ship else '',
        },
        'from': {
            'name': seller_name, 'address': cfg.store_address, 'phone': cfg.support_phone,
            'email': cfg.support_email, 'gstin': cfg.gstin,
        },
        'total_units': sum(i.quantity for i in items),
        'items': [{'name': i.product_name, 'variant': i.variant_name, 'qty': i.quantity} for i in items],
        'weight_kg': str(weight.quantize(Decimal('0.001'))) if weight_known else None,
        'status': order.status,
    }
