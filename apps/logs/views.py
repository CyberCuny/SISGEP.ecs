from rest_framework import viewsets
from .models import LogEntry
from .serializers import LogEntrySerializer


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogEntry.objects.all().order_by('-fecha', '-hora')
    serializer_class = LogEntrySerializer
    search_fields = ['username', 'modelo', 'accion']
    filterset_fields = ['username', 'modelo', 'object_id']
    ordering = ['id']
