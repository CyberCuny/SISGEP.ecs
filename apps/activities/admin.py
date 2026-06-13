from django.contrib import admin
from .models import Activity, ActivityGuideline, ActivityOrgUnit, ActivityMapping, UnfulfilledActivity, ActivityAttachment, ActivityComment


class ActivityGuidelineInline(admin.TabularInline):
    model = ActivityGuideline
    autocomplete_fields = ['guideline']
    extra = 1


class ActivityOrgUnitInline(admin.TabularInline):
    model = ActivityOrgUnit
    autocomplete_fields = ['organizational_unit']
    extra = 1


class ActivityMappingInline(admin.TabularInline):
    model = ActivityMapping
    autocomplete_fields = ['user']
    extra = 1


class ActivityAttachmentInline(admin.TabularInline):
    model = ActivityAttachment
    extra = 0
    readonly_fields = ['uploaded_at']


class ActivityCommentInline(admin.TabularInline):
    model = ActivityComment
    readonly_fields = ['created_at']
    extra = 0


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['description', 'organizational_unit', 'category', 'activity_type', 'is_important', 'is_general', 'color', 'created_by']
    list_filter = ['is_important', 'is_general', 'category', 'activity_type', 'arc']
    search_fields = ['description', 'place', 'responsible']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['category', 'organizational_unit', 'associated_objective', 'measurement_criterion', 'arc', 'activity_type', 'created_by']
    inlines = [ActivityGuidelineInline, ActivityOrgUnitInline, ActivityMappingInline, ActivityAttachmentInline, ActivityCommentInline]


@admin.register(ActivityGuideline)
class ActivityGuidelineAdmin(admin.ModelAdmin):
    list_display = ['activity', 'guideline']
    autocomplete_fields = ['activity', 'guideline']


@admin.register(ActivityOrgUnit)
class ActivityOrgUnitAdmin(admin.ModelAdmin):
    list_display = ['activity', 'organizational_unit', 'status']
    list_filter = ['status']
    autocomplete_fields = ['activity', 'organizational_unit']


@admin.register(ActivityMapping)
class ActivityMappingAdmin(admin.ModelAdmin):
    list_display = ['activity', 'user']
    autocomplete_fields = ['activity', 'user']


@admin.register(UnfulfilledActivity)
class UnfulfilledActivityAdmin(admin.ModelAdmin):
    list_display = ['activity', 'registered_by', 'registered_at']
    list_filter = ['registered_at']
    readonly_fields = ['registered_at']
    autocomplete_fields = ['activity', 'registered_by']


@admin.register(ActivityAttachment)
class ActivityAttachmentAdmin(admin.ModelAdmin):
    list_display = ['activity', 'description', 'uploaded_by', 'uploaded_at']
    readonly_fields = ['uploaded_at']
    autocomplete_fields = ['activity', 'uploaded_by']


@admin.register(ActivityComment)
class ActivityCommentAdmin(admin.ModelAdmin):
    list_display = ['activity', 'user', 'created_at']
    readonly_fields = ['created_at']
    autocomplete_fields = ['activity', 'user']
