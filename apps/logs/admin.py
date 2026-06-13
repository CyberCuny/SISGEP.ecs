from django.contrib import admin
from .models import LogEntry


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    list_display = ['fecha', 'hora', 'username', 'modelo', 'accion', 'ip_address']
    list_filter = ['modelo', 'fecha', 'username']
    search_fields = ['username', 'modelo', 'accion', 'ip_address']
    readonly_fields = ['fecha', 'hora', 'username', 'modelo', 'accion', 'ip_address', 'user_agent', 'object_id', 'data_diff']
    ordering = ['-fecha', '-hora']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
