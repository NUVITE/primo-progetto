# HotelWeb

Gestionale alberghiero web multi-struttura (alberghi, B&B, affittacamere, case vacanze, residence,
case per ferie, agriturismi): planning e prenotazioni, check-in e schedine di Polizia, ISTAT, tassa
di soggiorno, conto e cassa, comunicazioni, pulizie, manutenzioni, ristorazione, portineria, sale,
cruscotto e statistiche.

In produzione su https://hotelweb.nuvite.it

## Documentazione

Il manuale si legge **dentro il programma**:

- **Aiuto › Manuale**: manuale operativo per chi usa il programma (file in `docs/manuale/operativo/`);
- **Piattaforma › Manuale tecnico**: architettura, sviluppo in locale, migrazioni, collaudi,
  sicurezza, deploy, backup e ripristino, integrazioni, licenze (file in `docs/manuale/tecnico/`).

Come si scrivono i capitoli: `docs/manuale/LEGGIMI.md`.

## In breve

```
docker compose up -d
npm install
npx prisma migrate deploy && npx prisma generate && npx prisma db seed
npm run dev -- --port 3020
```

Il file `.env` (mai nel repository) è descritto nel capitolo "Sviluppo in locale" del manuale tecnico.
