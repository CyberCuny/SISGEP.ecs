from django.db import models


class LogEntry(models.Model):
    fecha = models.DateField(blank=True, null=True)
    hora = models.TimeField(blank=True, null=True)
    username = models.CharField(max_length=300, blank=True, null=True)
    modelo = models.CharField(max_length=300, blank=True, null=True)
    accion = models.CharField(max_length=600, blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name='Direccion IP')
    user_agent = models.TextField(blank=True, null=True, verbose_name='User Agent')
    object_id = models.IntegerField(blank=True, null=True, verbose_name='ID del Objeto')
    data_diff = models.JSONField(blank=True, null=True, verbose_name='Diferencia de Datos')

    class Meta:
        db_table = 'logstore'
        verbose_name = 'Registro de Auditoria'
        verbose_name_plural = 'Registros de Auditoria'
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['modelo']),
            models.Index(fields=['object_id']),
            models.Index(fields=['fecha']),
        ]

    def __str__(self):
        return f'{self.fecha} {self.hora} - {self.username}: {self.accion}'
