"""Store settings the owner can edit from the admin panel."""
import re
from decimal import Decimal

from rest_framework.views import APIView

from core.models import StoreConfig
from .common import IsStoreStaff, fail, ok, raise_if, to_decimal, to_int


def serialize_config(cfg):
    data = cfg.public_dict()
    data.update({
        'announcement_enabled': cfg.announcement_enabled,
        'announcement_text': cfg.announcement_text,
        'legal_name': cfg.legal_name, 'gstin': cfg.gstin,
        'business_state': cfg.business_state, 'invoice_note': cfg.invoice_note,
        'updated_at': cfg.updated_at.isoformat() if cfg.updated_at else None,
        'updated_by': cfg.updated_by.email if cfg.updated_by else None,
    })
    data.pop('announcement', None)
    return data


class StoreSettingsView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        return ok(serialize_config(StoreConfig.load()))

    def patch(self, request):
        # Prices, tax and delivery charges affect every order, so only the owner may change them
        if not request.user.is_superuser:
            return fail('Only the store owner can change store settings.', 403)
        cfg = StoreConfig.load()
        d = request.data
        errors = {}

        def dec(key, label, maximum=None, minimum=Decimal('0')):
            if key not in d:
                return getattr(cfg, key)
            v = to_decimal(d.get(key), key, errors, minimum=minimum)
            if v is not None and maximum is not None and v > maximum:
                errors[key] = f'{label} cannot be more than {maximum}'
                return getattr(cfg, key)
            return getattr(cfg, key) if v is None else v

        gst = dec('gst_percent', 'GST', maximum=Decimal('100'))
        threshold = dec('free_shipping_threshold', 'Free delivery amount')
        fee = dec('shipping_flat_fee', 'Delivery fee')
        cod_max = dec('cod_max_order_value', 'Cash on Delivery limit')
        qty = cfg.max_qty_per_item
        if 'max_qty_per_item' in d:
            parsed = to_int(d.get('max_qty_per_item'), 'max_qty_per_item', errors, minimum=1)
            if parsed is not None and parsed > 1000:
                errors['max_qty_per_item'] = 'That is too high (maximum 1000)'
            elif parsed is not None:
                qty = parsed

        email = str(d.get('support_email', cfg.support_email) or '').strip()
        if email and not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            errors['support_email'] = 'Enter a valid email address'
        phone = str(d.get('support_phone', cfg.support_phone) or '').strip()
        if len(phone) > 30:
            errors['support_phone'] = 'Phone number is too long'
        address = str(d.get('store_address', cfg.store_address) or '').strip()
        if len(address) > 300:
            errors['store_address'] = 'Address is too long (max 300 characters)'
        text = str(d.get('announcement_text', cfg.announcement_text) or '').strip()
        if len(text) > 200:
            errors['announcement_text'] = 'Keep the banner under 200 characters'
        banner_on = bool(d.get('announcement_enabled', cfg.announcement_enabled))
        if banner_on and not text:
            errors['announcement_text'] = 'Type the banner message before switching it on'
        legal = str(d.get('legal_name', cfg.legal_name) or '').strip()
        gstin = str(d.get('gstin', cfg.gstin) or '').strip().upper().replace(' ', '')
        if gstin and not re.match(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$', gstin):
            errors['gstin'] = 'A GSTIN has 15 letters and numbers, like 29ABCDE1234F1Z5'
        state = str(d.get('business_state', cfg.business_state) or '').strip()
        if state:
            from accounts.address_utils import INDIAN_STATES
            match = next((s for s in INDIAN_STATES if s.lower() == state.lower()), None)
            if not match:
                errors['business_state'] = 'Choose a state from the list'
            state = match or state
        note = str(d.get('invoice_note', cfg.invoice_note) or '').strip()
        if len(legal) > 200:
            errors['legal_name'] = 'Name is too long'
        if len(note) > 300:
            errors['invoice_note'] = 'Keep the note under 300 characters'
        raise_if(errors)

        cfg.legal_name, cfg.gstin, cfg.business_state, cfg.invoice_note = legal, gstin, state, note
        cfg.gst_percent, cfg.free_shipping_threshold, cfg.shipping_flat_fee = gst, threshold, fee
        cfg.cod_max_order_value, cfg.max_qty_per_item = cod_max, qty
        for flag in ('prices_include_gst', 'cod_enabled', 'online_payments_enabled'):
            if flag in d:
                setattr(cfg, flag, bool(d.get(flag)))
        cfg.support_email, cfg.support_phone, cfg.store_address = email, phone, address
        cfg.announcement_enabled, cfg.announcement_text = banner_on, text
        cfg.updated_by = request.user
        cfg.save()
        return ok(serialize_config(cfg), 'Settings saved')
