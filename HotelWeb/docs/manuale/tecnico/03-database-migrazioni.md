---
titolo: Database e migrazioni
ordine: 3
fornitore: si
---

Lo schema è in `prisma/schema.prisma`, commentato modello per modello. Prisma 7 non accetta l'URL
nello schema: la connessione sta in `prisma.config.ts` (per la CLI) e in `src/lib/prisma.ts`
(adattatore mariadb per l'app). Le versioni di `prisma` e `@prisma/client` devono coincidere.

## Modelli principali

- **Hotel** con tipologia, moduli, funzioni spente; **Utente**, **UtenteHotel** (accesso con ruolo),
  **Ruolo** (permessi in JSON), **EventoAccesso**, **DispositivoFidato**.
- **TipoCamera**, **Camera**, **CameraIndisponibilita** (fuori servizio).
- **Prenotazione** → **SegmentoSoggiorno** (una camera per un periodo; un cambio camera crea un
  segmento nuovo collegato al precedente) → **NotteSoggiorno** (prezzo della notte) → **TassaNotte**;
  **Presenza** (persone che occupano la camera).
- Conto: **Pagamento**, **AddebitoConto** (consumi, esborsi, abbuoni), **ServizioAggiunto**,
  **Cauzione**, **ChiusuraCassa**.
- Listini e prezzi: **Listino**, **PeriodoTariffario**, **Trattamento**, politiche di cancellazione.
- Adempimenti: schedine, giorni ISTAT, **PosizioneTassa**, regolamenti della tassa, tabelle Polizia.
- Moduli: sale, ristorazione, pulizie, manutenzioni, portineria hanno i loro modelli.

## Creare una migrazione

Si genera il codice SQL dalla differenza tra database e schema, si rilegge, si aggiunge l'eventuale
parte di dati, poi si applica:

```
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > prisma/migrations/AAAAMMGGHHMMSS_nome/migration.sql
npx prisma migrate deploy
npx prisma generate
```

(togliere dall'output le righe "Loaded Prisma config…" se ci finiscono).

## Migrazioni di dati

- Nuovo permesso a ruoli esistenti: `UPDATE Ruolo SET permessi = JSON_ARRAY_APPEND(permessi, '$', 'codice') WHERE nome IN (...) AND NOT JSON_CONTAINS(permessi, '"codice"')`.
- Nuovi ruoli predefiniti: `INSERT ... SELECT ... WHERE NOT EXISTS (...)` per ogni hotel.
- Le migrazioni devono poter girare su un database con dati veri: niente cancellazioni, valori
  predefiniti sensati per le colonne nuove.

## Da sapere

- `prisma migrate dev` non si usa: le migrazioni si scrivono e si rileggono a mano.
- In produzione le migrazioni le applica `deploy/deploy.py` dopo aver fatto la copia del database.
- I campi giorno sono `@db.Date`; gli importi `Decimal(10,2)` (si convertono con `Number()`).
