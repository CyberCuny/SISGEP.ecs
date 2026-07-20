# SISGEP — Sistema de Gestión de Planes de Trabajo

Sistema completo de gestión de planes de trabajo con control de acceso por roles (jerárquicos), visibilidad por unidades organizativas (UO), cronogramas, flujos de aprobación/rechazo, distribución a subunidades, calendarios, reportes, notificaciones en tiempo real y auditoría.

## Stack

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19.1, Vite 7, react-router-dom 7.5, Lucide |
| **Backend** | Django 5.1+, DRF 3.15+, SimpleJWT, Channels |
| **Base de datos** | PostgreSQL 16 (prod), SQLite (testing) |
| **Cache / WebSocket** | Redis 7 |
| **Proxy** | Nginx |
| **Contenedores** | Docker + docker-compose |

## Arquitectura de Roles (jerarquía ascendente)

| Rol | Permisos |
|-----|----------|
| **Ejecutor** | Ver actividades asignadas, cambiar estado de periodos del cronograma, comentarios/adjuntos |
| **Planificador** | CRUD actividades, crear/editar cronogramas, importar, asignar a unidades, distribuir a subunidades |
| **Aprobador** | Aprobar/rechazar actividades y cronogramas de su UO (no crea ni edita) |
| **Directivo** | Planificador + Aprobador + CRUD usuarios; visibilidad completa de su UO |
| **Admin (staff)** | Acceso total incluyendo gestión de roles, config del sistema, backup, email |

## Quick Start (Docker)

```bash
cp .env.example .env
# editar .env con tus secretos
docker compose up -d
```

Abrir `http://localhost`.  
Seed data (opcional): `docker compose exec backend python manage.py seed_data`

## Desarrollo sin Docker

### Backend

```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
set DJANGO_SECRET_KEY=dev-key
set DJANGO_DEBUG=True
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
# Backend (54 unit + 10 E2E)
set DJANGO_SETTINGS_MODULE=config.settings
set DJANGO_SECRET_KEY=dev-key
set DJANGO_DEBUG=True
python -m pytest apps/activities/tests.py apps/core/tests.py apps/communication/tests.py apps/schedule/tests.py apps/logs/tests.py
python -m pytest apps/core/tests_e2e.py

# Frontend (30 tests)
cd frontend
npx vitest run

# Build producción
npx vite build
```

## Seed Data

El comando `python manage.py seed_data` (o `docker compose exec backend python manage.py seed_data`) siembra:

- **5 roles**, 9 categorías, 10 tipos de actividad, 4 ARC, 8 objetivos, 8 criterios, 6 lineamientos
- **30 usuarios** (martin, maria, carlos, ana, luis, ...) con roles asignados
- **27 unidades organizativas** (6 departamentos con sub-áreas)
- **29 actividades** con periodos para may-sep 2026
- Flujos de aprobación/rechazo, distribución a subunidades, asignación a unidades
- 41 comentarios de cronograma, 19 incumplimientos, 29 comentarios de actividades
- Planes aprobados, días laborables, 28 mensajes, 60 notificaciones

## Variables de Entorno

Ver `.env.example` para todas las variables documentadas. Variables principales:

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DJANGO_SECRET_KEY` | Clave secreta de Django | **requerida** |
| `DJANGO_DEBUG` | Modo debug | `False` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos | `localhost,127.0.0.1` |
| `DB_NAME` | Nombre BD | `plantrabajo` |
| `DB_USER` | Usuario BD | `postgres` |
| `DB_PASSWORD` | Password BD | `postgres` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS | — |

## Despliegue Producción

```bash
# 1. Usar settings de producción
set DJANGO_SETTINGS_MODULE=config.settings_prod

# 2. Verificar configuración
python manage.py check --deploy

# 3. Docker deploy
docker compose -f docker-compose.yml up -d
```

`settings_prod.py` incluye: HSTS, SSL redirect, cookies seguras, Sentry, Redis cache, SMTP email, logging estructurado, whitenoise para assets estáticos.

### Backup

```bash
./scripts/backup.sh
```
