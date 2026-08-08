import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentFamily } from "@/lib/dal";
import { PhotoUploadForm } from "@/components/PhotoUploadForm";
import { PhotoGallery, type GalleryPhoto } from "@/components/PhotoGallery";

export default async function FotoPage() {
  const family = await getCurrentFamily();

  const [ownPhotosRaw, tripPhotosRaw] = await Promise.all([
    prisma.photo.findMany({
      where: { familyId: family.id },
      include: { person: true, family: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.photo.findMany({
      where: { sharedWithTrip: true, familyId: { not: family.id } },
      include: { person: true, family: true },
      orderBy: { createdAt: "desc" },
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
  });

  const ownPhotos = ownPhotosRaw.map(toGalleryPhoto);
  const tripPhotos = tripPhotosRaw.map(toGalleryPhoto);

  return (
    <div className="space-y-6 p-4">
      <PhotoUploadForm />

      <section>
        <h2 className="mb-2.5 px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          {family.displayName}
        </h2>
        {ownPhotos.length > 0 ? (
          <PhotoGallery photos={ownPhotos} allowShareToggle allowDelete />
        ) : (
          <p className="rounded-xl bg-sand-50 px-4 py-3 text-[14px] leading-snug text-ink-400">
            Non avete ancora caricato foto o video.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          <Users size={15} strokeWidth={2.4} />
          Condivise da tutto il gruppo
        </h2>
        {tripPhotos.length > 0 ? (
          <PhotoGallery photos={tripPhotos} allowShareToggle={false} allowDelete={false} />
        ) : (
          <p className="rounded-xl bg-sand-50 px-4 py-3 text-[14px] leading-snug text-ink-400">
            Nessuna famiglia ha ancora condiviso foto con tutto il gruppo.
          </p>
        )}
      </section>
    </div>
  );
}
