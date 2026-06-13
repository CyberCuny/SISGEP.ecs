"""
Production settings — overrides for config/settings.py
Import with: python manage.py runserver --settings=config.settings_prod
Or set: DJANGO_SETTINGS_MODULE=config.settings_prod
"""
import os
from pathlib import Path
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from .settings import *  # noqa
from .settings import MIDDLEWARE, BASE_DIR

_sentry_dsn = os.environ.get('SENTRY_DSN')
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[DjangoIntegration()],
        traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.2')),
        send_default_pii=True,
        environment=os.environ.get('SENTRY_ENVIRONMENT', 'production'),
    )

# Security
DEBUG = False
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Database — inherited from base settings

# Redis channel layer
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [os.environ.get('REDIS_URL', 'redis://localhost:6379/0')]},
    },
}

# Email — SMTP from env
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'localhost')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@plantrabajo.cu')

# Maintenance mode — flag file at MAINTENANCE_FILE path enables 503
MIDDLEWARE = [m for m in MIDDLEWARE]
MIDDLEWARE.insert(2, 'whitenoise.middleware.WhiteNoiseMiddleware')
MIDDLEWARE = [m for m in MIDDLEWARE if m != 'apps.core.middleware.CSPMiddleware']
MIDDLEWARE.append('apps.core.middleware.CSPMiddleware')

# Static & Media — Whitenoise
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_ROOT = os.environ.get('MEDIA_ROOT', str(BASE_DIR / 'media'))

# Security headers
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True'
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
SECURE_REFERRER_POLICY = 'same-origin'

# Content Security Policy
CSP_DEFAULT_SRC = ["'self'"]
CSP_SCRIPT_SRC = ["'self'"]
CSP_STYLE_SRC = ["'self'", "'unsafe-inline'"]
CSP_IMG_SRC = ["'self'", "data:"]
CSP_CONNECT_SRC = ["'self'", "ws://localhost:*", "wss://*"]

# CORS for production
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'https://plantrabajo.cu').split(',')
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'https://plantrabajo.cu').split(',')

# Logging — file + console with rotation
LOG_DIR = Path(os.environ.get('LOG_DIR', '/var/log/plantrabajo'))
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {'()': 'django.utils.log.RequireDebugFalse'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'django.log',
            'maxBytes': 10 * 1024 * 1024,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'error_file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'error.log',
            'maxBytes': 10 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
            'level': 'ERROR',
        },
    },
    'root': {
        'handlers': ['console', 'file', 'error_file'],
        'level': os.environ.get('LOG_LEVEL', 'INFO'),
    },
    'loggers': {
        'django.security': {'handlers': ['error_file'], 'level': 'WARNING', 'propagate': False},
        'django.request': {'handlers': ['error_file'], 'level': 'ERROR', 'propagate': False},
        'plantrabajo': {'handlers': ['file', 'console'], 'level': 'INFO', 'propagate': False},
    },
}

# Cache with Redis
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://localhost:6379/1'),
        'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
    }
}

# Session backend
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
