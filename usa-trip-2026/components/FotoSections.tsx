"use client";

import { useState } from "react";
import { Images, Users } from "lucide-react";
import { PhotoGallery, type GalleryPhoto } from "@/components/PhotoGallery";

type Filtro = "tutte" | "condivise" | "non-condivise";

const FILTRI: { id: Filtro; label: string }[] = [
  { id: "tutte", label: "Tutte" },
  { id: "condivise", label: "Condivise" },
  { id: "non-condivise", label: "Solo vostre" },
];

export function FotoSections({
  ownPhotos,
  sharedPhotos,
  familyDisplayName,
}: {
  ownPhotos: GalleryPhoto[];
  sharedPhotos: GalleryPhoto[];
  familyDisplayName: string;
}) {
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [filtro, setFiltro] = useState<Filtro>("tutte");
  const [personaFiltro, setPersonaFiltro] = useState<string>("tutti");

  const filteredOwn = ownPhotos.filter((p) => {
    if (filtro === "condivise") return p.sharedWithTrip;
    if (filtro === "non-condivise") return !p.sharedWithTrip;
    return true;
  });

  // Ordine di comparsa: chi ha condiviso per prima appare per primo nei filtri.
  const persone = [...new Set(sharedPhotos.map((p) => p.personName))];
  const filteredShared =
    personaFiltro === "tutti" ? sharedPhotos : sharedPhotos.filter((p) => p.personName === personaFiltro);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTab("mine")}
          aria-pressed={tab === "mine"}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[14px] font-bold transition-colors ${
            tab === "mine" ? "bg-brand-800 text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
          }`}
        >
          <Images size={16} strokeWidth={2.4} />
          {familyDisplayName}
          <span className={tab === "mine" ? "text-white/70" : "text-ink-400"}>{ownPhotos.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("shared")}
          aria-pressed={tab === "shared"}
          className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[14px] font-bold transition-colors ${
            tab === "shared" ? "bg-brand-800 text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
          }`}
        >
          <Users size={16} strokeWidth={2.4} />
          Condivise dal gruppo
          <span className={tab === "shared" ? "text-white/70" : "text-ink-400"}>{sharedPhotos.length}</span>
        </button>
      </div>

      {tab === "mine" && (
        <section>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {FILTRI.map((f) => {
              const attivo = f.id === filtro;
              const quante =
                f.id === "tutte"
                  ? ownPhotos.length
                  : f.id === "condivise"
                    ? ownPhotos.filter((p) => p.sharedWithTrip).length
                    : ownPhotos.filter((p) => !p.sharedWithTrip).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={attivo}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
                    attivo ? "bg-clay-600 text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
                  }`}
                >
                  {f.label}
                  <span className={attivo ? "text-white/70" : "text-ink-400"}>{quante}</span>
                </button>
              );
            })}
          </div>

          {ownPhotos.length === 0 ? (
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-[14px] leading-snug text-ink-400">
              Non avete ancora caricato foto o video.
            </p>
          ) : filteredOwn.length === 0 ? (
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-[14px] leading-snug text-ink-400">
              Nessuna foto in questo filtro.
            </p>
          ) : (
            <PhotoGallery photos={filteredOwn} />
          )}
        </section>
      )}

      {tab === "shared" && (
        <section>
          {sharedPhotos.length > 0 && persone.length > 1 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setPersonaFiltro("tutti")}
                aria-pressed={personaFiltro === "tutti"}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
                  personaFiltro === "tutti" ? "bg-clay-600 text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
                }`}
              >
                Tutti
                <span className={personaFiltro === "tutti" ? "text-white/70" : "text-ink-400"}>
                  {sharedPhotos.length}
                </span>
              </button>
              {persone.map((nome) => {
                const attivo = nome === personaFiltro;
                const quante = sharedPhotos.filter((p) => p.personName === nome).length;
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => setPersonaFiltro(nome)}
                    aria-pressed={attivo}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-bold transition-colors ${
                      attivo ? "bg-clay-600 text-white shadow-sm" : "bg-white text-ink-500 ring-1 ring-sand-200"
                    }`}
                  >
                    {nome}
                    <span className={attivo ? "text-white/70" : "text-ink-400"}>{quante}</span>
                  </button>
                );
              })}
            </div>
          )}

          {sharedPhotos.length > 0 ? (
            <PhotoGallery photos={filteredShared} />
          ) : (
            <p className="rounded-xl bg-sand-50 px-4 py-3 text-[14px] leading-snug text-ink-400">
              Nessuna famiglia ha ancora condiviso foto con tutto il gruppo.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
