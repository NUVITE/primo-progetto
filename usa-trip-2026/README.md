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

- `app/(app)/` — pagine protette (richiede login): home, itinerario, documenti, dogana,
  emergenze, escursioni, guida. Il layout in `app/(app)/layout.tsx` mostra header/nav e verifica
  la sessione.
- `app/login/` — pagina di login pubblica.
- `app/actions/` — Server Actions (`auth.ts` per login/logout, `activity.ts` per la modifica
  rapida degli orari durante il viaggio).
- `proxy.ts` — protezione delle route (equivalente del vecchio `middleware.ts`, rinominato in
  Next.js 16): redirige a `/login` se non autenticati.
- `lib/db.ts`, `lib/session.ts`, `lib/dal.ts` — client Prisma, sessione, verifica sessione.
- `prisma/schema.prisma` — modello dati.
- `prisma/seed.ts` — **tutti i contenuti del viaggio** (i 15 giorni, attività, farmaci, frasi
  dogana, escursioni, info di emergenza, documenti). Per correggere o aggiungere contenuti si
  modifica questo file e si rilancia il seed (vedi sotto) — **non** sovrascrive gli orari
  aggiornati a mano dagli utenti durante il viaggio, perché quelli vivono nel DB e il seed li
  sovrascriverebbe: da qui alla partenza va bene rilanciarlo liberamente, **durante il viaggio
  evitare di rilanciare il seed** se qualcuno ha già corretto degli orari.
- `private-uploads/` — PDF reali (voucher, biglietti, assicurazione), esclusi da Git. Struttura:
  `TUTTI/` per i comuni, `<COGNOME>/` per quelli personali di ogni famiglia.

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
| `FAMILY_SHARED_PASSWORD` | Password condivisa da tutte le famiglie per il login |

## Deploy (Docker)

L'app è pensata per girare in un container Docker su un VPS, dietro reverse proxy HTTPS
(nginx/Caddy/Traefik già in uso sul server).

```bash
docker compose build
SESSION_SECRET=... FAMILY_SHARED_PASSWORD=... docker compose up -d
docker compose exec usa-trip-2026 npx prisma db seed   # solo al primo avvio
```

Il database SQLite (`usa2026_data`) e i documenti personali (`usa2026_uploads`) vivono in volumi
Docker persistenti, così sopravvivono ai redeploy. **La cartella `private-uploads/` non è nel
repo**: al primo deploy va copiata sul server dentro il volume, ad es.:

```bash
docker compose cp private-uploads/. usa-trip-2026:/app/private-uploads
```

Il reverse proxy del server va configurato per inoltrare il sottodominio scelto (es.
`usa2026.nuvite.it`) alla porta pubblicata dal container (`3010` di default in
`docker-compose.yml`), con certificato TLS.
