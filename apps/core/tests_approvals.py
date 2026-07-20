from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.activities.models import Activity, ActivityOrgUnit, ActivityMapping
from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit, SchedulePeriodMapping, ApprovedPlan
from apps.core.models import OrganizationalUnit, Category

User = get_user_model()


class ApprovalWorkflowTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'admin123')
        self.manager = User.objects.create_user('manager', 'manager@test.com', 'pass123')
        self.client.force_authenticate(self.admin)

        self.category = Category.objects.create(name='Test Category')
        self.org_unit = OrganizationalUnit.objects.create(
            name='Test Unit', responsible=self.manager
        )
        self.activity = Activity.objects.create(
            description='Test Activity',
            category=self.category,
            organizational_unit=self.org_unit,
        )

    def test_approve_subunit_activity(self):
        aou = ActivityOrgUnit.objects.create(
            activity=self.activity, organizational_unit=self.org_unit
        )
        SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-07-01', end_date='2026-07-31',
            start_time='08:00', end_time='17:00',
        )
        url = '/api/v1/activities/approve_subunit_activity/'
        response = self.client.post(url, {'activity_org_unit_id': aou.id}, format='json')
        self.assertEqual(response.status_code, 200)
        aou.refresh_from_db()
        self.assertEqual(aou.status, 'Aprobado')
        self.assertTrue(ApprovedPlan.objects.filter(activity=self.activity).exists())

    def test_reject_subunit_activity(self):
        aou = ActivityOrgUnit.objects.create(
            activity=self.activity, organizational_unit=self.org_unit
        )
        url = '/api/v1/activities/reject_subunit_activity/'
        response = self.client.post(url, {'activity_org_unit_id': aou.id}, format='json')
        self.assertEqual(response.status_code, 200)
        aou.refresh_from_db()
        self.assertEqual(aou.status, 'Rechazado')

    def test_approve_subunit_cronograms(self):
        sp = SchedulePeriod.objects.create(
            activity=self.activity, start_date='2026-07-01', end_date='2026-07-31',
            start_time='08:00', end_time='17:00',
        )
        sou = ScheduleOrgUnit.objects.create(
            schedule_period=sp, organizational_unit=self.org_unit
        )
        url = '/api/v1/activities/approve_subunit_cronograms/'
        response = self.client.post(url, {'schedule_org_unit_id': sou.id}, format='json')
        self.assertEqual(response.status_code, 200)
        sou.refresh_from_db()
        self.assertEqual(sou.status, 'Aprobado')
        self.assertTrue(SchedulePeriodMapping.objects.filter(
            schedule_period=sp, user=self.admin
        ).exists())
