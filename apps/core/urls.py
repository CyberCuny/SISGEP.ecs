from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.core import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='users')
router.register(r'roles', views.RoleViewSet)
router.register(r'organizational-units', views.OrganizationalUnitViewSet, basename='organizational-units')
router.register(r'categories', views.CategoryViewSet)
router.register(r'activity-types', views.ActivityTypeViewSet)
router.register(r'arcs', views.ARCViewSet)
router.register(r'objectives', views.WorkObjectiveViewSet)
router.register(r'criteria', views.MeasurementCriterionViewSet)
router.register(r'guidelines', views.GuidelineViewSet)
router.register(r'backups', views.BackupViewSet, basename='backups')
router.register(r'email-config', views.EmailConfigViewSet)
router.register(r'system-config', views.SystemConfigViewSet, basename='system-config')

urlpatterns = [
    path('', include(router.urls)),
    path('search/', views.global_search, name='global-search'),
    path('health/', views.health_check, name='health-check'),
    path('users/verify_email/', views.UserViewSet.as_view({'post': 'verify_email'}), name='user-verify-email'),
]
