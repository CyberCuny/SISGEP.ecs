#!/usr/bin/env bash
# backup.sh — PostgreSQL backup with rotation
# Usage: ./backup.sh [output-dir]
set -euo pipefail

OUTPUT_DIR="${1:-./backups}"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="plantrabajo_${TIMESTAMP}.sql.gz"
DB_NAME="${DB_NAME:-plantrabajo}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

echo "Backing up $DB_NAME to $OUTPUT_DIR/$FILENAME ..."
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl | gzip > "$OUTPUT_DIR/$FILENAME"

echo "Done: $OUTPUT_DIR/$FILENAME"

# Keep last 14 daily backups
find "$OUTPUT_DIR" -name 'plantrabajo_*.sql.gz' -mtime +14 -delete 2>/dev/null || true

# Also backup media files
MEDIA_BACKUP="${OUTPUT_DIR}/media_${TIMESTAMP}.tar.gz"
if [ -d ./media ]; then
    tar czf "$MEDIA_BACKUP" ./media
    echo "Media backed up: $MEDIA_BACKUP"
fi
