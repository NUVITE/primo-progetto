---
titolo: Server e deploy
ordine: 6
fornitore: si
---

## Il server

- VPS Ubuntu 24.04, MariaDB 10.11, fuso Europe/Rome. Ospita anche altri siti: **niente Docker**
  (le sue regole del firewall romperebbero gli altri servizi) e nginx si tocca solo aggiungendo file
  nuovi e controllando con `nginx -t`.
- Node.js in `/opt/nodejs`; app in `/opt/hotelweb/app` (con il suo `.env`, permessi ristretti);
  copie in `/opt/hotelweb/backups`.
- Servizio systemd `hotelweb` (utente `hotelweb`, `next start --port 3020 --hostname 127.0.0.1`).
- nginx `/etc/nginx/sites-available/hotelweb`: proxy verso 127.0.0.1:3020 con `X-Real-IP`,
  `X-Forwarded-For`, `X-Forwarded-Proto`; certificato Let's Encrypt per `hotelweb.nuvite.it`.

## Deploy

Il deploy si fa dal PC con `deploy/deploy.py` (la password o la chiave SSH non sono nel progetto:
vedi l'intestazione dello script).

```
python deploy/deploy.py
python deploy/deploy.py --verifica
```

Cosa fa, in ordine (si ferma al primo passo che fallisce e riavvia il servizio):

1. Archivio dei file del progetto tracciati da git (controlla che non ci sia nessun `.env`).
2. Copia dell'app (`app-AAAAMMGGHHMM.tar.gz`, contiene anche il `.env`) e del database
   (`db-…sql.gz`): entrambe leggibili solo da root.
3. Ferma il servizio, toglie i sorgenti vecchi, estrae i nuovi.
4. `npm install`, `prisma generate`, `prisma migrate deploy`, ricalcolo delle tasse provvisorie,
   `npm run build`.
5. Riavvia il servizio e controlla che `/login` risponda.

La verifica lancia tutti i collaudi in produzione (uno alla volta), controlla le pagine principali,
lo stato dei backup e il registro del servizio.

## Tornare indietro

Se una versione nuova dà problemi:

1. `systemctl stop hotelweb`
2. ripristinare il database dalla copia fatta dal deploy (vedi il capitolo Backup e ripristino) se
   le migrazioni hanno cambiato dati;
3. estrarre in `/opt/hotelweb/app` l'archivio `app-…tar.gz` della versione precedente (conserva
   `.env`), poi `npm install`, `npx prisma generate`, `npm run build`, `chown -R hotelweb:hotelweb`;
4. `systemctl start hotelweb`.

## Regole

- Il deploy parte solo su richiesta esplicita di chi gestisce il progetto.
- Prima del deploy: collaudi tutti verdi in locale, codice su git.
- Mai cambiare `CHIAVE_CREDENZIALI` e `AUTH_SECRET` (la seconda butterebbe fuori tutti).
