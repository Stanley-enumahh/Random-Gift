from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient


class AuthApiTests(TestCase):
    def test_signup_login_me_logout(self):
        client = APIClient()
        res = client.post('/api/auth/signup/', {'name': 'Ada', 'email': 'Ada@Example.com', 'password': 'a-strong-pass-42'})
        self.assertEqual(res.status_code, 201)

        res = client.post('/api/auth/login/', {'email': 'ada@example.com', 'password': 'a-strong-pass-42'})
        self.assertEqual(res.status_code, 200)
        token = res.json()['token']

        client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        self.assertEqual(client.get('/api/auth/me/').json()['name'], 'Ada')
        self.assertEqual(client.post('/api/auth/logout/').status_code, 204)

        self.assertEqual(client.get('/api/auth/me/').status_code, 401)

    def _signed_in(self):
        client = APIClient()
        res = client.post('/api/auth/signup/', {'name': 'Ada', 'email': 'ada@example.com', 'password': 'a-strong-pass-42'})
        client.credentials(HTTP_AUTHORIZATION=f'Token {res.json()["token"]}')
        return client

    def test_update_name_and_phone(self):
        client = self._signed_in()
        me = client.get('/api/auth/me/').json()
        self.assertEqual(me['phone'], '')
        self.assertTrue(me['show_phone_prompt'])

        res = client.patch('/api/auth/me/', {'name': ' Ada Obi ', 'phone': '+234 (801) 234-5678'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['name'], 'Ada Obi')
        self.assertEqual(res.json()['phone'], '+2348012345678')
        self.assertFalse(res.json()['show_phone_prompt'])

    def test_invalid_phone_and_blank_name_rejected(self):
        client = self._signed_in()
        self.assertIn('phone', client.patch('/api/auth/me/', {'phone': '12ab'}, format='json').json())
        self.assertIn('name', client.patch('/api/auth/me/', {'name': '   '}, format='json').json())

    def test_phone_prompt_snoozes_for_a_week(self):
        client = self._signed_in()
        self.assertFalse(client.post('/api/auth/me/dismiss-phone-prompt/').json()['show_phone_prompt'])
        later = timezone.now() + timedelta(days=7, minutes=1)
        with mock.patch('django.utils.timezone.now', return_value=later):
            self.assertTrue(client.get('/api/auth/me/').json()['show_phone_prompt'])

    def test_weak_password_error_is_on_password_field(self):
        res = APIClient().post('/api/auth/signup/', {'name': 'Ada', 'email': 'ada@example.com', 'password': '12345678'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.json())

    def test_duplicate_email_rejected(self):
        client = APIClient()
        client.post('/api/auth/signup/', {'name': 'Ada', 'email': 'ada@example.com', 'password': 'a-strong-pass-42'})
        res = client.post('/api/auth/signup/', {'name': 'Ada 2', 'email': 'ADA@example.com', 'password': 'a-strong-pass-42'})
        self.assertEqual(res.status_code, 400)
