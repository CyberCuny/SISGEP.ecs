import datetime
import random
import string
import logging
from django.core.cache import cache
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.core.models import (User, Role, UserRole, OrganizationalUnit, Category,
                              ActivityType, ARC, WorkObjective, MeasurementCriterion, Guideline,
                              ObjectPermission, EmailConfig, SystemConfig)
from apps.core.serializers import (RoleSerializer, UserSerializer, UserCreateSerializer,
                                    OrganizationalUnitSerializer,
                                    CategorySerializer, ActivityTypeSerializer, ARCSerializer,
                                    WorkObjectiveSerializer, MeasurementCriterionSerializer,
                                    GuidelineSerializer, ObjectPermissionSerializer,
                                    EmailConfigSerializer, SystemConfigSerializer)
from apps.core.utils import log_action, compute_diff
from apps.core.throttles import WriteThrottle, AuthThrottle
from django.shortcuts import get_object_or_404
from django.db import connection

logger = logging.getLogger(__name__)


class IsAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.is_staff






def _create_notification(user, message, notification_type, related_object_id=None, related_object_type=None):
    from apps.communication.models import Notification
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    from apps.core.utils import send_email_with_config
    notif = Notification.objects.create(
        user=user,
        message=message,
        notification_type=notification_type,
        related_object_id=related_object_id,
        related_object_type=related_object_type,
    )
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{user.id}',
            {'type': 'notify', 'message': message, 'notification_type': notification_type,
             'related_object_id': related_object_id, 'related_object_type': related_object_type}
        )
    except Exception:
        logger.exception('Error sending WebSocket notification')
    if user.email:
        send_email_with_config(
            subject=f'[PlanTrabajo] {notification_type.title()}: {message[:50]}',
            message=message,
            recipient_list=[user.email],
        )
    return notif


def _try_ldap_auth(username, password):
    from django.conf import settings
    try:
        import ldap
        server = settings.LDAP_SERVER
        conn = ldap.initialize(server)
        conn.simple_bind_s(f'uid={username},{settings.LDAP_BASE_DN}', password)
        conn.unbind_s()
        return True
    except Exception:
        return False


def _build_parent_map():
    all_uos = list(OrganizationalUnit.objects.only('id', 'parent_id').all())
    parent_map = {}
    for u in all_uos:
        parent_map.setdefault(u.parent_id, []).append(u.id)
    return parent_map


def _get_descendant_ids(uo, parent_map):
    ids = set()
    stack = list(parent_map.get(uo.id, []))
    while stack:
        child_id = stack.pop()
        ids.add(child_id)
        stack.extend(parent_map.get(child_id, []))
    return ids


def _check_login_rate_limit(request):
    ip = request.META.get('REMOTE_ADDR', 'unknown')
    key = f'login_attempts_{ip}'
    try:
        attempts = cache.incr(key)
    except (ValueError, AttributeError):
        cache.set(key, 1, 300)
        attempts = 1
    if attempts > 5:
        return Response({'error': 'Demasiados intentos. Espere 5 minutos.', 'code': 429}, status=429)


def _authenticate_user(request, username, password):
    user = authenticate(request, username=username, password=password)
    if user:
        return user
    try:
        existing = User.objects.get(username=username)
        if not existing.is_active:
            return (None, Response({'error': 'Cuenta no verificada. Revise su correo.', 'code': 6}, status=400))
    except User.DoesNotExist:
        pass
    if _try_ldap_auth(username, password):
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return (None, Response({'error': 'Usuario no encontrado', 'code': 0}, status=400))
    return (None, Response({'error': 'Credenciales incorrectas', 'code': 2}, status=400))


def _do_login(request, user, username):
    login(request, user)
    ip = request.META.get('REMOTE_ADDR', 'unknown')
    cache.delete(f'login_attempts_{ip}')
    from django.utils.timezone import now
    current = now()
    user.date_last_login = current.date()
    user.time_last_login = current.time()
    user.save(update_fields=['date_last_login', 'time_last_login'])
    log_action(request, 'Usuario', f'Inicio de sesion: {username}')




class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    search_fields = ['username', 'display_name', 'email']
    ordering = ['id']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_throttles(self):
        if self.action in ['login', 'register']:
            return [AuthThrottle()]
        if self.action == 'create' and self.request.method == 'POST':
            return [WriteThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.action in ['login', 'create', 'register', 'forgot_password', 'reset_password_confirm', 'verify_email']:
            return [AllowAny()]
        if self.action in ['me', 'me_update', 'logout', 'list', 'retrieve', 'roles', 'ldap_list']:
            return [IsAuthenticated()]
        if self.action in ['assign_roles', 'remove_roles']:
            return [IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return User.objects.all().prefetch_related('userrole_set__role')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        log_action(self.request, 'Usuario', f'Creo usuario: {serializer.instance.username}', object_id=serializer.instance.pk)

    def perform_update(self, serializer):
        old = self.get_object()
        super().perform_update(serializer)
        diff = compute_diff(old, serializer.validated_data, ['username', 'display_name', 'email', 'position', 'is_disabled', 'plan_approver'])
        log_action(self.request, 'Usuario', f'Actualizo usuario: {serializer.instance.username}', object_id=serializer.instance.pk, data_diff=diff)

    def perform_destroy(self, instance):
        log_action(self.request, 'Usuario', f'Elimino usuario: {instance.username}', object_id=instance.pk)
        instance.delete()

    @action(detail=False, methods=['post'], permission_classes=[AllowAny()])
    def login(self, request):
        rate_limit = _check_login_rate_limit(request)
        if rate_limit:
            return rate_limit
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = _authenticate_user(request, username, password)
        if isinstance(user, tuple):
            return user[1]
        if user.is_disabled:
            return Response({'error': 'Usuario inhabilitado', 'code': 4}, status=400)
        _do_login(request, user, username)
        return Response({'user': UserSerializer(user).data, 'code': 5})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny()])
    def register(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as PasswordValidationError
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            password = request.data.get('password', '')
            try:
                validate_password(password)
            except PasswordValidationError as e:
                return Response({'password': list(e.messages)}, status=400)
            user = serializer.save()
            user.is_active = False
            user.save(update_fields=['is_active'])
            from django.utils.crypto import get_random_string
            token = get_random_string(48)
            cache.set(f'verify_email_{token}', user.id, 86400)
            from apps.core.utils import send_email_async
            verify_url = f"{request.scheme}://{request.get_host()}/verify-email?token={token}"
            send_email_async(
                subject='Confirme su correo electronico',
                message=f'Gracias por registrarse. Use este enlace para confirmar su cuenta: {verify_url}',
                recipient_list=[user.email],
            )
            logger.info(f'User registered (pending verification): {user.username} <{user.email}>')
            return Response({'detail': 'Revise su correo para confirmar la cuenta.'}, status=201)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny()])
    def verify_email(self, request):
        token = request.data.get('token', '')
        user_id = cache.get(f'verify_email_{token}')
        if not user_id:
            return Response({'error': 'Token invalido o expirado.'}, status=400)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        user.is_active = True
        user.save()
        cache.delete(f'verify_email_{token}')
        logger.info(f'Email verified: {user.username} <{user.email}>')
        return Response({'detail': 'Correo confirmado. Ya puede iniciar sesion.'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny()])
    def forgot_password(self, request):
        email = request.data.get('email', '')
        ip = request.META.get('REMOTE_ADDR', 'unknown')
        try:
            user = User.objects.get(email=email)
            from django.utils.crypto import get_random_string
            token = get_random_string(32)
            cache.set(f'pwd_reset_{token}', user.id, 3600)
            from apps.core.utils import send_email_async
            reset_url = f"{request.scheme}://{request.get_host()}/reset-password?token={token}"
            send_email_async(
                subject='Restablecer contrasena',
                message=f'Use este enlace para restablecer su contrasena: {reset_url}',
                recipient_list=[email],
            )
            logger.info(f'Password reset requested for {email} from {ip}')
        except User.DoesNotExist:
            logger.warning(f'Password reset attempted for unknown email {email} from {ip}')
        return Response({'detail': 'Si el correo existe, recibira instrucciones.'})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny()])
    def reset_password_confirm(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as PasswordValidationError
        token = request.data.get('token', '')
        password = request.data.get('password', '')
        user_id = cache.get(f'pwd_reset_{token}')
        if not user_id:
            return Response({'error': 'Token invalido o expirado.'}, status=400)
        try:
            validate_password(password)
        except PasswordValidationError as e:
            return Response({'password': list(e.messages)}, status=400)
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        user.set_password(password)
        user.save()
        cache.delete(f'pwd_reset_{token}')
        if user.email:
            from apps.core.utils import send_email_async
            send_email_async(
                subject='Contrasena actualizada',
                message='Su contrasena ha sido actualizada correctamente.',
                recipient_list=[user.email],
            )
        return Response({'detail': 'Contrasena actualizada.'})

    @action(detail=False, methods=['post'])
    def logout(self, request):
        log_action(request, 'Usuario', f'Cierre de sesión: {request.user.username}')
        logout(request)
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    ALLOWED_PROFILE_FIELDS = {'display_name', 'email', 'position'}

    @action(detail=False, methods=['patch'])
    def me_update(self, request):
        user = request.user
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        for field in self.ALLOWED_PROFILE_FIELDS:
            if field in request.data:
                if field == 'email':
                    try:
                        validate_email(request.data['email'])
                    except ValidationError:
                        return Response({'error': 'Formato de email inválido'}, status=400)
                setattr(user, field, request.data[field])
        user.save()
        log_action(request, 'Usuario', f'Actualizó su perfil: {user.username}')
        return Response(UserSerializer(user).data)

    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as PasswordValidationError
        user = self.get_object()
        old = request.data.get('old_password', '')
        new = request.data.get('new_password', '')
        if not user.check_password(old):
            return Response({'error': 'Contraseña actual incorrecta'}, status=400)
        try:
            validate_password(new)
        except PasswordValidationError as e:
            return Response({'password': list(e.messages)}, status=400)
        user.set_password(new)
        user.save()
        log_action(request, 'Usuario', f'Cambió contraseña: {user.username}')
        return Response({'ok': True})

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        user.set_password(new_password)
        user.save()
        log_action(request, 'Usuario', f'Reseteó contraseña: {user.username}')
        if user.email:
            from apps.core.utils import send_email_async
            send_email_async(
                subject='Contraseña restablecida',
                message=f'Su nueva contraseña es: {new_password}\nPor favor cámbiela al iniciar sesión.',
                recipient_list=[user.email],
            )
            return Response({'detail': 'Nueva contraseña enviada al correo del usuario.'})
        return Response({'detail': 'El usuario no tiene correo configurado. La contraseña no se muestra por seguridad.'})

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def assign_roles(self, request):
        user_ids = request.data.get('user_ids', [])
        role_ids = request.data.get('role_ids', [])
        existing_users = User.objects.filter(id__in=user_ids)
        existing_roles = Role.objects.filter(id__in=role_ids)
        missing_users = set(user_ids) - set(existing_users.values_list('id', flat=True))
        missing_roles = set(role_ids) - set(existing_roles.values_list('id', flat=True))
        if missing_users or missing_roles:
            msg = []
            if missing_users:
                msg.append(f'Usuarios no encontrados: {sorted(missing_users)}')
            if missing_roles:
                msg.append(f'Roles no encontrados: {sorted(missing_roles)}')
            return Response({'error': '; '.join(msg)}, status=400)
        role_names = [r.name for r in existing_roles]
        for u in existing_users:
            for r in existing_roles:
                UserRole.objects.get_or_create(user=u, role=r)
            if u != request.user:
                _create_notification(u, f'Se le asignaron roles: {", ".join(role_names)}', 'system',
                                     related_object_id=u.pk, related_object_type='User')
        log_action(request, 'Rol', f'Asignó roles {role_ids} a usuarios {user_ids}')
        return Response({'ok': True})

    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def remove_roles(self, request):
        user_ids = request.data.get('user_ids', [])
        role_ids = request.data.get('role_ids', [])
        if not User.objects.filter(id__in=user_ids).count() == len(user_ids):
            return Response({'error': 'Uno o más usuarios no existen'}, status=400)
        if not Role.objects.filter(id__in=role_ids).count() == len(role_ids):
            return Response({'error': 'Uno o más roles no existen'}, status=400)
        UserRole.objects.filter(user_id__in=user_ids, role_id__in=role_ids).delete()
        log_action(request, 'Rol', f'Removió roles {role_ids} de usuarios {user_ids}')
        return Response({'ok': True})

    @action(detail=True, methods=['get'])
    def roles(self, request, pk=None):
        user = self.get_object()
        data = [{'id': ur.role.id, 'name': ur.role.name} for ur in UserRole.objects.filter(user=user)]
        return Response(data)

    @action(detail=False, methods=['get'])
    def ldap_list(self, request):
        from django.conf import settings
        try:
            import ldap
            conn = ldap.initialize(settings.LDAP_SERVER)
            conn.simple_bind_s(settings.LDAP_BIND_DN, settings.LDAP_BIND_PASSWORD)
            base_dn = settings.LDAP_BASE_DN
            filter_str = '(objectClass=inetOrgPerson)'
            attrs = ['uid', 'cn', 'mail', 'description', 'physicalDeliveryOfficeName']
            result = conn.search_s(base_dn, ldap.SCOPE_SUBTREE, filter_str, attrs)
            users = []
            for dn, entry in result:
                users.append({
                    'username': entry.get('uid', [b''])[0].decode(),
                    'display_name': entry.get('cn', [b''])[0].decode(),
                    'email': entry.get('mail', [b''])[0].decode() if entry.get('mail') else '',
                    'position': entry.get('description', [b''])[0].decode() if entry.get('description') else '',
                    'unit': entry.get('physicalDeliveryOfficeName', [b''])[0].decode() if entry.get('physicalDeliveryOfficeName') else '',
                })
            conn.unbind_s()
            return Response(users)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'])
    def import_ldap(self, request):
        username = request.data.get('username', '')
        display_name = request.data.get('display_name', '')
        email = request.data.get('email', '')
        position = request.data.get('position', '')
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Usuario ya existe'}, status=400)
        import random
        import string
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        user = User.objects.create(
            username=username, display_name=display_name, email=email,
            position=position
        )
        user.set_password(password)
        user.save()
        log_action(self.request, 'Usuario', f'Importó usuario LDAP: {username}')
        return Response({'ok': True, 'username': username})


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    ordering = ['id']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        log_action(self.request, 'Rol', f'Creó rol: {serializer.instance.name}')

    def perform_update(self, serializer):
        old = self.get_object()
        super().perform_update(serializer)
        diff = compute_diff(old, serializer.validated_data, ['name'])
        log_action(self.request, 'Rol', f'Actualizó rol: {serializer.instance.name}', data_diff=diff)

    def perform_destroy(self, instance):
        log_action(self.request, 'Rol', f'Eliminó rol: {instance.name}')
        instance.delete()


class OrganizationalUnitViewSet(viewsets.ModelViewSet):
    queryset = OrganizationalUnit.objects.all()
    serializer_class = OrganizationalUnitSerializer
    search_fields = ['name']
    filterset_fields = ['parent', 'responsible']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        log_action(self.request, 'UnidadOrganizativa', f'Creó UO: {serializer.instance.name}')

    def perform_update(self, serializer):
        old = self.get_object()
        super().perform_update(serializer)
        diff = compute_diff(old, serializer.validated_data, ['name', 'parent', 'responsible'])
        log_action(self.request, 'UnidadOrganizativa', f'Actualizó UO: {serializer.instance.name}', data_diff=diff)

    def perform_destroy(self, instance):
        log_action(self.request, 'UnidadOrganizativa', f'Eliminó UO: {instance.name}')
        instance.delete()

    @action(detail=False, methods=['get'])
    def tree(self, request):
        user_id = request.query_params.get('user_id')
        accessible_ids = set()
        all_uos = list(OrganizationalUnit.objects.select_related('responsible').all())
        parent_map = {}
        uo_map = {}
        for uo in all_uos:
            uo_map[uo.id] = uo
            parent_map.setdefault(uo.parent_id, []).append(uo)

        if user_id:
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return Response([])
            responsible_uos = [uo for uo in all_uos if uo.responsible_id == user_id]
            for uo in responsible_uos:
                accessible_ids.add(uo.id)
                stack = [c for c in parent_map.get(uo.id, [])]
                while stack:
                    child = stack.pop()
                    accessible_ids.add(child.id)
                    stack.extend(parent_map.get(child.id, []))

        def build(parent_id=None):
            children = sorted(parent_map.get(parent_id, []), key=lambda u: (u.sort_order, u.name))
            return [{
                'id': u.id, 'name': u.name, 'parent_id': u.parent_id,
                'responsible_id': u.responsible_id,
                'responsible_name': u.responsible.display_name if u.responsible else None,
                'sort_order': u.sort_order,
                'expanded': parent_id is None or u.id in accessible_ids,
                'has_accessible_descendants': u.id in accessible_ids,
                'children': build(u.id),
            } for u in children]

        return Response(build())

    @action(detail=False, methods=['get'])
    def full_tree(self, request):
        return self.tree(request)

    @action(detail=False, methods=['patch'])
    def drag_drop(self, request):
        uo_id = request.data.get('id')
        new_parent_id = request.data.get('parent_id')
        new_position = request.data.get('position')
        if not uo_id or new_position is None:
            return Response({'error': 'id y position son requeridos'}, status=400)
        try:
            uo_id = int(uo_id)
            new_position = int(new_position)
            new_parent_id = int(new_parent_id) if new_parent_id is not None else None
        except (ValueError, TypeError):
            return Response({'error': 'id, position y parent_id deben ser números enteros'}, status=400)
        uo = get_object_or_404(OrganizationalUnit, id=uo_id)
        if new_parent_id is not None and new_parent_id == uo_id:
            return Response({'error': 'Una unidad no puede ser padre de sí misma'}, status=400)
        if new_parent_id is not None:
            parent_map = _build_parent_map()
            descendants = _get_descendant_ids(uo, parent_map)
            if new_parent_id in descendants:
                return Response({'error': 'No se puede mover una unidad a sus propios descendientes'}, status=400)
        siblings = list(OrganizationalUnit.objects.filter(parent_id=new_parent_id).order_by('sort_order', 'name'))
        siblings = [s for s in siblings if s.id != uo_id]
        uo.parent_id = new_parent_id
        siblings.insert(min(new_position, len(siblings)), uo)
        for idx, s in enumerate(siblings):
            s.sort_order = idx
        OrganizationalUnit.objects.bulk_update(siblings, ['sort_order', 'parent'])
        log_action(request, 'UnidadOrganizativa', f'Reordenó UO: {uo.name}')
        return Response({'ok': True})

    @action(detail=False, methods=['get'])
    def descendants_by_responsible(self, request):
        responsible_id = request.query_params.get('responsible_id')
        if not responsible_id:
            return Response([])
        uos = OrganizationalUnit.objects.filter(responsible_id=responsible_id)
        ids = set(uos.values_list('id', flat=True))
        parent_map = _build_parent_map()
        for uo in uos:
            ids.update(_get_descendant_ids(uo, parent_map))
        return Response(OrganizationalUnitSerializer(OrganizationalUnit.objects.filter(id__in=ids), many=True).data)

    @action(detail=False, methods=['get'])
    def descendants_by_responsible_cronos(self, request):
        return self.descendants_by_responsible(request)

    @action(detail=False, methods=['get'])
    def descendants_by_activity(self, request):
        activity_id = request.query_params.get('activity_id')
        if not activity_id:
            return Response([])
        from apps.activities.models import ActivityOrgUnit
        uo_ids = ActivityOrgUnit.objects.filter(activity_id=activity_id).values_list('organizational_unit_id', flat=True)
        return Response(OrganizationalUnitSerializer(OrganizationalUnit.objects.filter(id__in=uo_ids), many=True).data)

    @action(detail=False, methods=['get'])
    def descendants_by_cronograma(self, request):
        cronograma_id = request.query_params.get('cronograma_id')
        if not cronograma_id:
            return Response([])
        from apps.schedule.models import ScheduleOrgUnit
        uo_ids = ScheduleOrgUnit.objects.filter(schedule_period_id=cronograma_id).values_list('organizational_unit_id', flat=True)
        return Response(OrganizationalUnitSerializer(OrganizationalUnit.objects.filter(id__in=uo_ids), many=True).data)

    @action(detail=False, methods=['get'])
    def subordinate_users(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response([])
        uos = OrganizationalUnit.objects.filter(responsible_id=user_id)
        ids = set()
        parent_map = _build_parent_map()
        for uo in uos:
            ids.update(_get_descendant_ids(uo, parent_map))
        ids.update(uos.values_list('id', flat=True))
        users = User.objects.filter(organizationalunit__in=ids).distinct()
        return Response(UserSerializer(users, many=True).data)


class CatalogCacheMixin:
    catalog_cache_timeout = 3600

    def list(self, request, *args, **kwargs):
        cache_key = f'catalog_list_{self.get_queryset().model.__name__}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, self.catalog_cache_timeout)
        return response

    def _invalidate_catalog_cache(self):
        try:
            key = f'catalog_list_{self.get_queryset().model.__name__}'
            cache.delete(key)
        except Exception:
            logger.exception('Error invalidating catalog cache')


class CategoryViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['name']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'Categoria', f'Creó categoría: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'Categoria', f'Actualizó categoría: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'Categoria', f'Eliminó categoría: {instance.name}')
        instance.delete()


class ActivityTypeViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = ActivityType.objects.all()
    serializer_class = ActivityTypeSerializer
    search_fields = ['name']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'TipoActividad', f'Creó tipo: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'TipoActividad', f'Actualizó tipo: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'TipoActividad', f'Eliminó tipo: {instance.name}')
        instance.delete()


class ARCViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = ARC.objects.all()
    serializer_class = ARCSerializer
    search_fields = ['name', 'number']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'ARC', f'Creó ARC: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'ARC', f'Actualizó ARC: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'ARC', f'Eliminó ARC: {instance.name}')
        instance.delete()


class WorkObjectiveViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = WorkObjective.objects.all()
    serializer_class = WorkObjectiveSerializer
    search_fields = ['name']
    filterset_fields = ['arc']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'ObjetivoTrabajo', f'Creó objetivo: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'ObjetivoTrabajo', f'Actualizó objetivo: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'ObjetivoTrabajo', f'Eliminó objetivo: {instance.name}')
        instance.delete()


class MeasurementCriterionViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = MeasurementCriterion.objects.all()
    serializer_class = MeasurementCriterionSerializer
    search_fields = ['name']
    filterset_fields = ['objective']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'CriterioMedida', f'Creó criterio: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'CriterioMedida', f'Actualizó criterio: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'CriterioMedida', f'Eliminó criterio: {instance.name}')
        instance.delete()


class GuidelineViewSet(CatalogCacheMixin, viewsets.ModelViewSet):
    queryset = Guideline.objects.all()
    serializer_class = GuidelineSerializer
    search_fields = ['name']

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'Lineamiento', f'Creó lineamiento: {serializer.instance.name}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._invalidate_catalog_cache()
        log_action(self.request, 'Lineamiento', f'Actualizó lineamiento: {serializer.instance.name}')

    def perform_destroy(self, instance):
        self._invalidate_catalog_cache()
        log_action(self.request, 'Lineamiento', f'Eliminó lineamiento: {instance.name}')
        instance.delete()


class ObjectPermissionViewSet(viewsets.ModelViewSet):
    queryset = ObjectPermission.objects.all()
    serializer_class = ObjectPermissionSerializer
    filterset_fields = ['user', 'object_type', 'object_id', 'permission_type']

    def perform_create(self, serializer):
        serializer.save(granted_by=self.request.user)
        log_action(self.request, 'PermisoObjeto', f'Creó permiso: {serializer.instance}')

    def perform_destroy(self, instance):
        log_action(self.request, 'PermisoObjeto', f'Eliminó permiso: {instance}')
        instance.delete()


class BackupViewSet(viewsets.ViewSet):
    permission_classes = [IsAdmin]

    def list(self, request):
        import glob
        import os
        from django.conf import settings
        backup_dir = settings.BASE_DIR / 'backups'
        backup_dir.mkdir(exist_ok=True)
        files = sorted(
            glob.glob(str(backup_dir / '*.dump')) + glob.glob(str(backup_dir / '*.sql')),
            reverse=True
        )
        data = []
        for f in files:
            stat = os.stat(f)
            data.append({
                'name': os.path.basename(f),
                'size': stat.st_size,
                'created': datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
            })
        return Response(data)

    def create(self, request):
        from django.core.management import call_command
        import io as py_io
        output = py_io.StringIO()
        call_command('backup', stdout=output)
        return Response({'ok': True, 'message': output.getvalue()})

    @action(detail=False, methods=['post'])
    def restore(self, request):
        name = request.data.get('name', '')
        if not name or '..' in name or '/' in name or '\\' in name:
            return Response({'error': 'Nombre de archivo inválido'}, status=400)
        from django.conf import settings
        backup_dir = settings.BASE_DIR / 'backups'
        safe_path = (backup_dir / name).resolve()
        if not str(safe_path).startswith(str(backup_dir.resolve())):
            return Response({'error': 'Archivo no encontrado'}, status=400)
        if not safe_path.exists():
            return Response({'error': 'Archivo no encontrado'}, status=400)
        from django.core.management import call_command
        import io as py_io
        output = py_io.StringIO()
        call_command('restore', input=str(safe_path), stdout=output)
        return Response({'ok': True, 'message': output.getvalue()})

    @action(detail=False, methods=['get'])
    def download(self, request):
        name = request.query_params.get('name', '')
        if not name or '..' in name or '/' in name or '\\' in name:
            return Response({'error': 'Nombre de archivo inválido'}, status=400)
        from django.conf import settings
        backup_dir = settings.BASE_DIR / 'backups'
        safe_path = (backup_dir / name).resolve()
        if not str(safe_path).startswith(str(backup_dir.resolve())):
            return Response({'error': 'Archivo no encontrado'}, status=400)
        if not safe_path.exists():
            return Response({'error': 'Archivo no encontrado'}, status=400)
        from django.http import FileResponse
        content_type = 'application/octet-stream' if name.endswith('.dump') else 'application/sql'
        response = FileResponse(open(safe_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{name}"'
        return response


class EmailConfigViewSet(viewsets.ModelViewSet):
    queryset = EmailConfig.objects.all()
    serializer_class = EmailConfigSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            return qs.none()
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request, 'EmailConfig', 'Creó config email')
        _cache_email_config(instance)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        log_action(self.request, 'EmailConfig', 'Actualizó config email')
        _cache_email_config(serializer.instance)

    @action(detail=False, methods=['post'])
    def test(self, request):
        test_email = request.data.get('email', request.user.email)
        if not test_email:
            return Response({'error': 'Se requiere un correo de prueba.'}, status=400)
        from apps.core.utils import send_email_with_config
        send_email_with_config(
            subject='[PlanTrabajo] Correo de prueba',
            message='Este es un mensaje de prueba para verificar la configuración de correo.',
            recipient_list=[test_email],
        )
        log_action(request, 'EmailConfig', f'Envió correo de prueba a {test_email}')
        return Response({'detail': f'Correo de prueba enviado a {test_email}.'})


def _cache_email_config(instance):
    from django.core.cache import cache
    cache.set('email_config', {
        'host': instance.host,
        'port': instance.port,
        'use_tls': instance.use_tls,
        'use_ssl': instance.use_ssl,
        'username': instance.username,
        'password': instance.password,
        'default_from': instance.default_from,
    }, timeout=86400)


class SystemConfigViewSet(viewsets.ModelViewSet):
    queryset = SystemConfig.objects.all()
    serializer_class = SystemConfigSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            return qs.none()
        return qs

    def perform_create(self, serializer):
        super().perform_create(serializer)
        log_action(self.request, 'SystemConfig', f'Creó config {serializer.instance.key}')

    def perform_update(self, serializer):
        super().perform_update(serializer)
        log_action(self.request, 'SystemConfig', f'Actualizó config {serializer.instance.key}')

    def perform_destroy(self, instance):
        log_action(self.request, 'SystemConfig', f'Eliminó config {instance.key}')
        instance.delete()


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def health_check(request):
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    cache_ok = False
    try:
        cache.set('__health__', '1', 1)
        cache_ok = cache.get('__health__') == '1'
    except Exception:
        logger.exception('Health check — cache error')
    status_code = status.HTTP_200_OK if (db_ok and cache_ok) else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response({
        'status': 'ok' if status_code == 200 else 'degraded',
        'database': 'ok' if db_ok else 'error',
        'cache': 'ok' if cache_ok else 'error',
    }, status=status_code)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    q = request.query_params.get('q', '').strip()
    if not q or len(q) < 2:
        return Response({'results': []})
    from apps.activities.models import Activity, ActivityMapping
    from apps.schedule.models import SchedulePeriod, SchedulePeriodMapping
    from apps.core.models import OrganizationalUnit

    user = request.user

    def _visible_activities():
        qs = Activity.objects.filter(description__icontains=q)
        if not user.is_staff:
            uos = OrganizationalUnit.objects.filter(responsible=user)
            mapped = ActivityMapping.objects.filter(user=user).values_list('activity_id', flat=True)
            qs = qs.filter(Q(organizational_unit__in=uos) | Q(id__in=mapped))
        return [{'id': a.id, 'type': 'activity', 'title': a.description} for a in qs[:5]]

    def _visible_periods():
        qs = SchedulePeriod.objects.filter(
            Q(description__icontains=q) | Q(observation__icontains=q)
        ).select_related('activity')
        if not user.is_staff:
            uos = OrganizationalUnit.objects.filter(responsible=user)
            mapped = SchedulePeriodMapping.objects.filter(user=user).values_list('schedule_period_id', flat=True)
            mapped_acts = ActivityMapping.objects.filter(user=user).values_list('activity_id', flat=True)
            qs = qs.filter(
                Q(activity__organizational_unit__in=uos) |
                Q(id__in=mapped) |
                Q(activity_id__in=mapped_acts)
            )
        return [{
            'id': p.id, 'type': 'schedule',
            'title': p.description or p.activity.description,
            'start_date': p.start_date, 'end_date': p.end_date, 'status': p.status,
        } for p in qs[:5]]

    return Response({'results': _visible_activities() + _visible_periods()})
