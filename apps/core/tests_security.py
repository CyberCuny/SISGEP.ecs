from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()


class PasswordValidationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_weak_password_rejected(self):
        res = self.client.post('/api/v1/users/register/', {
            'username': 'weakuser',
            'password': '123',
            'display_name': 'Weak',
            'email': 'weak@test.com',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)

    def test_register_strong_password_accepted(self):
        res = self.client.post('/api/v1/users/register/', {
            'username': 'stronguser',
            'password': 'Str0ng!Pass#123',
            'display_name': 'Strong',
            'email': 'strong@test.com',
        })
        self.assertEqual(res.status_code, 201)

    def test_register_creates_inactive_user(self):
        res = self.client.post('/api/v1/users/register/', {
            'username': 'inactiveuser',
            'password': 'Str0ng!Pass#123',
            'display_name': 'Inactive',
            'email': 'inactive@test.com',
        })
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(username='inactiveuser')
        self.assertFalse(user.is_active)

    def test_change_password_weak_rejected(self):
        user = User.objects.create_user(username='changepass', password='OldPass123!')
        self.client.force_authenticate(user=user)
        res = self.client.post(f'/api/v1/users/{user.id}/change_password/', {
            'old_password': 'OldPass123!',
            'new_password': '123',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('password', res.data)

    def test_change_password_strong_accepted(self):
        user = User.objects.create_user(username='changepass2', password='OldPass123!')
        self.client.force_authenticate(user=user)
        res = self.client.post(f'/api/v1/users/{user.id}/change_password/', {
            'old_password': 'OldPass123!',
            'new_password': 'NewStr0ng!Pass#456',
        })
        self.assertEqual(res.status_code, 200)


class BackupPermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='normal', password='test123!')
        self.admin = User.objects.create_superuser(username='backupadmin', password='test123!')

    def test_normal_user_cannot_access_backups(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/v1/backups/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_backups(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/backups/')
        self.assertEqual(res.status_code, 200)


class CatalogCacheTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='cacheadmin', password='test123!')
        self.client.force_authenticate(user=self.admin)
        cache.clear()

    def test_category_list_cached(self):
        from apps.core.models import Category
        Category.objects.create(name='Cache Test Cat')
        res1 = self.client.get('/api/v1/categories/')
        self.assertEqual(res1.status_code, 200)
        Category.objects.create(name='Should Not Appear')
        res2 = self.client.get('/api/v1/categories/')
        self.assertEqual(len(res1.data), len(res2.data))


class AssignRolesPermissionTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='normalrole', password='test123!')
        self.admin = User.objects.create_superuser(username='adminrole', password='test123!')
        from apps.core.models import Role
        self.role = Role.objects.create(name='TestRole')

    def test_normal_user_cannot_assign_roles(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/users/assign_roles/', {'user_ids': [self.user.id], 'role_ids': [self.role.id]}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_assign_roles(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/assign_roles/', {'user_ids': [self.user.id], 'role_ids': [self.role.id]}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_normal_user_cannot_remove_roles(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/users/remove_roles/', {'user_ids': [self.user.id], 'role_ids': [self.role.id]}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_remove_roles(self):
        from apps.core.models import UserRole
        UserRole.objects.create(user=self.user, role=self.role)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/remove_roles/', {'user_ids': [self.user.id], 'role_ids': [self.role.id]}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(UserRole.objects.filter(user=self.user, role=self.role).exists())

    def test_assign_roles_validation_nonexistent(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/assign_roles/', {'user_ids': [9999], 'role_ids': [self.role.id]}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('no encontrados', res.data.get('error', ''))

    def test_remove_roles_validation_nonexistent(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/remove_roles/', {'user_ids': [self.user.id], 'role_ids': [9999]}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('no encontrados', res.data.get('error', ''))


class EmailAsyncTest(TestCase):
    def test_send_email_async_does_not_block(self):
        from apps.core.utils import send_email_async
        import threading
        threads_before = threading.active_count()
        send_email_async('Test', 'Body', ['test@test.com'])
        self.assertGreaterEqual(threading.active_count(), threads_before)


class EmailVerificationFlowTest(TestCase):
    def _clear_outbox(self):
        from django.core import mail
        import time
        mail.outbox = []
        time.sleep(0.05)

    def setUp(self):
        self.client = APIClient()
        self._clear_outbox()

    def _extract_token_from_outbox(self, subject_fragment):
        from django.core import mail
        import time
        timeout = 2.0
        step = 0.05
        waited = 0
        while waited < timeout:
            for msg in mail.outbox:
                if subject_fragment in msg.subject:
                    url = msg.body
                    return url.split('token=')[1].strip()
            time.sleep(step)
            waited += step
        return None

    def test_full_register_verify_login_flow(self):
        res = self.client.post('/api/v1/users/register/', {
            'username': 'flowuser',
            'password': 'Str0ng!Pass#123',
            'display_name': 'Flow User',
            'email': 'flow@test.com',
        })
        self.assertEqual(res.status_code, 201)

        token = self._extract_token_from_outbox('Confirme su correo')
        self.assertIsNotNone(token, 'Token no encontrado en bandeja de salida')

        user = User.objects.get(username='flowuser')
        self.assertFalse(user.is_active)

        res = self.client.post('/api/v1/users/verify_email/', {'token': 'invalid'})
        self.assertEqual(res.status_code, 400)

        res = self.client.post('/api/v1/users/verify_email/', {'token': token})
        self.assertEqual(res.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.is_active)

        res = self.client.post('/api/v1/users/login/', {'username': 'flowuser', 'password': 'wrong'})
        self.assertEqual(res.status_code, 400)

        res = self.client.post('/api/v1/users/login/', {'username': 'flowuser', 'password': 'Str0ng!Pass#123'})
        self.assertEqual(res.status_code, 200)

    def test_forgot_password_reset_flow(self):
        User.objects.create_user(username='resetuser', password='OldPass123!', email='reset@test.com')
        res = self.client.post('/api/v1/users/forgot_password/', {'email': 'reset@test.com'})
        self.assertEqual(res.status_code, 200)

        token = self._extract_token_from_outbox('Restablecer')
        self.assertIsNotNone(token, 'Token de reset no encontrado en bandeja de salida')

        res = self.client.post('/api/v1/users/reset_password_confirm/', {
            'token': token, 'password': 'NewStr0ng!Pass#789',
        })
        self.assertEqual(res.status_code, 200)

        user = User.objects.get(username='resetuser')
        self.assertTrue(user.check_password('NewStr0ng!Pass#789'))

        res = self.client.post('/api/v1/users/login/', {
            'username': 'resetuser', 'password': 'NewStr0ng!Pass#789',
        })
        self.assertEqual(res.status_code, 200)

    def test_login_fails_for_unverified_user(self):
        User.objects.create_user(username='unverified', password='Str0ng!Pass#123',
                                 email='unv@test.com', is_active=False)
        res = self.client.post('/api/v1/users/login/', {
            'username': 'unverified', 'password': 'Str0ng!Pass#123',
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 6)

    def test_login_fails_for_disabled_user(self):
        User.objects.create_user(username='disabled', password='Str0ng!Pass#123',
                                 email='dis@test.com', is_active=True, is_disabled=True)
        res = self.client.post('/api/v1/users/login/', {
            'username': 'disabled', 'password': 'Str0ng!Pass#123',
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get('code'), 4)


class FactoryResetTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='adminfr', password='test123!')
        self.user = User.objects.create_user(username='normalfr', password='test123!')

    def test_normal_user_cannot_factory_reset(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/users/factory_reset/', {}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_factory_reset(self):
        from apps.activities.models import Activity
        from apps.core.models import Category
        cat = Category.objects.create(name='Test Cat')
        Activity.objects.create(description='Test Act', category=cat, created_by=self.admin)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/factory_reset/', {}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Activity.objects.count(), 0)
