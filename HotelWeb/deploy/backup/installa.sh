#!/bin/bash
# Installa (o aggiorna) i backup notturni di HotelWeb sul server. Da lanciare come root dalla
# cartella dell'app: bash deploy/backup/installa.sh "ssh-ed25519 AAAA... pc-ufficio"
# La chiave pubblica è quella creata sul PC che scarica le copie (la privata resta solo sul PC).
# Si può rilanciare: non duplica nulla. Senza chiave installa solo il backup notturno.
set -euo pipefail

QUI="$(cd "$(dirname "$0")" && pwd)"
CHIAVE="${1:-}"
DEST=/opt/hotelweb/backups/notturni

[ "$(id -u)" -eq 0 ] || { echo "Va lanciato come root." >&2; exit 1; }

# Script fuori dalla cartella dell'app: un deploy non li cambia mentre girano e l'utente
# backupcopia non li può modificare.
install -m 755 -o root -g root "$QUI/backup-notturno.sh" /usr/local/sbin/hotelweb-backup-notturno
install -m 755 -o root -g root "$QUI/consegna-copia.sh" /usr/local/bin/hotelweb-consegna-copia
install -m 644 -o root -g root "$QUI/hotelweb-backup.service" /etc/systemd/system/hotelweb-backup.service
install -m 644 -o root -g root "$QUI/hotelweb-backup.timer" /etc/systemd/system/hotelweb-backup.timer

# Utente che può solo scaricare l'ultima copia: senza password (si entra solo con la chiave),
# con un comando forzato e nessuna altra possibilità (restrict: niente terminale né inoltri).
if ! id backupcopia >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/hotelweb-backup --shell /bin/sh backupcopia
fi
passwd -l backupcopia >/dev/null
install -d -m 755 -o backupcopia -g backupcopia /var/lib/hotelweb-backup
install -d -m 700 -o backupcopia -g backupcopia /var/lib/hotelweb-backup/.ssh

# Cartelle delle copie: i nomi li legge anche l'app (per la pagina del fornitore), il contenuto
# solo root e backupcopia.
install -d -m 755 -o root -g root /opt/hotelweb/backups "$DEST"
for d in giornalieri settimanali mensili; do install -d -m 755 -o root -g root "$DEST/$d"; done
find "$DEST" -name '*.sql.gz' -exec chgrp backupcopia {} + -exec chmod 640 {} +
# Anche le copie fatte dal deploy non devono essere leggibili da tutti.
find /opt/hotelweb/backups -maxdepth 1 -name 'db-*.sql.gz' -exec chmod 600 {} +

if [ -n "$CHIAVE" ]; then
  echo "$CHIAVE" | grep -qE '^ssh-(ed25519|rsa) [A-Za-z0-9+/=]+( .*)?$' || { echo "Chiave pubblica non valida." >&2; exit 1; }
  echo "command=\"/usr/local/bin/hotelweb-consegna-copia\",restrict $CHIAVE" > /var/lib/hotelweb-backup/.ssh/authorized_keys
  chown backupcopia:backupcopia /var/lib/hotelweb-backup/.ssh/authorized_keys
  chmod 600 /var/lib/hotelweb-backup/.ssh/authorized_keys
  echo "Chiave del PC installata (può solo scaricare l'ultima copia)."
fi

systemctl daemon-reload
systemctl enable --now hotelweb-backup.timer
# Primo backup subito, per avere una copia e uno stato da mostrare.
systemctl start hotelweb-backup.service
systemctl --no-pager status hotelweb-backup.service | tail -3
cat "$DEST/stato.json"
systemctl list-timers hotelweb-backup.timer --no-pager
