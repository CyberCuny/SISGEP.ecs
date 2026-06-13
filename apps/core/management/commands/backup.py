import os
import subprocess
import datetime
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Crea copia de seguridad de la base de datos usando pg_dump'

    def add_arguments(self, parser):
        parser.add_argument('--output', type=str, help='Ruta del archivo de salida')
        parser.add_argument('--format', type=str, default='custom', choices=['custom', 'plain', 'tar'],
                            help='Formato de pg_dump (custom, plain, tar)')

    def handle(self, *args, **options):
        backup_dir = settings.BASE_DIR / 'backups'
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        fmt = options['format']
        ext = 'sql' if fmt == 'plain' else 'dump'
        output = options.get('output') or str(backup_dir / f'backup_{timestamp}.{ext}')

        db_settings = settings.DATABASES['default']
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        cmd = [
            'pg_dump',
            f'--host={db_settings["HOST"]}',
            f'--port={db_settings["PORT"]}',
            f'--username={db_settings["USER"]}',
            f'--dbname={db_settings["NAME"]}',
            f'--format={fmt}',
            '--no-owner',
            '--no-acl',
        ]
        if fmt == 'custom':
            cmd.append(f'--file={output}')
        else:
            cmd.append('--file={}'.format(output))

        self.stdout.write(f'Creando backup en {output}...')
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            self.stdout.write(self.style.ERROR(f'Error: {result.stderr}'))
            return
        self.stdout.write(self.style.SUCCESS(f'Backup creado: {output}'))
