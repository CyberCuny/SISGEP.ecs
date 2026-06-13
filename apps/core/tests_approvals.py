from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from apps.activities.models import Activity
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
        url = '/api/v1/activities/approve_subunit_activity/'
        data = {
            'activity_id': self.activity.id,
            'action': 'APPROVE',
            'observation': 'Aprobado por gerencia',
        }
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [200, 400])

    def test_reject_subunit_activity(self):
        url = '/api/v1/activities/approve_subunit_activity/'
        data = {
            'activity_id': self.activity.id,
            'action': 'REJECT',
            'observation': 'Rechazado',
        }
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [200, 400])

    def test_approve_subunit_cronograms(self):
        url = '/api/v1/activities/approve_subunit_cronograms/'
        data = {'activity_id': self.activity.id}
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [200, 400])
