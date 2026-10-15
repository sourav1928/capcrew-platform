"""Address validation helpers shared by accounts and checkout."""
import re

INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
    'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
    'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
    'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]


class AddressValidationError(Exception):
    def __init__(self, errors):
        super().__init__('Please correct the highlighted address fields.')
        self.errors = errors


def clean_address(data):
    """Validate and normalise an Indian shipping address. Returns a dict of model fields."""
    data = data or {}
    errors = {}

    def text(key, label, max_len, required=True):
        value = re.sub(r'\s+', ' ', str(data.get(key) or '')).strip()
        if required and not value:
            errors[key] = f'{label} is required'
        elif len(value) > max_len:
            errors[key] = f'{label} is too long'
        return value

    full_name = text('full_name', 'Full name', 255)
    if full_name and len(full_name) < 2:
        errors['full_name'] = 'Enter your full name'
    line1 = text('line1', 'Address', 255)
    line2 = text('line2', 'Address line 2', 255, required=False)
    city = text('city', 'City', 100)
    state = text('state', 'State', 100)
    if state and state.lower() not in {s.lower() for s in INDIAN_STATES}:
        errors['state'] = 'Select a valid state'
    else:
        state = next((s for s in INDIAN_STATES if s.lower() == state.lower()), state)

    phone_raw = re.sub(r'[\s\-()]', '', str(data.get('phone') or ''))
    phone_raw = re.sub(r'^(\+?91|0)', '', phone_raw) if len(phone_raw) > 10 else phone_raw
    if not phone_raw:
        errors['phone'] = 'Phone number is required'
    elif not re.fullmatch(r'[6-9]\d{9}', phone_raw):
        errors['phone'] = 'Enter a valid 10-digit mobile number'

    postal = str(data.get('postal_code') or '').strip()
    if not postal:
        errors['postal_code'] = 'PIN code is required'
    elif not re.fullmatch(r'[1-9]\d{5}', postal):
        errors['postal_code'] = 'Enter a valid 6-digit PIN code'

    address_type = data.get('address_type') or 'both'
    if address_type not in ('billing', 'shipping', 'both'):
        address_type = 'both'

    if errors:
        raise AddressValidationError(errors)

    return {
        'full_name': full_name, 'phone': phone_raw, 'line1': line1, 'line2': line2,
        'city': city, 'state': state, 'postal_code': postal, 'country': 'IN',
        'address_type': address_type,
    }


def find_or_create_address(user, cleaned):
    """Re-use an identical saved address, otherwise create one (first one becomes default)."""
    from .models import Address
    match = Address.objects.filter(
        user=user, full_name=cleaned['full_name'], phone=cleaned['phone'], line1=cleaned['line1'],
        line2=cleaned['line2'], city=cleaned['city'], state=cleaned['state'],
        postal_code=cleaned['postal_code'],
    ).first()
    if match:
        return match
    is_first = not Address.objects.filter(user=user).exists()
    return Address.objects.create(user=user, is_default=is_first, **cleaned)
