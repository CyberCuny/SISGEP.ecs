from django.db import models
from apps.core.models import User


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages', db_column='id_remitente')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages', db_column='id_destinatario')
    subject = models.CharField(max_length=300, verbose_name='Asunto')
    body = models.TextField(verbose_name='Cuerpo')
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'mensaje'
        verbose_name = 'Mensaje'
        verbose_name_plural = 'Mensajes'

    def __str__(self):
        return f'{self.subject} - de {self.sender.display_name} para {self.recipient.display_name}'


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications', db_column='id_usuario')
    message = models.CharField(max_length=500, verbose_name='Mensaje')
    notification_type = models.CharField(max_length=50, verbose_name='Tipo')  # approval, rejection, message, system
    related_object_id = models.IntegerField(blank=True, null=True)
    related_object_type = models.CharField(max_length=100, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    meta = models.JSONField(default=dict, blank=True, verbose_name='Metadatos')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notificacion'
        verbose_name = 'Notificacion'
        verbose_name_plural = 'Notificaciones'

    def __str__(self):
        return f'{self.notification_type}: {self.message[:50]}'
