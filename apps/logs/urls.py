from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.logs import views

router = DefaultRouter()
router.register(r'log-entries', views.LogEntryViewSet, basename='log-entries')

urlpatterns = [
    path('', include(router.urls)),
]
