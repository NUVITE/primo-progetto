#!/bin/bash
# Backup notturno del database di HotelWeb (lo lancia il timer hotelweb-backup.timer alle 3).
#
# - copia completa e coerente (--single-transaction) compressa in gzip;
# - verifica: archivio integro, dump arrivato in fondo ("Dump completed"), tutte le tabelle presenti;
# - conservazione: 14 giornaliere, 8 settimanali (domenica), 12 mensili (giorno 1);
# - stato.json con l'esito, letto dalla pagina del fornitore (e dall'avviso se qualcosa non va).
#
# Le credenziali si leggono dal .env dell'app e passano al programma in un file temporaneo
# leggibile solo da root, mai sulla riga di comando (che altri utenti vedrebbero con ps).
# Variabili per il collaudo: ENV_FILE, DEST, OGGI (AAAA-MM-GG), ORA_FILE (HHMM).
set -uo pipefail

ENV_FILE="${ENV_FILE:-/opt/hotelweb/app/.env}"
DEST="${DEST:-/opt/hotelweb/backups/notturni}"
OGGI="${OGGI:-$(date +%F)}"
ORA_FILE="${ORA_FILE:-$(date +%H%M)}"
TENGO_GIORNALIERI=14
TENGO_SETTIMANALI=8
TENGO_MENSILI=12

mkdir -p "$DEST/giornalieri" "$DEST/settimanali" "$DEST/mensili"
NOME="hotelweb-${OGGI//-/}-${ORA_FILE}.sql.gz"
FILE="$DEST/giornalieri/$NOME"
TMP_CNF="$(mktemp)"
TMP_ERR="$(mktemp)"
trap 'rm -f "$TMP_CNF" "$TMP_ERR" "$FILE.parziale"' EXIT
chmod 600 "$TMP_CNF"

# Esito in stato.json (scritto in un file a parte e poi rinominato: chi legge non trova mai un file a metà).
scrivi_stato() {
  local esito="$1" messaggio="$2" dimensione="${3:-0}" tabelle="${4:-0}" file="${5:-}"
  messaggio="${messaggio//\\/\\\\}"
  messaggio="${messaggio//\"/\\\"}"
  printf '{"quando":"%s","esito":"%s","messaggio":"%s","file":"%s","dimensione":%s,"tabelle":%s,"giornalieri":%s,"settimanali":%s,"mensili":%s}\n' \
    "$(date --iso-8601=seconds)" "$esito" "$messaggio" "$file" "$dimensione" "$tabelle" \
    "$(ls "$DEST/giornalieri" | wc -l)" "$(ls "$DEST/settimanali" | wc -l)" "$(ls "$DEST/mensili" | wc -l)" > "$DEST/stato.json.nuovo"
  chmod 644 "$DEST/stato.json.nuovo"
  mv "$DEST/stato.json.nuovo" "$DEST/stato.json"
}
fallito() {
  echo "BACKUP FALLITO: $1" >&2
  scrivi_stato "errore" "$1"
  exit 1
}

# Credenziali dal .env dell'app (solo le righe DATABASE_*, senza eseguire il file).
leggi() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
DB_HOST="$(leggi DATABASE_HOST)"
DB_PORT="$(leggi DATABASE_PORT)"
DB_USER="$(leggi DATABASE_USER)"
DB_PASS="$(leggi DATABASE_PASSWORD)"
DB_NAME="$(leggi DATABASE_NAME)"
[ -n "$DB_NAME" ] && [ -n "$DB_USER" ] || fallito "credenziali del database non trovate in $ENV_FILE"
printf '[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n' "${DB_HOST:-127.0.0.1}" "${DB_PORT:-3306}" "$DB_USER" "$DB_PASS" > "$TMP_CNF"

DUMP="$(command -v mariadb-dump || command -v mysqldump)"
CLIENT="$(command -v mariadb || command -v mysql)"
[ -n "$DUMP" ] && [ -n "$CLIENT" ] || fallito "mariadb-dump o mariadb non installati"

# Quante tabelle ci sono adesso: il dump deve contenerle tutte.
ATTESE="$("$CLIENT" --defaults-extra-file="$TMP_CNF" -N -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_TYPE='BASE TABLE'" 2>"$TMP_ERR")" \
  || fallito "database non raggiungibile: $(head -c 300 "$TMP_ERR")"

"$DUMP" --defaults-extra-file="$TMP_CNF" --single-transaction --routines --triggers --hex-blob --default-character-set=utf8mb4 "$DB_NAME" 2>"$TMP_ERR" | gzip -9 > "$FILE.parziale"
[ "${PIPESTATUS[0]}" -eq 0 ] || fallito "copia non riuscita: $(head -c 300 "$TMP_ERR")"

# Verifiche prima di considerarlo un backup valido.
gzip -t "$FILE.parziale" 2>/dev/null || fallito "archivio compresso rovinato"
zcat "$FILE.parziale" | tail -1 | grep -q "Dump completed" || fallito "copia interrotta prima della fine"
TABELLE="$(zcat "$FILE.parziale" | grep -c '^CREATE TABLE')"
[ "$TABELLE" -eq "$ATTESE" ] || fallito "nella copia ci sono $TABELLE tabelle su $ATTESE"
mv "$FILE.parziale" "$FILE"
chmod 640 "$FILE"
# Leggibili dall'utente che scarica la copia sul PC (se esiste il suo gruppo).
getent group backupcopia >/dev/null 2>&1 && chgrp backupcopia "$FILE"

# Settimanale la domenica, mensile il giorno 1 (copie dello stesso file).
[ "$(date -d "$OGGI" +%u)" = "7" ] && cp -p "$FILE" "$DEST/settimanali/$NOME"
[ "$(date -d "$OGGI" +%d)" = "01" ] && cp -p "$FILE" "$DEST/mensili/$NOME"

# Conservazione: si tengono solo le più recenti di ogni tipo (i nomi contengono data e ora, quindi l'ordine è quello alfabetico).
tieni() { ls -1 "$1" | sort -r | tail -n +$(($2 + 1)) | while read -r f; do rm -f "$1/$f"; done; }
tieni "$DEST/giornalieri" "$TENGO_GIORNALIERI"
tieni "$DEST/settimanali" "$TENGO_SETTIMANALI"
tieni "$DEST/mensili" "$TENGO_MENSILI"

scrivi_stato "ok" "copia verificata" "$(stat -c%s "$FILE")" "$TABELLE" "$NOME"
echo "Backup riuscito: $FILE ($(stat -c%s "$FILE") byte, $TABELLE tabelle)"
