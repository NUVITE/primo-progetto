import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";

// In produzione i documenti stanno fuori dalla cartella dell'app, cosi' non
// vengono persi quando si ridistribuisce una nuova versione.
const PRIVATE_UPLOADS_ROOT = path.resolve(
  process.env.PRIVATE_UPLOADS_DIR ?? path.join(process.cwd(), "private-uploads")
);

function contentTypeFor(filePath: string) {
  if (filePath.endsWith(".pdf")) return "application/pdf";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const family = await getCurrentFamily();

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return new NextResponse("Documento non trovato", { status: 404 });
  }

  // Un documento comune (familyId null) e' visibile a tutti; uno personale solo
  // alla propria famiglia.
  if (doc.familyId !== null && doc.familyId !== family.id) {
    return new NextResponse("Non autorizzato", { status: 403 });
  }

  const resolvedPath = path.normalize(path.join(PRIVATE_UPLOADS_ROOT, doc.filePath));
  if (!resolvedPath.startsWith(PRIVATE_UPLOADS_ROOT)) {
    return new NextResponse("Percorso non valido", { status: 400 });
  }

  try {
    const info = await stat(resolvedPath);
    const etag = `"${info.size}-${Math.floor(info.mtimeMs)}"`;

    // Con i dati limitati negli USA un PDF non va riscaricato ogni volta, ma
    // "no-cache" impone comunque di ripassare da qui: cosi' il controllo di
    // autorizzazione viene sempre eseguito, anche su un telefono condiviso dove
    // prima ha fatto accesso un'altra famiglia. Se il file non e' cambiato
    // rispondiamo 304, senza rimandare i megabyte.
    const cacheHeaders = {
      "Cache-Control": "private, no-cache, must-revalidate",
      ETag: etag,
    };

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    const file = await readFile(resolvedPath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        ...cacheHeaders,
        "Content-Type": contentTypeFor(resolvedPath),
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      },
    });
  } catch {
    return new NextResponse("File non disponibile sul server", { status: 404 });
  }
}
