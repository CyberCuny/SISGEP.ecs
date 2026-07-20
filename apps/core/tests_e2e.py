import datetime
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.activities.models import Activity, ActivityResponsible, ActivityParticipant, ActivityMapping, ActivityOrgUnit
from apps.schedule.models import SchedulePeriod, SchedulePeriodMapping, ScheduleOrgUnit, ApprovedPlan
from apps.core.models import OrganizationalUnit, Category, Role

User = get_user_model()


class FullFlowTest(APITestCase):
    def setUp(self):
        Role.objects.get_or_create(name='Planificador')
        Role.objects.get_or_create(name='Ejecutor')
        Role.objects.get_or_create(name='Aprobador')
        Role.objects.get_or_create(name='Directivo')

        self.planner = User.objects.create_user('planner', 'planner@test.com', 'pass')
        self.planner.roles.add(Role.objects.get(name='Planificador'))
        self.executor = User.objects.create_user('executor', 'executor@test.com', 'pass')
        self.executor.roles.add(Role.objects.get(name='Ejecutor'))
        self.approver = User.objects.create_user('approver', 'approver@test.com', 'pass')
        self.approver.roles.add(Role.objects.get(name='Aprobador'))

        self.cat = Category.objects.create(name='Test Cat')
        self.parent_uo = OrganizationalUnit.objects.create(name='Padre', responsible=self.approver)
        self.child_uo = OrganizationalUnit.objects.create(name='Hija', parent=self.parent_uo)

    def test_01_create_activity_with_users(self):
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act E2E',
            'category': self.cat.id,
            'organizational_unit': self.parent_uo.id,
            'responsible_user_ids': [self.executor.id],
            'participant_user_ids': [self.planner.id],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        act = Activity.objects.get()
        self.assertEqual(act.description, 'Act E2E')

        self.assertTrue(ActivityResponsible.objects.filter(activity=act, user=self.executor).exists())
        self.assertTrue(ActivityParticipant.objects.filter(activity=act, user=self.planner).exists())
        self.assertTrue(ActivityMapping.objects.filter(activity=act, user=self.executor).exists())
        self.assertTrue(ActivityMapping.objects.filter(activity=act, user=self.planner).exists())

        self.assertTrue(ActivityOrgUnit.objects.filter(activity=act, organizational_unit=self.parent_uo).exists())

    def test_02_executor_sees_mapped_activity(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Visibilidad', category=self.cat, organizational_unit=self.parent_uo, created_by=self.planner)
        ActivityMapping.objects.create(activity=act, user=self.executor)

        self.client.force_authenticate(self.executor)
        res = self.client.get('/api/v1/activities/')
        self.assertEqual(res.status_code, 200)
        ids = [a['id'] for a in res.data['results']]
        self.assertIn(act.id, ids)

    def test_03_activity_invisible_without_mapping(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Invisible', category=self.cat, organizational_unit=self.parent_uo, created_by=self.planner)

        self.client.force_authenticate(self.executor)
        res = self.client.get('/api/v1/activities/')
        ids = [a['id'] for a in res.data['results']]
        self.assertNotIn(act.id, ids)

    def test_04_create_activity_with_schedule_periods(self):
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Con Cronogramas',
            'category': self.cat.id,
            'organizational_unit': self.parent_uo.id,
            'responsible_user_ids': [self.executor.id],
            'schedule_periods': [
                {'start_date': '2026-08-01', 'end_date': '2026-08-05', 'start_time': '08:00', 'end_time': '12:00'},
                {'start_date': '2026-08-10', 'end_date': '2026-08-15', 'start_time': '09:00', 'end_time': '13:00'},
            ],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        act = Activity.objects.get(description='Con Cronogramas')
        self.assertEqual(act.schedule_periods.count(), 2)
        for sp in act.schedule_periods.all():
            self.assertTrue(ScheduleOrgUnit.objects.filter(schedule_period=sp, organizational_unit=self.parent_uo).exists())

    def test_05_schedule_period_date_validation(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Validacion', category=self.cat, created_by=self.planner)
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': act.id,
            'start_date': '2026-08-15',
            'end_date': '2026-08-01',
            'start_time': '08:00',
            'end_time': '12:00',
        })
        self.assertEqual(res.status_code, 400)

    def test_06_schedule_period_time_validation(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Validacion Hora', category=self.cat, created_by=self.planner)
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': act.id,
            'start_date': '2026-08-01',
            'end_date': '2026-08-05',
            'start_time': '14:00',
            'end_time': '08:00',
        })
        self.assertEqual(res.status_code, 400)

    def test_07_nested_period_date_validation(self):
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Mal Periodo',
            'category': self.cat.id,
            'schedule_periods': [
                {'start_date': '2026-09-10', 'end_date': '2026-09-01', 'start_time': '08:00', 'end_time': '12:00'},
            ],
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_08_approve_activity_creates_approved_plan(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Aprobar', category=self.cat, organizational_unit=self.parent_uo, created_by=self.planner)
        ActivityOrgUnit.objects.create(activity=act, organizational_unit=self.parent_uo)
        SchedulePeriod.objects.create(activity=act, start_date='2026-07-01', end_date='2026-07-31', start_time='08:00', end_time='17:00')

        self.client.force_authenticate(self.approver)
        aou = ActivityOrgUnit.objects.get(activity=act)
        res = self.client.post('/api/v1/activities/approve/', {'ids': [aou.id]}, format='json')
        self.assertEqual(res.status_code, 200)

        plan = ApprovedPlan.objects.get(activity=act)
        self.assertEqual(plan.start_date, datetime.date(2026, 7, 1))
        self.assertEqual(plan.end_date, datetime.date(2026, 7, 31))
        self.assertEqual(plan.approved_by, self.approver)

    def test_09_distribute_to_subunits_creates_both(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Distribuir', category=self.cat, organizational_unit=self.parent_uo, created_by=self.planner)
        SchedulePeriod.objects.create(activity=act, start_date='2026-08-01', end_date='2026-08-10', start_time='08:00', end_time='17:00')

        res = self.client.post('/api/v1/activities/distribute_to_subunits/', {'activity_id': act.id}, format='json')
        self.assertEqual(res.status_code, 200)

        self.assertTrue(ActivityOrgUnit.objects.filter(activity=act, organizational_unit=self.child_uo).exists())
        sp = SchedulePeriod.objects.get(activity=act)
        self.assertTrue(ScheduleOrgUnit.objects.filter(schedule_period=sp, organizational_unit=self.child_uo).exists())

    def test_10_update_removes_mapping(self):
        self.client.force_authenticate(self.planner)
        act = Activity.objects.create(description='Remover', category=self.cat, created_by=self.planner)
        ActivityResponsible.objects.create(activity=act, user=self.executor)
        ActivityMapping.objects.create(activity=act, user=self.executor)

        res = self.client.patch(f'/api/v1/activities/{act.id}/', {
            'responsible_user_ids': [],
        }, format='json')
        self.assertEqual(res.status_code, 200)

        self.assertFalse(ActivityMapping.objects.filter(activity=act).exists())
