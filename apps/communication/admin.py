from django.contrib import admin
from .models import Message, Notification


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['subject', 'sender', 'recipient', 'created_at', 'read_at']
    list_filter = ['created_at', 'read_at']
    search_fields = ['subject', 'body']
    readonly_fields = ['created_at']
    autocomplete_fields = ['sender', 'recipient']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'notification_type', 'message', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['message']
    readonly_fields = ['created_at']
    autocomplete_fields = ['user']
