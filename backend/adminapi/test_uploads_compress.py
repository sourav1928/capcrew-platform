"""Tests: uploaded photos are shrunk."""
import io

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from .uploads import MAX_SIDE, compress_image


def _noisy_jpeg(w, h):
    import os
    img = Image.frombytes('RGB', (w, h), os.urandom(w * h * 3))
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=98)
    return buf.getvalue()


class CompressTests(APITestCase):
    def test_big_photo_is_scaled_and_smaller(self):
        raw = _noisy_jpeg(2400, 1800)
        out, ext = compress_image(raw, 'jpg')
        self.assertEqual(ext, 'jpg')
        self.assertLess(len(out), len(raw))
        self.assertLessEqual(max(Image.open(io.BytesIO(out)).size), MAX_SIDE)

    def test_gif_is_left_alone(self):
        gif = b'GIF89a' + b'\x00' * 20
        self.assertEqual(compress_image(gif, 'gif'), (gif, 'gif'))

    def test_garbage_falls_back_to_original(self):
        self.assertEqual(compress_image(b'\xff\xd8\xff not really', 'jpg'), (b'\xff\xd8\xff not really', 'jpg'))

    def test_upload_endpoint_stores_compressed_file(self):
        staff = User.objects.create_user('boss', 'boss@example.com', 'pw12345678', is_staff=True, is_superuser=True)
        c = APIClient()
        c.force_authenticate(staff)
        raw = _noisy_jpeg(2000, 1500)
        r = c.post('/api/v1/admin/uploads/', {'file': SimpleUploadedFile('p.jpg', raw, 'image/jpeg')}, format='multipart')
        self.assertEqual(r.status_code, 201)
        self.assertLess(r.data['data']['size'], len(raw))
