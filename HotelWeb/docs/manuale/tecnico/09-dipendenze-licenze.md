---
titolo: Dipendenze, costi e licenze
ordine: 9
fornitore: si
---

Regola del progetto: prima di adottare uno strumento o una libreria si verificano sulla fonte
ufficiale costi diretti, nascosti o futuri e la licenza, preferendo licenze permissive (MIT,
Apache 2.0, BSD).

## Dipendenze dirette (verificate l'8 ottobre 2026 dai metadati dei pacchetti installati)

| Pacchetto | Versione | Licenza |
|---|---|---|
| next | 16.3.6 | MIT |
| react, react-dom | 19.2.8 | MIT |
| @prisma/client, prisma, @prisma/adapter-mariadb | 7.10.0 | Apache-2.0 |
| bcryptjs | 3.0.3 | BSD-3-Clause |
| jose | 6.2.12 | MIT |
| lucide-react | 1.48.0 | ISC |
| nodemailer | 10.0.15 | MIT-0 |
| qrcode | 1.5.4 | MIT |
| server-only | 0.0.1 | MIT |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | MIT |
| typescript | 5.9.3 | Apache-2.0 |
| eslint, eslint-config-next, tsx, @types/* | — | MIT |
| dotenv | 18.0.4 | BSD-2-Clause |

## Dipendenze indirette con licenze non permissive

| Pacchetto | Licenza | Perché c'è | Cosa comporta |
|---|---|---|---|
| mariadb (driver) | LGPL-2.1 | richiesto dall'adattatore Prisma | obblighi solo se si distribuisce il programma; per un servizio web nessuno |
| sharp (binari) | Apache-2.0 + LGPL-3.0 (libvips) | ottimizzazione immagini di Next.js | come sopra |
| lightningcss, axe-core | MPL-2.0 | strumenti di build/lint | nessuno per l'uso; modifiche a quei file andrebbero pubblicate |
| elkjs | EPL-2.0 | strumenti di sviluppo | come MPL |
| seq-queue | MIT (dal file LICENSE: il package.json non la dichiara) | dipendenza del driver mariadb | nessuno |

Nessun pacchetto GPL o AGPL. Se un giorno il programma venisse **installato presso i clienti**
(non più solo servizio web), per le componenti LGPL/MPL andrebbero forniti gli avvisi di licenza e
la possibilità di sostituirle.

## Strumenti fuori dal programma

- **paramiko** (Python, LGPL-2.1): usato solo sul PC di chi fa il deploy.
- **Docker Desktop** (verificato su docs.docker.com, ottobre 2026): gratuito per uso personale,
  istruzione, progetti open source non commerciali e piccole imprese con meno di 250 dipendenti
  **e** meno di 10 milioni di dollari di fatturato annuo. Le soglie riguardano l'organizzazione che
  lo usa; oltre, servono gli abbonamenti Pro, Team o Business. Serve solo per il database di
  sviluppo: si può sostituire con MariaDB installato direttamente.
- **App di autenticazione** per la verifica in due passaggi: gratuite (Google Authenticator,
  Microsoft Authenticator, Aegis, FreeOTP).
- **Let's Encrypt**: certificati gratuiti.
