from django.db import migrations

ROLES = ['Administrador', 'Directivo', 'Aprobador', 'Planificador', 'Ejecutor']


def seed_roles(apps, schema_editor):
    Role = apps.get_model('core', 'Role')
    existing = {r.name for r in Role.objects.all()}
    for name in ROLES:
        if name not in existing:
            Role.objects.create(name=name)


def fix_aprovador_typo(apps, schema_editor):
    Role = apps.get_model('core', 'Role')
    try:
        old = Role.objects.get(name='Aprovador')
        if not Role.objects.filter(name='Aprobador').exists():
            old.name = 'Aprobador'
            old.save()
        else:
            old.delete()
    except Role.DoesNotExist:
        pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_delete_objectpermission'),
    ]

    operations = [
        migrations.RunPython(fix_aprovador_typo, migrations.RunPython.noop),
        migrations.RunPython(seed_roles, migrations.RunPython.noop),
    ]
