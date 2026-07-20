# Plan de Trabajo

Sistema de gestión de planes de trabajo con control de acceso por roles, visibilidad por unidades organizativas, cronogramas, aprobaciones y reportes.

## Stack

- **Frontend**: React 19, Vite 7, react-router-dom 7
- **Backend**: Django 5, DRF 3.15, SimpleJWT, Channels
- **BD**: PostgreSQL 16
- **Cache/WS**: Redis 7
- **Proxy**: Nginx

## Quick Start (Docker)

```bash
cp .env.example .env
# edit .env with your secrets

docker compose up -d
```

Luego abrir `http://localhost`.  
Seed data opcional: `docker compose exec backend python manage.py seed_data`

## Desarrollo sin Docker

### Backend

```bash
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Tests

```bash
# backend (SQLite, rápido)
python manage.py test --settings=config.settings_test

# frontend
cd frontend && npm test
```

## Variables de Entorno

Ver `.env.example` para todas las variables documentadas.

## Despliegue

1. Configurar dominio y DNS apuntando al servidor
2. `docker compose -f docker-compose.yml up -d`
3. Agregar HTTPS con reverse proxy (Caddy / Traefik / Nginx)

### Backup

```bash
./scripts/backup.sh
```

### Roles del Sistema

| Rol | Permisos |
|-----|----------|
| Ejecutor | Ver actividades asignadas, actualizar estado de periodos |
| Planificador | CRUD actividades, crear cronogramas, importar |
| Aprobador | Aprobar/rechazar actividades y cronogramas de su UO |
| Directivo | Crear actividades, aprobar, ver todo |
| Admin/staff | Todo lo anterior + gestión de usuarios y roles |
