"use client";

import { useState } from "react";
import type { DatiCliente } from "@/lib/clienti";

const CELLA = "w-full rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900";

export const clienteVuoto = (): DatiCliente => ({
  tipo: "azienda",
  denominazione: "",
  partitaIva: "",
  codiceFiscale: "",
  indirizzo: "",
  cap: "",
  comune: "",
  provincia: "",
  referente: "",
  email: "",
  telefono: "",
  pec: "",
  codiceDestinatario: "",
  note: "",
  attivo: true,
});

/** Modulo del cliente, usato dall'anagrafica e dalla prenotazione di sala (creazione al volo). */
export function FormCliente({
  iniziale,
  busy,
  onSalva,
  onAnnulla,
}: {
  iniziale: DatiCliente;
  busy: boolean;
  onSalva: (d: DatiCliente) => void;
  onAnnulla: () => void;
}) {
  const [d, setD] = useState(iniziale);
  const set = (p: Partial<DatiCliente>) => setD({ ...d, ...p });
  const campo = (label: string, k: keyof DatiCliente, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, className = "") => (
    <label className={`flex flex-col gap-1 text-xs font-semibold text-stone-600 ${className}`}>
      {label}
      <input className={CELLA} value={d[k] as string} onChange={(e) => set({ [k]: e.target.value })} {...extra} />
    </label>
  );
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
      <div className="flex gap-4 text-sm">
        {(["azienda", "privato"] as const).map((t) => (
          <label key={t} className="flex items-center gap-1.5">
            <input type="radio" checked={d.tipo === t} onChange={() => set({ tipo: t })} /> {t === "azienda" ? "Azienda / ente" : "Privato"}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {campo(d.tipo === "azienda" ? "Ragione sociale" : "Nome e cognome", "denominazione", {}, "sm:col-span-2")}
        {d.tipo === "azienda" && campo("Partita IVA", "partitaIva", { inputMode: "numeric" })}
        {campo("Codice fiscale", "codiceFiscale")}
        {campo("Indirizzo", "indirizzo", {}, "sm:col-span-2")}
        {campo("CAP", "cap", { inputMode: "numeric" })}
        <div className="grid grid-cols-[1fr_4rem] gap-2">
          {campo("Comune", "comune")}
          {campo("Prov.", "provincia", { maxLength: 2 })}
        </div>
        {campo("Referente", "referente")}
        {campo("Telefono", "telefono", { type: "tel" })}
        {campo("Email", "email", { type: "email" })}
        {campo("PEC", "pec", { type: "email" })}
        {campo("Codice destinatario SDI", "codiceDestinatario", { maxLength: 7 })}
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
        Note
        <textarea className={CELLA} rows={2} value={d.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.attivo} onChange={(e) => set({ attivo: e.target.checked })} /> Attivo
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} className="rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40" onClick={() => onSalva(d)}>
          Salva cliente
        </button>
        <button type="button" className="text-xs font-semibold text-stone-600" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </div>
  );
}
