import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";
import { fetchFromArchive, slugifyPersonName } from "@/lib/archive";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewerFamily = await getCurrentFamily();

  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { family: true, person: true },
  });
  if (!photo) {
    return new NextResponse("File non trovato", { status: 404 });
  }
  // Visibile alla famiglia che l'ha caricata, oppure a tutti se condivisa con il viaggio.
  if (photo.familyId !== viewerFamily.id && !photo.sharedWithTrip) {
    return new NextResponse("Non autorizzato", { status: 403 });
  }

  // Il file non e' mai sul VPS: lo recuperiamo al volo dal dominio dove e'
  // stato archiviato, passando anche l'eventuale header Range (necessario
  // per il seek dei video).
  const range = request.headers.get("range");
  const personSlug = slugifyPersonName(photo.person.name);
  const result = await fetchFromArchive(photo.family.code, personSlug, photo.storageName, photo.mimeType, range);

  if (!result.ok || !result.body) {
    return new NextResponse("File non disponibile sull'archivio", { status: result.status || 502 });
  }

  const headers = new Headers({
    "Content-Type": photo.mimeType,
    "Cache-Control": "private, no-cache, must-revalidate",
    "Accept-Ranges": "bytes",
  });
  if (result.contentLength) headers.set("Content-Length", result.contentLength);
  if (result.contentRange) headers.set("Content-Range", result.contentRange);
  if (!range) {
    headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(photo.fileName)}"`);
  }

  return new NextResponse(result.body, { status: result.status, headers });
}
