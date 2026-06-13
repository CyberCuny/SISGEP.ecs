from django.test import TestCase
from apps.logs.models import LogEntry
from django.contrib.auth import get_user_model

User = get_user_model()


class LogEntryModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='logtest', password='test123')
        self.log = LogEntry.objects.create(
            username='logtest',
            modelo='Test',
            accion='Test action',
            ip_address='127.0.0.1'
        )

    def test_log_creation(self):
        self.assertEqual(LogEntry.objects.count(), 1)
        self.assertEqual(self.log.modelo, 'Test')
        self.assertEqual(self.log.ip_address, '127.0.0.1')

    def test_log_str(self):
        self.assertIn('logtest', str(self.log))
