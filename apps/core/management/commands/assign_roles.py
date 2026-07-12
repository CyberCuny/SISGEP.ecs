from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import Role

User = get_user_model()


class Command(BaseCommand):
    help = 'Asigna un rol a usuarios que no tienen ningun rol asignado'

    def add_arguments(self, parser):
        parser.add_argument('--role', type=str, default='Ejecutor', help='Nombre del rol a asignar')
        parser.add_argument('--list', action='store_true', help='Solo listar usuarios sin rol')
        parser.add_argument('--all', action='store_true', help='Asignar a todos los usuarios (incluyendo los que ya tienen rol)')

    def handle(self, *args, **options):
        role_name = options['role']
        try:
            role = Role.objects.get(name=role_name)
        except Role.DoesNotExist:
            self.stderr.write(f'Rol "{role_name}" no existe. Roles disponibles: {list(Role.objects.values_list("name", flat=True))}')
            return

        users_no_role = User.objects.filter(roles__isnull=True, is_staff=False).distinct()
        if options['list']:
            self.stdout.write(f'Usuarios sin rol ({users_no_role.count()}):')
            for u in users_no_role:
                self.stdout.write(f'  {u.id}: {u.username} ({u.display_name})')
            return

        if options['all']:
            target_users = User.objects.filter(is_staff=False)
        else:
            target_users = users_no_role

        count = 0
        for u in target_users:
            u.roles.add(role)
            count += 1

        self.stdout.write(self.style.SUCCESS(f'Rol "{role_name}" asignado a {count} usuario(s)'))
