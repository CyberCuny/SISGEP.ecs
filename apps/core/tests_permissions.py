from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.core.models import Role, OrganizationalUnit, Category
from apps.activities.models import Activity, ActivityMapping
from apps.schedule.models import SchedulePeriod, SchedulePeriodMapping

User = get_user_model()


class RolePermissionTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin', password='test123!')
        self.director = User.objects.create_user(username='director', password='test123!')
        self.approver = User.objects.create_user(username='approver', password='test123!')
        self.planner = User.objects.create_user(username='planner', password='test123!')
        self.executor = User.objects.create_user(username='executor', password='test123!')
        self.norole = User.objects.create_user(username='norole', password='test123!')

        self.role_director, _ = Role.objects.get_or_create(name='Directivo')
        self.role_approver, _ = Role.objects.get_or_create(name='Aprobador')
        self.role_planner, _ = Role.objects.get_or_create(name='Planificador')
        self.role_executor, _ = Role.objects.get_or_create(name='Ejecutor')

        self.director.roles.add(self.role_director)
        self.approver.roles.add(self.role_approver)
        self.planner.roles.add(self.role_planner)
        self.executor.roles.add(self.role_executor)

        self.cat = Category.objects.create(name='TestCat')

        self.uo = OrganizationalUnit.objects.create(name='UO Test', responsible=self.planner)
        self.uo2 = OrganizationalUnit.objects.create(name='UO Other', responsible=self.approver)

        self.act = Activity.objects.create(description='Act 1', category=self.cat,
                                           organizational_unit=self.uo, created_by=self.planner)
        self.act2 = Activity.objects.create(description='Act 2', category=self.cat,
                                            organizational_unit=self.uo2, created_by=self.approver)
        self.act3 = Activity.objects.create(description='Act 3', category=self.cat,
                                            organizational_unit=None, created_by=self.admin)

        ActivityMapping.objects.create(activity=self.act2, user=self.executor)
        ActivityMapping.objects.create(activity=self.act3, user=self.executor)

        self.period = SchedulePeriod.objects.create(activity=self.act, start_date='2026-09-01',
                                                     end_date='2026-09-30', start_time='08:00', end_time='17:00')
        self.period2 = SchedulePeriod.objects.create(activity=self.act2, start_date='2026-10-01',
                                                       end_date='2026-10-31', start_time='08:00', end_time='17:00')
        self.period3 = SchedulePeriod.objects.create(activity=self.act3, start_date='2026-11-01',
                                                       end_date='2026-11-30', start_time='08:00', end_time='17:00')

        SchedulePeriodMapping.objects.create(schedule_period=self.period3, user=self.executor)

    def _auth(self, user):
        self.client.force_authenticate(user=user)


class ActivityFilterTest(RolePermissionTestBase):
    DATE_PARAMS = {'FechaDesde': '2026-01-01', 'FechaHasta': '2026-12-31'}

    def test_admin_sees_all_activities(self):
        self._auth(self.admin)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        ids = [a['id'] for a in res.data['results']]
        self.assertIn(self.act.id, ids)
        self.assertIn(self.act2.id, ids)
        self.assertIn(self.act3.id, ids)

    def test_director_sees_all_activities(self):
        self._auth(self.director)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        ids = [a['id'] for a in res.data['results']]
        self.assertIn(self.act.id, ids)
        self.assertIn(self.act2.id, ids)
        self.assertIn(self.act3.id, ids)

    def test_planner_sees_uo_and_mapped_activities(self):
        self._auth(self.planner)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        ids = [a['id'] for a in res.data['results']]
        self.assertIn(self.act.id, ids)
        self.assertNotIn(self.act2.id, ids)
        self.assertNotIn(self.act3.id, ids)

    def test_approver_sees_uo_and_mapped_activities(self):
        self._auth(self.approver)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        ids = [a['id'] for a in res.data['results']]
        self.assertIn(self.act2.id, ids)
        self.assertNotIn(self.act.id, ids)
        self.assertNotIn(self.act3.id, ids)

    def test_executor_sees_only_mapped_activities(self):
        self._auth(self.executor)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        ids = [a['id'] for a in res.data['results']]
        self.assertNotIn(self.act.id, ids)
        self.assertIn(self.act2.id, ids)
        self.assertIn(self.act3.id, ids)

    def test_norole_sees_no_activities(self):
        self._auth(self.norole)
        res = self.client.get('/api/v1/activities/', self.DATE_PARAMS)
        self.assertEqual(len(res.data['results']), 0)


class ScheduleFilterTest(RolePermissionTestBase):
    def test_admin_sees_all_periods(self):
        self._auth(self.admin)
        res = self.client.get('/api/v1/schedule/periods/')
        ids = [p['id'] for p in res.data['results']]
        self.assertIn(self.period.id, ids)
        self.assertIn(self.period2.id, ids)
        self.assertIn(self.period3.id, ids)

    def test_director_sees_all_periods(self):
        self._auth(self.director)
        res = self.client.get('/api/v1/schedule/periods/')
        ids = [p['id'] for p in res.data['results']]
        self.assertIn(self.period.id, ids)
        self.assertIn(self.period2.id, ids)
        self.assertIn(self.period3.id, ids)

    def test_executor_sees_only_mapped_periods(self):
        self._auth(self.executor)
        res = self.client.get('/api/v1/schedule/periods/')
        ids = [p['id'] for p in res.data['results']]
        self.assertNotIn(self.period.id, ids)
        self.assertIn(self.period2.id, ids)
        self.assertIn(self.period3.id, ids)


class ActivityActionPermissionTest(RolePermissionTestBase):
    def test_planner_can_create_activity(self):
        self._auth(self.planner)
        res = self.client.post('/api/v1/activities/', {'description': 'New', 'category': self.cat.id})
        self.assertEqual(res.status_code, 201)

    def test_executor_cannot_create_activity(self):
        self._auth(self.executor)
        res = self.client.post('/api/v1/activities/', {'description': 'New', 'category': self.cat.id})
        self.assertEqual(res.status_code, 403)

    def test_director_can_create_activity(self):
        self._auth(self.director)
        res = self.client.post('/api/v1/activities/', {'description': 'New', 'category': self.cat.id})
        self.assertEqual(res.status_code, 201)

    def test_planner_can_update_activity(self):
        self._auth(self.planner)
        res = self.client.patch(f'/api/v1/activities/{self.act.id}/', {'description': 'Updated'})
        self.assertEqual(res.status_code, 200)

    def test_executor_cannot_update_activity(self):
        self._auth(self.executor)
        res = self.client.patch(f'/api/v1/activities/{self.act3.id}/', {'description': 'Updated'})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_delete_activity(self):
        self._auth(self.admin)
        res = self.client.delete(f'/api/v1/activities/{self.act.id}/')
        self.assertEqual(res.status_code, 204)

    def test_planner_can_delete_activity(self):
        self._auth(self.planner)
        res = self.client.delete(f'/api/v1/activities/{self.act.id}/')
        self.assertEqual(res.status_code, 204)


class ScheduleActionPermissionTest(RolePermissionTestBase):
    def test_planner_can_create_period(self):
        self._auth(self.planner)
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': self.act.id, 'start_date': '2026-05-01', 'end_date': '2026-05-15',
            'start_time': '08:00', 'end_time': '17:00',
        })
        self.assertEqual(res.status_code, 201)

    def test_executor_cannot_create_period(self):
        self._auth(self.executor)
        res = self.client.post('/api/v1/schedule/periods/', {
            'activity': self.act.id, 'start_date': '2026-05-01', 'end_date': '2026-05-15',
            'start_time': '08:00', 'end_time': '17:00',
        })
        self.assertEqual(res.status_code, 403)

    def test_planner_can_update_period(self):
        self._auth(self.planner)
        res = self.client.patch(f'/api/v1/schedule/periods/{self.period.id}/', {'description': 'Updated'})
        self.assertEqual(res.status_code, 200)

    def test_executor_cannot_update_period(self):
        self._auth(self.executor)
        res = self.client.patch(f'/api/v1/schedule/periods/{self.period3.id}/', {'description': 'Updated'})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_delete_period(self):
        self._auth(self.admin)
        res = self.client.delete(f'/api/v1/schedule/periods/{self.period.id}/')
        self.assertEqual(res.status_code, 204)

    def test_planner_can_delete_period(self):
        self._auth(self.planner)
        res = self.client.delete(f'/api/v1/schedule/periods/{self.period.id}/')
        self.assertEqual(res.status_code, 204)


class ApprovalActionPermissionTest(RolePermissionTestBase):
    def setUp(self):
        super().setUp()
        from apps.activities.models import ActivityOrgUnit
        self.aou = ActivityOrgUnit.objects.create(
            activity=self.act, organizational_unit=self.uo, status=''
        )

    def test_approver_can_approve(self):
        self._auth(self.approver)
        res = self.client.post('/api/v1/activities/approve/', {'ids': [self.aou.id]}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_planner_cannot_approve(self):
        self._auth(self.planner)
        res = self.client.post('/api/v1/activities/approve/', {'ids': [self.aou.id]}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_executor_cannot_approve(self):
        self._auth(self.executor)
        res = self.client.post('/api/v1/activities/approve/', {'ids': [self.aou.id]}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_director_can_approve(self):
        self._auth(self.director)
        res = self.client.post('/api/v1/activities/approve/', {'ids': [self.aou.id]}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_approver_can_reject(self):
        self._auth(self.approver)
        res = self.client.post('/api/v1/activities/reject/', {'ids': [self.aou.id]}, format='json')
        self.assertEqual(res.status_code, 200)


class AdminEndpointPermissionTest(RolePermissionTestBase):
    def test_normal_user_cannot_list_roles(self):
        self._auth(self.executor)
        res = self.client.get('/api/v1/roles/')
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_create_role(self):
        self._auth(self.executor)
        res = self.client.post('/api/v1/roles/', {'name': 'NewRole'})
        self.assertEqual(res.status_code, 403)

    def test_admin_can_list_roles(self):
        self._auth(self.admin)
        res = self.client.get('/api/v1/roles/')
        self.assertEqual(res.status_code, 200)

    def test_admin_can_create_role(self):
        self._auth(self.admin)
        res = self.client.post('/api/v1/roles/', {'name': 'NewRole'})
        self.assertEqual(res.status_code, 201)

    def test_normal_user_cannot_access_email_config(self):
        self._auth(self.executor)
        res = self.client.get('/api/v1/email-config/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_email_config(self):
        self._auth(self.admin)
        res = self.client.get('/api/v1/email-config/')
        self.assertEqual(res.status_code, 200)

    def test_normal_user_cannot_access_system_config(self):
        self._auth(self.executor)
        res = self.client.get('/api/v1/system-config/')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_access_system_config(self):
        self._auth(self.admin)
        res = self.client.get('/api/v1/system-config/')
        self.assertEqual(res.status_code, 200)

    def test_normal_user_cannot_create_user(self):
        self._auth(self.executor)
        res = self.client.post('/api/v1/users/', {'username': 'newuser', 'password': 'Str0ng!Pass#123'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_user(self):
        self._auth(self.admin)
        res = self.client.post('/api/v1/users/', {
            'username': 'newuser', 'password': 'Str0ng!Pass#123',
            'display_name': 'New User', 'email': 'new@test.com',
        }, format='json')
        self.assertEqual(res.status_code, 201)

    def test_normal_user_cannot_update_user(self):
        self._auth(self.executor)
        res = self.client.patch(f'/api/v1/users/{self.planner.id}/', {'display_name': 'Hacked'})
        self.assertEqual(res.status_code, 403)

    def test_normal_user_cannot_delete_user(self):
        self._auth(self.executor)
        res = self.client.delete(f'/api/v1/users/{self.planner.id}/')
        self.assertEqual(res.status_code, 403)


class RolePermissionHelperTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testrole', password='test123!')
        self.role_planner, _ = Role.objects.get_or_create(name='Planificador')

    def test_has_role_method(self):
        self.assertFalse(self.user.has_role('Planificador'))
        self.user.roles.add(self.role_planner)
        self.assertTrue(self.user.has_role('Planificador'))

    def test_highest_role_property(self):
        from apps.core.permissions import ROLE_EXECUTOR, ROLE_PLANNER
        self.assertIsNone(self.user.highest_role)
        role_exec, _ = Role.objects.get_or_create(name='Ejecutor')
        self.user.roles.add(role_exec)
        self.assertEqual(self.user.highest_role, ROLE_EXECUTOR)
        self.user.roles.add(self.role_planner)
        self.assertEqual(self.user.highest_role, ROLE_PLANNER)
