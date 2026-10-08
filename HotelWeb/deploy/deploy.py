# Deploy di HotelWeb sul server (VPS Ubuntu, servizio systemd "hotelweb", nginx davanti).
#
#   python deploy/deploy.py            archivio dal working tree, copia app+database, migrazioni, build, riavvio
#   python deploy/deploy.py --verifica dopo il deploy: tutti i collaudi (uno alla volta), pagine, log, backup
#
# Credenziali: mai nel repository. Si usa la chiave SSH indicata in HOTELWEB_SSH_CHIAVE oppure la
# password in HOTELWEB_SSH_PASSWORD; se mancano entrambe la password si chiede a terminale.
# Server: HOTELWEB_SSH_HOST (predefinito hotelweb.nuvite.it), utente HOTELWEB_SSH_UTENTE (root).
# Serve Python 3 con paramiko (pip install paramiko) e git nel PATH.
import getpass
import io
import os
import subprocess
import sys
import tarfile
from pathlib import Path

import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
PROGETTO = Path(__file__).resolve().parent.parent
APP = "/opt/hotelweb/app"
P = "export PATH=/opt/nodejs/bin:$PATH"
URL = "https://hotelweb.nuvite.it"


def collega() -> paramiko.SSHClient:
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    host = os.environ.get("HOTELWEB_SSH_HOST", "hotelweb.nuvite.it")
    utente = os.environ.get("HOTELWEB_SSH_UTENTE", "root")
    chiave = os.environ.get("HOTELWEB_SSH_CHIAVE")
    if chiave:
        c.connect(host, username=utente, key_filename=chiave, timeout=15)
    else:
        password = os.environ.get("HOTELWEB_SSH_PASSWORD") or getpass.getpass(f"Password SSH di {utente}@{host}: ")
        c.connect(host, username=utente, password=password, timeout=15)
    return c


def archivio() -> bytes:
    """Tutti i file tracciati o nuovi ma non ignorati (il .env non c'è mai: lo si controlla comunque)."""
    nomi = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=PROGETTO, capture_output=True, text=True, check=True).stdout.split("\n")
    nomi = [n for n in nomi if n and (PROGETTO / n).is_file()]
    vietati = [n for n in nomi if Path(n).name.startswith(".env")]
    if vietati:
        sys.exit(f"Nell'archivio finirebbero file .env: {vietati}. Fermo.")
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as t:
        for n in nomi:
            t.add(PROGETTO / n, arcname=n)
    print(f"Archivio: {len(nomi)} file, {buf.tell() // 1024} KB")
    return buf.getvalue()


def esegui(c: paramiko.SSHClient, passi: list[str], fermati: bool) -> bool:
    for cmd in passi:
        print("\n===", cmd[:100])
        _, o, _ = c.exec_command(cmd, get_pty=True, timeout=2400)
        print(o.read().decode(errors="replace")[-4000:])
        stato = o.channel.recv_exit_status()
        print("uscita", stato)
        if stato != 0 and fermati:
            print("!!! PASSO FALLITO: riavvio il servizio con quello che c'è e mi fermo.")
            c.exec_command("systemctl start hotelweb")
            return False
    return True


DUMP = (
    "cd /opt/hotelweb && set -a && . app/.env && set +a && D=$(command -v mariadb-dump || command -v mysqldump) && "
    "$D -h \"$DATABASE_HOST\" -P \"${DATABASE_PORT:-3306}\" -u \"$DATABASE_USER\" -p\"$DATABASE_PASSWORD\" --single-transaction \"$DATABASE_NAME\" "
    "| gzip > backups/db-$(date +%Y%m%d%H%M).sql.gz && chmod 600 backups/db-*.sql.gz && test $(stat -c%s $(ls -t backups/db-*.sql.gz | head -1)) -gt 1000"
)

PASSI_DEPLOY = [
    # Copia dell'app e del database prima di toccare qualcosa (se falliscono, ci si ferma qui).
    # L'archivio dell'app contiene il .env: leggibile solo da root.
    f"mkdir -p /opt/hotelweb/backups && tar -czf /opt/hotelweb/backups/app-$(date +%Y%m%d%H%M).tar.gz -C {APP} --exclude=node_modules --exclude=.next . && chmod 600 /opt/hotelweb/backups/app-*.tar.gz",
    DUMP,
    "systemctl stop hotelweb",
    # Via i sorgenti vecchi: i file cancellati in git spariscono anche sul server.
    f"rm -rf {APP}/src {APP}/prisma {APP}/scripts {APP}/deploy {APP}/docs",
    f"tar -xzf /opt/hotelweb/hotelweb-deploy.tar.gz -C {APP} && rm /opt/hotelweb/hotelweb-deploy.tar.gz",
    f"cd {APP} && {P} && npm install 2>&1 | tail -3",
    f"cd {APP} && {P} && npx prisma generate 2>&1 | tail -2",
    f"cd {APP} && {P} && npx prisma migrate deploy 2>&1 | tail -4",
    # Tasse di soggiorno provvisorie ricalcolate (idempotente: le definitive non cambiano).
    f"cd {APP} && {P} && npx tsx scripts/ricalcola-tasse.ts 2>&1 | tail -2",
    f"cd {APP} && {P} && npm run build 2>&1 | tail -4",
    f"chown -R hotelweb:hotelweb {APP}",
    "systemctl start hotelweb && sleep 4 && systemctl is-active hotelweb",
    f"curl -s -o /dev/null -w 'login: %{{http_code}}\\n' {URL}/login",
]

PASSI_VERIFICA = [
    # Mai collaudi in parallelo: lavorano sullo stesso database.
    f"cd {APP} && {P} && for f in scripts/collaudo-*.ts; do printf '%s: ' $(basename $f .ts); npx tsx $f 2>&1 | tail -1; done",
    f"chown -R hotelweb:hotelweb {APP}",
    f"for u in login cruscotto statistiche manuale; do printf '%s ' $u; curl -s -o /dev/null -w '%{{http_code}}\\n' {URL}/$u; done",
    "cat /opt/hotelweb/backups/notturni/stato.json; systemctl is-active hotelweb hotelweb-backup.timer",
    "journalctl -u hotelweb --since '-30 min' --no-pager | grep -i -E 'error|⨯' | tail -10; echo fine",
]


def main():
    verifica = "--verifica" in sys.argv
    c = collega()
    try:
        if verifica:
            esegui(c, PASSI_VERIFICA, fermati=False)
            return
        dati = archivio()
        sftp = c.open_sftp()
        with sftp.open("/opt/hotelweb/hotelweb-deploy.tar.gz", "wb") as f:
            f.write(dati)
        sftp.close()
        if esegui(c, PASSI_DEPLOY, fermati=True):
            print("\nDeploy finito. Poi: python deploy/deploy.py --verifica")
    finally:
        c.close()


if __name__ == "__main__":
    main()
