from rest_framework import viewsets
from .models import LogEntry
from .serializers import LogEntrySerializer
from apps.core.permissions import IsAdmin


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogEntry.objects.all().order_by('-fecha', '-hora')
    serializer_class = LogEntrySerializer
    permission_classes = [IsAdmin]
    search_fields = ['username', 'modelo', 'accion']
    filterset_fields = ['username', 'modelo', 'object_id']
    ordering = ['id']
