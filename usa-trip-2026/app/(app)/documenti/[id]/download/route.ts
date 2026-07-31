import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";

const PRIVATE_UPLOADS_ROOT = path.join(process.cwd(), "private-uploads");

function contentTypeFor(filePath: string) {
  if (filePath.endsWith(".pdf")) return "application/pdf";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const family = await getCurrentFamily();

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) {
    return new NextResponse("Documento non trovato", { status: 404 });
  }

  // Un documento comune (familyId null) è visibile a tutti; uno personale solo alla propria famiglia.
  if (doc.familyId !== null && doc.familyId !== family.id) {
    return new NextResponse("Non autorizzato", { status: 403 });
  }

  const resolvedPath = path.normalize(path.join(PRIVATE_UPLOADS_ROOT, doc.filePath));
  if (!resolvedPath.startsWith(PRIVATE_UPLOADS_ROOT)) {
    return new NextResponse("Percorso non valido", { status: 400 });
  }

  try {
    const file = await readFile(resolvedPath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypeFor(resolvedPath),
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      },
    });
  } catch {
    return new NextResponse("File non disponibile sul server", { status: 404 });
  }
}
