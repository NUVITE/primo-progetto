<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, array('ok' => false, 'error' => 'Metodo non consentito'));
}

if (!tokenIsValid($VALID_TOKEN)) {
    respond(401, array('ok' => false, 'error' => 'Token non valido'));
}

$family = isset($_POST['family']) ? $_POST['family'] : '';
if (!in_array($family, $ALLOWED_FAMILIES, true)) {
    respond(400, array('ok' => false, 'error' => 'Famiglia non valida'));
}

$person = isset($_POST['person']) ? $_POST['person'] : '';
if (!isValidPersonSlug($person)) {
    respond(400, array('ok' => false, 'error' => 'Persona non valida'));
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    respond(400, array('ok' => false, 'error' => 'File mancante o upload fallito (controlla anche upload_max_filesize/post_max_size)'));
}

$file = $_FILES['file'];
if ($file['size'] > $MAX_SIZE_BYTES) {
    respond(413, array('ok' => false, 'error' => 'File troppo grande'));
}

$originalName = isset($file['name']) ? $file['name'] : '';
if (!isValidStorageName($originalName)) {
    respond(400, array('ok' => false, 'error' => 'Nome file non valido'));
}

$personDir = $STORAGE_DIR . '/' . $family . '/' . $person;
ensureStorageDir($STORAGE_DIR, $personDir);

$destination = $personDir . '/' . $originalName;
if (!move_uploaded_file($file['tmp_name'], $destination)) {
    respond(500, array('ok' => false, 'error' => 'Salvataggio su disco fallito'));
}

respond(200, array('ok' => true));
