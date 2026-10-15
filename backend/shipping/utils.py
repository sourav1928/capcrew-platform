"""Small helpers for tracking numbers."""

COURIERS = [
    'Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ecom Express', 'Xpressbees', 'Shadowfax', 'FedEx', 'Own delivery',
]

# Only couriers whose public tracking address is well known get an automatic link.
# For others the owner can paste a link, or just give the customer the number.
_TRACKING_URLS = {
    'delhivery': 'https://www.delhivery.com/track/package/{n}',
    'fedex': 'https://www.fedex.com/fedextrack/?trknbr={n}',
}


def auto_tracking_url(courier, number):
    template = _TRACKING_URLS.get((courier or '').strip().lower())
    return template.format(n=number) if template and number else ''


def serialize_shipment(shipment):
    if shipment is None:
        return None
    return {
        'courier': shipment.courier_provider,
        'tracking_number': shipment.tracking_number,
        'tracking_url': shipment.tracking_url or auto_tracking_url(shipment.courier_provider, shipment.tracking_number),
        'status': shipment.status,
        'shipped_at': shipment.shipped_at.isoformat() if shipment.shipped_at else None,
        'estimated_delivery': shipment.estimated_delivery.isoformat() if shipment.estimated_delivery else None,
    }
