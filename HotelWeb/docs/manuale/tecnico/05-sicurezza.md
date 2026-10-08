---
titolo: Sicurezza
ordine: 5
fornitore: si
---

## Sessioni

- Cookie `hotelweb_sessione` httpOnly, `SameSite=Lax`, `Secure` in produzione, 7 giorni: JWT HS256
  firmato con `AUTH_SECRET` (`src/lib/auth.ts`). Contiene l'utente, l'hotel attivo, `v` (versione
  della sessione) e `a2` (deve attivare la verifica in due passaggi).
- **Versione della sessione** (`Utente.versioneSessione`): cambio password, "esci dagli altri
  dispositivi", reimpostazione della password e azzeramento della verifica la incrementano e tutti i
  cookie vecchi smettono di valere. Cookie senza `v` = versione 0.
- `getUtenteCorrente()` restituisce `null` a chi ha un obbligo in sospeso (password temporanea o
  verifica da attivare); `richiediUtente()` lo manda a `/cambia-password` o `/attiva-verifica`.

## Accesso

- Password: almeno 10 caratteri, non tra le più comuni, senza nome o email (`problemaPassword` in
  `src/lib/accessiRegole.ts`). Le password iniziali e reimpostate sono temporanee.
- Blocco: 5 errori per la stessa email in 15 minuti (dopo l'ultimo accesso riuscito), 30 per lo
  stesso indirizzo di rete. Contano anche i codici di verifica sbagliati. L'indirizzo è quello
  scritto da nginx in `X-Real-IP` (l'app ascolta solo su 127.0.0.1).
- Dopo il login si va solo a percorsi interni (`destinazioneSicura`): niente open redirect.
- Registro `EventoAccesso`: accessi, errori, blocchi, cambi di password e di verifica; conservato
  12 mesi (pulizia a ogni accesso riuscito).

## Verifica in due passaggi

- TOTP (RFC 6238) scritto in `src/lib/totp.ts` con `node:crypto`: HMAC-SHA1, 6 cifre, passi di 30
  secondi, finestra ±1, niente riuso dello stesso passo. Il collaudo lo confronta con i valori di
  prova della RFC.
- Segreto cifrato con `CHIAVE_CREDENZIALI`; 10 codici di riserva salvati come impronte SHA-256.
- Obbligatoria per il gestore della piattaforma e per chi ha "Gestire utenti" o "Configurare
  l'hotel" in almeno una struttura (titolare unico compreso), dal login successivo all'attivazione
  dell'obbligo.
- Tra password e codice c'è un cookie provvisorio (`hotelweb_verifica`, 10 minuti). "Ricorda questo
  dispositivo" salva un valore casuale nel cookie `hotelweb_dispositivo` e la sua impronta in
  `DispositivoFidato` (30 giorni).

## Dati

- **Credenziali dei servizi esterni** (posta, Alloggiati, Ross1000) cifrate AES-256-GCM con
  `CHIAVE_CREDENZIALI` (`src/lib/cifratura.ts`): chi legge un backup del database non le legge.
  Se la chiave cambia vanno reinserite tutte.
- **Permessi lato server** in ogni pagina e azione; il menu nasconde solo per comodità.
- **Importi** e **note alimentari** (dati sanitari) non lasciano il server senza il permesso.
- **Codici di accesso** dell'arrivo autonomo visibili solo a chi gestisce le prenotazioni.
- File scaricabili con dati privati (ricevute Alloggiati, righe per la fattura, estratti conto delle
  agenzie): `Cache-Control: private, no-store`, mai `immutable`, così non restano leggibili nella
  cache del browser dopo un cambio di utente.

## Server

- L'app gira come utente `hotelweb` su `127.0.0.1:3020`, dietro nginx con HTTPS (Let's Encrypt,
  rinnovo automatico).
- Da migliorare: oggi l'accesso SSH di root è permesso con password (lo usa anche il deploy).
  Passare alle sole chiavi richiede di aggiornare `deploy/deploy.py` (variabile
  `HOTELWEB_SSH_CHIAVE`) prima di cambiare `sshd_config`.
