import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";
import { PhotoUploadForm } from "@/components/PhotoUploadForm";
import { FotoSections } from "@/components/FotoSections";
import type { GalleryPhoto } from "@/components/PhotoGallery";

export default async function FotoPage() {
  const family = await getCurrentFamily();

  const [ownPhotosRaw, sharedPhotosRaw] = await Promise.all([
    prisma.photo.findMany({
      where: { familyId: family.id },
      include: { person: true, family: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.photo.findMany({
      where: { sharedWithTrip: true },
      include: { person: true, family: true },
      orderBy: { sharedAt: "desc" },
    }),
  ]);

  const toGalleryPhoto = (p: (typeof ownPhotosRaw)[number]): GalleryPhoto => ({
    id: p.id,
    kind: p.kind,
    caption: p.caption,
    sharedWithTrip: p.sharedWithTrip,
    sharedAt: p.sharedAt ? p.sharedAt.toISOString() : null,
    personName: p.person.name,
    familyDisplayName: p.family.displayName,
    isMine: p.familyId === family.id,
  });

  const ownPhotos = ownPhotosRaw.map(toGalleryPhoto);
  const sharedPhotos = sharedPhotosRaw.map(toGalleryPhoto);

  return (
    <div className="space-y-6 p-4">
      <PhotoUploadForm />
      <FotoSections ownPhotos={ownPhotos} sharedPhotos={sharedPhotos} familyDisplayName={family.displayName} />
    </div>
  );
}
