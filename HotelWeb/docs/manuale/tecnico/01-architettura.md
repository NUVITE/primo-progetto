---
titolo: Architettura e convenzioni
ordine: 1
fornitore: si
---

HotelWeb è un'unica applicazione web **Next.js** (App Router) che parla con un database
**MariaDB** attraverso **Prisma**. Serve più strutture ricettive (multi-hotel) dalla stessa
installazione: ogni dato appartiene a un hotel e ogni lettura e scrittura filtra per l'hotel attivo
della sessione.

## Componenti

| Parte | Tecnologia | Note |
|---|---|---|
| Interfaccia e server | Next.js 16 (App Router, server actions), React 19 | componenti server per leggere, client solo dove serve interazione |
| Stile | Tailwind CSS 4 | componenti di base in `src/components/ui.tsx` |
| Database | MariaDB 11 (sviluppo, Docker) / MariaDB 10.11 (produzione) | |
| Accesso ai dati | Prisma 7 con l'adattatore `@prisma/adapter-mariadb` | client generato in `src/generated/prisma` |
| Sessioni | JWT firmato (libreria `jose`) in un cookie httpOnly | vedi il capitolo Sicurezza |
| Password | `bcryptjs` | |
| Email | `nodemailer`, con la casella SMTP di ogni hotel | |
| Codici QR | `qrcode` | room service e verifica in due passaggi |

Nessun altro servizio esterno a pagamento: niente servizi di posta terzi, niente analytics, niente
librerie di grafici (i grafici delle statistiche sono fatti in casa).

## Struttura delle cartelle

```
src/app/            pagine e server actions (una cartella per pagina, actions.ts accanto)
src/app/api/        poche route HTTP (avvisi, ricerche, file da scaricare)
src/components/     componenti condivisi (ui.tsx, AiutoSezione, Suggerimento, Markdown…)
src/lib/            logica: un file per area (prenotazioni.ts, cassa.ts, …)
src/lib/*Regole.ts  regole pure, senza database: usabili anche dalle pagine e nei collaudi
src/generated/      client Prisma generato (non si modifica)
prisma/             schema, migrazioni, dati iniziali (seed.ts)
scripts/            collaudi (collaudo-*.ts) e script di manutenzione
deploy/             deploy.py e script dei backup notturni (deploy/backup/)
docs/manuale/       questo manuale (operativo/ e tecnico/)
```

## Come è fatta una richiesta

1. `src/proxy.ts` (il middleware di Next.js 16) controlla solo che ci sia un cookie di sessione
   firmato; altrimenti manda a `/login`. Le pagine pubbliche sono escluse dal suo `matcher`:
   `/login`, `/rs/<codice>` (room service), `/pv/<codice>` (preventivo), `/qs/<codice>` (questionario).
2. La pagina o l'azione chiama `richiediUtente()` o `richiediPermesso(...)` di `src/lib/auth.ts`:
   qui si legge l'utente dal database, si controlla la versione della sessione, gli obblighi
   (password temporanea, attivazione della verifica in due passaggi) e i permessi nell'hotel attivo.
3. La logica sta in `src/lib/<area>.ts` e riceve sempre `hotelId`: ogni `where` lo contiene.
4. Le server actions restituiscono `conEsito(...)` (`{ ok, valore }` o `{ ok: false, errore }`, vedi
   `src/lib/esito.ts`); il client le chiama con `sbusta(...)`, che trasforma l'errore in eccezione con
   il messaggio da mostrare.

## Convenzioni del codice

- **Italiano** per nomi, commenti e messaggi. I messaggi d'errore sono frasi complete per l'utente.
- **Regole pure in `*Regole.ts`**: calcoli e validazioni senza database. Le pagine client le
  importano direttamente; i moduli server si importano dal client solo con `import type`.
- **Importi**: chi non ha il permesso "Vedere importi" non riceve gli importi dal server (arrivano
  `null` o 0), non basta nasconderli a video.
- **Moduli** (`src/lib/moduli.ts`): parti opzionali accese per hotel dal fornitore (sale,
  ristorazione, pulizie, manutenzioni, portineria). Un modulo spento toglie menu e permessi collegati.
- **Funzioni** (`src/lib/funzioniRegole.ts`): parti del nucleo che la struttura può spegnere (gruppi,
  agenzie, uso diurno, preventivi).
- **Tipologia** (`src/lib/tipologie.ts`): albergo, B&B, casa vacanze… cambia i nomi delle unità
  (camere/appartamenti, con le concordanze) e il profilo di partenza (`src/lib/profiliRegole.ts`).
- **Permessi e ruoli** (`src/lib/permessi.ts`): codici, descrizioni per la pagina Ruoli, implicazioni
  (chi gestisce vede), ruoli predefiniti. Un nuovo permesso va aggiunto ai ruoli esistenti con una
  migrazione di dati.
- **Date**: i giorni sono `@db.Date` (mezzanotte UTC) e si confrontano come stringhe `AAAA-MM-GG`;
  il "giorno di oggi" è quello italiano (`oggiItaliano()` in `src/lib/cassaAperta.ts`).
- **Niente dialog nativi** (`confirm`, `alert`): le conferme sono in pagina.
- **Aiuti**: un `Suggerimento` per pagina (il flusso), `AiutoSezione` per sezione (frase breve e
  "Cosa significa?"), `aiuto` sotto i campi.

## Il manuale

Le pagine `/manuale` e `/manuale/tecnico` leggono i file di `docs/manuale/` (vedi
`docs/manuale/LEGGIMI.md` per formato e stile). Il Markdown è interpretato da `src/lib/manualeRegole.ts`
senza librerie esterne. Quando cambia una funzione si aggiorna il capitolo nella stessa modifica.
