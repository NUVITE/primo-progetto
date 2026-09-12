<?php
// Compatibile con PHP 5.5 (il tuo hosting non ha una versione piu' recente):
// niente declare(strict_types), niente tipi sui parametri delle funzioni,
// niente operatore "??", niente hash_equals() (arrivata solo in PHP 5.6).

// ==== CONFIGURAZIONE — modifica solo qui, vale sia per upload.php che get.php ====
// Deve essere IDENTICO a ARCHIVE_API_TOKEN nel .env dell'app Next.js.
$VALID_TOKEN = 'ycEua8hECFdMB4-B9i6zo9fBJOOSIRWqRrfBSSZTmOw';

$ALLOWED_FAMILIES = array('SERINO', 'GIANNELLA', 'DICUONZO', 'CAFAGNA');
$MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

// Cartella di archivio: una sotto-cartella accanto a questi script (stessa
// cartella dove hai caricato upload.php e get.php). Su alcuni hosting (es.
// Aruba) la cartella pubblica del sito non si chiama "public_html" ma come
// il dominio stesso: qui non serve saperlo, perche' la protezione vera non
// e' "stare fuori" da quella cartella, ma il file .htaccess che viene creato
// subito dentro a questa (vedi ensureStorageDir piu' sotto): blocca
// l'accesso diretto via browser anche se la cartella resta visibile via
// FTP/file manager. Verifica comunque con il test del punto 3 nel README
// dopo il primo caricamento.
$STORAGE_DIR = __DIR__ . '/usa-trip-archivio-privato';
// ===================================================================

function respond($status, $body) {
    header('Content-Type: application/json');
    http_response_code($status);
    echo json_encode($body);
    exit;
}

// Confronto a tempo costante (come hash_equals, non disponibile prima di PHP
// 5.6): evita che un attaccante possa indovinare il token misurando quanto
// impiega il confronto carattere per carattere.
function safeCompare($a, $b) {
    if (function_exists('hash_equals')) {
        return hash_equals($a, $b);
    }
    if (strlen($a) !== strlen($b)) {
        return false;
    }
    $diff = 0;
    for ($i = 0; $i < strlen($a); $i++) {
        $diff |= ord($a[$i]) ^ ord($b[$i]);
    }
    return $diff === 0;
}

// Apache spesso non passa l'header Authorization a PHP di default: lo
// recuperiamo da tutte le fonti possibili, piu' un header di ripiego
// semplice (X-Archive-Token) che l'app manda sempre in aggiunta.
function tokenIsValid($validToken) {
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    if ($authHeader === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
        } elseif (isset($headers['authorization'])) {
            $authHeader = $headers['authorization'];
        }
    }

    $fallbackToken = isset($_SERVER['HTTP_X_ARCHIVE_TOKEN']) ? $_SERVER['HTTP_X_ARCHIVE_TOKEN'] : '';

    return safeCompare('Bearer ' . $validToken, $authHeader) || safeCompare($validToken, $fallbackToken);
}

function ensureStorageDir($storageDir, $familyDir) {
    if (!is_dir($familyDir) && !mkdir($familyDir, 0750, true) && !is_dir($familyDir)) {
        respond(500, array('ok' => false, 'error' => 'Impossibile creare la cartella di archivio'));
    }
    // .htaccess di difesa, ricreato se manca: e' la protezione vera, visto
    // che questa cartella resta comunque dentro lo spazio web pubblico.
    $htaccess = $storageDir . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n");
    }
}

// Il nome file arriva sempre generato dall'app (UUID + estensione): si
// accetta solo questo formato, per evitare path traversal o accessi ad altri
// file tramite un nome fabbricato ad arte.
function isValidStorageName($name) {
    return (bool) preg_match('/^[a-f0-9-]{36}\.[a-zA-Z0-9]{1,10}$/', $name);
}

// Il nome scelto in "Chi sei?" e' testo libero, ma l'app lo trasforma sempre
// in questo formato (solo lettere minuscole, numeri e trattini) prima di
// mandarlo qui: qualunque altra cosa viene rifiutata.
function isValidPersonSlug($slug) {
    return (bool) preg_match('/^[a-z0-9-]{1,40}$/', $slug);
}
