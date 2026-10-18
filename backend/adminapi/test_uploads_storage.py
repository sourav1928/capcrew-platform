"""Uploaded photos go to whatever storage is configured, and come back as plain public links."""
import io
from io import StringIO

from botocore.exceptions import ClientError
from django.contrib.auth.models import User
from django.core.files.storage import Storage
from django.core.management import call_command
from django.core.management.base import CommandError
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


class BrokenStorage(Storage):
    """Behaves like a storage service that answers with an empty error (the real-world case that was hard to diagnose)."""
    def exists(self, name):
        return False

    def _save(self, name, content):
        raise ClientError({'Error': {'Code': '', 'Message': ''},
                           'ResponseMetadata': {'HTTPStatusCode': 403, 'HTTPHeaders': {'server': 'fake-storage'}}}, 'PutObject')


BROKEN = {'default': {'BACKEND': 'adminapi.test_uploads_storage.BrokenStorage'},
          'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}}


@override_settings(STORAGES=BROKEN)
class StorageFailureTests(APITestCase):
    def setUp(self):
        staff = User.objects.create_user('boss@example.com', 'boss@example.com', 'Zq7!trailblazer', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(staff)

    def test_a_broken_storage_gives_a_clear_message_and_a_useful_log_line(self):
        with self.assertLogs('adminapi.uploads', level='ERROR') as logs:
            res = self.client.post('/api/v1/admin/uploads/', {'file': photo()}, format='multipart')
        self.assertEqual(res.status_code, 502)
        self.assertFalse(res.data['success'])
        self.assertIn('storage', res.data['message'].lower())
        text = '\n'.join(logs.output)
        self.assertIn('http=403', text)
        self.assertIn('server=fake-storage', text)

    def test_check_storage_command_explains_the_problem(self):
        with self.assertRaises(CommandError) as ctx:
            call_command('check_storage', stdout=StringIO(), stderr=StringIO())
        self.assertIn('refused the keys', str(ctx.exception))


@override_settings(STORAGES=MEMORY)
class CheckStorageCommandTests(APITestCase):
    def test_check_storage_passes_on_a_working_storage(self):
        out = StringIO()
        call_command('check_storage', '--skip-public-check', stdout=out)
        self.assertIn('Photo storage works', out.getvalue())
