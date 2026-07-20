import datetime
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.communication.models import Message, Notification
from apps.activities.models import Activity, ActivityResponsible, ActivityParticipant, ActivityMapping, ActivityOrgUnit
from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit
from apps.core.models import OrganizationalUnit, Category, Role

User = get_user_model()


class MessageTest(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user('user1', 'user1@test.com', 'pass123')
        self.user2 = User.objects.create_user('user2', 'user2@test.com', 'pass123')
        self.client.force_authenticate(self.user1)

        self.message = Message.objects.create(
            sender=self.user1,
            recipient=self.user2,
            subject='Test Subject',
            body='Test body',
        )

    def test_list_messages(self):
        url = '/api/v1/messages/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_message(self):
        url = '/api/v1/messages/'
        data = {
            'recipient': self.user2.id,
            'subject': 'New Subject',
            'body': 'New body',
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_inbox(self):
        url = '/api/v1/messages/inbox/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_sent(self):
        url = '/api/v1/messages/sent/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mark_read(self):
        url = f'/api/v1/messages/{self.message.id}/mark_read/'
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.message.refresh_from_db()
        self.assertIsNotNone(self.message.read_at)

    def test_unread_count(self):
        url = '/api/v1/messages/unread_count/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)


class NotificationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('user', 'user@test.com', 'pass123')
        self.client.force_authenticate(self.user)

        self.notification = Notification.objects.create(
            user=self.user,
            message='Test message',
            notification_type='INFO',
        )

    def test_list_notifications(self):
        url = '/api/v1/notifications/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_notification(self):
        url = f'/api/v1/notifications/{self.notification.id}/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Test message')

    def test_mark_read(self):
        url = f'/api/v1/notifications/{self.notification.id}/mark_read/'
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_mark_all_read(self):
        url = '/api/v1/notifications/mark_all_read/'
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(user=self.user, is_read=True).exists())

    def test_unread_count(self):
        url = '/api/v1/notifications/unread_count/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)


class NotificationCreationTest(APITestCase):
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

    def test_notification_on_activity_creation(self):
        """Al crear actividad con responsable/participante, se crean notificaciones"""
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act Notif Test',
            'category': self.cat.id,
            'responsible_user_ids': [self.executor.id],
            'participant_user_ids': [self.approver.id],
        }, format='json')
        self.assertEqual(res.status_code, 201)
        notifs = Notification.objects.filter(related_object_type='Activity')
        self.assertEqual(notifs.count(), 2)
        self.assertTrue(notifs.filter(user=self.executor, notification_type='assignment').exists())
        self.assertTrue(notifs.filter(user=self.approver, notification_type='assignment').exists())
        for n in notifs:
            self.assertIn('activity_desc', n.meta)
            self.assertEqual(n.meta['activity_id'], res.data['id'])

    def test_notification_on_activity_update_new_users(self):
        """Al actualizar actividad agregando nuevos responsables, se crean notificaciones"""
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act Update Notif',
            'category': self.cat.id,
            'responsible_user_ids': [self.executor.id],
        }, format='json')
        act_id = res.data['id']

        # agregar nuevo responsable
        res2 = self.client.patch(f'/api/v1/activities/{act_id}/', {
            'responsible_user_ids': [self.executor.id, self.approver.id],
        }, format='json')
        self.assertEqual(res2.status_code, 200)
        new_notifs = Notification.objects.filter(
            related_object_id=act_id,
            notification_type='assignment',
            user=self.approver
        )
        self.assertEqual(new_notifs.count(), 1)

    def test_notification_on_schedule_period_creation(self):
        """Al crear periodo, se notifica a responsables de la actividad"""
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act Period Notif',
            'category': self.cat.id,
            'responsible_user_ids': [self.executor.id],
        }, format='json')
        act_id = res.data['id']
        res2 = self.client.post('/api/v1/schedule/periods/', {
            'activity': act_id,
            'start_date': '2026-09-01',
            'end_date': '2026-09-30',
            'start_time': '08:00',
            'end_time': '16:00',
        }, format='json')
        self.assertEqual(res2.status_code, 201)
        notif = Notification.objects.filter(
            related_object_type='SchedulePeriod',
            user=self.executor
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.notification_type, 'assignment')

    def test_notification_on_approve(self):
        """Al aprobar actividad, se notifica al creador"""
        parent = OrganizationalUnit.objects.create(name='Parent UO', responsible=self.approver)
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act Approve Notif',
            'category': self.cat.id,
            'organizational_unit': parent.id,
            'responsible_user_ids': [self.executor.id],
        }, format='json')
        self.assertEqual(res.status_code, 201, res.data)
        act_id = res.data['id']
        aou = ActivityOrgUnit.objects.filter(activity_id=act_id).first()
        self.assertIsNotNone(aou)
        self.client.force_authenticate(self.approver)
        res2 = self.client.post('/api/v1/activities/approve/', {'ids': [aou.id]}, format='json')
        self.assertEqual(res2.status_code, 200, res2.data)
        notif = Notification.objects.filter(
            notification_type='approval',
            user=self.planner
        ).first()
        self.assertIsNotNone(notif)
        self.assertEqual(notif.related_object_type, 'Activity')

    def test_notification_on_distribute_to_subunits(self):
        """Al distribuir a subunidades, se notifica al responsable de la UO hija"""
        parent = OrganizationalUnit.objects.create(name='Parent UO')
        child = OrganizationalUnit.objects.create(name='Child UO', parent=parent, responsible=self.executor)
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Act Distribute Notif',
            'category': self.cat.id,
            'organizational_unit': parent.id,
            'responsible_user_ids': [],
        }, format='json')
        act_id = res.data['id']
        res2 = self.client.post('/api/v1/activities/distribute_to_subunits/', {
            'activity_id': act_id,
        }, format='json')
        self.assertEqual(res2.status_code, 200)
        notif = Notification.objects.filter(
            notification_type='assignment',
            user=self.executor
        ).filter(meta__unit_id=child.id).first()
        self.assertIsNotNone(notif)

    def test_notification_meta_contains_structured_data(self):
        """Verificar que meta contiene datos estructurados para i18n"""
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Meta Test Act',
            'category': self.cat.id,
            'responsible_user_ids': [self.executor.id],
        }, format='json')
        notif = Notification.objects.filter(user=self.executor).first()
        self.assertIsNotNone(notif)
        self.assertIn('activity_id', notif.meta)
        self.assertIn('activity_desc', notif.meta)
        self.assertIn('user_id', notif.meta)
        self.assertIn('user_name', notif.meta)
        self.assertEqual(notif.meta['activity_desc'], 'Meta Test Act')

    def test_workday_ownership_restriction(self):
        """Ejecutor no puede modificar días laborables de otro usuario"""
        from apps.schedule.models import WorkDay
        self.client.force_authenticate(self.executor)
        other = User.objects.create_user('other', 'other@test.com', 'pass')
        wd = WorkDay.objects.create(user=other, day=1)
        res = self.client.delete(f'/api/v1/schedule/work-days/{wd.id}/')
        self.assertEqual(res.status_code, 404, 'Ejecutor no debe poder eliminar WorkDay de otro')

    def test_unfulfilled_activity_executor_can_create(self):
        """Ejecutor puede registrar actividad incumplida"""
        self.client.force_authenticate(self.planner)
        res = self.client.post('/api/v1/activities/', {
            'description': 'Unfulfilled Test',
            'category': self.cat.id,
        }, format='json')
        act_id = res.data['id']
        self.client.force_authenticate(self.executor)
        res2 = self.client.post('/api/v1/unfulfilled-activities/', {
            'activity': act_id,
            'description': 'No se pudo completar',
        }, format='json')
        self.assertEqual(res2.status_code, 201)
