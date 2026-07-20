from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.core.models import Category, OrganizationalUnit

User = get_user_model()


class AuthAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.password = 'test123'
        self.user = User.objects.create_user(username='api_test', password=self.password, display_name='API Test')

    def test_login_success(self):
        res = self.client.post('/api/v1/users/login/', {'username': 'api_test', 'password': self.password})
        self.assertEqual(res.status_code, 200)
        self.assertIn('user', res.data)

    def test_login_fail(self):
        res = self.client.post('/api/v1/users/login/', {'username': 'api_test', 'password': 'wrong'})
        self.assertEqual(res.status_code, 400)

    def test_me_unauthenticated(self):
        res = self.client.get('/api/v1/users/me/')
        self.assertEqual(res.status_code, 403)

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get('/api/v1/users/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['username'], 'api_test')

    def test_logout(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post('/api/v1/users/logout/')
        self.assertEqual(res.status_code, 200)


class CategoryAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin_cat', password='test123')
        self.client.force_authenticate(user=self.admin)

    def test_list_categories(self):
        Category.objects.create(name='Test Cat')
        res = self.client.get('/api/v1/categories/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

    def test_create_category(self):
        res = self.client.post('/api/v1/categories/', {'name': 'Nueva Cat'})
        self.assertEqual(res.status_code, 201)

    def test_create_category_duplicate_allowed(self):
        Category.objects.create(name='Unica')
        res = self.client.post('/api/v1/categories/', {'name': 'Unica'})
        self.assertEqual(res.status_code, 201)

    def test_delete_category(self):
        cat = Category.objects.create(name='Borrar')
        res = self.client.delete(f'/api/v1/categories/{cat.id}/')
        self.assertEqual(res.status_code, 204)


class OrgUnitAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin_ou', password='test123')
        self.client.force_authenticate(user=self.admin)

    def test_create_org_unit(self):
        res = self.client.post('/api/v1/organizational-units/', {'name': 'Nueva UO'})
        self.assertEqual(res.status_code, 201)

    def test_list_org_units(self):
        OrganizationalUnit.objects.create(name='UO Test')
        res = self.client.get('/api/v1/organizational-units/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)


class SearchAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(username='search_test', password='test123')
        self.client.force_authenticate(user=self.user)
        from apps.activities.models import Activity
        cat = Category.objects.create(name='Test')
        self.activity = Activity.objects.create(description='Busqueda test activity', created_by=self.user, category=cat)

    def test_search_no_query(self):
        res = self.client.get('/api/v1/search/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 0)

    def test_search_short_query(self):
        res = self.client.get('/api/v1/search/', {'q': 'a'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['results']), 0)

    def test_search_activity(self):
        res = self.client.get('/api/v1/search/', {'q': 'Busqueda'})
        self.assertEqual(res.status_code, 200)
        results = res.data['results']
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['type'], 'activity')


class HealthCheckTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_ok(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'ok')
        self.assertEqual(res.data['database'], 'ok')
