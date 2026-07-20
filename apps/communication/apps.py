from django.apps import AppConfig


class CommunicationConfig(AppConfig):
    name = 'apps.communication'

    def ready(self):
        from . import signals  # noqa
