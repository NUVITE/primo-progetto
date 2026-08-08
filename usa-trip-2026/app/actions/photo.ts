"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentFamily, getCurrentPerson } from "@/lib/dal";
import { slugifyPersonName, uploadToArchive, deleteFromArchive } from "@/lib/archive";

export interface UploadPhotoState {
  error?: string;
  info?: string;
}

const MAX_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB, abbondante per un video da telefono

function extensionFor(file: File) {
  const fromName = path.extname(file.name);
  if (fromName) return fromName;
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/heic") return ".heic";
  if (file.type === "video/mp4") return ".mp4";
  if (file.type === "video/quicktime") return ".mov";
  return "";
}

export async function uploadPhoto(
  _prevState: UploadPhotoState | undefined,
  formData: FormData
): Promise<UploadPhotoState> {
  const family = await getCurrentFamily();
  const person = await getCurrentPerson();

  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { error: "Scegli almeno una foto o un video." };
  }

  const caption = String(formData.get("caption") ?? "").trim();
  const sharedWithTrip = formData.get("sharedWithTrip") === "on";
  const personSlug = slugifyPersonName(person.name);

  let uploaded = 0;
  const problems: string[] = [];

  // Uno alla volta: l'hosting PHP di destinazione e' condiviso e modesto,
  // meglio non bombardarlo con richieste in parallelo per una selezione di
  // decine di foto.
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      problems.push(`${file.name}: tipo non supportato`);
      continue;
    }
    if (file.size > MAX_SIZE_BYTES) {
      problems.push(`${file.name}: troppo grande (oltre 150 MB)`);
      continue;
    }

    const storageName = `${randomUUID()}${extensionFor(file)}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const archiveResult = await uploadToArchive(bytes, family.code, personSlug, storageName, file.type);

    if (!archiveResult.ok) {
      // Niente riga nel DB: il file resta solo sul telefono, si puo' riprovare.
      problems.push(`${file.name}: invio fallito${archiveResult.error ? ` (${archiveResult.error})` : ""}`);
      continue;
    }

    await prisma.photo.create({
      data: {
        personId: person.id,
        familyId: family.id,
        kind: isVideo ? "video" : "foto",
        mimeType: file.type,
        fileName: file.name || storageName,
        storageName,
        sizeBytes: file.size,
        caption: caption || null,
        sharedWithTrip,
      },
    });
    uploaded++;
  }

  revalidatePath("/foto");

  if (uploaded === 0) {
    return { error: problems[0] ?? "Nessun file caricato." };
  }
  const suffix =
    problems.length > 0
      ? ` — ${problems.length} non riusciti: ${problems.slice(0, 2).join("; ")}${problems.length > 2 ? "…" : ""}`
      : "";
  return { info: `${uploaded} file caricat${uploaded === 1 ? "o" : "i"}${suffix}` };
}

export async function setPhotoShared(photoId: string, sharedWithTrip: boolean) {
  const family = await getCurrentFamily();

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo || photo.familyId !== family.id) {
    return;
  }

  await prisma.photo.update({
    where: { id: photoId },
    data: { sharedWithTrip, sharedAt: sharedWithTrip ? new Date() : null },
  });
  revalidatePath("/foto");
}

export async function deletePhoto(photoId: string) {
  const family = await getCurrentFamily();

  const photo = await prisma.photo.findUnique({ where: { id: photoId }, include: { person: true } });
  if (!photo || photo.familyId !== family.id) {
    return;
  }

  await prisma.photo.delete({ where: { id: photoId } });
  await deleteFromArchive(family.code, slugifyPersonName(photo.person.name), photo.storageName);
  revalidatePath("/foto");
}
