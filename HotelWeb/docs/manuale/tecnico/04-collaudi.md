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
