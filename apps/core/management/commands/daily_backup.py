import os
import subprocess
import datetime
from django.conf import settings
from django.core.management.base import BaseCommand
from pathlib import Path


class Command(BaseCommand):
    help = 'Copia de seguridad programada (para cron / task scheduler). Rotación: conserva últimos 7 backups.'

    def add_arguments(self, parser):
        parser.add_argument('--keep', type=int, default=7, help='Número de backups a conservar')
        parser.add_argument('--format', type=str, default='custom', choices=['custom', 'plain', 'tar'])

    def handle(self, *args, **options):
        backup_dir = Path(settings.BASE_DIR) / 'backups'
        backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        fmt = options['format']
        ext = 'sql' if fmt == 'plain' else 'dump'
        output = str(backup_dir / f'backup_{timestamp}.{ext}')

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
            '--no-owner', '--no-acl',
            f'--file={output}',
        ]

        self.stdout.write(f'Creando backup: {output}')
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            self.stdout.write(self.style.ERROR(f'Error: {result.stderr}'))
            raise SystemExit(1)
        self.stdout.write(self.style.SUCCESS(f'Backup creado: {os.path.getsize(output)} bytes'))

        keep = options['keep']
        backups = sorted(backup_dir.glob(f'backup_*.{ext}'))
        for old in backups[:-keep] if len(backups) > keep else []:
            old.unlink()
            self.stdout.write(f'Eliminado backup viejo: {old.name}')
