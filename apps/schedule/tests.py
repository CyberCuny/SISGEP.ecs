from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.core.models import Category, OrganizationalUnit
from apps.activities.models import Activity
from apps.schedule.models import SchedulePeriod

User = get_user_model()


class ScheduleAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(username='scheduleadmin', password='test123')
        self.client.force_authenticate(user=self.user)
        cat = Category.objects.create(name='Test')
        self.activity = Activity.objects.create(description='Act Schedule', created_by=self.user, category=cat)

    def test_list_schedule_periods(self):
        res = self.client.get('/api/v1/schedule/periods/')
        self.assertEqual(res.status_code, 200)

    def test_create_schedule_period(self):
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': self.activity.id,
            'start_date': '2026-06-01',
            'end_date': '2026-06-15',
            'start_time': '08:00',
            'end_time': '17:00',
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(SchedulePeriod.objects.count(), 1)

    def test_create_schedule_period_overlap(self):
        self.client.post('/api/v1/schedule/periods/', {
            'activity': self.activity.id,
            'start_date': '2026-06-01',
            'end_date': '2026-06-15',
            'start_time': '08:00',
            'end_time': '17:00',
        })
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': self.activity.id,
            'start_date': '2026-06-10',
            'end_date': '2026-06-20',
            'start_time': '08:00',
            'end_time': '17:00',
        })
        self.assertEqual(res.status_code, 400)

    def test_update_schedule_period(self):
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.patch(f'/api/v1/schedule/periods/{sp.id}/', {'status': 'CUMPLIDO'})
        self.assertEqual(res.status_code, 200)
        sp.refresh_from_db()
        self.assertEqual(sp.status, 'CUMPLIDO')

    def test_delete_schedule_period(self):
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-08-01',
            end_date='2026-08-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.delete(f'/api/v1/schedule/periods/{sp.id}/')
        self.assertEqual(res.status_code, 204)

    def test_list_work_days(self):
        res = self.client.get('/api/v1/schedule/work-days/')
        self.assertEqual(res.status_code, 200)

    def test_calendar_action_month(self):
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.get('/api/v1/schedule/periods/calendar/', {
            'year': 2026, 'month': 6, 'view_mode': 'month'
        })
        self.assertEqual(res.status_code, 200)

    def test_individual_calendar(self):
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.get('/api/v1/schedule/periods/individual_calendar/', {
            'year': 2026, 'month': 6, 'user_id': self.user.id
        })
        self.assertEqual(res.status_code, 200)

    def test_annual_calendar(self):
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.get('/api/v1/schedule/periods/annual_calendar/', {
            'year': 2026
        })
        self.assertEqual(res.status_code, 200)

    def test_compliance_stats(self):
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00',
            status='CUMPLIDO'
        )
        res = self.client.get('/api/v1/schedule/periods/compliance_stats/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('total', res.data)
        self.assertEqual(res.data['total'], 1)
        self.assertEqual(res.data['cumplidas'], 1)

    def test_compliance_stats_group_by_uo(self):
        uo = OrganizationalUnit.objects.create(name='UO Test')
        self.activity.organizational_unit = uo
        self.activity.save()
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00',
            status='CUMPLIDO'
        )
        res = self.client.get('/api/v1/schedule/periods/compliance_stats/', {'group_by': 'uo'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('by_uo', res.data)
        self.assertEqual(len(res.data['by_uo']), 1)
        self.assertEqual(res.data['by_uo'][0]['org_unit'], 'UO Test')
        self.assertEqual(res.data['by_uo'][0]['total'], 1)

    def test_compliance_stats_group_by_month(self):
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00',
            status='CUMPLIDO'
        )
        res = self.client.get('/api/v1/schedule/periods/compliance_stats/', {'group_by': 'month', 'year': 2026})
        self.assertEqual(res.status_code, 200)
        self.assertIn('by_month', res.data)
        self.assertEqual(len(res.data['by_month']), 12)
        june = [m for m in res.data['by_month'] if m['month'] == '2026-06']
        self.assertEqual(len(june), 1)
        self.assertEqual(june[0]['total'], 1)

    def test_compliance_stats_group_by_invalid(self):
        res = self.client.get('/api/v1/schedule/periods/compliance_stats/', {'group_by': 'invalid'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('total', res.data)

    def test_work_day_create(self):
        res = self.client.post('/api/v1/schedule/work-days/', {
            'user': self.user.id, 'day': 15
        })
        self.assertEqual(res.status_code, 201)

    def test_drag_drop(self):
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-08-01',
            end_date='2026-08-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.patch(f'/api/v1/schedule/periods/{sp.id}/drag_drop/', {
            'start_date': '2026-09-01', 'end_date': '2026-09-15'
        })
        self.assertEqual(res.status_code, 200)
        sp.refresh_from_db()
        self.assertEqual(sp.start_date.isoformat(), '2026-09-01')

    def test_executor_update_single_status(self):
        executor = User.objects.create_user(username='exec_status', password='test123')
        from apps.core.models import Role
        role_ejecutor, _ = Role.objects.get_or_create(name='Ejecutor')
        executor.roles.add(role_ejecutor)
        from apps.activities.models import ActivityMapping
        ActivityMapping.objects.create(user=executor, activity=self.activity)
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-10-01',
            end_date='2026-10-15', start_time='08:00', end_time='17:00'
        )
        self.client.force_authenticate(user=executor)
        res = self.client.post(f'/api/v1/schedule/periods/{sp.id}/update_single_status/', {'status': 'CUMPLIDO'}, format='json')
        self.assertEqual(res.status_code, 200)
        sp.refresh_from_db()
        self.assertEqual(sp.status, 'CUMPLIDO')
