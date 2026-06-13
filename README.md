# SISGEP — Sistema de Gestión de Planes de Trabajo

Sistema integral para la gestión de planes de trabajo con cronogramas, aprobación por unidades organizativas, cumplimiento, reportes, mensajería interna y notificaciones en tiempo real vía WebSockets.

## Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | Python 3.14+, Django 5.x, DRF 3.15+, Django Channels (ASGI), Daphne |
| **Frontend** | React 19, Vite 7, Chart.js, i18next, Axios, Lucide React |
| **Base de datos** | PostgreSQL 16+ |
| **Cache/Sesión** | Redis 7+ (producción) / InMemory (desarrollo) |
| **Infra** | Docker Compose, nginx, Whitenoise, Sentry |

## Funcionalidades

- **Catálogos**: ARC, objetivos de trabajo, criterios de medida, lineamientos, categorías, tipos de actividad
- **Usuarios**: CRUD, roles, autenticación JWT + sesión, LDAP, registro, recuperación de contraseña
- **Unidades Organizativas**: Estructura jerárquica con árbol, responsables
- **Actividades**: CRUD con filtros, búsqueda global, operaciones batch (delete, update, asignar UO), importación desde Excel
- **Cronograma**: Periodos con drag-drop, calendario mensual/anual/individual, estados (pendiente/cumplido/en_proceso/incidencia), solapamiento
- **Aprobaciones**: Flujo de aprobación/rechazo por UO, distribución a subunidades, notificaciones
- **Reportes**: PDF individual, XLSX por UO, XLSX comparativo mensual, ICS, plantilla de importación
- **Cumplimiento**: Estadísticas con gráficos, paginación, filtros por periodo/UO
- **Mensajería**: Bandeja de entrada/salida, marcado como leído, notificaciones
- **Notificaciones**: Tiempo real vía WebSocket, email vía SMTP configurable, marcado individual/todo
- **Auditoría**: Registro de todas las acciones con IP, user-agent, diff de datos
- **Respaldo**: `pg_dump` / `pg_restore`, rotación automática, programación vía cron, descarga desde UI
- **Configuración**: Email SMTP, sistema (clave/valor), variables de entorno
- **Seguridad**: Rate limiting (5 throttles), HSTS, CSP, CORS, CSRF, JWT, headers de seguridad, modo mantenimiento, validación de contraseñas, confirmación de email al registrarse

## Requisitos

- Python 3.14+
- Node.js 22+
- PostgreSQL 16+
- Redis 7+ (opcional, solo necesario en producción)

## Instalación y Desarrollo

### Backend

```bash
# Clonar y entrar
git clone <repo> && cd plantrabajo

# Entorno virtual
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# Dependencias
pip install -r requirements.txt

# Variable requerida
export DJANGO_SECRET_KEY=clave-temporal-de-desarrollo

# Base de datos
createdb plantrabajo
python manage.py migrate

# Datos de demostración
python manage.py seed_data

# Servidor de desarrollo (con WebSockets)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
# O sin WebSockets:
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Abre http://localhost:5173 con proxy a Django en :8000
```

### Usuario por defecto (seed_data)

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Superusuario (staff) |
| `martin` | `123456` | Usuario regular |
| `maria` | `123456` | Usuario regular |
| `carlos` | `123456` | Usuario regular |
| `ana` | `123456` | Usuario regular |
| `luis` | `123456` | Usuario regular |
| `rosa` | `123456` | Usuario regular |

### Seed data

Crea automáticamente catálogos, UOs, actividades, cronogramas, mensajes y notificaciones:

```bash
python manage.py seed_data
```

## Docker (producción)

```bash
# Iniciar todo el stack
docker compose up -d

# Ver logs
docker compose logs -f
```

Variables de entorno requeridas (`.env`):

```env
DJANGO_SECRET_KEY=<clave-segura-64-chars>
DB_NAME=plantrabajo
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432
REDIS_URL=redis://redis:6379/0
CORS_ALLOWED_ORIGINS=https://tudominio.com
CSRF_TRUSTED_ORIGINS=https://tudominio.com
```

## Pruebas

```bash
# Backend (todos los tests)
python manage.py test apps/ --noinput

# Frontend
cd frontend && npm test

# CI completo
npm run build
```

## Producción

```bash
export DJANGO_SETTINGS_MODULE=config.settings_prod
export DJANGO_SECRET_KEY=<clave-segura>
export DB_NAME=plantrabajo
export DB_USER=postgres
export DB_PASSWORD=postgres
export DB_HOST=localhost
export DB_PORT=5432
export REDIS_URL=redis://host:6379/0

python manage.py collectstatic --noinput
python manage.py migrate
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Modo mantenimiento

```bash
# Activar (todas las rutas → 503, excepto /api/health/)
touch /tmp/maintenance.flag

# Desactivar
rm /tmp/maintenance.flag
```

### Respaldos automáticos (cron)

```bash
# Editar crontab
crontab -e

# Agregar línea (ejecuta a las 3 AM, conserva últimos 7)
0 3 * * * cd /app && python manage.py daily_backup --keep=7 >> /var/log/plantrabajo/backup.log 2>&1
```

## Migraciones

```bash
python manage.py makemigrations
python manage.py migrate
```

## API

Todas las rutas bajo `/api/v1/`. Documentación interactiva en `/api/docs/`.

| Prefijo | App | Descripción |
|---------|-----|-------------|
| `/api/v1/users/` | core | Usuarios, login, registro, roles, LDAP |
| `/api/v1/roles/` | core | Roles del sistema |
| `/api/v1/organizational-units/` | core | UOs con árbol |
| `/api/v1/categories/` | core | Categorías |
| `/api/v1/activity-types/` | core | Tipos de actividad |
| `/api/v1/arcs/` | core | Áreas de Resultado Clave |
| `/api/v1/objectives/` | core | Objetivos de trabajo |
| `/api/v1/criteria/` | core | Criterios de medida |
| `/api/v1/guidelines/` | core | Lineamientos |
| `/api/v1/object-permissions/` | core | Permisos por objeto |
| `/api/v1/backups/` | core | Respaldo y restauración |
| `/api/v1/email-config/` | core | Configuración SMTP |
| `/api/v1/system-config/` | core | Configuración clave/valor |
| `/api/v1/search/` | core | Búsqueda global |
| `/api/v1/activities/` | activities | Actividades, batch, importación, aprobaciones |
| `/api/v1/activity-guidelines/` | activities | Lineamientos por actividad |
| `/api/v1/activity-org-units/` | activities | UOs por actividad |
| `/api/v1/activity-mappings/` | activities | Mapeo actividad-usuario |
| `/api/v1/unfulfilled-activities/` | activities | Incumplimientos |
| `/api/v1/activity-attachments/` | activities | Adjuntos |
| `/api/v1/activity-comments/` | activities | Comentarios |
| `/api/v1/schedule/periods/` | schedule | Periodos de cronograma |
| `/api/v1/schedule/period-mappings/` | schedule | Mapeo periodo-usuario |
| `/api/v1/schedule/org-units/` | schedule | UOs por periodo |
| `/api/v1/schedule/work-days/` | schedule | Días laborables |
| `/api/v1/schedule/approved-plans/` | schedule | Planes aprobados |
| `/api/v1/schedule/reports/` | schedule | Reportes (XLSX, PDF, ICS) |
| `/api/v1/schedule/comments/` | schedule | Comentarios de cronograma |
| `/api/v1/messages/` | communication | Mensajes internos |
| `/api/v1/notifications/` | communication | Notificaciones |
| `/api/v1/log-entries/` | logs | Registro de auditoría |
| `/api/v1/token/` | simplejwt | Obtener JWT |
| `/api/v1/token/refresh/` | simplejwt | Refrescar JWT |
| `/api/v1/health/` | core | Health check (DB + cache) |
| `/api/docs/` | drf-spectacular | Esquema OpenAPI |
| `/api/docs/swagger-ui/` | drf-spectacular | Swagger UI |
| `/api/docs/redoc/` | drf-spectacular | ReDoc |

### WebSockets

```
ws://host/ws/notifications/?token=<jwt_access_token>
```

## Estructura del proyecto

```
plantrabajo/
├── apps/
│   ├── core/               # Usuarios, roles, UOs, catálogos, config, backup, email, middleware, throttles
│   ├── activities/          # Actividades, adjuntos, comentarios, incumplimientos, batch, importación
│   ├── schedule/            # Periodos, calendarios, reportes, días laborables, planes aprobados
│   ├── communication/       # Mensajes, notificaciones, WebSocket consumer
│   └── logs/                # Auditoría (LogEntry)
├── config/                  # Settings (dev + prod), ASGI, WSGI, URLs raíz
├── frontend/src/
│   ├── pages/               # 32 páginas
│   ├── components/          # 12+ componentes reutilizables
│   ├── services/            # Capa axios con interceptors (JWT + CSRF)
│   ├── context/             # AuthContext, ToastContext, ConfirmContext
│   ├── hooks/               # 7 hooks (useWebSocket, useDebounce, etc.)
│   ├── i18n/                # Español e Inglés
│   └── test/                # 4 test suites (14 tests)
├── docker-compose.yml       # PostgreSQL + Backend + Frontend (nginx)
├── backend.Dockerfile       # Imagen Django + Daphne
├── frontend.Dockerfile      # Imagen nginx + build estático
├── nginx.conf               # Proxy inverso para producción
└── .github/workflows/ci.yml # CI/CD: tests → build → push → deploy
```

## Throttles (Rate Limiting)

| Ámbito | Límite | Aplica a |
|--------|--------|----------|
| `anon` | 60/h | Usuarios no autenticados |
| `user` | 300/h | Usuarios autenticados |
| `write` | 60/h | Operaciones de escritura |
| `auth` | 10/h | Login y registro |
| `report` | 30/h | Descarga de reportes |

Configurables vía `THROTTLE_RATE_ANON`, `THROTTLE_RATE_USER`, etc.

## Variables de Entorno

Ver `.env.example` para la lista completa. Variables críticas:

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DJANGO_SECRET_KEY` | **Sí** | Clave secreta de Django |
| `DATABASE_URL` | En prod | URL de PostgreSQL |
| `REDIS_URL` | En prod | URL de Redis |
| `CORS_ALLOWED_ORIGINS` | En prod | Orígenes permitidos |
| `SENTRY_DSN` | Opcional | DSN de Sentry (backend) |
| `VITE_SENTRY_DSN` | Opcional | DSN de Sentry (frontend) |
| `MAINTENANCE_FILE` | Opcional | Ruta del flag de mantenimiento |
