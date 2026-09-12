// Condiviso tra client (controllo prima di inviare, istantaneo) e server
// (controllo di sicurezza, non fidarsi solo del client). Vedi
// app/actions/photo.ts e components/PhotoUploadForm.tsx.
//
// Il vero collo di bottiglia e' l'hosting PHP che riceve i file (non
// modificabile da qui): verificato empiricamente il 2026-09-12 inviando file
// di dimensione crescente all'endpoint reale, 195 MB passa, 200 MB fallisce
// (troncamento post_max_size lato PHP). 180 MB lascia margine sotto quella
// soglia reale.
export const MAX_PHOTO_SIZE_BYTES = 180 * 1024 * 1024;
export const MAX_PHOTO_SIZE_LABEL = "180 MB";
