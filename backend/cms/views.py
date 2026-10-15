"""Public endpoints the shop uses for editable homepage content and pages."""
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from catalog.serializers import ProductListSerializer
from inventory.models import Inventory
from .models import CMSBanner, CMSPage


def _live_banners():
    now = timezone.now()
    return CMSBanner.objects.filter(is_active=True, valid_from__lte=now).filter(
        Q(valid_until__isnull=True) | Q(valid_until__gte=now)).order_by('display_order', '-created_at')


class HomeContentView(APIView):
    """Banners + the products the owner chose to feature (empty list = show the default layout)."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from adminapi.website import featured_ids
        ids = featured_ids()
        products = Product.objects.filter(pk__in=ids, status='active', is_deleted=False).select_related('category').prefetch_related(
            'variants__skus', Prefetch('variants__skus__inventory', queryset=Inventory.objects.filter(warehouse__is_active=True)), 'media')
        by_id = {str(p.id): p for p in products}
        featured = [by_id[i] for i in ids if i in by_id]
        return Response({'success': True, 'data': {
            'banners': [{
                'id': str(b.id), 'title': b.title, 'subtitle': b.subtitle, 'image_url': b.image_url,
                'link_url': b.link_url or '', 'button_text': b.button_text,
            } for b in _live_banners()],
            'featured': ProductListSerializer(featured, many=True, context={'request': request}).data,
        }})


class PublicPageView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        page = CMSPage.objects.filter(slug=slug, is_published=True).first()
        if not page:
            return Response({'success': False, 'message': 'Not found'}, status=404)
        return Response({'success': True, 'data': {'slug': page.slug, 'title': page.title, 'content': page.content}})
