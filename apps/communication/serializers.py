from rest_framework import serializers
from .models import Message, Notification


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.display_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.display_name', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['sender', 'created_at', 'read_at']


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['recipient', 'subject', 'body']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['created_at']
