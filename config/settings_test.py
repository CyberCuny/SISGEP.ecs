"""
Test settings — SQLite in-memory for CI/testing without PostgreSQL.
Usage: python manage.py test --settings=config.settings_test
"""
from .settings import *  # noqa: F403
import os  # noqa: F405
from .settings import BASE_DIR  # noqa: F405

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'test_db.sqlite3'),
    }
}

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']['auth'] = '1000/hour'  # noqa: F405

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

DEBUG = True
ALLOWED_HOSTS = ['*']
SECRET_KEY = 'test-secret-key-not-for-production'
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.InMemoryStorage'},
    'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'},
}
