from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.core.models import Category, OrganizationalUnit
from apps.activities.models import Activity, ActivityOrgUnit
from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit

User = get_user_model()


class ActivityAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(username='actadmin', password='test123')
        self.client.force_authenticate(user=self.user)
        self.cat = Category.objects.create(name='Test Cat')

    def test_list_activities(self):
        res = self.client.get('/api/v1/activities/')
        self.assertEqual(res.status_code, 200)

    def test_create_activity(self):
        res = self.client.post('/api/v1/activities/', {
            'description': 'Nueva actividad',
            'category': self.cat.id,
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Activity.objects.count(), 1)

    def test_create_activity_minimal(self):
        res = self.client.post('/api/v1/activities/', {
            'description': 'Minima',
        })
        self.assertEqual(res.status_code, 201)

    def test_update_activity(self):
        act = Activity.objects.create(description='Original', created_by=self.user, category=self.cat)
        res = self.client.patch(f'/api/v1/activities/{act.id}/', {'description': 'Modificada'})
        self.assertEqual(res.status_code, 200)
        act.refresh_from_db()
        self.assertEqual(act.description, 'Modificada')

    def test_delete_activity(self):
        act = Activity.objects.create(description='Borrar', created_by=self.user, category=self.cat)
        res = self.client.delete(f'/api/v1/activities/{act.id}/')
        self.assertEqual(res.status_code, 204)

    def test_filter_by_category(self):
        cat2 = Category.objects.create(name='Otra')
        Activity.objects.create(description='En test', created_by=self.user, category=self.cat)
        Activity.objects.create(description='En otra', created_by=self.user, category=cat2)
        res = self.client.get('/api/v1/activities/', {'category': self.cat.id})
        self.assertEqual(res.status_code, 200)

    def test_search_activity(self):
        Activity.objects.create(description='Buscar esto', created_by=self.user, category=self.cat)
        Activity.objects.create(description='Otra cosa', created_by=self.user, category=self.cat)
        res = self.client.get('/api/v1/activities/', {'search': 'Buscar'})
        self.assertEqual(res.status_code, 200)

    def test_create_activity_general(self):
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act General', 'is_general': True
        })
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['is_general'])

    def test_assign_to_units(self):
        act = Activity.objects.create(description='Para asignar', created_by=self.user, category=self.cat)
        u1 = OrganizationalUnit.objects.create(name='UO A')
        u2 = OrganizationalUnit.objects.create(name='UO B')
        url = '/api/v1/activities/assign_to_units/'
        res = self.client.post(url, {'activity_id': act.id, 'unit_ids': [u1.id, u2.id]}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ActivityOrgUnit.objects.filter(activity=act).count(), 2)

    def test_assign_to_units_missing_activity_id(self):
        res = self.client.post('/api/v1/activities/assign_to_units/', {'unit_ids': []}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_assign_to_units_creates_schedule_org_units(self):
        act = Activity.objects.create(description='Con cronograma', created_by=self.user, category=self.cat)
        sp = SchedulePeriod.objects.create(activity=act, start_date='2026-08-01', end_date='2026-08-31', start_time='08:00', end_time='17:00')
        u = OrganizationalUnit.objects.create(name='UO Crono')
        res = self.client.post('/api/v1/activities/assign_to_units/', {'activity_id': act.id, 'unit_ids': [u.id]}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(ScheduleOrgUnit.objects.filter(schedule_period=sp, organizational_unit=u).exists())
