"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneNuovaVersione } from "./actions";

/** Nuova versione del regolamento da una data, copiando (facoltativo) una versione esistente. */
export function NuovaVersione({ comuneId, versioni }: { comuneId: number; versioni: { id: number; etichetta: string }[] }) {
  const router = useRouter();
  const [aperto, setAperto] = useState(false);
  const [dal, setDal] = useState("");
  const [copiaDa, setCopiaDa] = useState<number | "">(versioni[0]?.id ?? "");
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!aperto) {
    return (
      <button type="button" className="mt-2 text-xs font-semibold text-teal-700 hover:underline" onClick={() => setAperto(true)}>
        + Nuova versione da una data
      </button>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-dashed border-stone-300 p-3">
      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-stone-600">
          Valida dal
          <input
            type="date"
            className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
            value={dal}
            onChange={(e) => setDal(e.target.value)}
          />
        </label>
        <label className="flex flex-col text-xs text-stone-600">
          Parti da
          <select
            className="mt-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
            value={copiaDa}
            onChange={(e) => setCopiaDa(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Versione vuota</option>
            {versioni.map((v) => (
              <option key={v.id} value={v.id}>
                Copia della versione {v.etichetta}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !dal}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
          onClick={async () => {
            setErrore(null);
            setBusy(true);
            try {
              const id = await sbusta(azioneNuovaVersione(comuneId, dal, copiaDa === "" ? null : copiaDa));
              router.push(`/piattaforma/tassa/${id}`);
            } catch (e) {
              setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Crea
        </button>
        <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10" onClick={() => setAperto(false)}>
          Annulla
        </button>
      </div>
      <p className="text-[11px] text-stone-500">
        La versione in vigore a quella data viene chiusa al giorno prima: le notti precedenti restano calcolate come prima.
      </p>
    </div>
  );
}
