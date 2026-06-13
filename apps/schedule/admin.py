from django.contrib import admin
from .models import SchedulePeriod, SchedulePeriodMapping, ScheduleOrgUnit, WorkDay, ApprovedPlan, ScheduleComment


class SchedulePeriodMappingInline(admin.TabularInline):
    model = SchedulePeriodMapping
    autocomplete_fields = ['user']
    extra = 1


class ScheduleOrgUnitInline(admin.TabularInline):
    model = ScheduleOrgUnit
    autocomplete_fields = ['organizational_unit']
    extra = 1


class ScheduleCommentInline(admin.TabularInline):
    model = ScheduleComment
    readonly_fields = ['created_at']
    extra = 0


@admin.register(SchedulePeriod)
class SchedulePeriodAdmin(admin.ModelAdmin):
    list_display = ['description', 'activity', 'start_date', 'end_date', 'status', 'is_extraplan', 'has_incidence']
    list_filter = ['status', 'is_extraplan', 'has_incidence']
    search_fields = ['description', 'observation']
    readonly_fields = ['is_modified']
    autocomplete_fields = ['activity']
    inlines = [SchedulePeriodMappingInline, ScheduleOrgUnitInline, ScheduleCommentInline]


@admin.register(SchedulePeriodMapping)
class SchedulePeriodMappingAdmin(admin.ModelAdmin):
    list_display = ['schedule_period', 'user']
    autocomplete_fields = ['schedule_period', 'user']


@admin.register(ScheduleOrgUnit)
class ScheduleOrgUnitAdmin(admin.ModelAdmin):
    list_display = ['schedule_period', 'organizational_unit', 'status']
    list_filter = ['status']
    autocomplete_fields = ['schedule_period', 'organizational_unit']


@admin.register(WorkDay)
class WorkDayAdmin(admin.ModelAdmin):
    list_display = ['user', 'day']
    list_filter = ['day']
    autocomplete_fields = ['user']
    ordering = ['day']


@admin.register(ApprovedPlan)
class ApprovedPlanAdmin(admin.ModelAdmin):
    list_display = ['organizational_unit', 'plan_date', 'approved_date']
    list_filter = ['plan_date']
    autocomplete_fields = ['organizational_unit']


@admin.register(ScheduleComment)
class ScheduleCommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'schedule_period', 'created_at']
    readonly_fields = ['created_at']
    autocomplete_fields = ['schedule_period', 'user']
