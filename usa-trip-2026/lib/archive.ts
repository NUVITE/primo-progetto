import "server-only";
import { slugifyPersonName } from "@/lib/slug";

export { slugifyPersonName };

interface ArchiveUploadResult {
  ok: boolean;
  error?: string;
}

function baseUrl(): string | undefined {
  return process.env.ARCHIVE_API_BASE_URL?.replace(/\/+$/, "");
}

/**
 * Spinge il file (tenuto solo in memoria, mai scritto su disco sul VPS)
 * verso l'API PHP sul dominio dell'utente (vedi archive-receiver-php/), unico
 * posto dove il file finisce archiviato. Se fallisce, chi chiama restituisce
 * un errore all'utente: la foto resta sul telefono, si puo' ricaricare.
 */
export async function uploadToArchive(
  bytes: Buffer,
  familyCode: string,
  personSlug: string,
  storageName: string,
  mimeType: string
): Promise<ArchiveUploadResult> {
  const base = baseUrl();
  const token = process.env.ARCHIVE_API_TOKEN;
  if (!base || !token) {
    return { ok: false, error: "Configurazione archivio mancante" };
  }

  try {
    // Blob vuole un ArrayBuffer "pieno", non il tipo generico condiviso con
    // Buffer: lo isoliamo con slice().
    const arrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;

    const form = new FormData();
    form.append("family", familyCode);
    form.append("person", personSlug);
    form.append("file", new Blob([arrayBuffer], { type: mimeType }), storageName);

    const response = await fetch(`${base}/upload.php`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Archive-Token": token, // ripiego se l'hosting non passa Authorization a PHP
      },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Cancella il file dall'archivio sul dominio, quando una foto/video viene
 * rimossa dalla webapp. Se la chiamata fallisce non blocca la cancellazione
 * lato app: il file resta orfano sul dominio, meno grave di un errore che
 * impedisce di rimuovere una foto sbagliata dalla galleria.
 */
export async function deleteFromArchive(
  familyCode: string,
  personSlug: string,
  storageName: string
): Promise<void> {
  const base = baseUrl();
  const token = process.env.ARCHIVE_API_TOKEN;
  if (!base || !token) return;

  try {
    const form = new FormData();
    form.append("family", familyCode);
    form.append("person", personSlug);
    form.append("file", storageName);

    await fetch(`${base}/delete.php`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Archive-Token": token,
      },
      body: form,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // vedi commento sopra: non propaghiamo l'errore
  }
}

export interface ArchiveFetchResult {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
  contentLength: string | null;
  contentRange: string | null;
}

/**
 * Recupera i byte di una foto/video direttamente dall'archivio sul dominio,
 * per servirli nella galleria: sul VPS non ne resta mai una copia. Chiamata
 * solo da server a server (mai dal browser): il token resta segreto.
 */
export async function fetchFromArchive(
  familyCode: string,
  personSlug: string,
  storageName: string,
  mimeType: string,
  rangeHeader: string | null
): Promise<ArchiveFetchResult> {
  const base = baseUrl();
  const token = process.env.ARCHIVE_API_TOKEN;
  if (!base || !token) {
    return { ok: false, status: 500, body: null, contentLength: null, contentRange: null };
  }

  const url =
    `${base}/get.php?family=${encodeURIComponent(familyCode)}` +
    `&person=${encodeURIComponent(personSlug)}` +
    `&file=${encodeURIComponent(storageName)}&mime=${encodeURIComponent(mimeType)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Archive-Token": token,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });

    return {
      ok: response.status === 200 || response.status === 206,
      status: response.status,
      body: response.body,
      contentLength: response.headers.get("content-length"),
      contentRange: response.headers.get("content-range"),
    };
  } catch {
    return { ok: false, status: 502, body: null, contentLength: null, contentRange: null };
  }
}
