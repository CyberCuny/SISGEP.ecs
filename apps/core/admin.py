from django.contrib import admin
from .models import Role, User, UserRole, OrganizationalUnit, Category, ActivityType, ARC, WorkObjective, MeasurementCriterion, Guideline, ObjectPermission, EmailConfig, SystemConfig


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    ordering = ['name']


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'display_name', 'email', 'position', 'is_disabled', 'is_staff']
    list_filter = ['is_disabled', 'is_staff', 'is_superuser']
    search_fields = ['username', 'display_name', 'email']
    ordering = ['username']
    readonly_fields = ['date_joined', 'last_login', 'date_last_login', 'time_last_login']
    filter_horizontal = ['groups', 'user_permissions']


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role']
    search_fields = ['user__username', 'role__name']
    autocomplete_fields = ['user', 'role']


@admin.register(OrganizationalUnit)
class OrganizationalUnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'responsible']
    list_filter = ['parent']
    search_fields = ['name']
    autocomplete_fields = ['parent', 'responsible']


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    ordering = ['name']


@admin.register(ActivityType)
class ActivityTypeAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    ordering = ['name']


@admin.register(ARC)
class ARCAdmin(admin.ModelAdmin):
    list_display = ['number', 'name']
    search_fields = ['name']
    ordering = ['number']


@admin.register(WorkObjective)
class WorkObjectiveAdmin(admin.ModelAdmin):
    list_display = ['name', 'arc']
    list_filter = ['arc']
    search_fields = ['name']
    autocomplete_fields = ['arc']


@admin.register(MeasurementCriterion)
class MeasurementCriterionAdmin(admin.ModelAdmin):
    list_display = ['name', 'objective']
    list_filter = ['objective']
    search_fields = ['name']
    autocomplete_fields = ['objective']


@admin.register(Guideline)
class GuidelineAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    ordering = ['name']


@admin.register(ObjectPermission)
class ObjectPermissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'permission_type', 'object_type', 'object_id', 'granted_by', 'created_at']
    list_filter = ['permission_type', 'object_type']
    search_fields = ['user__username']
    readonly_fields = ['created_at']
    autocomplete_fields = ['user', 'granted_by']


@admin.register(EmailConfig)
class EmailConfigAdmin(admin.ModelAdmin):
    list_display = ['host', 'port', 'use_tls', 'use_ssl', 'username', 'default_from']
    list_editable = ['port', 'use_tls', 'use_ssl']


@admin.register(SystemConfig)
class SystemConfigAdmin(admin.ModelAdmin):
    list_display = ['key', 'value']
    search_fields = ['key']
    list_filter = ['key']
