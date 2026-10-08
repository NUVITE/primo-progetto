---
titolo: Backup e ripristino
ordine: 7
fornitore: si
---

## Backup notturni

Installati con `deploy/backup/installa.sh` (da root, si può rilanciare):

- `hotelweb-backup.timer` alle 3:00 (con un ritardo casuale fino a 5 minuti; se il server era spento
  parte appena si riaccende) lancia `/usr/local/sbin/hotelweb-backup-notturno`.
- Lo script legge le credenziali dal `.env` dell'app, fa `mariadb-dump --single-transaction`,
  comprime e **verifica**: archivio integro, dump arrivato in fondo ("Dump completed"), numero di
  tabelle uguale a quello del database. Una copia che non passa i controlli non viene tenuta.
- Conservazione in `/opt/hotelweb/backups/notturni/`: 14 giornaliere, 8 settimanali (domenica),
  12 mensili (giorno 1).
- Esito in `stato.json`, letto dall'app: riquadro "Backup" in **Piattaforma › Hotel** e avviso in
  cima alle pagine per il gestore se l'ultimo backup è fallito o ha più di 26 ore, o se la copia sul
  PC è ferma da più di 3 giorni.

## Copia sul PC

- Sul server l'utente `backupcopia` non ha password; la sua chiave SSH ha un **comando forzato**
  (`/usr/local/bin/hotelweb-consegna-copia`) con `restrict`: chi si collega riceve solo l'ultima
  copia giornaliera, niente terminale né tunnel.
- Sul PC: `deploy/backup/pc/installa-attivita.ps1` crea la chiave (in `%USERPROFILE%\.ssh\hotelweb_backup`)
  e l'operazione pianificata "HotelWeb - copia backup" (ogni giorno alle 9 o appena il PC si accende).
  `copia-sul-pc.ps1` scarica, verifica (decomprime tutto e controlla la fine del dump) e tiene le
  ultime 30 copie in `Documenti\HotelWeb-backup`, con `registro.txt`.
- La chiave pubblica del PC si installa sul server con `installa.sh "<chiave pubblica>"`.

## Cosa NON c'è nelle copie

- Il file `.env`: `CHIAVE_CREDENZIALI` e `AUTH_SECRET` vanno conservate **a parte** (gestore di
  password). Senza `CHIAVE_CREDENZIALI`, dopo un ripristino su un server nuovo le password di posta,
  Alloggiati e Ross1000 e le verifiche in due passaggi vanno reimpostate.
- Le copie contengono dati personali degli ospiti: il disco del PC va cifrato (BitLocker).

## Prova di ripristino

`deploy/backup/ripristino-prova.sh` (da root) carica l'ultima copia in un database separato
`hotelweb_prova_ripristino`, confronta le righe tabella per tabella con il database vero e poi lo
cancella. Il database vero non si tocca. Va rifatta ogni tanto (e dopo modifiche agli script).

## Ripristino vero

1. `systemctl stop hotelweb`
2. Copia di sicurezza di quello che c'è adesso (anche se rovinato):
   `mariadb-dump hotelweb | gzip > /root/prima-del-ripristino.sql.gz`
3. Database vuoto e caricamento della copia scelta (dal server o dal PC):
   `mariadb -e "DROP DATABASE hotelweb; CREATE DATABASE hotelweb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"`
   poi `zcat <copia>.sql.gz | mariadb hotelweb`
4. Se la copia è di una versione precedente dell'app: `npx prisma migrate deploy` dalla cartella
   dell'app.
5. `systemctl start hotelweb`, poi la verifica (`python deploy/deploy.py --verifica`).

Il nome del database e l'utente sono quelli del `.env` dell'app (qui per semplicità `hotelweb`).
