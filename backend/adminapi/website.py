"""Homepage banners, featured products and editable pages."""
import json
import re

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.views import APIView

from catalog.models import Product
from cms.models import CMSBanner, CMSContent, CMSPage
from .catalog import product_qs, serialize_product
from .common import IsStoreStaff, fail, ok, raise_if, to_int

FEATURED_KEY = 'home.featured'
MAX_FEATURED = 12
# Pages the owner may edit (the shop shows its built-in text until the owner publishes their own)
EDITABLE_PAGES = {
    'about': 'About us',
    'privacy-policy': 'Privacy policy',
    'terms-and-conditions': 'Terms & conditions',
}


def link_ok(url):
    return not url or re.match(r'^(https?://|/)', url)


def serialize_banner(b):
    now = timezone.now()
    if not b.is_active:
        state = 'off'
    elif b.valid_from > now:
        state = 'scheduled'
    elif b.valid_until and b.valid_until < now:
        state = 'expired'
    else:
        state = 'live'
    return {
        'id': str(b.id), 'title': b.title, 'subtitle': b.subtitle, 'image_url': b.image_url,
        'link_url': b.link_url or '', 'button_text': b.button_text, 'is_active': b.is_active,
        'display_order': b.display_order, 'valid_from': b.valid_from.isoformat(),
        'valid_until': b.valid_until.isoformat() if b.valid_until else None, 'state': state,
    }


def save_banner(b, d):
    errors = {}
    title = str(d.get('title', b.title if (not b._state.adding) else '') or '').strip()
    if not title:
        errors['title'] = 'Give the banner a headline'
    image = str(d.get('image_url', b.image_url if (not b._state.adding) else '') or '').strip()
    if not image:
        errors['image_url'] = 'Upload a banner picture'
    elif not re.match(r'^https?://', image):
        errors['image_url'] = 'The picture link must start with https://'
    link = str(d.get('link_url', b.link_url if (not b._state.adding) else '') or '').strip()
    if not link_ok(link):
        errors['link_url'] = 'Use a page like /products or a full https:// link'
    start = parse_datetime(str(d['valid_from'])) if d.get('valid_from') else (b.valid_from if (not b._state.adding) else timezone.now())
    end = parse_datetime(str(d['valid_until'])) if d.get('valid_until') else (None if 'valid_until' in d else (b.valid_until if (not b._state.adding) else None))
    if start is None:
        errors['valid_from'] = 'Enter a valid start date'
    elif end and end <= start:
        errors['valid_until'] = 'The end date must be after the start date'
    order = to_int(d.get('display_order', b.display_order if (not b._state.adding) else 0) or 0, 'display_order', errors, 0)
    raise_if(errors)
    for dt_name in ('start', 'end'):
        pass
    if start and timezone.is_naive(start):
        start = timezone.make_aware(start)
    if end and timezone.is_naive(end):
        end = timezone.make_aware(end)
    b.title, b.image_url, b.link_url = title[:255], image, link or None
    b.subtitle = str(d.get('subtitle', b.subtitle) or '').strip()[:255]
    b.button_text = str(d.get('button_text', b.button_text if (not b._state.adding) else 'Shop now') or '').strip()[:40]
    b.is_active = d.get('is_active', b.is_active if (not b._state.adding) else True) is not False
    b.display_order, b.valid_from, b.valid_until = order or 0, start, end
    b.save()
    return b


class BannerListCreateView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        return ok([serialize_banner(b) for b in CMSBanner.objects.all().order_by('display_order', '-created_at')])

    def post(self, request):
        return ok(serialize_banner(save_banner(CMSBanner(), request.data)), 'Banner created', status=201)


class BannerDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def patch(self, request, pk):
        b = CMSBanner.objects.filter(pk=pk).first()
        if not b:
            return fail('Banner not found', 404)
        return ok(serialize_banner(save_banner(b, request.data)), 'Banner saved')

    def delete(self, request, pk):
        b = CMSBanner.objects.filter(pk=pk).first()
        if not b:
            return fail('Banner not found', 404)
        b.delete()
        return ok(message='Banner deleted')


# ---------------------------------------------------------------- featured
def featured_ids():
    row = CMSContent.objects.filter(key=FEATURED_KEY).first()
    if not row:
        return []
    try:
        ids = json.loads(row.content)
        return [str(i) for i in ids] if isinstance(ids, list) else []
    except ValueError:
        return []


class FeaturedProductsView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        ids = featured_ids()
        products = {str(p.id): p for p in product_qs().filter(pk__in=ids)}
        return ok([serialize_product(products[i]) for i in ids if i in products])

    @transaction.atomic
    def put(self, request):
        ids = request.data.get('product_ids')
        if not isinstance(ids, list) or len(ids) > MAX_FEATURED:
            return fail(f'Choose up to {MAX_FEATURED} products.')
        ids = list(dict.fromkeys(str(i) for i in ids))
        found = {str(p.id) for p in Product.objects.filter(pk__in=ids, status='active')}
        missing = [i for i in ids if i not in found]
        if missing:
            return fail('Only live products can be featured. Remove the hidden or deleted ones.')
        CMSContent.objects.update_or_create(key=FEATURED_KEY, defaults={'content': json.dumps(ids), 'content_type': 'json'})
        return ok(message='Featured products saved')


# ------------------------------------------------------------------- pages
def serialize_page(slug, page):
    return {
        'slug': slug, 'label': EDITABLE_PAGES[slug],
        'title': page.title if page else EDITABLE_PAGES[slug],
        'content': page.content if page else '',
        'is_published': bool(page and page.is_published),
        'updated_at': page.updated_at.isoformat() if page else None,
    }


class PageListView(APIView):
    permission_classes = [IsStoreStaff]

    def get(self, request):
        pages = {p.slug: p for p in CMSPage.objects.filter(slug__in=EDITABLE_PAGES)}
        return ok([serialize_page(s, pages.get(s)) for s in EDITABLE_PAGES])


class PageDetailView(APIView):
    permission_classes = [IsStoreStaff]

    def put(self, request, slug):
        if slug not in EDITABLE_PAGES:
            return fail('This page cannot be edited.', 404)
        d = request.data
        title = str(d.get('title') or EDITABLE_PAGES[slug]).strip()[:255]
        content = str(d.get('content') or '').strip()
        publish = bool(d.get('is_published'))
        errors = {}
        if publish and len(content) < 20:
            errors['content'] = 'Write the page text before publishing it'
        if len(content) > 50000:
            errors['content'] = 'This page is too long'
        raise_if(errors)
        page, _ = CMSPage.objects.update_or_create(
            slug=slug, defaults={'title': title, 'content': content or ' ', 'is_published': publish})
        return ok(serialize_page(slug, page), 'Page saved')
