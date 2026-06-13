from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.activities import views

router = DefaultRouter()
router.register(r'activities', views.ActivityViewSet, basename='activities')
router.register(r'activity-guidelines', views.ActivityGuidelineViewSet)
router.register(r'activity-org-units', views.ActivityOrgUnitViewSet)
router.register(r'activity-mappings', views.ActivityMappingViewSet)
router.register(r'unfulfilled-activities', views.UnfulfilledActivityViewSet)
router.register(r'activity-attachments', views.ActivityAttachmentViewSet)
router.register(r'activity-comments', views.ActivityCommentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
