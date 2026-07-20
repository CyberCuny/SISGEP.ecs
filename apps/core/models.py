import logging
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.signing import TimestampSigner


class Role(models.Model):
    name = models.CharField(max_length=100, verbose_name='Rol')

    class Meta:
        db_table = 'rol'
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    username = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200, verbose_name='Nombre a mostrar')
    email = models.EmailField(max_length=100)
    position = models.CharField(max_length=100, blank=True, null=True, verbose_name='Cargo')
    is_disabled = models.BooleanField(default=False, verbose_name='Inhabilitado')
    date_last_login = models.DateField(blank=True, null=True)
    time_last_login = models.TimeField(blank=True, null=True)
    plan_approver = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, verbose_name='Aprueba plan')
    roles = models.ManyToManyField(Role, through='UserRole', related_name='users')
    groups = models.ManyToManyField('auth.Group', related_name='core_users', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='core_users', blank=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'display_name']

    class Meta:
        db_table = 'usuario'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def has_role(self, role_name):
        from apps.core.permissions import has_role as _has_role
        return _has_role(self, role_name)

    @property
    def highest_role(self):
        from apps.core.permissions import get_highest_role
        return get_highest_role(self)

    def __str__(self):
        return self.display_name or self.username


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, db_column='iduser')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, db_column='idrol')

    class Meta:
        db_table = 'user_rol'
        unique_together = ('user', 'role')
        verbose_name = 'Rol de Usuario'
        verbose_name_plural = 'Roles de Usuarios'


class OrganizationalUnit(models.Model):
    name = models.CharField(max_length=255, verbose_name='Nombre')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True, db_column='id_uo_padre', verbose_name='Unidad Padre')
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_responsable', verbose_name='Responsable')
    sort_order = models.IntegerField(default=0, verbose_name='Orden')

    class Meta:
        db_table = 'unidad_organizativa'
        verbose_name = 'Unidad Organizativa'
        verbose_name_plural = 'Unidades Organizativas'
        ordering = ['parent_id', 'sort_order', 'name']

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=255, verbose_name='Nombre')

    class Meta:
        db_table = 'categoria'
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['name']

    def __str__(self):
        return self.name


class ActivityType(models.Model):
    name = models.CharField(max_length=255, verbose_name='Nombre')

    class Meta:
        db_table = 'tipo_actividad'
        verbose_name = 'Tipo de Actividad'
        verbose_name_plural = 'Tipos de Actividad'
        ordering = ['name']

    def __str__(self):
        return self.name


class ARC(models.Model):
    name = models.CharField(max_length=300, verbose_name='Nombre')
    number = models.IntegerField(blank=True, null=True, verbose_name='Numero', unique=True)

    class Meta:
        db_table = 'arc'
        verbose_name = 'Area de Resultado Clave'
        verbose_name_plural = 'Areas de Resultados Clave'
        ordering = ['number']

    def __str__(self):
        return f'ARC {self.number} - {self.name}' if self.number else self.name


class WorkObjective(models.Model):
    name = models.CharField(max_length=300, verbose_name='Nombre')
    arc = models.ForeignKey(ARC, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_arc', verbose_name='ARC')

    class Meta:
        db_table = 'objetivo_trabajo'
        verbose_name = 'Objetivo de Trabajo'
        verbose_name_plural = 'Objetivos de Trabajo'
        ordering = ['name']

    def __str__(self):
        return self.name


class MeasurementCriterion(models.Model):
    name = models.CharField(max_length=500, verbose_name='Nombre')
    objective = models.ForeignKey(WorkObjective, on_delete=models.SET_NULL, blank=True, null=True, db_column='id_objetivo', verbose_name='Objetivo')

    class Meta:
        db_table = 'criterio_medida'
        verbose_name = 'Criterio de Medida'
        verbose_name_plural = 'Criterios de Medida'
        ordering = ['name']

    def __str__(self):
        return self.name


class Guideline(models.Model):
    name = models.CharField(max_length=500, verbose_name='Nombre', unique=True)

    class Meta:
        db_table = 'lineamiento'
        verbose_name = 'Lineamiento'
        verbose_name_plural = 'Lineamientos'
        ordering = ['name']

    def __str__(self):
        return self.name


logger = logging.getLogger(__name__)
_signer = TimestampSigner()

class EmailConfig(models.Model):
    host = models.CharField(max_length=255, default='localhost')
    port = models.IntegerField(default=25)
    use_tls = models.BooleanField(default=False)
    use_ssl = models.BooleanField(default=False)
    username = models.CharField(max_length=255, blank=True)
    _password = models.CharField('password', max_length=255, blank=True, db_column='password')
    default_from = models.EmailField(default='noreply@example.com')

    class Meta:
        db_table = 'configuracion_email'
        verbose_name = 'Configuración Email'
        verbose_name_plural = 'Configuración Email'
        ordering = ['id']

    @property
    def password(self):
        val = self._password
        if not val:
            return ''
        if val.startswith('__'):
            return val.lstrip('_')
        if val.startswith('e'):
            return val[1:]
        try:
            return _signer.unsign_object(val, max_age=86400 * 365)
        except Exception:
            logger.warning('EmailConfig password: falló unsign, retornando vacío')
            return ''

    @password.setter
    def password(self, value):
        if not value:
            self._password = ''
        elif value.startswith('__') or value.startswith('e'):
            self._password = value
        else:
            self._password = _signer.sign_object(value) if value else ''


class SystemConfig(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(blank=True)

    class Meta:
        db_table = 'configuracion_sistema'
        verbose_name = 'Configuración Sistema'
        verbose_name_plural = 'Configuraciones Sistema'
        ordering = ['key']

    def __str__(self):
        return self.key
