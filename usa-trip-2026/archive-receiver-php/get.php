<?php
require __DIR__ . '/config.php';

// Chiamato solo dal server dell'app (mai dal browser di chi viaggia: il
// token non e' mai esposto al telefono), per mostrare nella galleria un file
// che vive solo qui sul dominio e non sul VPS.

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(405, array('ok' => false, 'error' => 'Metodo non consentito'));
}

if (!tokenIsValid($VALID_TOKEN)) {
    respond(401, array('ok' => false, 'error' => 'Token non valido'));
}

$family = isset($_GET['family']) ? $_GET['family'] : '';
if (!in_array($family, $ALLOWED_FAMILIES, true)) {
    respond(400, array('ok' => false, 'error' => 'Famiglia non valida'));
}

$person = isset($_GET['person']) ? $_GET['person'] : '';
if (!isValidPersonSlug($person)) {
    respond(400, array('ok' => false, 'error' => 'Persona non valida'));
}

$fileName = isset($_GET['file']) ? $_GET['file'] : '';
if (!isValidStorageName($fileName)) {
    respond(400, array('ok' => false, 'error' => 'Nome file non valido'));
}

$path = $STORAGE_DIR . '/' . $family . '/' . $person . '/' . $fileName;
if (!is_file($path)) {
    respond(404, array('ok' => false, 'error' => 'File non trovato'));
}

// Whitelist stretta sul mime passato dall'app: evita che finisca tal quale
// in un header di risposta.
$mime = isset($_GET['mime']) ? $_GET['mime'] : 'application/octet-stream';
if (!preg_match('#^(image|video)/[a-zA-Z0-9.+-]+$#', $mime)) {
    $mime = 'application/octet-stream';
}

$size = filesize($path);
$start = 0;
$end = $size - 1;
$statusCode = 200;

// Necessario per i video: il player fa richieste "Range" per fare seek e per
// caricare solo un pezzo alla volta invece di tutto il file.
$rangeHeader = isset($_SERVER['HTTP_RANGE']) ? $_SERVER['HTTP_RANGE'] : '';
if ($rangeHeader !== '' && preg_match('/bytes=(\d*)-(\d*)/', $rangeHeader, $matches)) {
    if ($matches[1] !== '') {
        $start = (int) $matches[1];
    }
    if ($matches[2] !== '') {
        $end = (int) $matches[2];
    }
    if ($start > $end || $end >= $size) {
        header('Content-Range: bytes */' . $size);
        respond(416, array('ok' => false, 'error' => 'Range non valido'));
    }
    $statusCode = 206;
}

$length = $end - $start + 1;

http_response_code($statusCode);
header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) $length);
header('Accept-Ranges: bytes');
if ($statusCode === 206) {
    header("Content-Range: bytes $start-$end/$size");
}

$handle = fopen($path, 'rb');
if ($handle === false) {
    respond(500, array('ok' => false, 'error' => 'Apertura file fallita'));
}
fseek($handle, $start);
$remaining = $length;
while ($remaining > 0 && !feof($handle)) {
    $chunk = fread($handle, min(8192, $remaining));
    if ($chunk === false) {
        break;
    }
    echo $chunk;
    $remaining -= strlen($chunk);
    flush();
}
fclose($handle);
exit;
