---
titolo: Collaudi
ordine: 4
fornitore: si
---

I collaudi sono script in `scripts/collaudo-*.ts`, uno per area. Ognuno controlla le regole pure e
poi lavora sul database vero: crea dati di prova, verifica, e **cancella tutto alla fine** (anche in
caso di errore, con `try/finally`). Stampano una riga `OK` o `FAIL` per verifica e escono con codice
diverso da zero se qualcosa fallisce.

```
npx tsx scripts/collaudo-nucleo.ts      (un collaudo)
```

Tutta la batteria, **uno alla volta**:

```
for f in scripts/collaudo-*.ts; do printf '%s: ' $f; npx tsx $f 2>&1 | tail -1; done
```

## Regole

- **Mai due batterie in parallelo**: lavorano sullo stesso database e si intralciano (dati di prova
  incrociati, ripristini sbagliati). Una batteria lanciata "in sottofondo" con `&` da una shell che
  poi si chiude può continuare a girare senza che lo si veda.
- I collaudi usano il **primo hotel** (id più basso) e date lontane (2032–2035) per non toccare i
  dati di lavoro; quelli che servono "oggi" (cruscotto, messaggi) cercano camere libere e, se non
  ce ne sono, lo dicono e si fermano senza fallire.
- I moduli server marcati `server-only` (es. `src/lib/auth.ts`) non si possono importare dai
  collaudi: si importa solo il tipo, e le funzioni che servono stanno in librerie senza quel marchio.
- Si lanciano anche in produzione dopo ogni deploy (`python deploy/deploy.py --verifica`): devono
  lasciare il database identico.
- Una funzione nuova arriva con il suo collaudo.

## Verifica nel browser

Oltre ai collaudi, le pagine nuove si provano nel browser con il server di sviluppo. Per la verifica
in due passaggi in locale serve un'app di autenticazione (o uno script temporaneo che calcola il
codice dal segreto, da non lasciare nel progetto).

## Video dimostrativi

I video del manuale operativo (blocchi `@video`) si generano con Playwright, che guida un Chromium
sul server di sviluppo, e FFmpeg, che li converte in WebM VP9 senza audio. Sono file
`public/video/<nome>.webm`, uno per script `scripts/video/<nome>.ts`.

- `scripts/video/regista.ts`: cursore finto (il video di Playwright non registra il mouse),
  fumetti con evidenziazione dell'elemento, cartelli iniziale e finale, pause di lettura;
  `riscalda` apre le pagine prima di registrare, così nel video non si vede la compilazione.
- `scripts/video/scena.ts`: sessione dell'utente dimostrativo firmata con l'`AUTH_SECRET` locale
  (nessuna password) e pulizia di prenotazioni e ospiti creati; alla fine confronta il numero di
  righe di ogni tabella con quello di prima e segnala le differenze.

Con il server di sviluppo acceso sulla porta 3020 e il database locale con i dati dimostrativi:

```
FFMPEG=<percorso di ffmpeg.exe> npx tsx scripts/video/prenotazione.ts
```

Le registrazioni grezze restano in `scripts/video/.grezzi/` (ignorata da git) e si cancellano a
fine conversione. Quando cambia una pagina mostrata in un video, si rigenera il video. Come i
collaudi, un video alla volta.
