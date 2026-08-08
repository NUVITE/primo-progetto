<?php
require __DIR__ . '/config.php';

// Chiamato solo dal server dell'app, quando una famiglia rimuove una foto o
// un video dalla webapp: cancella anche il file qui sul dominio, cosi' non
// resta un file orfano che nessuno vede piu' ma occupa spazio per sempre.

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

$fileName = isset($_POST['file']) ? $_POST['file'] : '';
if (!isValidStorageName($fileName)) {
    respond(400, array('ok' => false, 'error' => 'Nome file non valido'));
}

$path = $STORAGE_DIR . '/' . $family . '/' . $person . '/' . $fileName;

// Se il file non c'e' piu' va bene comunque: l'obiettivo (che non ci sia)
// e' gia' raggiunto, non e' un errore da segnalare all'app.
if (is_file($path) && !unlink($path)) {
    respond(500, array('ok' => false, 'error' => 'Cancellazione fallita'));
}

respond(200, array('ok' => true));
