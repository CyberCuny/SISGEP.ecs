from django.db import models
from apps.core.models import User, OrganizationalUnit
from apps.activities.models import Activity


class SchedulePeriod(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, db_column='id_actividad', related_name='schedule_periods')
    start_date = models.DateField(verbose_name='Fecha Inicio')
    end_date = models.DateField(verbose_name='Fecha Fin')
    is_extraplan = models.BooleanField(default=False, verbose_name='Extraplan')
    status = models.CharField(max_length=20, blank=True, null=True, verbose_name='Estado')
    description = models.CharField(max_length=500, blank=True, null=True, verbose_name='Descripcion')
    observation = models.CharField(max_length=600, blank=True, null=True, verbose_name='Observacion')
    start_time = models.TimeField(verbose_name='Hora Plan')
    end_time = models.TimeField(verbose_name='Hora Fin')
    has_incidence = models.BooleanField(default=False, verbose_name='Incidencia')
    color = models.CharField(max_length=50, blank=True, null=True, verbose_name='Color')
    is_modified = models.BooleanField(default=False, verbose_name='Modificado')

    class Meta:
        db_table = 'cronograma_periodo'
        unique_together = ('activity', 'start_date', 'end_date', 'start_time', 'end_time')
        verbose_name = 'Periodo de Cronograma'
        verbose_name_plural = 'Periodos de Cronograma'
        ordering = ['start_date']
        indexes = [
            models.Index(fields=['start_date']),
            models.Index(fields=['end_date']),
            models.Index(fields=['status']),
            models.Index(fields=['activity']),
        ]

    def __str__(self):
        return f'{self.description or "Sin desc"} ({self.start_date} - {self.end_date})'


class SchedulePeriodMapping(models.Model):
    schedule_period = models.ForeignKey(SchedulePeriod, on_delete=models.CASCADE, db_column='id_cronograma_periodo')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_user')

    class Meta:
        db_table = 'cronograma_periodo_mapeado'
        unique_together = ('schedule_period', 'user')
        verbose_name = 'Periodo de Cronograma Mapeado'
        verbose_name_plural = 'Periodos de Cronograma Mapeados'


class ScheduleOrgUnit(models.Model):
    schedule_period = models.ForeignKey(SchedulePeriod, on_delete=models.CASCADE, db_column='id_cronograma')
    organizational_unit = models.ForeignKey(OrganizationalUnit, on_delete=models.CASCADE, db_column='id_unidad_organizativa')
    status = models.CharField(max_length=10, blank=True, null=True, verbose_name='Estado')

    class Meta:
        db_table = 'cronoperiodo_uo'
        unique_together = ('schedule_period', 'organizational_unit')
        verbose_name = 'Cronograma por UO'
        verbose_name_plural = 'Cronogramas por UO'
        indexes = [models.Index(fields=['status'])]


class WorkDay(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='iduser')
    day = models.IntegerField(verbose_name='Dia')

    class Meta:
        db_table = 'dialaborable'
        unique_together = ('user', 'day')
        verbose_name = 'Dia Laborable'
        verbose_name_plural = 'Dias Laborables'
        ordering = ['day']


class ApprovedPlan(models.Model):
    organizational_unit = models.ForeignKey(OrganizationalUnit, on_delete=models.CASCADE, db_column='id_unidad_organizativa')
    plan_date = models.DateField(verbose_name='Fecha del Plan')
    approved_date = models.DateField(verbose_name='Fecha Aprobado')

    class Meta:
        db_table = 'plan_aprobado'
        unique_together = ('organizational_unit', 'plan_date')
        verbose_name = 'Plan Aprobado'
        verbose_name_plural = 'Planes Aprobados'


class ScheduleComment(models.Model):
    schedule_period = models.ForeignKey(SchedulePeriod, on_delete=models.CASCADE, related_name='comments', db_column='id_cronograma_periodo')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_usuario')
    comment = models.TextField(verbose_name='Comentario')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cronograma_comentario'
        verbose_name = 'Comentario de Cronograma'
        verbose_name_plural = 'Comentarios de Cronogramas'

    def __str__(self):
        return f'{self.user.display_name}: {self.comment[:50]}'
