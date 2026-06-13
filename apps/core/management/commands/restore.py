import os
import glob
import subprocess
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Restaura copia de seguridad usando pg_restore'

    def add_arguments(self, parser):
        parser.add_argument('--input', type=str, help='Ruta del archivo de backup')
        parser.add_argument('--format', type=str, default='custom', choices=['custom', 'plain', 'tar'],
                            help='Formato del backup')

    def handle(self, *args, **options):
        backup_file = options.get('input')
        if not backup_file:
            backup_dir = settings.BASE_DIR / 'backups'
            backup_dir.mkdir(exist_ok=True)
            files = sorted(glob.glob(str(backup_dir / '*.dump')) + glob.glob(str(backup_dir / '*.sql')), reverse=True)
            if not files:
                self.stdout.write(self.style.ERROR('No hay archivos de backup'))
                return
            backup_file = files[0]

        self.stdout.write(f'Restaurando desde {backup_file}...')

        db_settings = settings.DATABASES['default']
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        is_plain = backup_file.endswith('.sql')
        if is_plain:
            cmd = [
                'psql',
                f'--host={db_settings["HOST"]}',
                f'--port={db_settings["PORT"]}',
                f'--username={db_settings["USER"]}',
                f'--dbname={db_settings["NAME"]}',
                '-f', backup_file,
            ]
        else:
            cmd = [
                'pg_restore',
                f'--host={db_settings["HOST"]}',
                f'--port={db_settings["PORT"]}',
                f'--username={db_settings["USER"]}',
                f'--dbname={db_settings["NAME"]}',
                '--no-owner',
                '--no-acl',
                '--clean',
                '--if-exists',
                backup_file,
            ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            self.stdout.write(self.style.ERROR(f'Error: {result.stderr}'))
            return
        self.stdout.write(self.style.SUCCESS(f'Restaurado: {backup_file}'))
