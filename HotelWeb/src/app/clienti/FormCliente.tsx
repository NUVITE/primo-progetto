"use client";

import { useState } from "react";
import type { DatiCliente, TipoCliente } from "@/lib/clienti";

const TIPI: { valore: TipoCliente; nome: string }[] = [
  { valore: "azienda", nome: "Azienda / ente" },
  { valore: "privato", nome: "Privato" },
  { valore: "agenzia", nome: "Agenzia / tour operator" },
  { valore: "portale", nome: "Portale online" },
];

const CELLA = "h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 hover:border-stone-400 disabled:bg-stone-100 pointer-coarse:h-10";

export const clienteVuoto = (): DatiCliente => ({
  tipo: "azienda",
  commissione: "",
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
      <div className="flex flex-wrap gap-4 text-sm">
        {TIPI.map((t) => (
          <label key={t.valore} className="flex items-center gap-1.5">
            <input type="radio" checked={d.tipo === t.valore} onChange={() => set({ tipo: t.valore })} /> {t.nome}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {campo(d.tipo === "privato" ? "Nome e cognome" : "Ragione sociale", "denominazione", {}, "sm:col-span-2")}
        {d.tipo !== "privato" && campo("Partita IVA", "partitaIva", { inputMode: "numeric" })}
        {(d.tipo === "agenzia" || d.tipo === "portale") && campo("Commissione %", "commissione", { inputMode: "decimal", placeholder: "es. 15" })}
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
        <textarea className={`${CELLA} h-auto py-1.5`} rows={2} value={d.note} onChange={(e) => set({ note: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={d.attivo} onChange={(e) => set({ attivo: e.target.checked })} /> Attivo
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9" onClick={() => onSalva(d)}>
          Salva cliente
        </button>
        <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={onAnnulla}>
          Annulla
        </button>
      </div>
    </div>
  );
}
