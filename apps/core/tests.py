from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.models import Role, Category, OrganizationalUnit

User = get_user_model()


class CoreModelsTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test', password='test123', display_name='Test User')
        self.role, _ = Role.objects.get_or_create(name='Planificador')
        self.cat = Category.objects.create(name='Capacitación')
        self.uo = OrganizationalUnit.objects.create(name='Dirección')

    def test_user_creation(self):
        self.assertEqual(str(self.user), 'Test User')
        self.assertEqual(self.user.display_name, 'Test User')

    def test_role_creation(self):
        self.assertEqual(str(self.role), 'Planificador')

    def test_category_creation(self):
        self.assertEqual(str(self.cat), 'Capacitación')

    def test_organizational_unit(self):
        self.assertEqual(str(self.uo), 'Dirección')


class ActivityModelTest(TestCase):
    def setUp(self):
        user = User.objects.create_user(username='act_test', password='test123')
        cat = Category.objects.create(name='Test')
        from apps.activities.models import Activity
        self.activity = Activity.objects.create(
            description='Actividad de prueba',
            created_by=user,
            category=cat
        )

    def test_activity_creation(self):
        from apps.activities.models import Activity
        self.assertEqual(Activity.objects.count(), 1)
        self.assertEqual(self.activity.description, 'Actividad de prueba')

    def test_activity_str(self):
        self.assertIn('Actividad de prueba', str(self.activity))
