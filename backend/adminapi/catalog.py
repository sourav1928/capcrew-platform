"""Products, categories and stock for store staff."""
import re
import uuid

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.views import APIView

from catalog.models import Category, Product, ProductMedia, ProductVariant, SKU
from inventory.models import Inventory, InventoryTransaction, Warehouse
from .common import IsStoreStaff, fail, ok, paginate, raise_if, to_decimal, to_int

LOW_STOCK = 10


def default_warehouse():
    wh = Warehouse.objects.filter(is_active=True).order_by('created_at').first()
    if wh:
        return wh
    return Warehouse.objects.create(
        name='Main Warehouse', code='MAIN', address='Main warehouse', city='-', state='-',
        postal_code='000000', country='IN')


def sku_stock(sku):
    return sum(max(0, i.quantity_on_hand - i.quantity_reserved) for i in sku.inventory.all())


def unique_slug(model, text, exclude_pk=None):
    base = slugify(text)[:200] or 'item'
    slug, n = base, 2
    while model.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
        slug, n = f'{base}-{n}', n + 1
    return slug


def product_qs():
    return (Product.objects.select_related('category')
            .prefetch_related('variants__skus__inventory', 'media'))


def serialize_product(p, detail=False):
    skus = [(v, s) for v in p.variants.all() for s in v.skus.all()]
    prices = [s.base_price for _, s in skus]
    stock = sum(sku_stock(s) for _, s in skus)
    image = next((m.file_url for m in p.media.all() if m.media_type == 'image' and m.is_primary), None) \
        or next((m.file_url for m in p.media.all() if m.media_type == 'image'), None)
    data = {
        'id': str(p.id), 'name': p.name, 'slug': p.slug, 'brand': p.brand, 'status': p.status,
        'category_id': str(p.category_id), 'category_name': p.category.name, 'image_url': image,
        'min_price': str(min(prices)) if prices else None,
        'max_price': str(max(prices)) if prices else None,
        'total_stock': stock, 'option_count': len(skus),
        'stock_state': 'out' if stock <= 0 else ('low' if stock <= LOW_STOCK else 'ok'),
        'created_at': p.created_at.isoformat(),
    }
    if detail:
        data.update({
            'images': [m.file_url for m in sorted((m for m in p.media.all() if m.media_type == 'image'),
                                                  key=lambda m: (not m.is_primary, m.display_order))],
            'description': p.description, 'short_description': p.short_description,
            'options': [{
                'variant_id': str(v.id), 'sku_id': str(s.id), 'name': v.name, 'sku_code': s.sku_code,
                'price': str(s.base_price), 'mrp': str(s.mrp), 'stock': sku_stock(s),
                'active': s.status == 'active' and v.is_active,
            } for v, s in skus],
        })
    return data


def clean_product(d, creating):
    errors = {}
    name = str(d.get('name') or '').strip()
    if not name:
        errors['name'] = 'Product name is required'
    category = Category.objects.filter(pk=d.get('category_id')).first() if d.get('category_id') else None
    if not category:
        errors['category_id'] = 'Choose a category'
    status = d.get('status') or 'draft'
    if status not in ('draft', 'active', 'discontinued'):
        errors['status'] = 'Invalid status'
    image = str(d.get('image_url') or '').strip()
    if image and not re.match(r'^https?://', image):
        errors['image_url'] = 'Image link must start with http:// or https://'
    images = d.get('images')
    if images is not None:
        if not isinstance(images, list) or len(images) > 8:
            errors['images'] = 'Add up to 8 photos'
        else:
            images = [str(u).strip() for u in images if str(u).strip()]
            if any(not re.match(r'^https?://', u) or len(u) > 500 for u in images):
                errors['images'] = 'One of the photos has an invalid link'
    options = d.get('options')
    if creating and not options:
        errors['options'] = 'Add at least one price option'
    cleaned_options = []
    seen = set()
    for idx, o in enumerate(options or []):
        oe = {}
        price = to_decimal(o.get('price'), 'price', oe, minimum=0)
        mrp = to_decimal(o.get('mrp') or o.get('price'), 'mrp', oe, minimum=0)
        stock = to_int(o.get('stock', 0), 'stock', oe, minimum=0)
        if price is not None and price <= 0:
            oe['price'] = 'Price must be greater than 0'
        if price is not None and mrp is not None and mrp < price:
            oe['mrp'] = 'MRP cannot be lower than the selling price'
        code = str(o.get('sku_code') or '').strip().upper()
        if code:
            if code in seen:
                oe['sku_code'] = 'Duplicate code'
            seen.add(code)
        if oe:
            errors[f'options.{idx}'] = oe
        cleaned_options.append({
            'sku_id': o.get('sku_id'), 'name': str(o.get('name') or 'Standard').strip()[:255] or 'Standard',
            'sku_code': code, 'price': price, 'mrp': mrp, 'stock': stock, 'active': o.get('active', True) is not False,
        })
    raise_if(errors)
    return {
        'name': name[:255], 'category': category, 'status': status, 'image': image, 'images': images,
        'brand': str(d.get('brand') or '').strip()[:255],
        'description': str(d.get('description') or '').strip() or name,
        'short_description': str(d.get('short_description') or '').strip()[:500],
        'options': cleaned_options if options is not None else None,
    }


def set_stock(sku, quantity, staff, note='Stock set from admin panel'):
    inv = Inventory.objects.select_for_update().filter(sku=sku, warehouse__is_active=True).order_by('created_at').first()
    if not inv:
        inv = Inventory.objects.create(sku=sku, warehouse=default_warehouse(), quantity_on_hand=0)
    diff = quantity - inv.quantity_on_hand
    if diff == 0:
        return inv
    inv.quantity_on_hand = quantity
    inv.save()
    InventoryTransaction.objects.create(
        inventory=inv, transaction_type='adjustment' if diff else 'purchase', quantity_change=diff,
        reference_type='admin', notes=note, created_by=staff)
    return inv


def apply_options(product, options, staff):
    existing = {str(s.id): s for v in product.variants.all() for s in v.skus.all()}
    kept = set()
    for o in options:
        sku = existing.get(str(o['sku_id'])) if o.get('sku_id') else None
        code = o['sku_code'] or f"CC-{slugify(product.name)[:12].upper()}-{uuid.uuid4().hex[:5].upper()}"
        if sku:
            variant = sku.variant
            variant.name, variant.is_active = o['name'], o['active']
            variant.save()
            if SKU.objects.filter(sku_code=code).exclude(pk=sku.pk).exists():
                code = sku.sku_code
            sku.sku_code, sku.base_price, sku.mrp = code, o['price'], o['mrp']
            sku.status = 'active' if o['active'] else 'inactive'
            sku.save()
        else:
            if SKU.objects.filter(sku_code=code).exists() or ProductVariant.objects.filter(sku=code).exists():
                code = f'{code}-{uuid.uuid4().hex[:4].upper()}'
            variant = ProductVariant.objects.create(product=product, name=o['name'], sku=code, is_active=o['active'])
            sku = SKU.objects.create(variant=variant, sku_code=code, base_price=o['price'], mrp=o['mrp'],
                                     status='active' if o['active'] else 'inactive')
        set_stock(sku, o['stock'], staff, 'Stock set from product form')
        kept.add(str(sku.id))
    # options removed in the form are switched off (kept in the database so old orders stay intact)
    for sid, sku in existing.items():
        if sid not in kept:
            sku.status = 'inactive'
            sku.save()


def apply_images(product, urls):
    """Make the product's photos exactly this list (first one is the main photo)."""
    existing = {m.file_url: m for m in product.media.filter(media_type='image')}
    keep = set(urls)
    for url, media in existing.items():
        if url not in keep:
            media.delete()
    for order, url in enumerate(urls):
        media = existing.get(url)
        if media:
            media.display_order, media.is_primary = order, order == 0
            media.save()
        else:
            ProductMedia.objects.create(product=product, media_type='image', file_url=url, alt_text=product.name,
                                        is_primary=order == 0, display_order=order)


def apply_image(product, url):
    if url == '' or url is None:
        return
    media = product.media.filter(media_type='image').order_by('-is_primary', 'display_order').first()
    if media:
        if media.file_url != url:
            media.file_url = url
            media.save()
    else:
        ProductMedia.objects.create(product=product, media_type='image', file_url=url, alt_text=product.name,
                                    is_primary=True, display_order=0)


class ProductListCreateView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        qs = product_qs().order_by('-created_at')
        p = request.query_params
        if p.get('status') and p['status'] != 'all':
            qs = qs.filter(status=p['status'])
        if p.get('category') and p['category'] != 'all':
            qs = qs.filter(category_id=p['category'])
        search = (p.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(brand__icontains=search)
                           | Q(variants__skus__sku_code__icontains=search)).distinct()
        stock = p.get('stock')
        if stock in ('low', 'out'):
            items = [x for x in qs if serialize_product(x)['stock_state'] == stock]
            return paginate(items, request, serialize_product)
        return paginate(qs, request, serialize_product)

    @transaction.atomic
    def post(self, request):
        c = clean_product(request.data, creating=True)
        product = Product.objects.create(
            category=c['category'], name=c['name'], slug=unique_slug(Product, c['name']),
            description=c['description'], short_description=c['short_description'],
            brand=c['brand'], status=c['status'])
        apply_options(product, c['options'], request.user)
        if c['images'] is not None:
            apply_images(product, c['images'])
        else:
            apply_image(product, c['image'])
        return ok(serialize_product(product_qs().get(pk=product.pk), detail=True), 'Product created', status=201)


class ProductDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def get_obj(self, pk):
        return product_qs().filter(pk=pk).first()

    def get(self, request, pk):
        p = self.get_obj(pk)
        return ok(serialize_product(p, detail=True)) if p else fail('Product not found', 404)

    @transaction.atomic
    def patch(self, request, pk):
        product = self.get_obj(pk)
        if not product:
            return fail('Product not found', 404)
        merged = {
            'name': product.name, 'category_id': product.category_id, 'status': product.status,
            'brand': product.brand, 'description': product.description,
            'short_description': product.short_description, **request.data,
        }
        c = clean_product(merged, creating=False)
        product.name, product.category, product.status = c['name'], c['category'], c['status']
        product.brand, product.description, product.short_description = c['brand'], c['description'], c['short_description']
        product.save()
        if c['options'] is not None:
            apply_options(product, c['options'], request.user)
        if 'images' in request.data and c['images'] is not None:
            apply_images(product, c['images'])
        elif 'image_url' in request.data:
            apply_image(product, c['image'])
        return ok(serialize_product(product_qs().get(pk=product.pk), detail=True), 'Product saved')

    def delete(self, request, pk):
        product = Product.objects.filter(pk=pk).first()
        if not product:
            return fail('Product not found', 404)
        # Old orders keep their own copy of the product name/price, so a soft delete is safe
        product.status = 'discontinued'
        product.soft_delete()
        return ok(message='Product removed from the store')


# ---------------------------------------------------------------- categories
def serialize_category(c):
    return {
        'id': str(c.id), 'name': c.name, 'slug': c.slug, 'description': c.description,
        'is_active': c.is_active, 'display_order': c.display_order,
        'product_count': Product.objects.filter(category=c).count(),
    }


def save_category(c, d, creating):
    errors = {}
    name = str(d.get('name', c.name if (not c._state.adding) else '') or '').strip()
    if not name:
        errors['name'] = 'Category name is required'
    elif Category.objects.filter(name__iexact=name).exclude(pk=c.pk).exists():
        errors['name'] = 'A category with this name already exists'
    raise_if(errors)
    c.name = name[:255]
    c.description = str(d.get('description', c.description) or '')
    c.is_active = d.get('is_active', c.is_active if (not c._state.adding) else True) is not False
    c.display_order = to_int(d.get('display_order', c.display_order or 0), 'display_order', {}, 0) or 0
    if creating or 'name' in d:
        c.slug = unique_slug(Category, c.name, exclude_pk=c.pk) if (creating or not c.slug) else c.slug
    c.save()
    return c


class CategoryListCreateView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        cats = Category.objects.all().order_by('display_order', 'name')
        return ok([serialize_category(c) for c in cats])

    def post(self, request):
        c = save_category(Category(), request.data, True)
        return ok(serialize_category(c), 'Category created', status=201)


class CategoryDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def patch(self, request, pk):
        c = Category.objects.filter(pk=pk).first()
        if not c:
            return fail('Category not found', 404)
        return ok(serialize_category(save_category(c, request.data, False)), 'Category saved')

    def delete(self, request, pk):
        c = Category.objects.filter(pk=pk).first()
        if not c:
            return fail('Category not found', 404)
        if Product.objects.filter(category=c).exists():
            return fail('This category still has products. Move or remove them first, or just hide the category.')
        c.delete()
        return ok(message='Category deleted')


# ----------------------------------------------------------------- inventory
def serialize_stock_row(sku):
    product = sku.variant.product
    stock = sku_stock(sku)
    return {
        'sku_id': str(sku.id), 'sku_code': sku.sku_code, 'product_id': str(product.id),
        'product_name': product.name, 'variant_name': sku.variant.name, 'price': str(sku.base_price),
        'stock': stock, 'on_hand': sum(i.quantity_on_hand for i in sku.inventory.all()),
        'state': 'out' if stock <= 0 else ('low' if stock <= LOW_STOCK else 'ok'),
        'active': sku.status == 'active',
    }


class InventoryListView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        qs = (SKU.objects.select_related('variant__product').prefetch_related('inventory')
              .filter(variant__product__is_deleted=False).order_by('variant__product__name', 'sku_code'))
        search = (request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(Q(sku_code__icontains=search) | Q(variant__product__name__icontains=search))
        flt = request.query_params.get('filter')
        if flt in ('low', 'out'):
            rows = [s for s in qs if serialize_stock_row(s)['state'] == flt]
            return paginate(rows, request, serialize_stock_row)
        return paginate(qs, request, serialize_stock_row)


class InventoryAdjustView(APIView):
    permission_classes = [IsStoreStaff]

    @transaction.atomic
    def post(self, request):
        d = request.data
        sku = SKU.objects.filter(sku_code=d.get('sku_code')).first()
        if not sku:
            return fail('Item not found', 404)
        errors = {}
        if d.get('set_to') not in (None, ''):
            target = to_int(d.get('set_to'), 'set_to', errors, 0)
        else:
            change = to_int(d.get('change'), 'change', errors, minimum=-10**6)
            current = sum(i.quantity_on_hand for i in sku.inventory.all())
            target = None if change is None else current + change
            if target is not None and target < 0:
                errors['change'] = f'Only {current} in stock, you cannot remove more than that'
        raise_if(errors)
        set_stock(sku, target, request.user, str(d.get('notes') or 'Stock adjusted from admin panel')[:500])
        sku = SKU.objects.select_related('variant__product').prefetch_related('inventory').get(pk=sku.pk)
        return ok(serialize_stock_row(sku), 'Stock updated')
