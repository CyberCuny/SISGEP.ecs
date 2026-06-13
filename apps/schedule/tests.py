from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.core.models import Category
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
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
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

    def test_work_day_create(self):
        res = self.client.post('/api/v1/schedule/work-days/', {
            'user': self.user.id, 'day': 15
        })
        self.assertEqual(res.status_code, 201)

    def test_drag_drop(self):
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-06-01',
            end_date='2026-06-15', start_time='08:00', end_time='17:00'
        )
        res = self.client.patch(f'/api/v1/schedule/periods/{sp.id}/drag_drop/', {
            'start_date': '2026-07-01', 'end_date': '2026-07-15'
        })
        self.assertEqual(res.status_code, 200)
        sp.refresh_from_db()
        self.assertEqual(sp.start_date.isoformat(), '2026-07-01')
