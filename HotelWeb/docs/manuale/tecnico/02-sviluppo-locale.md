---
titolo: Sviluppo in locale
ordine: 2
fornitore: si
---

## Requisiti

- Node.js 22 (in produzione gira la 22.14) e npm.
- Docker Desktop, per il database di sviluppo.
- Git. Per il deploy anche Python 3 con `paramiko`.

## Database di sviluppo

`docker-compose.yml` avvia MariaDB 11 sulla porta **3309** del PC (dentro il container è la 3306),
con un volume persistente. Le password scritte lì valgono **solo per il database locale**.

```
docker compose up -d
```

Se Docker Desktop era spento, il container riparte da solo quando Docker si riavvia
(`restart: unless-stopped`).

## Variabili d'ambiente (`.env`, mai nel repository)

| Variabile | A cosa serve |
|---|---|
| `DATABASE_URL` | stringa di connessione per Prisma CLI (migrazioni) |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` | connessione dell'app tramite l'adattatore mariadb |
| `AUTH_SECRET` | chiave di firma dei cookie di sessione |
| `CHIAVE_CREDENZIALI` | 32 byte in base64: cifra le password di posta, Alloggiati e Ross1000 e i segreti della verifica in due passaggi. **Non va mai cambiata** in produzione |
| `EMAIL_SIMULA` | `1` in sviluppo: le email non partono, si registrano come "simulata" |
| `NODE_ENV` | `production` sul server |
| `BACKUP_DIR`, `BACKUP_REGISTRO_PC` | facoltative: percorsi dello stato dei backup (in produzione ci sono valori predefiniti) |

## Primo avvio

```
npm install
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npm run dev -- --port 3020
```

Il seed crea gli hotel e gli utenti di prova (vedi `prisma/seed.ts`). L'amministratore di prova
è un gestore della piattaforma: al primo accesso il programma chiede di attivare la verifica in due
passaggi con un'app sul telefono.

## Cose da sapere

- **Un solo server di sviluppo per cartella**: Next.js rifiuta una seconda istanza.
- Dopo una migrazione o `prisma generate` il server di sviluppo va **riavviato** (il client Prisma
  vecchio resta in memoria).
- Non lanciare `prisma generate` o migrazioni mentre girano i collaudi.
- Con Git Bash su Windows i percorsi Linux passati a `docker exec` vengono trasformati: usare
  `MSYS_NO_PATHCONV=1`.
- Il lint si lancia sui file toccati: `npx eslint <file>`. Alcuni file vecchi hanno errori
  `react-hooks/set-state-in-effect` noti (SituazioneCamere.tsx, OspiteSearch.tsx, GestioneCamere.tsx).
- Controllo dei tipi: `npx tsc --noEmit -p .`
