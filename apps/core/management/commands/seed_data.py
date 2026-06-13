from django.core.management.base import BaseCommand
from django.db import transaction
import datetime

from apps.core.models import (
    User, OrganizationalUnit, Category, ActivityType, ARC,
    WorkObjective, MeasurementCriterion, Guideline
)
from apps.activities.models import Activity, ActivityGuideline, ActivityMapping, ActivityOrgUnit
from apps.schedule.models import SchedulePeriod, ScheduleOrgUnit, WorkDay, ApprovedPlan
from apps.communication.models import Message, Notification


class Command(BaseCommand):
    help = 'Siembra datos completos (catálogo + usuarios + UOs + actividades + cronograma)'

    def handle(self, *args, **options):
        with transaction.atomic():
            admin = self._get_admin()
            self._seed_catalog()
            self._seed_users()
            self._seed_org_units()
            self._seed_activities(admin)
            self._seed_schedule()
            self._seed_workdays()
            self._seed_approved_plans()
            self._seed_communications()
        self.stdout.write(self.style.SUCCESS('Datos sembrados exitosamente'))

    def _get_admin(self):
        admin = User.objects.filter(username='admin').first()
        if not admin:
            admin = User.objects.create_user(
                username='admin', password='admin123',
                display_name='Administrador', is_staff=True, is_superuser=True
            )
            self.stdout.write('  Creado usuario: admin')
        return admin

    def _seed_catalog(self):
        categories = ['Capacitación', 'Producción', 'Investigación', 'Gestión', 'Eventos', 'Mantenimiento', 'Calidad']
        for name in categories:
            Category.objects.get_or_create(name=name)
        self.stdout.write(f'  Creadas {len(categories)} categorías')

        types = ['Taller', 'Conferencia', 'Reunión', 'Curso', 'Seminario', 'Informe', 'Visita', 'Entrevista', 'Capacitación']
        for name in types:
            ActivityType.objects.get_or_create(name=name)
        self.stdout.write(f'  Creados {len(types)} tipos de actividad')

        arcs_data = [(1, 'Gobernabilidad'), (2, 'Economía'), (3, 'Social'), (4, 'Infraestructura')]
        for num, name in arcs_data:
            ARC.objects.get_or_create(number=num, defaults={'name': name})
        self.stdout.write(f'  Creadas {len(arcs_data)} ARC')

        objectives_data = [
            ('Incrementar eficiencia', 1),
            ('Mejorar calidad', 1),
            ('Fortalecer capacidades', 2),
            ('Optimizar recursos', 2),
            ('Desarrollar talento humano', 3),
            ('Modernizar infraestructura', 4),
        ]
        for name, arc_num in objectives_data:
            arc = ARC.objects.get(number=arc_num)
            WorkObjective.objects.get_or_create(name=name, defaults={'arc': arc})
        self.stdout.write(f'  Creados {len(objectives_data)} objetivos')

        criteria_data = ['Eficiencia', 'Eficacia', 'Calidad', 'Oportunidad', 'Impacto', 'Cobertura']
        for name in criteria_data:
            objective = WorkObjective.objects.filter(arc__number=1).first()
            MeasurementCriterion.objects.get_or_create(name=name, defaults={'objective': objective})
        self.stdout.write(f'  Creados {len(criteria_data)} criterios')

        guidelines_data = [
            'Lineamiento General 1', 'Lineamiento General 2',
            'Directiva Anual 2026', 'Plan de Desarrollo 2026-2030',
        ]
        for name in guidelines_data:
            Guideline.objects.get_or_create(name=name)
        self.stdout.write(f'  Creados {len(guidelines_data)} lineamientos')

    def _seed_users(self):
        users_data = [
            ('martin', 'Martín López', 'martin@plantrabajo.cu', 'Especialista'),
            ('maria', 'María García', 'maria@plantrabajo.cu', 'Jefa de Departamento'),
            ('carlos', 'Carlos Rodríguez', 'carlos@plantrabajo.cu', 'Analista Principal'),
            ('ana', 'Ana Martínez', 'ana@plantrabajo.cu', 'Coordinadora de Proyectos'),
            ('luis', 'Luis Pérez', 'luis@plantrabajo.cu', 'Técnico'),
            ('rosa', 'Rosa Sánchez', 'rosa@plantrabajo.cu', 'Especialista en Calidad'),
        ]
        for username, display_name, email, position in users_data:
            if not User.objects.filter(username=username).exists():
                User.objects.create_user(
                    username=username, password='123456',
                    display_name=display_name, email=email,
                    position=position, is_staff=False, is_superuser=False
                )
                self.stdout.write(f'  Creado usuario: {username}')

    def _seed_org_units(self):
        admin = User.objects.get(username='admin')
        parent, _ = OrganizationalUnit.objects.get_or_create(
            name='Dirección General',
            defaults={'responsible': admin}
        )
        sub_units = [
            ('Departamento de Capacitación', 'maria'),
            ('Departamento de Producción', 'carlos'),
            ('Departamento de Investigación', 'ana'),
            ('Departamento de Gestión', 'martin'),
            ('Departamento de Calidad', 'rosa'),
            ('Departamento de Tecnología', 'luis'),
        ]
        for name, resp_username in sub_units:
            resp = User.objects.filter(username=resp_username).first()
            OrganizationalUnit.objects.get_or_create(
                name=name,
                defaults={'parent': parent, 'responsible': resp}
            )
            self.stdout.write(f'  Creada UO: {name}')

    def _seed_activities(self, admin):
        cat = {c.name: c for c in Category.objects.all()}
        types = {t.name: t for t in ActivityType.objects.all()}
        arcs = {a.number: a for a in ARC.objects.all()}
        objs = {o.name: o for o in WorkObjective.objects.all()}
        crits = {c.name: c for c in MeasurementCriterion.objects.all()}
        gls = list(Guideline.objects.all())
        uos = {u.name: u for u in OrganizationalUnit.objects.all()}

        activities_data = [
            dict(description='Taller de Desarrollo Profesional', place='Salón A', responsible='Martín López',
                 participants='María García, Carlos Rodríguez', category=cat['Capacitación'],
                 activity_type=types['Taller'], arc=arcs[1], associated_objective=objs['Fortalecer capacidades'],
                 measurement_criterion=crits['Eficacia'], organizational_unit=uos['Departamento de Capacitación'],
                 is_important=True, is_general=False, color='#1976d2', created_by=admin),
            dict(description='Conferencia sobre Innovación Tecnológica', place='Auditorio Principal',
                 responsible='María García', participants='Todo el personal', category=cat['Eventos'],
                 activity_type=types['Conferencia'], arc=arcs[1], associated_objective=objs['Incrementar eficiencia'],
                 measurement_criterion=crits['Eficiencia'], organizational_unit=uos['Departamento de Capacitación'],
                 is_important=True, is_general=True, color='#388e3c', created_by=admin),
            dict(description='Curso de Metodologías Ágiles', place='Laboratorio 3', responsible='Carlos Rodríguez',
                 participants='Analistas', category=cat['Capacitación'], activity_type=types['Curso'],
                 arc=arcs[1], associated_objective=objs['Fortalecer capacidades'],
                 measurement_criterion=crits['Oportunidad'], organizational_unit=uos['Departamento de Capacitación'],
                 is_important=False, is_general=False, color='#f57c00', created_by=admin),
            dict(description='Reunión de Planificación Mensual', place='Sala de Juntas',
                 responsible='Martín López', participants='Jefes de Departamento',
                 category=cat['Gestión'], activity_type=types['Reunión'], arc=arcs[2],
                 associated_objective=objs['Incrementar eficiencia'], measurement_criterion=crits['Eficiencia'],
                 organizational_unit=uos['Departamento de Gestión'], is_important=True, is_general=False,
                 color='#7b1fa2', created_by=admin),
            dict(description='Seminario de Actualización Normativa', place='Salón B',
                 responsible='Ana Martínez', participants='Todo el personal',
                 category=cat['Capacitación'], activity_type=types['Seminario'], arc=arcs[2],
                 associated_objective=objs['Mejorar calidad'], measurement_criterion=crits['Oportunidad'],
                 organizational_unit=uos['Departamento de Investigación'], is_important=True, is_general=False,
                 color='#c62828', created_by=admin),
            dict(description='Producción de Material Didáctico', place='Taller de Impresión',
                 responsible='Carlos Rodríguez', participants='Equipo de Producción',
                 category=cat['Producción'], activity_type=types['Taller'], arc=arcs[1],
                 associated_objective=objs['Mejorar calidad'], measurement_criterion=crits['Eficiencia'],
                 organizational_unit=uos['Departamento de Producción'], is_important=False, is_general=False,
                 color='#00695c', created_by=admin),
            dict(description='Investigación de Satisfacción del Cliente', place='Oficina 204',
                 responsible='Ana Martínez', participants='Equipo de Investigación',
                 category=cat['Investigación'], activity_type=types['Conferencia'], arc=arcs[2],
                 associated_objective=objs['Fortalecer capacidades'], measurement_criterion=crits['Eficacia'],
                 organizational_unit=uos['Departamento de Investigación'], is_important=True, is_general=False,
                 color='#283593', created_by=admin),
            dict(description='Taller de Trabajo en Equipo', place='Salón de Usos Múltiples',
                 responsible='María García', participants='Todo el personal',
                 category=cat['Capacitación'], activity_type=types['Taller'], arc=arcs[1],
                 associated_objective=objs['Incrementar eficiencia'], measurement_criterion=crits['Oportunidad'],
                 organizational_unit=uos['Departamento de Capacitación'], is_important=False, is_general=True,
                 color='#e91e63', created_by=admin),
            dict(description='Reunión de Seguimiento de Proyectos', place='Sala de Juntas',
                 responsible='Martín López', participants='Líderes de Proyecto',
                 category=cat['Gestión'], activity_type=types['Reunión'], arc=arcs[2],
                 associated_objective=objs['Incrementar eficiencia'], measurement_criterion=crits['Eficiencia'],
                 organizational_unit=uos['Departamento de Gestión'], is_important=True, is_general=False,
                 color='#4527a0', created_by=admin),
            dict(description='Elaboración de Informe Trimestral', place='Oficina 101',
                 responsible='Carlos Rodríguez', participants='Todos los departamentos',
                 category=cat['Gestión'], activity_type=types['Informe'], arc=arcs[1],
                 associated_objective=objs['Mejorar calidad'], measurement_criterion=crits['Eficacia'],
                 organizational_unit=uos['Departamento de Gestión'], is_important=True, is_general=False,
                 color='#33691e', created_by=admin),
            dict(description='Visita Técnica a Instalaciones', place='Planta Industrial',
                 responsible='Ana Martínez', participants='Equipo Técnico',
                 category=cat['Producción'], activity_type=types['Visita'], arc=arcs[1],
                 associated_objective=objs['Incrementar eficiencia'], measurement_criterion=crits['Eficiencia'],
                 organizational_unit=uos['Departamento de Producción'], is_important=False, is_general=False,
                 color='#4e342e', created_by=admin),
            dict(description='Taller de Seguridad Informática', place='Laboratorio 1',
                 responsible='Carlos Rodríguez', participants='Personal de TI',
                 category=cat['Capacitación'], activity_type=types['Taller'], arc=arcs[2],
                 associated_objective=objs['Fortalecer capacidades'], measurement_criterion=crits['Oportunidad'],
                 organizational_unit=uos['Departamento de Tecnología'], is_important=True, is_general=False,
                 color='#b71c1c', created_by=admin),
            dict(description='Auditoría Interna de Calidad', place='Oficina 301',
                 responsible='Rosa Sánchez', participants='Todo el personal',
                 category=cat['Calidad'], activity_type=types['Entrevista'], arc=arcs[3],
                 associated_objective=objs['Mejorar calidad'], measurement_criterion=crits['Calidad'],
                 organizational_unit=uos['Departamento de Calidad'], is_important=True, is_general=False,
                 color='#1565c0', created_by=admin),
            dict(description='Mantenimiento de Equipos de Cómputo', place='Laboratorio 2',
                 responsible='Luis Pérez', participants='Equipo Técnico',
                 category=cat['Mantenimiento'], activity_type=types['Taller'], arc=arcs[4],
                 associated_objective=objs['Modernizar infraestructura'], measurement_criterion=crits['Impacto'],
                 organizational_unit=uos['Departamento de Tecnología'], is_important=False, is_general=False,
                 color='#2e7d32', created_by=admin),
            dict(description='Capacitación en Nuevas Herramientas', place='Aula Virtual',
                 responsible='María García', participants='Todos los departamentos',
                 category=cat['Capacitación'], activity_type=types['Capacitación'], arc=arcs[3],
                 associated_objective=objs['Desarrollar talento humano'], measurement_criterion=crits['Cobertura'],
                 organizational_unit=uos['Departamento de Capacitación'], is_important=True, is_general=True,
                 color='#6a1b9a', created_by=admin),
        ]

        for i, data in enumerate(activities_data):
            Activity.objects.filter(description=data['description']).delete()
            act = Activity.objects.create(**data)

            gl_subset = gls[:2] if i % 3 == 0 else (gls[:1] if i % 3 == 1 else [])
            for gl in gl_subset:
                ActivityGuideline.objects.get_or_create(activity=act, guideline=gl)

            for ou_name in [data['organizational_unit'].name]:
                ou = uos.get(ou_name)
                if ou:
                    ActivityOrgUnit.objects.get_or_create(activity=act, organizational_unit=ou, defaults={'status': 'ACTIVO'})

            self.stdout.write(f'  Creada actividad: {act.description[:60]}')

        maria = User.objects.get(username='maria')
        carlos = User.objects.get(username='carlos')
        ana = User.objects.get(username='ana')
        for act in Activity.objects.all()[:6]:
            ActivityMapping.objects.get_or_create(activity=act, user=maria)
        for act in Activity.objects.all()[3:9]:
            ActivityMapping.objects.get_or_create(activity=act, user=carlos)
        for act in Activity.objects.all()[6:]:
            ActivityMapping.objects.get_or_create(activity=act, user=ana)

    def _seed_schedule(self):
        today = datetime.date.today()
        month = today.month if today.month < 12 else 1
        year = today.year
        activities = list(Activity.objects.all())
        statuses = ['PENDIENTE', 'CUMPLIDO', 'PENDIENTE', 'CUMPLIDO', 'EN_PROCESO', 'PENDIENTE']

        for i, act in enumerate(activities):
            day = ((i * 3) % 25) + 1
            start = datetime.date(year, month, day)
            end = start + datetime.timedelta(days=(i % 3) + 1)
            start_hour = 8 + (i % 8)
            end_hour = start_hour + 2 + (i % 3)
            sp = SchedulePeriod.objects.create(
                activity=act,
                start_date=start,
                end_date=end,
                start_time=datetime.time(start_hour, 0),
                end_time=datetime.time(min(end_hour, 17), 0),
                status=statuses[i % len(statuses)],
                description=act.description[:200],
                color=act.color,
            )
            if act.organizational_unit:
                ScheduleOrgUnit.objects.get_or_create(
                    schedule_period=sp,
                    organizational_unit=act.organizational_unit,
                    defaults={'status': 'ACTIVO'}
                )
            self.stdout.write(f'  Creado periodo: {act.description[:40]} ({start} - {end})')

    def _seed_workdays(self):
        for user in User.objects.all():
            for day in range(1, 6):
                WorkDay.objects.get_or_create(user=user, day=day)
        self.stdout.write('  Creados días laborables (lun-vie) para todos los usuarios')

    def _seed_approved_plans(self):
        today = datetime.date.today()
        month = today.month
        year = today.year
        first_day = datetime.date(year, month, 1)
        for ou in OrganizationalUnit.objects.all():
            ApprovedPlan.objects.get_or_create(
                organizational_unit=ou,
                plan_date=first_day,
                defaults={'approved_date': today},
            )
        self.stdout.write('  Creados planes aprobados')

    def _seed_communications(self):
        admin = User.objects.get(username='admin')
        users = User.objects.exclude(username='admin')
        if not Message.objects.exists():
            for recipient in users[:4]:
                Message.objects.create(
                    sender=admin, recipient=recipient,
                    subject='Bienvenido al sistema',
                    body='Su usuario ha sido creado exitosamente. Por favor revise sus datos y complete su perfil.'
                )
        if not Notification.objects.exists():
            for user in users:
                Notification.objects.create(
                    user=user, message='Tiene actividades pendientes por revisar',
                    notification_type='system', is_read=False,
                )
        self.stdout.write('  Creados mensajes y notificaciones')
