"""Photo upload for the admin panel (product photos, homepage banners)."""
import io
import logging
import os
import uuid

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from .common import IsStoreStaff, fail, ok

logger = logging.getLogger(__name__)

MAX_BYTES = 5 * 1024 * 1024
MAX_SIDE = 1600      # longest side in pixels; bigger photos are scaled down
JPEG_QUALITY = 82    # visually identical to the original, far smaller
# File signature -> extension. We trust the file's real content, not its name.
SIGNATURES = [
    (b'\xff\xd8\xff', 'jpg'),
    (b'\x89PNG\r\n\x1a\n', 'png'),
    (b'GIF87a', 'gif'),
    (b'GIF89a', 'gif'),
]


def sniff_extension(head):
    for sig, ext in SIGNATURES:
        if head.startswith(sig):
            return ext
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'webp'
    return None


def compress_image(data, ext):
    """Shrink a photo for the website: fix phone rotation, cap the size, re-encode lightly.

    Returns (bytes, extension). Animated GIFs and anything that fails are kept as uploaded.
    """
    if ext == 'gif':
        return data, ext
    try:
        from PIL import Image, ImageOps
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
        if max(img.size) > MAX_SIDE:
            img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        out = io.BytesIO()
        has_alpha = img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info)
        if ext == 'png' and has_alpha:
            img.save(out, 'PNG', optimize=True)
        elif ext == 'webp':
            img.save(out, 'WEBP', quality=JPEG_QUALITY, method=6)
        else:
            # JPEG, and PNG photos without transparency (usually much smaller as JPEG)
            img.convert('RGB').save(out, 'JPEG', quality=JPEG_QUALITY, optimize=True, progressive=True)
            ext = 'jpg'
        smaller = out.getvalue()
        return (smaller, ext) if len(smaller) < len(data) or ext != 'png' else (data, ext)
    except Exception:
        logger.warning('Photo could not be compressed; storing the original', exc_info=True)
        return data, ext


def absolute_media_url(request, path):
    url = default_storage.url(path)
    return url if url.startswith(('http://', 'https://')) else request.build_absolute_uri(url)


class ImageUploadView(APIView):
    permission_classes = [IsStoreStaff]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return fail('Choose a photo to upload.')
        if upload.size > MAX_BYTES:
            return fail('That photo is too big. Please use one under 5 MB.')
        data = upload.read()
        ext = sniff_extension(data[:16])
        if not ext:
            return fail('Only JPG, PNG, WebP or GIF photos can be uploaded.')
        data, ext = compress_image(data, ext)
        now = timezone.now()
        path = default_storage.save(f'uploads/{now:%Y/%m}/{uuid.uuid4().hex}.{ext}', ContentFile(data))
        return ok({'url': absolute_media_url(request, path), 'name': os.path.basename(path), 'size': len(data)},
                  'Photo uploaded', status=201)
