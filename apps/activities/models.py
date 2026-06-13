from django.db import models
from apps.core.models import (User, OrganizationalUnit, Category, ActivityType,
                              ARC, WorkObjective, MeasurementCriterion, Guideline)


class Activity(models.Model):
    place = models.CharField(max_length=255, blank=True, null=True, verbose_name='Lugar')
    responsible = models.CharField(max_length=500, blank=True, null=True, verbose_name='Responsables')
    participants = models.CharField(max_length=500, blank=True, null=True, verbose_name='Participantes')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_categoria', verbose_name='Categoria')
    organizational_unit = models.ForeignKey(OrganizationalUnit, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_unidad_organizativa', verbose_name='Unidad Organizativa')
    description = models.CharField(max_length=500, blank=True, null=True, verbose_name='Descripcion')
    is_important = models.BooleanField(default=False, verbose_name='Importante')
    associated_objective = models.ForeignKey(WorkObjective, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_objetivo_asociado', verbose_name='Objetivo Asociado')
    measurement_criterion = models.ForeignKey(MeasurementCriterion, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_criterio_medida', verbose_name='Criterio de Medida')
    arc = models.ForeignKey(ARC, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_arc', verbose_name='ARC')
    activity_type = models.ForeignKey(ActivityType, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_tipo_actividad', verbose_name='Tipo de Actividad')
    is_general = models.BooleanField(default=False, verbose_name='General')
    color = models.CharField(max_length=50, blank=True, null=True, verbose_name='Color')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='created_activities')

    class Meta:
        db_table = 'actividad'
        verbose_name = 'Actividad'
        verbose_name_plural = 'Actividades'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['description']),
            models.Index(fields=['organizational_unit']),
            models.Index(fields=['category']),
            models.Index(fields=['created_by']),
        ]

    def __str__(self):
        return self.description or f'Actividad #{self.pk}'


class ActivityGuideline(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, db_column='id_actividad')
    guideline = models.ForeignKey(Guideline, on_delete=models.CASCADE, db_column='id_lineamiento')

    class Meta:
        db_table = 'actividad_lineamiento'
        unique_together = ('activity', 'guideline')
        verbose_name = 'Lineamiento de Actividad'
        verbose_name_plural = 'Lineamientos de Actividades'


class ActivityOrgUnit(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, db_column='id_actividad')
    organizational_unit = models.ForeignKey(OrganizationalUnit, on_delete=models.CASCADE, db_column='id_unidad_organizativa')
    status = models.CharField(max_length=10, blank=True, null=True, verbose_name='Estado')

    class Meta:
        db_table = 'actividad_uo'
        unique_together = ('activity', 'organizational_unit')
        verbose_name = 'Actividad por UO'
        verbose_name_plural = 'Actividades por UO'
        indexes = [models.Index(fields=['status'])]


class ActivityMapping(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, db_column='id_actividad')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_user')

    class Meta:
        db_table = 'actividad_mapeada'
        unique_together = ('activity', 'user')
        verbose_name = 'Actividad Mapeada'
        verbose_name_plural = 'Actividades Mapeadas'


class UnfulfilledActivity(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, db_column='id_actividad', related_name='unfulfilled_records')
    schedule_period = models.ForeignKey('schedule.SchedulePeriod', on_delete=models.CASCADE, blank=True, null=True, db_column='id_cronograma_periodo')
    description = models.TextField(verbose_name='Descripcion')
    registered_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_registrado_por')
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'actividad_incumplida'
        verbose_name = 'Actividad Incumplida'
        verbose_name_plural = 'Actividades Incumplidas'

    def __str__(self):
        return f'Incumplimiento: {self.activity.description[:50]}'


class ActivityAttachment(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='attachments', db_column='id_actividad')
    file = models.FileField(upload_to='activity_attachments/', verbose_name='Archivo', validators=[])
    description = models.CharField(max_length=300, blank=True, null=True, verbose_name='Descripcion')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_subido_por')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'actividad_adjunto'
        verbose_name = 'Adjunto de Actividad'
        verbose_name_plural = 'Adjuntos de Actividades'


class ActivityComment(models.Model):
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='comments', db_column='id_actividad')
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='id_usuario')
    comment = models.TextField(verbose_name='Comentario')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'actividad_comentario'
        verbose_name = 'Comentario de Actividad'
        verbose_name_plural = 'Comentarios de Actividades'

    def __str__(self):
        return f'{self.user.display_name}: {self.comment[:50]}'
