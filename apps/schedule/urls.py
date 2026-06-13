from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.schedule import views

router = DefaultRouter()
router.register(r'periods', views.SchedulePeriodViewSet, basename='schedule-periods')
router.register(r'period-mappings', views.SchedulePeriodMappingViewSet)
router.register(r'org-units', views.ScheduleOrgUnitViewSet)
router.register(r'work-days', views.WorkDayViewSet, basename='work-days')
router.register(r'approved-plans', views.ApprovedPlanViewSet)
router.register(r'reports', views.ReportsViewSet, basename='reports')
router.register(r'comments', views.ScheduleCommentViewSet)

urlpatterns = [
    path('schedule/', include(router.urls)),
]
