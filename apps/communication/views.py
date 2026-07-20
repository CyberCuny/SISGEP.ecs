from django.db import models
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Message, Notification
from .serializers import MessageSerializer, MessageCreateSerializer, NotificationSerializer
from apps.core.utils import log_action
from apps.core.views import _create_notification


class MessageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    search_fields = ['subject', 'body']

    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer

    def get_queryset(self):
        return Message.objects.select_related('sender', 'recipient').filter(
            models.Q(sender=self.request.user) | models.Q(recipient=self.request.user)
        ).order_by('-created_at')

    def perform_create(self, serializer):
        msg = serializer.save(sender=self.request.user)
        log_action(self.request, 'Mensaje', f'Envió mensaje: {msg.subject[:80]}', object_id=msg.pk)
        _create_notification(msg.recipient, f'Nuevo mensaje: {msg.subject[:80]}', 'message',
                             related_object_id=msg.pk, related_object_type='Message',
                             meta={'message_id': msg.pk, 'message_subject': msg.subject[:80], 'sender_id': msg.sender.id, 'sender_name': msg.sender.display_name})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        msg.read_at = timezone.now()
        msg.save()
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def inbox(self, request):
        qs = Message.objects.select_related('sender', 'recipient').filter(recipient=request.user).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def sent(self, request):
        qs = Message.objects.select_related('sender', 'recipient').filter(sender=request.user).order_by('-created_at')
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = Message.objects.filter(recipient=request.user, read_at__isnull=True).count()
        return Response({'count': count})


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.select_related('user').filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notif = self.get_object()
        notif.is_read = True
        notif.save()
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
