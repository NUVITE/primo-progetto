# Archivio foto/video (PHP)

Piccola API HTTP da caricare sul tuo hosting del dominio: riceve le foto/video caricati dall'app
e li restituisce per mostrarli in galleria. **Le foto non toccano mai il disco del VPS**, ne' in
scrittura ne' in lettura: l'unico posto dove i file vivono davvero e' qui, sul tuo dominio (spazio
web illimitato).

I file finiscono organizzati per **famiglia e poi per persona**, es.
`usa-trip-archivio-privato/SERINO/daniele/<file>`: la sottocartella prende il nome scelto in "Chi
sei?" nell'app, reso sicuro per il filesystem (minuscolo, senza accenti/spazi/simboli). Le
sottocartelle si creano da sole al primo caricamento di ciascuna persona, non c'e' niente da
preparare a mano.

## File

- `config.php` — configurazione condivisa (token, famiglie ammesse, cartella di archivio). L'unico
  file da modificare.
- `upload.php` — riceve un file e lo salva.
- `get.php` — restituisce un file gia' archiviato, usato dall'app per mostrarlo in galleria
  (supporta anche le richieste "Range", necessarie per il seek dei video).
- `.htaccess` — inoltra l'header `Authorization` a PHP (Apache spesso lo blocca di default).
- `.user.ini` — alza i limiti di dimensione upload di PHP (funziona solo su hosting PHP-FPM).

## Come caricarlo

Non conta come si chiama la cartella pubblica del tuo sito nel pannello di controllo — su Aruba a
volte è `public_html`, a volte è direttamente il nome del dominio (es. `www.tuodominio.it`), con
tutte le sottocartelle dentro. Le istruzioni qui sotto vanno bene comunque.

1. Con il file manager del pannello di hosting (non serve FTP dedicato), crea una sottocartella
   dentro la cartella pubblica del sito — ad esempio `api-foto/` dentro `www.tuodominio.it/` — e
   caricaci **tutti e cinque i file** di questa cartella in un colpo solo.
2. La cartella d'archivio vera e propria (dove finiscono le foto) si crea da sola accanto agli
   script, dentro `api-foto/usa-trip-archivio-privato/`. Resta tecnicamente dentro lo spazio
   pubblico del sito, ma **non è raggiungibile da browser**: `upload.php` ci crea dentro un
   `.htaccess` con `Deny from all` al primo caricamento, che blocca l'accesso diretto ai file anche
   se qualcuno ne indovina l'indirizzo.
3. **Verifica dopo il primo caricamento di prova**: apri nel browser
   `https://tuodominio.it/api-foto/usa-trip-archivio-privato/SERINO/daniele/` (adatta il percorso a
   dove hai messo la cartella). Deve dare un errore (403/404), mai mostrare un elenco di file o una
   foto. Se invece si vede qualcosa, il tuo hosting non applica i file `.htaccess` (raro): fermati e
   dimmelo prima di caricare foto vere.
4. Il token e' gia' scritto in `config.php` ed e' lo stesso gia' messo in `ARCHIVE_API_TOKEN` nel
   `.env` dell'app — funzionano cosi' come sono, per test. Per la messa in produzione vera, genera
   un token nuovo (una stringa lunga a caso) e aggiornalo in **entrambi i posti**: qui in
   `config.php` (`$VALID_TOKEN`) e in `ARCHIVE_API_TOKEN` sul server dove gira l'app.
5. In `ARCHIVE_API_BASE_URL` (nel `.env` dell'app) metti l'URL della **cartella** dove hai caricato
   questi file, es. `https://tuodominio.it/api-foto` (senza `/upload.php` in fondo: lo aggiunge
   l'app da sola, insieme a `/get.php`).

## Limiti di dimensione

I video dei telefoni possono superare i limiti di default di PHP (spesso 8-32 MB). Il file
`.user.ini` prova ad alzarli a 200 MB, ma funziona solo se il tuo hosting usa PHP-FPM (la
situazione più comune su Aruba). Se dopo il deploy i video falliscono e le foto no, controlla dal
pannello di controllo i valori di `upload_max_filesize` e `post_max_size` e alzali da lì.

## Se il push fallisce

A differenza della prima versione, ora non c'e' una copia di riserva sul VPS: se l'invio a questa
API fallisce, l'app mostra un errore e il file non compare nella galleria, ma **resta sul
telefono** (non viene mai cancellato dalla fotocamera), quindi si puo' sempre riprovare piu' tardi.
