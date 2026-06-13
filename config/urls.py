from django.contrib import admin
from django.shortcuts import render
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from apps.core import views


def handler403(request, exception=None):
    return render(request, '403.html', status=403)


def handler404(request, exception=None):
    return render(request, '404.html', status=404)


def handler500(request):
    return render(request, '500.html', status=500)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/v1/', include('apps.core.urls')),
    path('api/v1/', include('apps.activities.urls')),
    path('api/v1/', include('apps.schedule.urls')),
    path('api/v1/', include('apps.communication.urls')),
    path('api/v1/', include('apps.logs.urls')),
    path('api/v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/health/', views.health_check, name='health-check'),

    path('api/docs/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
