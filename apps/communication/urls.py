from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.communication import views

router = DefaultRouter()
router.register(r'messages', views.MessageViewSet, basename='messages')
router.register(r'notifications', views.NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
]
