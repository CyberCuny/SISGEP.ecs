import datetime
import openpyxl
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.core.models import OrganizationalUnit, Guideline
from apps.core.utils import log_action, compute_diff
from apps.core.views import _create_notification
from apps.activities.models import Activity, ActivityGuideline, ActivityOrgUnit, ActivityMapping, UnfulfilledActivity, ActivityAttachment, ActivityComment
from apps.activities.serializers import (ActivitySerializer, ActivityGuidelineSerializer,
                                          ActivityOrgUnitSerializer, ActivityMappingSerializer,
                                          UnfulfilledActivitySerializer, ActivityAttachmentSerializer,
                                          ActivityCommentSerializer)
from apps.schedule.models import SchedulePeriod, SchedulePeriodMapping
from rest_framework.exceptions import ValidationError
class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all().select_related(
        'category', 'organizational_unit', 'arc', 'activity_type',
        'associated_objective', 'measurement_criterion'
    ).prefetch_related('activityguideline_set')
    serializer_class = ActivitySerializer
    search_fields = ['description', 'place', 'responsible', 'participants']
    filterset_fields = ['category', 'organizational_unit', 'arc', 'activity_type', 'is_important', 'is_general']

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_staff:
            uos = OrganizationalUnit.objects.filter(
                Q(responsible=user) | Q(id__in=OrganizationalUnit.objects.filter(responsible=user).values('id'))
            )
            mapped_act_ids = ActivityMapping.objects.filter(user=user).values_list('activity_id', flat=True)
            qs = qs.filter(
                Q(organizational_unit__in=uos) |
                Q(id__in=mapped_act_ids)
            )
        if self.action == 'list':
            desde = self.request.query_params.get('FechaDesde')
            hasta = self.request.query_params.get('FechaHasta')
            if not desde and not hasta:
                today = datetime.date.today()
                desde = today.replace(day=1).isoformat()
                if today.month == 12:
                    hasta = today.replace(year=today.year + 1, month=1, day=1).isoformat()
                else:
                    hasta = today.replace(month=today.month + 1, day=1).isoformat()
            if desde:
                qs = qs.filter(schedule_periods__start_date__gte=desde)
            if hasta:
                qs = qs.filter(schedule_periods__end_date__lte=hasta)
        return qs.distinct()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        log_action(self.request, 'Actividad', f'Creó actividad: {serializer.instance.description}')

    def perform_update(self, serializer):
        old = self.get_object()
        super().perform_update(serializer)
        diff = compute_diff(old, serializer.validated_data, ['description', 'place', 'responsible', 'participants', 'is_important', 'is_general'])
        log_action(self.request, 'Actividad', f'Actualizó actividad: {serializer.instance.description}', data_diff=diff)

    def perform_destroy(self, instance):
        log_action(self.request, 'Actividad', f'Eliminó actividad: {instance.description}')
        instance.delete()

    @action(detail=False, methods=['get'])
    def pending_approval(self, request):
        user = request.user
        uos = OrganizationalUnit.objects.filter(responsible=user)
        qs = ActivityOrgUnit.objects.filter(
            organizational_unit__in=uos,
            status__in=['', 'Re-Enviado']
        ).select_related('activity', 'organizational_unit')
        return Response(ActivityOrgUnitSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def approve(self, request):
        ids = request.data.get('ids', [])
        for aou in ActivityOrgUnit.objects.filter(id__in=ids).select_related('activity__created_by', 'organizational_unit__responsible'):
            aou.status = 'Aprobado'
            aou.save()
            ActivityMapping.objects.get_or_create(activity=aou.activity, user=request.user)
            SchedulePeriodMapping.objects.filter(
                schedule_period__activity=aou.activity,
                user=request.user
            ).delete()
            for u in [aou.activity.created_by, aou.organizational_unit.responsible]:
                if u and u != request.user:
                    _create_notification(u, f'Actividad aprobada: {aou.activity.description[:80]}', 'approval',
                                         related_object_id=aou.activity_id, related_object_type='Activity')
        log_action(request, 'Actividad', f'Aprobó actividades: {ids}')
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def reject(self, request):
        ids = request.data.get('ids', [])
        for aou in ActivityOrgUnit.objects.filter(id__in=ids).select_related('activity__created_by', 'organizational_unit__responsible'):
            aou.status = 'Rechazado'
            aou.save()
            for u in [aou.activity.created_by, aou.organizational_unit.responsible]:
                if u and u != request.user:
                    _create_notification(u, f'Actividad rechazada: {aou.activity.description[:80]}', 'rejection',
                                         related_object_id=aou.activity_id, related_object_type='Activity')
        log_action(request, 'Actividad', f'Rechazó actividades: {ids}')
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def assign_to_units(self, request):
        activity_id = request.data.get('activity_id')
        unit_ids = request.data.get('unit_ids', [])
        if not activity_id:
            return Response({'error': 'activity_id required'}, status=400)
        for uid in unit_ids:
            ActivityOrgUnit.objects.get_or_create(
                activity_id=activity_id,
                organizational_unit_id=uid,
                defaults={'status': ''}
            )
        log_action(request, 'Actividad', f'Asignó actividad {activity_id} a UOs {unit_ids}')
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def map_to_user(self, request):
        activity_id = request.data.get('activity_id')
        user_id = request.data.get('user_id')
        if not activity_id or not user_id:
            return Response({'error': 'activity_id and user_id required'}, status=400)
        ActivityMapping.objects.get_or_create(activity_id=activity_id, user_id=user_id)
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def batch_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'ids required'}, status=400)
        qs = self.get_queryset().filter(id__in=ids)
        deleted = qs.count()
        qs.delete()
        log_action(request, 'Actividad', f'Eliminación masiva: {deleted} actividades (ids: {ids})')
        return Response({'deleted': deleted})

    @action(detail=False, methods=['post'])
    def batch_update(self, request):
        ids = request.data.get('ids', [])
        updates = request.data.get('updates', {})
        if not ids:
            return Response({'error': 'ids required'}, status=400)
        allowed = {'is_important', 'is_general', 'color', 'organizational_unit', 'category', 'arc', 'activity_type', 'associated_objective', 'measurement_criterion'}
        clean = {k: v for k, v in updates.items() if k in allowed}
        if not clean:
            return Response({'error': 'no valid fields to update'}, status=400)
        qs = self.get_queryset().filter(id__in=ids)
        count = qs.count()
        qs.update(**clean)
        log_action(request, 'Actividad', f'Actualización masiva: {count} actividades con {clean}')
        return Response({'updated': count})

    @action(detail=False, methods=['post'])
    def batch_assign_unit(self, request):
        ids = request.data.get('ids', [])
        unit_id = request.data.get('organizational_unit')
        if not ids or not unit_id:
            return Response({'error': 'ids and organizational_unit required'}, status=400)
        created = 0
        for aid in ids:
            _, c = ActivityOrgUnit.objects.get_or_create(activity_id=aid, organizational_unit_id=unit_id, defaults={'status': ''})
            if c:
                created += 1
        log_action(request, 'Actividad', f'Asignación masiva: {created} actividades a UO {unit_id}')
        return Response({'assigned': created})

    @action(detail=False, methods=['post'])
    def import_activities(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)
        if file.size > 10 * 1024 * 1024:
            return Response({'error': 'Archivo demasiado grande (máx 10MB)'}, status=400)
        ext = file.name.split('.')[-1].lower() if '.' in file.name else ''
        if ext not in ['xlsx', 'xls']:
            return Response({'error': 'Formato no soportado. Use archivos .xlsx o .xls'}, status=400)
        wb = openpyxl.load_workbook(file, read_only=True)
        ws = wb.active
        MAX_ROWS = 10000
        if ws.max_row and ws.max_row > MAX_ROWS:
            return Response({'error': f'El archivo excede el límite de {MAX_ROWS} filas'}, status=400)
        # Read header row to build column mapping
        header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True), [])
        header_map = {}
        norm_headers = {
            'actividad': 'desc', 'lugar': 'place', 'fecha': 'start_date',
            'hora': 'start_time', 'hora fin': 'end_time', 'hora_fin': 'end_time',
            'responsable': 'responsible', 'responsables': 'responsible',
            'participantes': 'participants',
            'categoria': 'category_name', 'categoría': 'category_name',
            'tipoactividad': 'type_name', 'tipo actividad': 'type_name',
            'arc': 'arc_name',
            'objetivo': 'obj_name', 'objetivo asociado': 'obj_name',
            'criteriomedida': 'crit_name', 'criterio de medida': 'crit_name',
            'uo': 'uo_name', 'unidad organizativa': 'uo_name',
            'importante': 'is_imp',
            'general': 'is_gen',
            'lineamientos': 'guideline_names', 'lineamiento': 'guideline_names',
        }
        for idx, h in enumerate(header_row):
            key = str(h).strip().lower().replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
            if key in norm_headers:
                header_map[norm_headers[key]] = idx

        created = 0
        errors = []
        from apps.core.models import Category, ActivityType, ARC, WorkObjective, MeasurementCriterion
        for row in ws.iter_rows(min_row=2, values_only=True):
            def cell(field):
                i = header_map.get(field)
                return row[i] if i is not None and i < len(row) else None

            desc = str(cell('desc') or '').strip()
            if not desc:
                continue
            try:
                place = str(cell('place') or '').strip()
                start_date = cell('start_date')
                start_time = cell('start_time')
                end_time = cell('end_time')
                responsible = str(cell('responsible') or '').strip()
                participants = str(cell('participants') or '').strip()
                category_name = str(cell('category_name') or '').strip()
                type_name = str(cell('type_name') or '').strip()
                arc_name = str(cell('arc_name') or '').strip()
                obj_name = str(cell('obj_name') or '').strip()
                crit_name = str(cell('crit_name') or '').strip()
                uo_name = str(cell('uo_name') or '').strip()
                is_imp = str(cell('is_imp') or '').strip().lower() in ['si', 'yes', 'x', 'true', '1']
                is_gen = str(cell('is_gen') or '').strip().lower() in ['si', 'yes', 'x', 'true', '1']
                guideline_raw = str(cell('guideline_names') or '').strip()
                guideline_names = [g.strip() for g in guideline_raw.split(';') if g.strip()] if guideline_raw else []

                cat = Category.objects.filter(name=category_name).first() if category_name else None
                atype = ActivityType.objects.filter(name=type_name).first() if type_name else None
                arc_obj = ARC.objects.filter(name=arc_name).first() if arc_name else None
                obj_obj = WorkObjective.objects.filter(name=obj_name).first() if obj_name else None
                crit_obj = MeasurementCriterion.objects.filter(name=crit_name).first() if crit_name else None
                uo = OrganizationalUnit.objects.filter(name=uo_name).first() if uo_name else None
                if isinstance(start_date, datetime.datetime):
                    sd = start_date.date()
                elif isinstance(start_date, str):
                    sd = datetime.datetime.strptime(start_date[:10], '%Y-%m-%d').date()
                else:
                    sd = datetime.date.today()
                ed = sd
                if start_time and isinstance(start_time, datetime.time):
                    st = start_time
                else:
                    st = datetime.time(8, 0)
                if end_time and isinstance(end_time, datetime.time):
                    et = end_time
                else:
                    et = datetime.time(16, 0)

                with transaction.atomic():
                    activity = Activity.objects.create(
                        description=desc, place=place,
                        responsible=responsible, participants=participants,
                        category=cat, activity_type=atype, arc=arc_obj,
                        associated_objective=obj_obj, measurement_criterion=crit_obj,
                        organizational_unit=uo, is_important=is_imp, is_general=is_gen,
                        created_by=request.user
                    )
                    SchedulePeriod.objects.create(
                        activity=activity,
                        start_date=sd, end_date=ed,
                        start_time=st, end_time=et,
                        status='PENDIENTE'
                    )
                    for gn in guideline_names:
                        if gn:
                            gl = Guideline.objects.filter(name=gn).first()
                            if gl:
                                ActivityGuideline.objects.get_or_create(activity=activity, guideline=gl)
                created += 1
            except (ValueError, TypeError, KeyError, IndexError) as e:
                errors.append(f'Fila {desc}: {str(e)}')
        return Response({'created': created, 'errors': errors})

    @action(detail=False, methods=['post'])
    def distribute_to_subunits(self, request):
        activity_id = request.data.get('activity_id')
        if not activity_id:
            return Response({'error': 'activity_id required'}, status=400)
        try:
            activity = Activity.objects.get(id=activity_id)
        except Activity.DoesNotExist:
            return Response({'error': 'Actividad no encontrada'}, status=404)
        if not activity.organizational_unit:
            return Response({'error': 'Activity has no organizational unit'}, status=400)
        sub_units = OrganizationalUnit.objects.filter(parent=activity.organizational_unit)
        for su in sub_units:
            ActivityOrgUnit.objects.get_or_create(
                activity=activity,
                organizational_unit=su,
                defaults={'status': ''}
            )
        return Response({'ok': True, 'units_distributed': sub_units.count()})

    @action(detail=False, methods=['post'])
    def distribute_subunit_cronograms(self, request):
        activity_id = request.data.get('activity_id')
        if not activity_id:
            return Response({'error': 'activity_id required'}, status=400)
        try:
            activity = Activity.objects.get(id=activity_id)
        except Activity.DoesNotExist:
            return Response({'error': 'Actividad no encontrada'}, status=404)
        if not activity.organizational_unit:
            return Response({'error': 'Activity has no organizational unit'}, status=400)
        periods = SchedulePeriod.objects.filter(activity=activity)
        sub_units = OrganizationalUnit.objects.filter(parent=activity.organizational_unit)
        count = 0
        from apps.schedule.models import ScheduleOrgUnit
        for sp in periods:
            for su in sub_units:
                _, created = ScheduleOrgUnit.objects.get_or_create(
                    schedule_period=sp,
                    organizational_unit=su,
                    defaults={'status': ''}
                )
                if created:
                    count += 1
        return Response({'ok': True, 'assignments_created': count})

    @action(detail=False, methods=['post'])
    def approve_subunit_activity(self, request):
        aou_id = request.data.get('activity_org_unit_id')
        if not aou_id:
            return Response({'error': 'activity_org_unit_id required'}, status=400)
        try:
            aou = ActivityOrgUnit.objects.get(id=aou_id)
        except ActivityOrgUnit.DoesNotExist:
            return Response({'error': 'Actividad UO no encontrada'}, status=404)
        aou.status = 'Aprobado'
        aou.save()
        ActivityMapping.objects.get_or_create(activity=aou.activity, user=request.user)
        if aou.activity.created_by and aou.activity.created_by != request.user:
            _create_notification(aou.activity.created_by, f'Actividad de subunidad aprobada: {aou.activity.description[:80]}', 'approval',
                                 related_object_id=aou.activity_id, related_object_type='Activity')
        return Response({'ok': True})

    @action(detail=False, methods=['post'])
    def approve_subunit_cronograms(self, request):
        schedule_org_unit_id = request.data.get('schedule_org_unit_id')
        if not schedule_org_unit_id:
            return Response({'error': 'schedule_org_unit_id required'}, status=400)
        from apps.schedule.models import ScheduleOrgUnit
        try:
            sou = ScheduleOrgUnit.objects.get(id=schedule_org_unit_id)
        except ScheduleOrgUnit.DoesNotExist:
            return Response({'error': 'Cronograma UO no encontrado'}, status=404)
        sou.status = 'Aprobado'
        sou.save()
        SchedulePeriodMapping.objects.get_or_create(
            schedule_period=sou.schedule_period,
            user=request.user
        )
        return Response({'ok': True})


class ActivityGuidelineViewSet(viewsets.ModelViewSet):
    queryset = ActivityGuideline.objects.all()
    serializer_class = ActivityGuidelineSerializer


class ActivityOrgUnitViewSet(viewsets.ModelViewSet):
    queryset = ActivityOrgUnit.objects.all().select_related('activity', 'organizational_unit')
    serializer_class = ActivityOrgUnitSerializer
    filterset_fields = ['activity', 'organizational_unit', 'status']

    @action(detail=True, methods=['post'])
    def re_send(self, request, pk=None):
        aou = self.get_object()
        aou.status = 'Re-Enviado'
        aou.save()
        log_action(request, 'ActividadUO', f'Re-envió actividad UO: {pk}')
        return Response({'ok': True})


class ActivityMappingViewSet(viewsets.ModelViewSet):
    queryset = ActivityMapping.objects.all()
    serializer_class = ActivityMappingSerializer


class UnfulfilledActivityViewSet(viewsets.ModelViewSet):
    queryset = UnfulfilledActivity.objects.all().select_related('registered_by', 'activity')
    serializer_class = UnfulfilledActivitySerializer
    filterset_fields = ['activity', 'schedule_period']

    def perform_create(self, serializer):
        serializer.save(registered_by=self.request.user)
        log_action(self.request, 'ActividadIncumplida', 'Registró actividad incumplida')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        log_action(self.request, 'ActividadIncumplida', 'Actualizó actividad incumplida')

    def perform_destroy(self, instance):
        log_action(self.request, 'ActividadIncumplida', 'Eliminó actividad incumplida')
        instance.delete()


ALLOWED_ATTACHMENT_EXTENSIONS = None  # uses settings.ALLOWED_UPLOAD_EXTENSIONS

def _validate_file_extension(file):
    from django.conf import settings
    allowed = settings.ALLOWED_UPLOAD_EXTENSIONS
    ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
    if ext not in allowed:
        raise ValidationError({'error': f'Extensión de archivo no permitida: .{ext}'})
    if file.size > 10 * 1024 * 1024:
        raise ValidationError({'error': 'Archivo demasiado grande (máx 10MB)'})

class ActivityAttachmentViewSet(viewsets.ModelViewSet):
    queryset = ActivityAttachment.objects.all().select_related('uploaded_by')
    serializer_class = ActivityAttachmentSerializer
    filterset_fields = ['activity']
    ordering = ['id']

    def perform_create(self, serializer):
        file = serializer.validated_data.get('file')
        if file:
            _validate_file_extension(file)
        serializer.save(uploaded_by=self.request.user)
        log_action(self.request, 'AdjuntoActividad', 'Adjuntó archivo a actividad')

    def perform_destroy(self, instance):
        log_action(self.request, 'AdjuntoActividad', 'Eliminó adjunto de actividad')
        instance.delete()

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        attachment = self.get_object()
        if not attachment.file:
            return Response({'error': 'Archivo no encontrado'}, status=404)
        from django.http import FileResponse
        response = FileResponse(attachment.file.open('rb'), as_attachment=True, filename=attachment.file.name.split('/')[-1])
        return response


class ActivityCommentViewSet(viewsets.ModelViewSet):
    queryset = ActivityComment.objects.all().select_related('user')
    serializer_class = ActivityCommentSerializer
    filterset_fields = ['activity']
    ordering = ['id']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        log_action(self.request, 'ComentarioActividad', 'Comentó en actividad')

    def perform_destroy(self, instance):
        log_action(self.request, 'ComentarioActividad', 'Eliminó comentario de actividad')
        instance.delete()
