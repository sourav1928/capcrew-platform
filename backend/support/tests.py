"""Tests: public contact form."""
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from .models import ContactMessage

URL = '/api/v1/support/contact/'
GOOD = {'name': 'Asha', 'email': 'asha@example.com', 'subject': 'Size help', 'message': 'Which size fits a 56 cm head?'}


class ContactFormTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_valid_message_is_saved_and_emailed(self):
        r = self.client.post(URL, GOOD, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data['success'])
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].reply_to, ['asha@example.com'])

    def test_invalid_input_is_rejected_with_a_readable_message(self):
        r = self.client.post(URL, {**GOOD, 'email': 'nope'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertFalse(r.data['success'])
        self.assertTrue(r.data['message'])
        r = self.client.post(URL, {**GOOD, 'message': 'hi'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_honeypot_stores_nothing(self):
        r = self.client.post(URL, {**GOOD, 'website': 'http://spam.example'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_rate_limit(self):
        for _ in range(5):
            self.assertEqual(self.client.post(URL, GOOD, format='json').status_code, 201)
        self.assertEqual(self.client.post(URL, GOOD, format='json').status_code, 429)
