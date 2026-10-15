"""
Seed data for development - DEMO DATA ONLY (CapCrew caps store)
Run with: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from catalog.models import Category, Product, ProductVariant, SKU, ProductAttribute


def _desc(intro, features):
    items = ''.join(f'<li>{f}</li>' for f in features)
    return (f'<p>{intro}</p><p><strong>Key Features:</strong></p><ul>{items}</ul>'
            '<p><em>DEMO DATA - details to be verified before production launch.</em></p>')


def _cap_attrs(material, brim, closure, extra=None):
    attrs = [
        {'name': 'Material', 'value': material, 'unit': ''},
        {'name': 'Brim', 'value': brim, 'unit': ''},
        {'name': 'Closure', 'value': closure, 'unit': ''},
        {'name': 'Fit', 'value': 'Adjustable (54-60 cm)', 'unit': ''},
        {'name': 'Care', 'value': 'Hand wash cold, air dry', 'unit': ''},
    ]
    return attrs + (extra or [])


def _variants(prefix, colours, base, mrp, size=''):
    out = []
    for name, code in colours:
        label = f'{name} - {size}' if size else name
        out.append({'name': label, 'sku': f'{prefix}-{code}' + (f'-{size[:1].upper()}' if size else ''),
                    'base_price': base, 'mrp': mrp})
    return out


COLOURS = [('Black', 'BLK'), ('Navy', 'NVY'), ('White', 'WHT'), ('Olive', 'OLV')]


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding demo data...')

        solid = Category.objects.get_or_create(slug='solid-caps', defaults={
            'name': 'Solid Caps', 'display_order': 1,
            'description': 'Classic single-colour caps for everyday wear'})[0]
        smiley = Category.objects.get_or_create(slug='smiley-caps', defaults={
            'name': 'Smiley Caps', 'display_order': 2,
            'description': 'Fun smiley-face caps for kids and adults'})[0]
        trucker = Category.objects.get_or_create(slug='snapback-trucker-caps', defaults={
            'name': 'Snapback & Trucker Caps', 'display_order': 3,
            'description': 'Flat-brim snapbacks and mesh-back trucker caps'})[0]
        self.stdout.write(self.style.SUCCESS('Categories created'))

        common = {'manufacturer': 'CapCrew Manufacturing Pvt. Ltd.', 'country_of_origin': 'IN', 'status': 'active'}
        products_data = [
            {**common, 'category': solid, 'brand': 'CapCrew',
             'name': 'Classic Solid Baseball Cap', 'slug': 'classic-solid-baseball-cap',
             'short_description': 'Everyday 6-panel cotton cap in a clean solid colour',
             'description': _desc('The Classic Solid Baseball Cap is the one you will wear with everything.',
                                  ['100% cotton twill', 'Pre-curved brim', 'Adjustable metal buckle strap',
                                   'Breathable eyelets', 'Soft inner sweatband']),
             'attributes': _cap_attrs('100% Cotton Twill', 'Curved', 'Metal buckle strap', [{'name': 'Panels', 'value': '6', 'unit': ''}]),
             'variants': _variants('CC-SOL', COLOURS, '349.00', '599.00')},
            {**common, 'category': solid, 'brand': 'CapCrew',
             'name': 'Washed Cotton Dad Cap', 'slug': 'washed-cotton-dad-cap',
             'short_description': 'Soft washed-cotton dad cap with a relaxed, low-profile fit',
             'description': _desc('A relaxed, lived-in dad cap that is comfortable from the first wear.',
                                  ['Washed cotton for a soft feel', 'Low-profile unstructured crown',
                                   'Adjustable strap', 'Tonal stitching']),
             'attributes': _cap_attrs('Washed Cotton', 'Curved', 'Fabric strap with brass clip', [{'name': 'Crown', 'value': 'Unstructured', 'unit': ''}]),
             'variants': _variants('CC-DAD', [('Beige', 'BEG'), ('Maroon', 'MRN'), ('Grey', 'GRY')], '449.00', '699.00')},
            {**common, 'category': smiley, 'brand': 'SunnySide',
             'name': 'Smiley Face Cap', 'slug': 'smiley-face-cap',
             'short_description': 'Embroidered smiley face on a soft cotton cap',
             'description': _desc('Bring a smile wherever you go with this embroidered smiley face cap.',
                                  ['Embroidered smiley on the front', 'Cotton twill body', 'Curved brim',
                                   'Adjustable strap', 'Fade-resistant thread']),
             'attributes': _cap_attrs('Cotton Twill', 'Curved', 'Adjustable strap', [{'name': 'Design', 'value': 'Embroidered smiley', 'unit': ''}]),
             'variants': _variants('CC-SMI', [('Yellow', 'YLW'), ('Black', 'BLK'), ('White', 'WHT')], '399.00', '699.00')},
            {**common, 'category': smiley, 'brand': 'SunnySide',
             'name': 'Kids Smiley Cap', 'slug': 'kids-smiley-cap',
             'short_description': 'Soft, lightweight smiley cap sized for kids',
             'description': _desc('A cheerful, lightweight cap made for little heads.',
                                  ['Smaller kids fit', 'Soft cotton, gentle on the forehead', 'Embroidered smiley',
                                   'Easy hook-and-loop adjustment']),
             'attributes': [
                 {'name': 'Material', 'value': 'Soft Cotton', 'unit': ''}, {'name': 'Brim', 'value': 'Curved', 'unit': ''},
                 {'name': 'Closure', 'value': 'Hook and loop', 'unit': ''},
                 {'name': 'Fit', 'value': 'Kids (50-54 cm)', 'unit': ''}, {'name': 'Care', 'value': 'Hand wash cold, air dry', 'unit': ''}],
             'variants': _variants('CC-KID', [('Yellow', 'YLW'), ('Sky Blue', 'SKY'), ('Pink', 'PNK')], '299.00', '499.00')},
            {**common, 'category': smiley, 'brand': 'SunnySide',
             'name': 'Retro Smiley Trucker Cap', 'slug': 'retro-smiley-trucker-cap',
             'short_description': 'Mesh-back trucker cap with a retro smiley patch',
             'description': _desc('A breathable trucker cap with a retro smiley patch on the front.',
                                  ['Mesh back for airflow', 'Foam front panel', 'Retro smiley patch', 'Snap closure']),
             'attributes': _cap_attrs('Polyester Mesh + Foam Front', 'Curved', 'Snap closure', [{'name': 'Design', 'value': 'Retro smiley patch', 'unit': ''}]),
             'variants': _variants('CC-RST', [('Yellow/White', 'YW'), ('Black/Yellow', 'BY')], '449.00', '749.00')},
            {**common, 'category': trucker, 'brand': 'ClassicLid',
             'name': 'Flat Brim Snapback Cap', 'slug': 'flat-brim-snapback-cap',
             'short_description': 'Structured flat-brim snapback in bold solid colours',
             'description': _desc('A structured snapback with a flat brim and a street-ready shape.',
                                  ['Structured 6-panel crown', 'Flat brim', 'Snapback closure', 'Embroidered eyelets']),
             'attributes': _cap_attrs('Acrylic Wool Blend', 'Flat', 'Snapback', [{'name': 'Crown', 'value': 'Structured', 'unit': ''}]),
             'variants': _variants('CC-SNB', [('Black', 'BLK'), ('Red', 'RED'), ('Royal Blue', 'RBL')], '499.00', '799.00')},
            {**common, 'category': trucker, 'brand': 'ClassicLid',
             'name': 'Sports Mesh Trucker Cap', 'slug': 'sports-mesh-trucker-cap',
             'short_description': 'Lightweight mesh trucker cap for sun and sport',
             'description': _desc('A light, airy trucker cap for runs, rides and sunny days.',
                                  ['Full mesh back', 'Quick-dry sweatband', 'Pre-curved brim', 'Adjustable snap back']),
             'attributes': _cap_attrs('Polyester Mesh', 'Curved', 'Snap closure', [{'name': 'Season', 'value': 'Summer', 'unit': ''}]),
             'variants': _variants('CC-SMT', [('Black', 'BLK'), ('Grey', 'GRY'), ('Navy', 'NVY')], '399.00', '649.00')},
        ]

        for pd in products_data:
            attrs = pd.pop('attributes', [])
            variants = pd.pop('variants', [])
            product, created = Product.objects.get_or_create(slug=pd['slug'], defaults=pd)
            if created:
                for i, attr in enumerate(attrs):
                    ProductAttribute.objects.create(product=product, display_order=i, **attr)
                for vd in variants:
                    variant = ProductVariant.objects.create(product=product, name=vd['name'], sku=vd['sku'])
                    SKU.objects.create(variant=variant, sku_code=vd['sku'], base_price=vd['base_price'], mrp=vd['mrp'])
                self.stdout.write(self.style.SUCCESS(f'  Created: {product.name}'))
            else:
                self.stdout.write(f'  Already exists: {product.name}')

        self.stdout.write(self.style.SUCCESS('\nDemo data seeded successfully!'))
        self.stdout.write(self.style.WARNING('This is DEMO DATA. Do not use in production without verification.'))
