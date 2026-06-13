import os
from django.http import JsonResponse
from django.conf import settings


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        maintenance_file = os.environ.get('MAINTENANCE_FILE', '/tmp/maintenance.flag')
        if os.path.exists(maintenance_file) and not request.path.startswith('/api/health/'):
            return JsonResponse(
                {'detail': 'Sistema en mantenimiento. Intente más tarde.'},
                status=503,
            )
        return self.get_response(request)


class CSPMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        directives = []
        if settings.CSP_DEFAULT_SRC:
            directives.append(f"default-src {' '.join(settings.CSP_DEFAULT_SRC)}")
        if hasattr(settings, 'CSP_SCRIPT_SRC') and settings.CSP_SCRIPT_SRC:
            directives.append(f"script-src {' '.join(settings.CSP_SCRIPT_SRC)}")
        if hasattr(settings, 'CSP_STYLE_SRC') and settings.CSP_STYLE_SRC:
            directives.append(f"style-src {' '.join(settings.CSP_STYLE_SRC)}")
        if hasattr(settings, 'CSP_IMG_SRC') and settings.CSP_IMG_SRC:
            directives.append(f"img-src {' '.join(settings.CSP_IMG_SRC)}")
        if hasattr(settings, 'CSP_CONNECT_SRC') and settings.CSP_CONNECT_SRC:
            directives.append(f"connect-src {' '.join(settings.CSP_CONNECT_SRC)}")
        if directives:
            response['Content-Security-Policy'] = '; '.join(directives)
        return response
