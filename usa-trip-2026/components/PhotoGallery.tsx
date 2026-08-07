"use client";

import { useState, useTransition } from "react";
import { Play, Share2, Users, X } from "lucide-react";
import { setPhotoShared } from "@/app/actions/photo";

export interface GalleryPhoto {
  id: string;
  kind: string;
  caption: string | null;
  sharedWithTrip: boolean;
  personName: string;
  familyDisplayName: string;
}

export function PhotoGallery({
  photos,
  allowShareToggle,
}: {
  photos: GalleryPhoto[];
  allowShareToggle: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = photos.find((p) => p.id === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-3 gap-1">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setOpenId(photo.id)}
            className="relative aspect-square overflow-hidden bg-sand-100"
          >
            {photo.kind === "video" ? (
              <>
                <video src={`/foto/${photo.id}/file`} className="h-full w-full object-cover" muted preload="metadata" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play size={22} strokeWidth={2.4} className="text-white" fill="white" />
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/foto/${photo.id}/file`}
                alt={photo.caption ?? ""}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
            {photo.sharedWithTrip && (
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white">
                <Users size={11} strokeWidth={2.6} />
              </span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <PhotoLightbox photo={open} allowShareToggle={allowShareToggle} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

function PhotoLightbox({
  photo,
  allowShareToggle,
  onClose,
}: {
  photo: GalleryPhoto;
  allowShareToggle: boolean;
  onClose: () => void;
}) {
  const [shared, setShared] = useState(photo.sharedWithTrip);
  const [pending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{photo.personName}</p>
          <p className="truncate text-[13px] text-white/60">{photo.familyDisplayName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
        >
          <X size={20} strokeWidth={2.4} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-2">
        {photo.kind === "video" ? (
          <video src={`/foto/${photo.id}/file`} controls autoPlay className="max-h-full max-w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/foto/${photo.id}/file`}
            alt={photo.caption ?? ""}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="space-y-3 p-4">
        {photo.caption && <p className="text-[15px] text-white">{photo.caption}</p>}

        {allowShareToggle && (
          <label className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3 text-[14px] font-semibold text-white">
            <input
              type="checkbox"
              checked={shared}
              disabled={pending}
              onChange={(e) => {
                const value = e.target.checked;
                setShared(value);
                startTransition(() => setPhotoShared(photo.id, value));
              }}
              className="h-4 w-4"
            />
            <Share2 size={16} strokeWidth={2.2} className="shrink-0" />
            Condividi con tutto il gruppo del viaggio
          </label>
        )}
      </div>
    </div>
  );
}
