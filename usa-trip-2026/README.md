# USA Costa a Costa 2026 — Guida di viaggio (webapp)

PWA privata per le 4 famiglie del viaggio negli USA (9-23 agosto 2026): itinerario giorno per
giorno, documenti personali, frasi utili per la dogana, farmaci, contatti di emergenza ed
escursioni facoltative.

Il **manuale operativo** (come usare l'app) è dentro l'app stessa, alla voce **❓ Guida** in alto
a destra dopo il login (`/guida`).

## Stack

- **Next.js 16** (App Router, TypeScript), un'unica app full-stack
- **Prisma 7 + SQLite** (via `@prisma/adapter-better-sqlite3`)
- **iron-session** per l'autenticazione (nome famiglia + password condivisa)
- **Tailwind CSS**, mobile-first
- PWA con manifest + service worker (`public/sw.js`)

## Struttura

- `app/(app)/` — pagine protette (richiede login **e** aver scelto "chi sei"): home, itinerario,
  documenti, foto, dogana, emergenze, escursioni, guida, profilo. Il layout in
  `app/(app)/layout.tsx` mostra header/nav e verifica la sessione (famiglia + persona).
- `app/login/` — pagina di login pubblica (famiglia + password condivisa).
- `app/chi-sei/` — dopo il login, se sul telefono non è ancora stata scelta una persona della
  famiglia, si passa da qui (si sceglie un nome esistente o se ne aggiunge uno). Serve per
  attribuire le foto a chi le carica senza fare un account per persona.
- `app/actions/` — Server Actions: `auth.ts` (login/logout/cambio password), `activity.ts`
  (modifica rapida degli orari durante il viaggio), `person.ts` ("chi sei"), `photo.ts` (upload
  foto/video).
- `proxy.ts` — protezione delle route (equivalente del vecchio `middleware.ts`, rinominato in
  Next.js 16): redirige a `/login` se non autenticati.
- `lib/db.ts`, `lib/session.ts`, `lib/dal.ts` — client Prisma, sessione, verifica sessione
  (famiglia e persona).
- `lib/archive.ts`, `lib/slug.ts` — upload/lettura foto verso l'archivio esterno (vedi sotto) e
  conversione di un nome libero in un nome di cartella sicuro.
- `prisma/schema.prisma` — modello dati.
- `prisma/seed.ts` — **tutti i contenuti del viaggio** (i 15 giorni, attività, farmaci, frasi
  dogana, escursioni, info di emergenza, documenti, persone per "chi sei"). Per correggere o
  aggiungere contenuti si modifica questo file e si rilancia il seed (vedi sotto) — **non**
  sovrascrive gli orari aggiornati a mano dagli utenti durante il viaggio, perché quelli vivono
  nel DB e il seed li sovrascriverebbe: da qui alla partenza va bene rilanciarlo liberamente,
  **durante il viaggio evitare di rilanciare il seed** se qualcuno ha già corretto degli orari.
- `private-uploads/` — PDF reali (voucher, biglietti, assicurazione), esclusi da Git. Struttura:
  `TUTTI/` per i comuni, `<COGNOME>/` per quelli personali di ogni famiglia.
- `public/avatars/` — un'immagine per persona (`<nome-slug>.webp`), mostrata in "Chi sei?" e
  nell'header. Asset statico nel repo: set piccolo e fisso, non serve archiviarlo altrove.

## Foto e video del viaggio (`/foto`)

Le foto/video caricati dall'app **non vengono mai salvati sul VPS**: il file passa in memoria sul
server Next.js e va dritto verso una piccola API PHP sul dominio dell'utente (spazio web
illimitato, a differenza del VPS). Se l'invio fallisce, l'app mostra un errore e non crea nulla
nel database: il file resta sul telefono (mai cancellato dalla fotocamera) e si può ricaricare.
Anche la lettura per la galleria recupera i byte al volo dall'archivio (route `/foto/[id]/file`),
mai da disco locale.

Il ricevitore PHP vive in [`archive-receiver-php/`](archive-receiver-php/) (fuori da questo
progetto Next.js: va caricato separatamente sul dominio) — vedi il suo README per come
distribuirlo e la sua storia (perché non FTP, perché non `public_html`, compatibilità PHP 5.5).

## Sviluppo locale

```bash
npm install
cp .env.example .env   # se non esiste già .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Login di prova: nome famiglia (SERINO, GIANNELLA, DICUONZO, CAFAGNA) + la password in
`FAMILY_SHARED_PASSWORD` (nel `.env`).

## Aggiungere i documenti delle altre famiglie

Quando arrivano i PDF di Giannella, Dicuonzo e Cafagna (stesso schema di SERINO: voli, voucher,
assicurazione):

1. Copiarli in `private-uploads/<COGNOME>/`.
2. Aggiungere le voci corrispondenti in `FAMILY_DOCUMENTS` dentro `prisma/seed.ts`.
3. Rilanciare `npx prisma db seed` (o l'equivalente in produzione, vedi sotto).

## Variabili d'ambiente

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Percorso del file SQLite, es. `file:./dev.db` |
| `SESSION_SECRET` | Chiave per firmare i cookie di sessione (stringa lunga e casuale) |
| `FAMILY_SHARED_PASSWORD` | Password condivisa da tutte le famiglie per il login (usata solo dal seed, poi ogni famiglia la cambia da `/profilo`) |
| `PRIVATE_UPLOADS_DIR` | Cartella dei PDF privati; se assente usa `./private-uploads` |
| `ARCHIVE_API_BASE_URL` | Cartella dove vive il ricevitore PHP dell'archivio foto, es. `https://tuodominio.it/api-foto` (senza `/upload.php` in fondo) |
| `ARCHIVE_API_TOKEN` | Token condiviso con `archive-receiver-php/config.php` per autenticare upload e lettura |

## Deploy (nativo su VPS, non Docker)

L'app gira **senza Docker** su un VPS condiviso con altri servizi: Docker riscrive le regole
iptables e avrebbe potuto romperli. Setup nativo con Node isolato + systemd + nginx come reverse
proxy.

Struttura sul server:

```
/opt/usa-trip/app/              # codice (questo repo, senza node_modules/.next/.env)
/opt/usa-trip/data/app.db       # database SQLite (persiste tra i deploy)
/opt/usa-trip/private-uploads/  # PDF privati (persiste tra i deploy)
/opt/nodejs/                    # Node 22 isolato, non da apt
```

Servizio systemd (`/etc/systemd/system/usa-trip.service`) che lancia
`node .../next/dist/bin/next start --port 3010 --hostname 127.0.0.1`, con `EnvironmentFile` che
punta al `.env` di produzione. nginx fa da reverse proxy con certificato Let's Encrypt.

Procedura di aggiornamento (codice, senza modifiche allo schema):

```bash
# in locale: pacchetto senza node_modules/.next/.env/dev.db/private-uploads/app/generated/prisma
tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.env \
    --exclude=dev.db --exclude=private-uploads --exclude=app/generated/prisma \
    -czf deploy.tar.gz .

# sul server
systemctl stop usa-trip
tar -xzf deploy.tar.gz -C /opt/usa-trip/app
chown -R usatrip:usatrip /opt/usa-trip/app
cd /opt/usa-trip/app
export PATH=/opt/nodejs/bin:$PATH
npm install && npx prisma generate && npm run build
systemctl start usa-trip
```

Se lo schema è cambiato, prima di `npm run build` lanciare anche
`DATABASE_URL=file:/opt/usa-trip/data/app.db npx prisma migrate deploy` (**mai** `prisma db push`
o reset in produzione). Il `.env` di produzione si modifica a mano sul server, non fa mai parte
del pacchetto di deploy.

Vedi anche [`archive-receiver-php/README.md`](archive-receiver-php/README.md) per il deploy,
separato, del ricevitore PHP sul dominio (non sul VPS).
