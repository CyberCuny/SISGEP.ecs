from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
import datetime

from apps.core.models import (
    User, Role, UserRole, OrganizationalUnit, Category, ActivityType, ARC,
    WorkObjective, MeasurementCriterion, Guideline
)
from apps.activities.models import (
    Activity, ActivityGuideline, ActivityMapping, ActivityOrgUnit,
    ActivityResponsible, ActivityParticipant, ActivityComment,
    UnfulfilledActivity
)
from apps.schedule.models import (
    SchedulePeriod, ScheduleOrgUnit, SchedulePeriodMapping,
    ScheduleComment, WorkDay, ApprovedPlan
)
from apps.communication.models import Message, Notification


class Command(BaseCommand):
    help = 'Siembra datos completos de demostración para todos los flujos del sistema'

    def handle(self, *args, **options):
        with transaction.atomic():
            self._seed_roles()
            admin = self._get_admin()
            self._seed_catalog()
            users = self._seed_users()
            self._assign_roles(users)
            units = self._seed_org_units(users)
            admin_user = User.objects.get(username='admin')
            activities = self._seed_activities(admin_user, users, units)
            self._seed_responsible_participant_m2m(activities, users)
            schedule_map = self._seed_schedule(activities, units)
            self._seed_schedule_comments(schedule_map, users)
            self._seed_unfulfilled(activities, schedule_map, users)
            self._seed_activity_comments(activities, users)
            self._seed_workdays(users)
            self._seed_approved_plans(units, activities)
            self._run_approval_flow(activities, users, units)
            self._run_distribute_flow(activities, units)
            self._run_assign_to_units_flow(activities, units)
            self._seed_messages(users)
            self._seed_notifications(users)
        self.stdout.write(self.style.SUCCESS('Datos sembrados exitosamente'))

    # ── Roles ──
    def _seed_roles(self):
        role_names = ['Administrador', 'Directivo', 'Aprobador', 'Planificador', 'Ejecutor']
        for name in role_names:
            Role.objects.get_or_create(name=name)
        self.stdout.write(f'  Creados {len(role_names)} roles')

    # ── Admin ──
    def _get_admin(self):
        admin = User.objects.filter(username='admin').first()
        if not admin:
            admin = User.objects.create_user(
                username='admin', password='admin123',
                display_name='Administrador', email='admin@sistema.cu',
                position='Administrador del Sistema', is_staff=True, is_superuser=True
            )
            self.stdout.write('  Creado usuario: admin')
        admin_role = Role.objects.get(name='Administrador')
        UserRole.objects.get_or_create(user=admin, role=admin_role)
        return admin

    # ── Catálogos ──
    def _seed_catalog(self):
        cats = ['Capacitación', 'Producción', 'Investigación', 'Gestión',
                'Eventos', 'Mantenimiento', 'Calidad', 'Seguridad', 'Logística']
        for name in cats:
            Category.objects.get_or_create(name=name)
        self.stdout.write(f'  Creadas {len(cats)} categorías')

        types = ['Taller', 'Conferencia', 'Reunión', 'Curso', 'Seminario',
                 'Informe', 'Visita', 'Entrevista', 'Capacitación', 'Auditoría']
        for name in types:
            ActivityType.objects.get_or_create(name=name)
        self.stdout.write(f'  Creados {len(types)} tipos de actividad')

        arcs_data = [(1, 'Gobernabilidad'), (2, 'Economía'), (3, 'Social'), (4, 'Infraestructura')]
        for num, name in arcs_data:
            ARC.objects.get_or_create(number=num, defaults={'name': name})
        self.stdout.write(f'  Creadas {len(arcs_data)} ARC')

        objectives_data = [
            ('Incrementar eficiencia', 1), ('Mejorar calidad', 1),
            ('Fortalecer capacidades', 2), ('Optimizar recursos', 2),
            ('Desarrollar talento humano', 3), ('Modernizar infraestructura', 4),
            ('Transparencia institucional', 1), ('Innovación tecnológica', 4),
        ]
        for name, arc_num in objectives_data:
            arc = ARC.objects.get(number=arc_num)
            WorkObjective.objects.get_or_create(name=name, defaults={'arc': arc})
        self.stdout.write(f'  Creados {len(objectives_data)} objetivos')

        criteria_data = [
            'Eficiencia', 'Eficacia', 'Calidad', 'Oportunidad', 'Impacto', 'Cobertura',
            'Sostenibilidad', 'Participación',
        ]
        for name in criteria_data:
            objective = WorkObjective.objects.filter(arc__number=1).first()
            MeasurementCriterion.objects.get_or_create(name=name, defaults={'objective': objective})
        self.stdout.write(f'  Creados {len(criteria_data)} criterios')

        guidelines_data = [
            'Lineamiento General 1', 'Lineamiento General 2',
            'Directiva Anual 2026', 'Plan de Desarrollo 2026-2030',
            'Estrategia de Transformación Digital',
            'Política de Calidad',
        ]
        for name in guidelines_data:
            Guideline.objects.get_or_create(name=name)
        self.stdout.write(f'  Creados {len(guidelines_data)} lineamientos')

    # ── Usuarios ──
    def _seed_users(self):
        users_data = [
            ('martin',  'Martín López',     'martin@sistema.cu',  'Director General'),
            ('maria',   'María García',     'maria@sistema.cu',   'Jefa de Capacitación'),
            ('carlos',  'Carlos Rodríguez', 'carlos@sistema.cu',  'Jefe de Producción'),
            ('ana',     'Ana Martínez',     'ana@sistema.cu',     'Jefa de Investigación'),
            ('luis',    'Luis Pérez',       'luis@sistema.cu',    'Jefe de Tecnología'),
            ('rosa',    'Rosa Sánchez',     'rosa@sistema.cu',    'Jefa de Calidad'),
            ('jorge',   'Jorge Fernández',  'jorge@sistema.cu',   'Especialista en Gestión'),
            ('laura',   'Laura Díaz',       'laura@sistema.cu',   'Analista de Procesos'),
            ('pedro',   'Pedro Ramírez',    'pedro@sistema.cu',   'Técnico de Soporte'),
            ('sofia',   'Sofía Morales',    'sofia@sistema.cu',   'Coordinadora de Logística'),
        ]
        created = []
        for username, display_name, email, position in users_data:
            user, was = User.objects.get_or_create(
                username=username,
                defaults={
                    'display_name': display_name, 'email': email,
                    'position': position, 'is_staff': False, 'is_superuser': False,
                },
            )
            if was:
                user.set_password('123456')
                user.save(update_fields=['password'])
                self.stdout.write(f'  Creado usuario: {username}')
            created.append(user)
        return created

    # ── Asignar roles ──
    def _assign_roles(self, users):
        mapping = {
            'martin': 'Directivo',
            'maria': 'Aprobador',
            'carlos': 'Planificador',
            'ana': 'Planificador',
            'luis': 'Ejecutor',
            'rosa': 'Aprobador',
            'jorge': 'Planificador',
            'laura': 'Ejecutor',
            'pedro': 'Ejecutor',
            'sofia': 'Ejecutor',
        }
        for u in users:
            role_name = mapping.get(u.username, 'Ejecutor')
            role = Role.objects.get(name=role_name)
            UserRole.objects.get_or_create(user=u, role=role)
        self.stdout.write('  Roles asignados')

    # ── Unidades Organizativas ──
    def _seed_org_units(self, users):
        by_username = {u.username: u for u in users}
        admin = User.objects.get(username='admin')

        direccion, _ = OrganizationalUnit.objects.get_or_create(
            name='Dirección General',
            defaults={'responsible': admin}
        )

        sub_units_data = [
            ('Departamento de Capacitación',    'maria',  [
                'Área de Formación Interna',
                'Área de Certificaciones',
            ]),
            ('Departamento de Producción',      'carlos', [
                'Área de Diseño',
                'Área de Impresión',
            ]),
            ('Departamento de Investigación',   'ana',    [
                'Área de Estudios',
                'Área de Desarrollo',
            ]),
            ('Departamento de Gestión',         'jorge',  [
                'Área de Planificación',
                'Área de Seguimiento',
            ]),
            ('Departamento de Calidad',          'rosa',   [
                'Área de Auditoría',
                'Área de Normativas',
            ]),
            ('Departamento de Tecnología',       'luis',   [
                'Área de Soporte Técnico',
                'Área de Desarrollo de Software',
            ]),
            ('Departamento de Logística',       'sofia',  []),
        ]

        units_map = {'Dirección General': direccion}
        for dept_name, resp_username, sub_areas in sub_units_data:
            resp = by_username.get(resp_username)
            dept, _ = OrganizationalUnit.objects.get_or_create(
                name=dept_name,
                defaults={'parent': direccion, 'responsible': resp}
            )
            units_map[dept_name] = dept
            self.stdout.write(f'  Creada UO: {dept_name}')
            for area_name in sub_areas:
                area, _ = OrganizationalUnit.objects.get_or_create(
                    name=area_name,
                    defaults={'parent': dept, 'responsible': resp}
                )
                units_map[area_name] = area
                self.stdout.write(f'    Creada sub-UO: {area_name}')
        return units_map

    # ── Actividades ──
    def _seed_activities(self, admin, users, units):
        cat = {c.name: c for c in Category.objects.all()}
        types = {t.name: t for t in ActivityType.objects.all()}
        arcs = {a.number: a for a in ARC.objects.all()}
        objs = {o.name: o for o in WorkObjective.objects.all()}
        crits = {c.name: c for c in MeasurementCriterion.objects.all()}
        gls = list(Guideline.objects.all())

        by_username = {u.username: u for u in users}

        activities_data = [
            dict(description='Taller de Liderazgo para Mandos Medios', place='Salón A',
                 responsible='María García', participants='Jefes de Departamento, Supervisores',
                 category=cat['Capacitación'], activity_type=types['Taller'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Cobertura'],
                 organizational_unit=units['Departamento de Capacitación'],
                 is_important=True, is_general=False, color='#1976d2',
                 created_by=admin),
            dict(description='Conferencia sobre Innovación Pedagógica', place='Auditorio Principal',
                 responsible='María García', participants='Todo el personal docente',
                 category=cat['Eventos'], activity_type=types['Conferencia'],
                 arc=arcs[3], associated_objective=objs['Fortalecer capacidades'],
                 measurement_criterion=crits['Impacto'],
                 organizational_unit=units['Departamento de Capacitación'],
                 is_important=True, is_general=True, color='#388e3c',
                 created_by=admin),
            dict(description='Curso de Metodologías Ágiles', place='Laboratorio 3',
                 responsible='Carlos Rodríguez', participants='Analistas y Desarrolladores',
                 category=cat['Capacitación'], activity_type=types['Curso'],
                 arc=arcs[2], associated_objective=objs['Fortalecer capacidades'],
                 measurement_criterion=crits['Eficacia'],
                 organizational_unit=units['Área de Desarrollo de Software'],
                 is_important=False, is_general=False, color='#f57c00',
                 created_by=admin),
            dict(description='Seminario de Actualización Normativa', place='Salón B',
                 responsible='Ana Martínez', participants='Equipo de Investigación',
                 category=cat['Capacitación'], activity_type=types['Seminario'],
                 arc=arcs[1], associated_objective=objs['Mejorar calidad'],
                 measurement_criterion=crits['Oportunidad'],
                 organizational_unit=units['Área de Estudios'],
                 is_important=True, is_general=False, color='#c62828',
                 created_by=admin),
            dict(description='Capacitación en Nuevas Herramientas Digitales', place='Aula Virtual',
                 responsible='Luis Pérez', participants='Todos los departamentos',
                 category=cat['Capacitación'], activity_type=types['Capacitación'],
                 arc=arcs[4], associated_objective=objs['Innovación tecnológica'],
                 measurement_criterion=crits['Cobertura'],
                 organizational_unit=units['Departamento de Tecnología'],
                 is_important=True, is_general=True, color='#6a1b9a',
                 created_by=admin),
            dict(description='Producción de Material Didáctico', place='Taller de Impresión',
                 responsible='Carlos Rodríguez', participants='Equipo de Diseño e Impresión',
                 category=cat['Producción'], activity_type=types['Taller'],
                 arc=arcs[2], associated_objective=objs['Optimizar recursos'],
                 measurement_criterion=crits['Eficiencia'],
                 organizational_unit=units['Área de Impresión'],
                 is_important=False, is_general=False, color='#00695c',
                 created_by=admin),
            dict(description='Diseño de Nuevos Materiales Educativos', place='Oficina 103',
                 responsible='Carlos Rodríguez', participants='Equipo de Diseño',
                 category=cat['Producción'], activity_type=types['Taller'],
                 arc=arcs[3], associated_objective=objs['Innovación tecnológica'],
                 measurement_criterion=crits['Calidad'],
                 organizational_unit=units['Área de Diseño'],
                 is_important=True, is_general=False, color='#2e7d32',
                 created_by=admin),
            dict(description='Estudio de Satisfacción del Cliente', place='Oficina 204',
                 responsible='Ana Martínez', participants='Equipo de Estudios',
                 category=cat['Investigación'], activity_type=types['Informe'],
                 arc=arcs[1], associated_objective=objs['Mejorar calidad'],
                 measurement_criterion=crits['Impacto'],
                 organizational_unit=units['Área de Estudios'],
                 is_important=True, is_general=False, color='#283593',
                 created_by=admin),
            dict(description='Proyecto de Investigación Aplicada', place='Laboratorio 2',
                 responsible='Ana Martínez', participants='Investigadores asociados',
                 category=cat['Investigación'], activity_type=types['Seminario'],
                 arc=arcs[4], associated_objective=objs['Modernizar infraestructura'],
                 measurement_criterion=crits['Sostenibilidad'],
                 organizational_unit=units['Área de Desarrollo'],
                 is_important=True, is_general=False, color='#1565c0',
                 created_by=admin),
            dict(description='Elaboración de Informe Técnico Trimestral', place='Oficina 101',
                 responsible='Ana Martínez', participants='Todos los departamentos',
                 category=cat['Gestión'], activity_type=types['Informe'],
                 arc=arcs[1], associated_objective=objs['Transparencia institucional'],
                 measurement_criterion=crits['Oportunidad'],
                 organizational_unit=units['Departamento de Investigación'],
                 is_important=True, is_general=False, color='#33691e',
                 created_by=admin),
            dict(description='Reunión de Planificación Mensual', place='Sala de Juntas',
                 responsible='Jorge Fernández', participants='Jefes de Departamento',
                 category=cat['Gestión'], activity_type=types['Reunión'],
                 arc=arcs[1], associated_objective=objs['Incrementar eficiencia'],
                 measurement_criterion=crits['Eficiencia'],
                 organizational_unit=units['Departamento de Gestión'],
                 is_important=True, is_general=False, color='#7b1fa2',
                 created_by=admin),
            dict(description='Reunión de Seguimiento de Proyectos', place='Sala de Juntas',
                 responsible='Jorge Fernández', participants='Líderes de Proyecto',
                 category=cat['Gestión'], activity_type=types['Reunión'],
                 arc=arcs[2], associated_objective=objs['Optimizar recursos'],
                 measurement_criterion=crits['Eficacia'],
                 organizational_unit=units['Área de Seguimiento'],
                 is_important=True, is_general=False, color='#4527a0',
                 created_by=admin),
            dict(description='Elaboración de Plan Operativo Anual', place='Oficina 105',
                 responsible='Martín López', participants='Equipo de Planificación',
                 category=cat['Gestión'], activity_type=types['Taller'],
                 arc=arcs[1], associated_objective=objs['Incrementar eficiencia'],
                 measurement_criterion=crits['Eficiencia'],
                 organizational_unit=units['Área de Planificación'],
                 is_important=True, is_general=False, color='#e91e63',
                 created_by=admin),
            dict(description='Evaluación de Desempeño por Indicadores', place='Sala de Reuniones',
                 responsible='Jorge Fernández', participants='Todo el personal',
                 category=cat['Gestión'], activity_type=types['Reunión'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Impacto'],
                 organizational_unit=units['Área de Seguimiento'],
                 is_important=False, is_general=True, color='#ad1457',
                 created_by=admin),
            dict(description='Auditoría Interna de Calidad', place='Oficina 301',
                 responsible='Rosa Sánchez', participants='Todo el personal',
                 category=cat['Calidad'], activity_type=types['Auditoría'],
                 arc=arcs[1], associated_objective=objs['Mejorar calidad'],
                 measurement_criterion=crits['Calidad'],
                 organizational_unit=units['Departamento de Calidad'],
                 is_important=True, is_general=False, color='#1565c0',
                 created_by=admin),
            dict(description='Revisión de Normativas Internas', place='Oficina 302',
                 responsible='Rosa Sánchez', participants='Comité de Calidad',
                 category=cat['Calidad'], activity_type=types['Reunión'],
                 arc=arcs[1], associated_objective=objs['Transparencia institucional'],
                 measurement_criterion=crits['Sostenibilidad'],
                 organizational_unit=units['Área de Normativas'],
                 is_important=True, is_general=False, color='#0d47a1',
                 created_by=admin),
            dict(description='Inspección de Procesos Productivos', place='Planta Industrial',
                 responsible='Rosa Sánchez', participants='Equipo de Auditoría',
                 category=cat['Calidad'], activity_type=types['Visita'],
                 arc=arcs[2], associated_objective=objs['Mejorar calidad'],
                 measurement_criterion=crits['Eficacia'],
                 organizational_unit=units['Área de Auditoría'],
                 is_important=False, is_general=False, color='#42a5f5',
                 created_by=admin),
            dict(description='Taller de Seguridad Informática', place='Laboratorio 1',
                 responsible='Luis Pérez', participants='Personal de TI',
                 category=cat['Seguridad'], activity_type=types['Taller'],
                 arc=arcs[4], associated_objective=objs['Modernizar infraestructura'],
                 measurement_criterion=crits['Impacto'],
                 organizational_unit=units['Departamento de Tecnología'],
                 is_important=True, is_general=False, color='#b71c1c',
                 created_by=admin),
            dict(description='Mantenimiento de Equipos de Cómputo', place='Laboratorio 2',
                 responsible='Pedro Ramírez', participants='Equipo de Soporte',
                 category=cat['Mantenimiento'], activity_type=types['Taller'],
                 arc=arcs[4], associated_objective=objs['Modernizar infraestructura'],
                 measurement_criterion=crits['Oportunidad'],
                 organizational_unit=units['Área de Soporte Técnico'],
                 is_important=False, is_general=False, color='#2e7d32',
                 created_by=admin),
            dict(description='Desarrollo de Módulo de Reportes', place='Oficina 401',
                 responsible='Luis Pérez', participants='Equipo de Desarrollo',
                 category=cat['Producción'], activity_type=types['Taller'],
                 arc=arcs[4], associated_objective=objs['Innovación tecnológica'],
                 measurement_criterion=crits['Calidad'],
                 organizational_unit=units['Área de Desarrollo de Software'],
                 is_important=True, is_general=False, color='#1b5e20',
                 created_by=admin),
            dict(description='Actualización de Infraestructura de Red', place='Centro de Datos',
                 responsible='Pedro Ramírez', participants='Proveedores externos',
                 category=cat['Mantenimiento'], activity_type=types['Visita'],
                 arc=arcs[4], associated_objective=objs['Modernizar infraestructura'],
                 measurement_criterion=crits['Sostenibilidad'],
                 organizational_unit=units['Área de Soporte Técnico'],
                 is_important=True, is_general=False, color='#003300',
                 created_by=admin),
            dict(description='Inventario General de Activos', place='Almacén Central',
                 responsible='Sofía Morales', participants='Auxiliares de Logística',
                 category=cat['Gestión'], activity_type=types['Visita'],
                 arc=arcs[2], associated_objective=objs['Optimizar recursos'],
                 measurement_criterion=crits['Eficiencia'],
                 organizational_unit=units['Departamento de Logística'],
                 is_important=True, is_general=False, color='#bf360c',
                 created_by=admin),
            dict(description='Recepción y Distribución de Insumos', place='Almacén 2',
                 responsible='Sofía Morales', participants='Proveedores, Almaceneros',
                 category=cat['Logística'], activity_type=types['Visita'],
                 arc=arcs[2], associated_objective=objs['Optimizar recursos'],
                 measurement_criterion=crits['Oportunidad'],
                 organizational_unit=units['Departamento de Logística'],
                 is_important=False, is_general=False, color='#e64a19',
                 created_by=admin),
            dict(description='Jornada de Limpieza y Orden', place='Todas las áreas',
                 responsible='Martín López', participants='Todo el personal',
                 category=cat['Gestión'], activity_type=types['Taller'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Participación'],
                 organizational_unit=units['Dirección General'],
                 is_important=False, is_general=True, color='#ff6f00',
                 created_by=admin),
            dict(description='Celebración del Aniversario Institucional', place='Salón de Eventos',
                 responsible='María García', participants='Todo el personal',
                 category=cat['Eventos'], activity_type=types['Conferencia'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Participación'],
                 organizational_unit=units['Dirección General'],
                 is_important=False, is_general=True, color='#fdd835',
                 created_by=admin),
            dict(description='Aplicación de Encuesta de Clima Laboral', place='Online',
                 responsible='Laura Díaz', participants='Todo el personal',
                 category=cat['Investigación'], activity_type=types['Entrevista'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Participación'],
                 organizational_unit=units['Dirección General'],
                 is_important=True, is_general=True, color='#8e24aa',
                 created_by=admin),
            dict(description='Simulacro de Emergencia', place='Edificio Principal',
                 responsible='Martín López', participants='Todo el personal',
                 category=cat['Seguridad'], activity_type=types['Taller'],
                 arc=arcs[3], associated_objective=objs['Desarrollar talento humano'],
                 measurement_criterion=crits['Impacto'],
                 organizational_unit=units['Dirección General'],
                 is_important=True, is_general=True, color='#d32f2f',
                 created_by=admin),
            dict(description='Reunión del Consejo de Dirección', place='Sala de Juntas',
                 responsible='Martín López', participants='Directivos',
                 category=cat['Gestión'], activity_type=types['Reunión'],
                 arc=arcs[1], associated_objective=objs['Incrementar eficiencia'],
                 measurement_criterion=crits['Eficiencia'],
                 organizational_unit=units['Dirección General'],
                 is_important=True, is_general=False, color='#37474f',
                 created_by=admin),
            dict(description='Entrega de Resultados del Buzón de Sugerencias', place='Cartelera principal',
                 responsible='Laura Díaz', participants='Todo el personal',
                 category=cat['Gestión'], activity_type=types['Informe'],
                 arc=arcs[1], associated_objective=objs['Transparencia institucional'],
                 measurement_criterion=crits['Participación'],
                 organizational_unit=units['Dirección General'],
                 is_important=False, is_general=True, color='#00897b',
                 created_by=admin),
        ]

        created_activities = []
        for i, data in enumerate(activities_data):
            act, was_created = Activity.objects.get_or_create(
                description=data['description'],
                defaults=data,
            )
            if not was_created:
                for key, val in data.items():
                    setattr(act, key, val)
                act.save()

            gl_subset = gls[:2] if i % 4 == 0 else (gls[:1] if i % 4 == 2 else [])
            for gl in gl_subset:
                ActivityGuideline.objects.get_or_create(activity=act, guideline=gl)

            ou = data['organizational_unit']
            act_status = '' if i % 3 != 1 else 'ACTIVO'
            aou, _ = ActivityOrgUnit.objects.get_or_create(activity=act, organizational_unit=ou)
            if aou.status != act_status:
                aou.status = act_status
                aou.save(update_fields=['status'])

            created_activities.append(act)
            self.stdout.write(f'  Creada actividad: {act.description[:60]}')

        by_username = {u.username: u for u in users}
        maria = by_username.get('maria')
        carlos = by_username.get('carlos')
        ana = by_username.get('ana')
        jorge = by_username.get('jorge')
        laura = by_username.get('laura')
        pedro = by_username.get('pedro')
        luis = by_username.get('luis')
        rosa = by_username.get('rosa')
        sofia = by_username.get('sofia')
        for i, act in enumerate(created_activities):
            if i % 2 == 0 and maria:
                ActivityMapping.objects.get_or_create(activity=act, user=maria)
            if i % 3 == 0 and carlos:
                ActivityMapping.objects.get_or_create(activity=act, user=carlos)
            if i % 4 == 0 and ana:
                ActivityMapping.objects.get_or_create(activity=act, user=ana)
            if i % 5 == 0 and jorge:
                ActivityMapping.objects.get_or_create(activity=act, user=jorge)
            if i % 2 == 1 and laura:
                ActivityMapping.objects.get_or_create(activity=act, user=laura)
            if i % 6 == 0 and pedro:
                ActivityMapping.objects.get_or_create(activity=act, user=pedro)
            if i % 3 == 1 and luis:
                ActivityMapping.objects.get_or_create(activity=act, user=luis)
            if i % 4 == 2 and rosa:
                ActivityMapping.objects.get_or_create(activity=act, user=rosa)
            if i % 5 == 2 and sofia:
                ActivityMapping.objects.get_or_create(activity=act, user=sofia)

        return created_activities

    # ── M2M Responsables y Participantes ──
    def _seed_responsible_participant_m2m(self, activities, users):
        by_username = {u.username: u for u in users}
        pairs = [
            (['maria', 'carlos'], ['laura', 'jorge']),
            (['maria'], ['ana', 'carlos', 'luis', 'rosa']),
            (['carlos', 'luis'], ['laura', 'pedro']),
            (['ana'], ['jorge', 'rosa']),
            (['luis', 'pedro'], ['todos']),
            (['carlos'], ['sofia', 'laura']),
            (['carlos', 'ana'], ['jorge', 'luis']),
            (['ana', 'jorge'], ['laura', 'sofia']),
            (['ana', 'carlos'], ['maria', 'rosa']),
            (['ana', 'jorge'], ['todos']),
            (['jorge', 'martin'], ['todos']),
            (['jorge'], ['carlos', 'ana', 'maria', 'rosa']),
            (['martin', 'jorge'], ['laura', 'carlos']),
            (['jorge'], ['todos']),
            (['rosa'], ['todos']),
            (['rosa', 'jorge'], ['carlos', 'ana']),
            (['rosa'], ['pedro', 'sofia']),
            (['luis', 'pedro'], ['carlos', 'jorge']),
            (['pedro', 'luis'], ['pedro']),
            (['luis', 'carlos'], ['ana', 'laura']),
            (['pedro'], ['sofia', 'luis']),
            (['sofia'], ['laura', 'pedro']),
            (['sofia'], ['todos']),
            (['todos'], ['todos']),
            (['maria', 'martin'], ['todos']),
            (['laura', 'jorge'], ['todos']),
            (['todos'], ['todos']),
            (['martin'], ['todos']),
            (['laura', 'martin'], ['todos']),
            (['laura'], ['todos']),
        ]
        for i, act in enumerate(activities):
            if i >= len(pairs):
                break
            resp_usernames, part_usernames = pairs[i]
            for uname in resp_usernames:
                if uname == 'todos':
                    for u in users:
                        ActivityResponsible.objects.get_or_create(activity=act, user=u)
                else:
                    u = by_username.get(uname)
                    if u:
                        ActivityResponsible.objects.get_or_create(activity=act, user=u)
            for uname in part_usernames:
                if uname == 'todos':
                    for u in users:
                        ActivityParticipant.objects.get_or_create(activity=act, user=u)
                else:
                    u = by_username.get(uname)
                    if u:
                        ActivityParticipant.objects.get_or_create(activity=act, user=u)

    # ── Cronograma ──
    def _seed_schedule(self, activities, units):
        today = datetime.date.today()
        months = []
        for offset in [-2, -1, 0, 1, 2]:
            m = today.month + offset
            y = today.year
            while m < 1:
                m += 12; y -= 1
            while m > 12:
                m -= 12; y += 1
            months.append((y, m))

        statuses_pool = ['PENDIENTE', 'CUMPLIDO', 'INCUMPLIDO', 'EN_PROCESO', 'PENDIENTE', 'CUMPLIDO', 'PENDIENTE']
        schedule_map = {}

        for mi, (year, month) in enumerate(months):
            for i, act in enumerate(activities):
                day = ((i * 3 + mi * 7) % 25) + 1
                start = datetime.date(year, month, day)
                duration = (i % 4) + 1
                end = start + datetime.timedelta(days=duration)

                if mi < 1:
                    st = 'CUMPLIDO' if i % 3 != 1 else 'INCUMPLIDO'
                elif mi == 1:
                    st = statuses_pool[i % len(statuses_pool)]
                elif mi == 2:
                    st = statuses_pool[(i + 2) % len(statuses_pool)]
                else:
                    st = 'PENDIENTE'

                start_hour = 8 + (i % 8)
                end_hour = start_hour + 1 + (i % 3)

                sp, _ = SchedulePeriod.objects.get_or_create(
                    activity=act,
                    start_date=start,
                    end_date=end,
                    start_time=datetime.time(start_hour, 0),
                    end_time=datetime.time(min(end_hour, 17), 0),
                    defaults={
                        'status': st,
                        'description': act.description[:200],
                        'color': act.color or '#1976d2',
                        'is_extraplan': False,
                    },
                )
                if sp.status != st and mi >= 1:
                    sp.status = st
                    sp.save(update_fields=['status'])

                # ScheduleOrgUnit for main organizational unit
                if act.organizational_unit:
                    sou_status = '' if (mi >= 1 and i % 2 == 0) else 'ACTIVO'
                    sou, _ = ScheduleOrgUnit.objects.get_or_create(
                        schedule_period=sp, organizational_unit=act.organizational_unit
                    )
                    if sou.status != sou_status:
                        sou.status = sou_status
                        sou.save(update_fields=['status'])

                for mapping in ActivityMapping.objects.filter(activity=act):
                    SchedulePeriodMapping.objects.get_or_create(
                        schedule_period=sp, user=mapping.user
                    )

                schedule_map.setdefault(act.id, []).append(sp)

            self.stdout.write(f'  Creados periodos para {year}-{month:02d}')

        return schedule_map

    # ── Comentarios de cronograma ──
    def _seed_schedule_comments(self, schedule_map, users):
        by_username = {u.username: u for u in users}
        comments_text = [
            'Periodo ejecutado según lo planificado.',
            'Se presentaron retrasos por falta de recursos.',
            'Actividad cumplida satisfactoriamente.',
            'Requiere reprogramación por condiciones climáticas.',
            'Ejecutado con éxito. Se superaron las expectativas.',
            'Pendiente de aprobación por la dirección.',
        ]
        count = 0
        for act_id, periods in schedule_map.items():
            for sp in periods[:2]:
                if sp.status == 'CUMPLIDO' or sp.status == 'INCUMPLIDO':
                    user = by_username.get('jorge') or users[0]
                    ScheduleComment.objects.get_or_create(
                        schedule_period=sp, user=user,
                        defaults={'comment': comments_text[hash(sp.id) % len(comments_text)]}
                    )
                    count += 1
        if count:
            self.stdout.write(f'  Creados {count} comentarios de cronograma')

    # ── Incumplimientos ──
    def _seed_unfulfilled(self, activities, schedule_map, users):
        by_username = {u.username: u for u in users}
        reasons = [
            'No se completó por falta de personal calificado.',
            'Recursos insuficientes para ejecutar la actividad.',
            'Condiciones climáticas adversas impidieron la ejecución.',
            'Problemas técnicos con el equipamiento necesario.',
            'Se pospuso por decisión de la dirección.',
        ]
        count = 0
        for act_id, periods in schedule_map.items():
            for sp in periods:
                if sp.status != 'INCUMPLIDO':
                    continue
                act = Activity.objects.get(id=act_id)
                user = by_username.get('jorge') or users[0]
                UnfulfilledActivity.objects.get_or_create(
                    activity=act, schedule_period=sp,
                    defaults={
                        'description': reasons[hash(sp.id) % len(reasons)],
                        'registered_by': user,
                    }
                )
                count += 1
        if count:
            self.stdout.write(f'  Creados {count} incumplimientos')

    # ── Comentarios de actividades ──
    def _seed_activity_comments(self, activities, users):
        by_username = {u.username: u for u in users}
        comments_data = [
            'Actividad prioritaria para este periodo.',
            'Se necesita coordinar con el Departamento de Tecnología.',
            'Recordar preparar los materiales con antelación.',
            'Confirmar disponibilidad del salón con logística.',
            'Incluir informe de resultados al finalizar.',
            'Actividad evaluada positivamente por los participantes.',
        ]
        count = 0
        for i, act in enumerate(activities):
            user = by_username.get('jorge') or users[0]
            ActivityComment.objects.get_or_create(
                activity=act, user=user,
                defaults={'comment': comments_data[i % len(comments_data)]},
            )
            count += 1
        self.stdout.write(f'  Creados {count} comentarios de actividades')

    # ── Días laborables ──
    def _seed_workdays(self, users):
        for user in users:
            for day in range(1, 6):
                WorkDay.objects.get_or_create(user=user, day=day)
        self.stdout.write('  Creados días laborables (lun-vie) para todos los usuarios')

    # ── Planes aprobados ──
    def _seed_approved_plans(self, units, activities):
        today = datetime.date.today()
        planner = User.objects.filter(username='carlos').first() or User.objects.first()
        for offset in [-2, -1, 0, 1]:
            m = today.month + offset
            y = today.year
            while m < 1:
                m += 12; y -= 1
            while m > 12:
                m -= 12; y += 1
            first_day = datetime.date(y, m, 1)
            last_day = datetime.date(y, m, 28) if m != today.month else today
            for ou in units.values():
                act = activities[(ou.id + m) % len(activities)]
                ApprovedPlan.objects.get_or_create(
                    organizational_unit=ou,
                    activity=act,
                    start_date=first_day,
                    end_date=last_day,
                    observations=f'Plan aprobado para {ou.name} - {m}/{y}',
                    defaults={'approved_by': planner},
                )
        self.stdout.write('  Creados planes aprobados (varios meses)')

    # ── Approval flow: approve/reject some activities and cronograms ──
    def _run_approval_flow(self, activities, users, units):
        approver = User.objects.filter(username='maria').first() or User.objects.first()
        director = User.objects.filter(username='martin').first() or User.objects.first()
        planner = User.objects.filter(username='carlos').first() or User.objects.first()
        today = datetime.date.today()

        # Approve some ActivityOrgUnits (simula approve_subunit_activity)
        aous = ActivityOrgUnit.objects.all()[:8]
        for i, aou in enumerate(aous):
            if i < 5:
                aou.status = 'Aprobado'
                aou.save(update_fields=['status'])
                ActivityMapping.objects.get_or_create(activity=aou.activity, user=approver)
                period = SchedulePeriod.objects.filter(activity=aou.activity).first()
                if period:
                    ApprovedPlan.objects.get_or_create(
                        organizational_unit=aou.organizational_unit,
                        activity=aou.activity,
                        start_date=period.start_date,
                        end_date=period.end_date,
                        approved_by=approver,
                    )
                Notification.objects.get_or_create(
                    user=aou.activity.created_by,
                    message=f'Actividad aprobada: {aou.activity.description[:80]}',
                    notification_type='approval',
                    related_object_id=aou.activity_id,
                    related_object_type='Activity',
                    defaults={
                        'meta': {
                            'activity_id': aou.activity_id,
                            'activity_desc': aou.activity.description[:80],
                            'user_id': approver.id,
                            'user_name': approver.display_name,
                        }
                    }
                )
            else:
                aou.status = 'Rechazado'
                aou.save(update_fields=['status'])
                Notification.objects.get_or_create(
                    user=aou.activity.created_by,
                    message=f'Actividad rechazada: {aou.activity.description[:80]}',
                    notification_type='rejection',
                    related_object_id=aou.activity_id,
                    related_object_type='Activity',
                    defaults={
                        'meta': {
                            'activity_id': aou.activity_id,
                            'activity_desc': aou.activity.description[:80],
                            'user_id': approver.id,
                            'user_name': approver.display_name,
                        }
                    }
                )

        # Approve some ScheduleOrgUnits (simula approve_subunit_cronograms)
        sous = ScheduleOrgUnit.objects.all()[:6]
        for i, sou in enumerate(sous):
            if i < 4:
                sou.status = 'Aprobado'
                sou.save(update_fields=['status'])
                SchedulePeriodMapping.objects.get_or_create(
                    schedule_period=sou.schedule_period,
                    user=director,
                )

        self.stdout.write('  Flujo de aprobación/rechazo ejecutado (varias actividades)')

    # ── Distribute flow: simulate distribute_to_subunits ──
    def _run_distribute_flow(self, activities, units):
        planner = User.objects.filter(username='carlos').first() or User.objects.first()
        parent_units = OrganizationalUnit.objects.exclude(parent=None).filter(
            parent__isnull=False
        ).values_list('parent', flat=True).distinct()

        for parent_id in list(parent_units)[:3]:
            children = list(OrganizationalUnit.objects.filter(parent_id=parent_id))
            if len(children) < 2:
                continue
            act = activities[(parent_id * 3) % len(activities)]
            target = children[1]
            ActivityOrgUnit.objects.get_or_create(
                activity=act, organizational_unit=target,
                defaults={'status': ''}
            )
            for sp in SchedulePeriod.objects.filter(activity=act):
                ScheduleOrgUnit.objects.get_or_create(
                    schedule_period=sp, organizational_unit=target,
                    defaults={'status': ''}
                )

        self.stdout.write('  Flujo de distribución a subunidades ejecutado')

    # ── Assign to units flow: simulate assign_to_units ──
    def _run_assign_to_units_flow(self, activities, units):
        all_units = list(OrganizationalUnit.objects.all())
        for i, act in enumerate(activities[:5]):
            target_units = [u for u in all_units if u.id != getattr(act.organizational_unit, 'id', None)][:2]
            for target in target_units:
                ActivityOrgUnit.objects.get_or_create(
                    activity=act, organizational_unit=target,
                    defaults={'status': ''}
                )
                for sp in SchedulePeriod.objects.filter(activity=act):
                    ScheduleOrgUnit.objects.get_or_create(
                        schedule_period=sp, organizational_unit=target,
                        defaults={'status': ''}
                    )
        self.stdout.write('  Flujo de asignación a unidades ejecutado')

    # ── Mensajes ──
    def _seed_messages(self, users):
        by_username = {u.username: u for u in users}
        admin = User.objects.get(username='admin')
        messages_data = [
            ('Bienvenido al sistema', 'Su usuario ha sido creado exitosamente. Por favor revise sus datos y complete su perfil.', 'admin', 'martin'),
            ('Bienvenido al sistema', 'Su usuario ha sido creado exitosamente.', 'admin', 'maria'),
            ('Bienvenido al sistema', 'Bienvenido al Sistema de Gestión de Planes.', 'admin', 'carlos'),
            ('Recordatorio: Taller de Liderazgo', 'El taller programado para esta semana requiere confirmación de asistencia.', 'maria', 'jorge'),
            ('Solicitud de informe', 'Por favor enviar el informe trimestral antes del viernes.', 'martin', 'ana'),
            ('Re: Solicitud de informe', 'El informe será entregado en la fecha acordada.', 'ana', 'martin'),
            ('Actualización de cronograma', 'Se han ajustado las fechas del proyecto de investigación.', 'ana', 'carlos'),
            ('Invitación a reunión', 'Reunión de seguimiento el jueves a las 10:00 en Sala de Juntas.', 'jorge', 'todos'),
            ('Aprobación de plan mensual', 'El plan del mes ha sido aprobado por la dirección.', 'martin', 'jorge'),
            ('Notificación de auditoría', 'La auditoría interna de calidad se realizará la próxima semana.', 'rosa', 'todos'),
            ('Asignación de actividad', 'Se le ha asignado una nueva actividad en el sistema.', 'carlos', 'pedro'),
            ('Recordatorio de cronograma', 'Tiene periodos pendientes por ejecutar esta semana.', 'jorge', 'sofia'),
        ]
        count = 0
        for subject, body, sender_uname, recipient_uname in messages_data:
            sender = by_username.get(sender_uname, admin)
            if recipient_uname == 'todos':
                recipients = [u for u in users if u != sender]
            else:
                recipients = [by_username.get(recipient_uname)] if by_username.get(recipient_uname) else []
            for recipient in recipients:
                if not Message.objects.filter(subject=subject, sender=sender, recipient=recipient).exists():
                    Message.objects.create(
                        sender=sender, recipient=recipient,
                        subject=subject, body=body,
                    )
                    count += 1
        self.stdout.write(f'  Creados {count} mensajes')

    # ── Notificaciones ──
    def _seed_notifications(self, users):
        admin = User.objects.get(username='admin')
        notifications_data = [
            ('Tiene actividades pendientes por revisar', 'system', {}),
            ('Se le ha asignado una nueva actividad: Taller de Liderazgo', 'assignment', {'activity_id': 1, 'activity_desc': 'Taller de Liderazgo para Mandos Medios'}),
            ('Su plan mensual ha sido aprobado', 'approval', {'approved_by': 'admin'}),
            ('Tiene un nuevo mensaje sin leer', 'message', {}),
            ('Actividad distribuida a su subunidad', 'assignment', {'activity_id': 2, 'activity_desc': 'Conferencia sobre Innovación Pedagógica'}),
            ('Cronograma aprobado: Producción de Material Didáctico', 'approval', {'activity_desc': 'Producción de Material Didáctico'}),
        ]
        count = 0
        for user in users:
            if user == admin:
                continue
            for message, ntype, meta in notifications_data:
                Notification.objects.get_or_create(
                    user=user, message=message, notification_type=ntype,
                    defaults={'is_read': ntype == 'system', 'meta': meta},
                )
                count += 1
        self.stdout.write(f'  Creadas {count} notificaciones')
