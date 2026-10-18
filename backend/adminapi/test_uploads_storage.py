"""Uploaded photos go to whatever storage is configured, and come back as plain public links."""
import io

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APIClient, APITestCase

CDN = 'https://cdn.example.com/photos/'
MEMORY = {'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage', 'OPTIONS': {'base_url': CDN}},
          'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


def photo():
    buf = io.BytesIO()
    Image.new('RGB', (600, 400), (200, 60, 20)).save(buf, 'JPEG')
    return SimpleUploadedFile('cap.jpg', buf.getvalue(), 'image/jpeg')


@override_settings(STORAGES=MEMORY)
class PhotoStorageTests(APITestCase):
    def setUp(self):
        staff = User.objects.create_user('boss@example.com', 'boss@example.com', 'Zq7!trailblazer', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(staff)

    def test_photo_is_saved_in_the_configured_storage_and_returned_as_its_public_link(self):
        res = self.client.post('/api/v1/admin/uploads/', {'file': photo()}, format='multipart')
        self.assertEqual(res.status_code, 201, res.data)
        url = res.data['data']['url']
        self.assertTrue(url.startswith(CDN + 'uploads/'), url)
        self.assertTrue(url.endswith('.jpg'))
        self.assertNotIn('?', url)                      # no expiring signed link stored in the database

    def test_only_staff_can_upload(self):
        anon = APIClient().post('/api/v1/admin/uploads/', {'file': photo()}, format='multipart')
        self.assertIn(anon.status_code, (401, 403))
