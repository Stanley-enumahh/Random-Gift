from django.test import TestCase
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

    def test_weak_password_error_is_on_password_field(self):
        res = APIClient().post('/api/auth/signup/', {'name': 'Ada', 'email': 'ada@example.com', 'password': '12345678'})
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.json())

    def test_duplicate_email_rejected(self):
        client = APIClient()
        client.post('/api/auth/signup/', {'name': 'Ada', 'email': 'ada@example.com', 'password': 'a-strong-pass-42'})
        res = client.post('/api/auth/signup/', {'name': 'Ada 2', 'email': 'ADA@example.com', 'password': 'a-strong-pass-42'})
        self.assertEqual(res.status_code, 400)
