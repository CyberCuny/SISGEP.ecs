from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.communication.models import Message, Notification

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
