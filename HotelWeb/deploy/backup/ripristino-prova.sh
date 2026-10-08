#!/bin/bash
# Prova di ripristino: carica l'ultima copia notturna (o quella indicata) in un database separato,
# confronta tabella per tabella il numero di righe con il database vero e poi cancella il database
# di prova. Non tocca il database vero. Da lanciare come root (usa l'accesso locale di root a MariaDB):
#   bash deploy/backup/ripristino-prova.sh [file.sql.gz]
set -euo pipefail

DEST="${DEST:-/opt/hotelweb/backups/notturni}"
ENV_FILE="${ENV_FILE:-/opt/hotelweb/app/.env}"
PROVA=hotelweb_prova_ripristino
FILE="${1:-$DEST/giornalieri/$(ls -1 "$DEST/giornalieri" | sort -r | head -1)}"
VERO="$(grep -E '^DATABASE_NAME=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"')"
DB="$(command -v mariadb || command -v mysql)"

[ -f "$FILE" ] || { echo "Copia non trovata: $FILE" >&2; exit 1; }
[ "$VERO" != "$PROVA" ] || { echo "Nome del database di prova uguale a quello vero: fermo." >&2; exit 1; }
echo "Ripristino di prova di $(basename "$FILE") nel database $PROVA (il database vero $VERO non si tocca)"
trap '"$DB" -e "DROP DATABASE IF EXISTS \`$PROVA\`"' EXIT
"$DB" -e "DROP DATABASE IF EXISTS \`$PROVA\`; CREATE DATABASE \`$PROVA\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
INIZIO=$(date +%s)
zcat "$FILE" | "$DB" "$PROVA"
echo "Caricata in $(($(date +%s) - INIZIO)) secondi."

# Righe per tabella: copia ripristinata contro database vero (differenze piccole = lavoro fatto dopo il backup).
TABELLE="$("$DB" -N -e "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA='$VERO' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")"
UGUALI=0; DIVERSE=0; MANCANTI=0
for t in $TABELLE; do
  v="$("$DB" -N -e "SELECT COUNT(*) FROM \`$VERO\`.\`$t\`")"
  p="$("$DB" -N -e "SELECT COUNT(*) FROM \`$PROVA\`.\`$t\`" 2>/dev/null || echo "MANCA")"
  if [ "$p" = "MANCA" ]; then MANCANTI=$((MANCANTI + 1)); echo "  MANCA  $t"
  elif [ "$v" = "$p" ]; then UGUALI=$((UGUALI + 1))
  else DIVERSE=$((DIVERSE + 1)); echo "  diversa $t: copia $p, ora $v"
  fi
done
echo "Tabelle: $UGUALI uguali, $DIVERSE con righe diverse (lavoro dopo il backup), $MANCANTI mancanti."
[ "$MANCANTI" -eq 0 ] || exit 1
