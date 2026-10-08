#!/bin/bash
# Comando forzato della chiave SSH dell'utente "backupcopia" (vedi installa.sh): qualunque cosa
# chieda chi si collega, si esegue solo questo. Scrive sullo standard output l'ultima copia giornaliera
# (gzip) e registra l'ora dello scarico, che la pagina del fornitore mostra come "copia sul PC".
# Non apre una shell, non accetta argomenti, non dà accesso ad altri file.
set -uo pipefail

DEST="${DEST:-/opt/hotelweb/backups/notturni}"
REGISTRO="${REGISTRO:-/var/lib/hotelweb-backup/ultima-copia-pc}"

ULTIMO="$(ls -1 "$DEST/giornalieri" 2>/dev/null | grep -E '^hotelweb-[0-9]{8}-[0-9]{4}\.sql\.gz$' | sort -r | head -1)"
if [ -z "$ULTIMO" ]; then
  echo "Nessuna copia disponibile sul server." >&2
  exit 1
fi
cat "$DEST/giornalieri/$ULTIMO" || exit 1
# Ora e nome della copia scaricata (il file è dell'utente backupcopia, leggibile dall'app).
printf '{"quando":"%s","file":"%s"}\n' "$(date --iso-8601=seconds)" "$ULTIMO" > "$REGISTRO.nuovo" && mv "$REGISTRO.nuovo" "$REGISTRO"
