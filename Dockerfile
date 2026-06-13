FROM python:3.14-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libldap2-dev libsasl2-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -t /deps

FROM python:3.14-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.settings_prod

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client libpq-dev && rm -rf /var/lib/apt/lists/*

COPY --from=builder /deps /usr/local/lib/python3.14/site-packages
COPY . .

RUN python manage.py collectstatic --noinput --clear

EXPOSE 8000
CMD python manage.py migrate --noinput && daphne -b 0.0.0.0 -p 8000 config.asgi:application
