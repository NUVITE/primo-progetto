"use client";

import { Package } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneApplicaPacchetto, datiDettaglioSala } from "../../actions";
import { BOTTONE, CELLA, euro, it, type Contesto } from "../../componenti";

type Dettaglio = Awaited<ReturnType<typeof datiDettaglioSala>>["dettaglio"];

/** Applica un pacchetto (es. "Giornata congressuale") a tutti i giorni dell'evento o a uno solo. */
export function PacchettoEvento({
  evento,
  pacchetti,
  busy,
  esegui,
}: {
  evento: Dettaglio;
  pacchetti: Contesto["pacchetti"];
  busy: boolean;
  esegui: (fn: () => Promise<Dettaglio>, ok: string) => Promise<boolean>;
}) {
  const [f, setF] = useState<null | { pacchettoId: string; giorno: string; partecipanti: string }>(null);
  if (!pacchetti.length) return null;
  const scelto = pacchetti.find((p) => String(p.id) === f?.pacchettoId);
  const giorni = f?.giorno ? 1 : evento.giorni.length;
  const persone = Number(f?.partecipanti || 0);
  const stima = scelto ? (scelto.aPersona * persone + scelto.aEvento) * giorni : 0;

  if (!f) {
    return (
      <button
        type="button"
        className="mt-2 ml-2 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-teal-300 bg-white px-2.5 text-xs font-semibold text-teal-800 shadow-sm hover:bg-teal-50 pointer-coarse:h-9"
        onClick={() => setF({ pacchettoId: String(pacchetti[0].id), giorno: "", partecipanti: evento.partecipanti ? String(evento.partecipanti) : "" })}
      >
        <Package className="h-3.5 w-3.5" aria-hidden /> Applica un pacchetto
      </button>
    );
  }
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
      <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
        Pacchetto
        <select className={`${CELLA} w-auto`} value={f.pacchettoId} onChange={(e) => setF({ ...f, pacchettoId: e.target.value })}>
          {pacchetti.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
        Giorni
        <select className={`${CELLA} w-auto`} value={f.giorno} onChange={(e) => setF({ ...f, giorno: e.target.value })}>
          <option value="">Tutti i giorni dell&apos;evento ({evento.giorni.length})</option>
          {evento.giorni.map((g) => (
            <option key={g} value={g}>
              Solo il {it(g)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
        Partecipanti
        <input type="number" min={1} className={`${CELLA} w-24`} value={f.partecipanti} onChange={(e) => setF({ ...f, partecipanti: e.target.value })} />
      </label>
      {scelto && persone > 0 && <span className="pb-1 text-sm text-stone-700">circa {euro(stima)}</span>}
      <button
        type="button"
        disabled={busy}
        className={BOTTONE}
        onClick={async () => {
          const ok = await esegui(
            () =>
              sbusta(
                azioneApplicaPacchetto(evento.id, {
                  pacchettoId: Number(f.pacchettoId),
                  giorno: f.giorno || null,
                  partecipanti: f.partecipanti ? Number(f.partecipanti) : null,
                }),
              ),
            "Pacchetto applicato: i servizi si possono ancora modificare uno per uno.",
          );
          if (ok) setF(null);
        }}
      >
        Applica
      </button>
      <button
        type="button"
        className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 pointer-coarse:h-9"
        onClick={() => setF(null)}
      >
        Annulla
      </button>
    </div>
  );
}
