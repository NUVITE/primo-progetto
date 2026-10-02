"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { DatiHotel } from "@/lib/hotel";
import { SISTEMI_ISTAT } from "@/lib/istat";
import { azioneAggiornaHotel, azioneCreaComune, azioneCreaHotel, datiModulo } from "./actions";

type Riferimenti = Awaited<ReturnType<typeof datiModulo>>;

const INPUT = "mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900";
const ETICHETTA = "flex flex-col text-xs text-stone-600";

export const HOTEL_VUOTO: DatiHotel = {
  nome: "",
  comuneId: 0,
  categoria: "",
  ragioneSociale: "",
  partitaIva: "",
  codiceFiscale: "",
  indirizzo: "",
  cap: "",
  telefono: "",
  email: "",
  pec: "",
  sistemaIstat: "",
};

/** hotelId assente = creazione (con eventuale primo amministratore), altrimenti modifica. */
export function FormHotel({ riferimenti, iniziale, hotelId }: { riferimenti: Riferimenti; iniziale: DatiHotel; hotelId?: number }) {
  const router = useRouter();
  const [dati, setDati] = useState(iniziale);
  const [comuni, setComuni] = useState(riferimenti.comuni);
  const [admin, setAdmin] = useState({ nome: "", email: "", password: "" });
  const [nuovoComune, setNuovoComune] = useState<{ nome: string; provincia: string; codiceIstat: string } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [salvato, setSalvato] = useState(false);
  const [busy, setBusy] = useState(false);

  const campo = (k: keyof DatiHotel) => ({
    value: String(dati[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setSalvato(false);
      setDati({ ...dati, [k]: e.target.value });
    },
  });

  async function esegui(fn: () => Promise<void>) {
    setErrore(null);
    setSalvato(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  const categorieSuggerite = riferimenti.categorie[dati.comuneId] ?? [];

  return (
    <div className="flex flex-col gap-4">
      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Struttura</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={ETICHETTA}>
            Nome dell&apos;hotel *
            <input className={INPUT} {...campo("nome")} />
          </label>
          <div className={ETICHETTA}>
            Comune *
            {nuovoComune ? (
              <div className="mt-1 flex flex-col gap-2 rounded-md border border-dashed border-stone-300 p-2">
                <input className={INPUT} placeholder="Nome (es. Pescara)" value={nuovoComune.nome} onChange={(e) => setNuovoComune({ ...nuovoComune, nome: e.target.value })} />
                <div className="flex gap-2">
                  <input className={INPUT} placeholder="Provincia (es. PE)" maxLength={2} value={nuovoComune.provincia} onChange={(e) => setNuovoComune({ ...nuovoComune, provincia: e.target.value })} />
                  <input className={INPUT} placeholder="Codice ISTAT (6 cifre)" maxLength={6} value={nuovoComune.codiceIstat} onChange={(e) => setNuovoComune({ ...nuovoComune, codiceIstat: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setNuovoComune(null)}>
                    Annulla
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-9"
                    onClick={() =>
                      esegui(async () => {
                        const c = await sbusta(azioneCreaComune(nuovoComune));
                        setComuni([...comuni, c].sort((a, b) => a.nome.localeCompare(b.nome)));
                        setDati({ ...dati, comuneId: c.id });
                        setNuovoComune(null);
                      })
                    }
                  >
                    Aggiungi comune
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select className={INPUT} value={dati.comuneId || ""} onChange={(e) => setDati({ ...dati, comuneId: Number(e.target.value) })}>
                  <option value="" disabled>
                    Scegli...
                  </option>
                  {comuni.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.provincia})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mt-1 whitespace-nowrap text-xs font-semibold text-teal-700 hover:underline"
                  onClick={() => setNuovoComune({ nome: "", provincia: "", codiceIstat: "" })}
                >
                  + Nuovo
                </button>
              </div>
            )}
          </div>
          <label className={ETICHETTA}>
            Categoria (per la tassa di soggiorno)
            {categorieSuggerite.length > 0 ? (
              // Scelta tra le categorie del regolamento in vigore: il nome deve combaciare con la tariffa.
              <select className={INPUT} value={dati.categoria} onChange={(e) => setDati({ ...dati, categoria: e.target.value })}>
                <option value="">Non indicata (si applica la tariffa predefinita)</option>
                {dati.categoria && !categorieSuggerite.includes(dati.categoria) && (
                  <option value={dati.categoria}>{dati.categoria} (non prevista dal regolamento)</option>
                )}
                {categorieSuggerite.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input className={INPUT} placeholder="es. Albergo 3 stelle, B&B, Case per ferie" {...campo("categoria")} />
                <span className="mt-1 text-[11px] text-stone-500">Il comune non ha un regolamento della tassa in vigore.</span>
              </>
            )}
          </label>
          <label className={ETICHETTA}>
            Indirizzo
            <input className={INPUT} {...campo("indirizzo")} />
          </label>
          <label className={ETICHETTA}>
            CAP
            <input className={INPUT} maxLength={5} {...campo("cap")} />
          </label>
          <label className={ETICHETTA}>
            Telefono
            <input className={INPUT} {...campo("telefono")} />
          </label>
          <label className={ETICHETTA}>
            Email
            <input type="email" className={INPUT} {...campo("email")} />
          </label>
          <label className={ETICHETTA}>
            Sistema per la statistica ISTAT
            <select className={INPUT} value={dati.sistemaIstat} onChange={(e) => setDati({ ...dati, sistemaIstat: e.target.value })}>
              <option value="">Nessuno / non ancora configurato</option>
              {SISTEMI_ISTAT.map((s) => (
                <option key={s.valore} value={s.valore}>
                  {s.nome}
                </option>
              ))}
            </select>
            <span className="mt-1 text-[11px] text-stone-500">Decide quali voci di motivo del viaggio e mezzo di trasporto compaiono al check-in.</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Dati fiscali</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={ETICHETTA}>
            Ragione sociale
            <input className={INPUT} {...campo("ragioneSociale")} />
          </label>
          <label className={ETICHETTA}>
            Partita IVA
            <input className={INPUT} maxLength={11} {...campo("partitaIva")} />
          </label>
          <label className={ETICHETTA}>
            Codice fiscale
            <input className={INPUT} maxLength={16} {...campo("codiceFiscale")} />
          </label>
          <label className={ETICHETTA}>
            PEC
            <input type="email" className={INPUT} {...campo("pec")} />
          </label>
        </div>
      </section>

      {!hotelId && (
        <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-1 text-sm font-bold text-stone-900">Primo amministratore (facoltativo)</h2>
          <p className="mb-3 text-sm text-stone-600">Un utente con ruolo Amministratore per questo hotel. Si può aggiungere anche dopo, dalla pagina Utenti.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={ETICHETTA}>
              Nome
              <input className={INPUT} value={admin.nome} onChange={(e) => setAdmin({ ...admin, nome: e.target.value })} />
            </label>
            <label className={ETICHETTA}>
              Email
              <input type="email" className={INPUT} value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
            </label>
            <label className={ETICHETTA}>
              Password iniziale (min. 8 caratteri)
              <input type="text" className={INPUT} value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
            </label>
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        {salvato && <span className="text-sm font-semibold text-emerald-700">Salvato</span>}
        <button
          type="button"
          disabled={busy || !dati.nome.trim() || !dati.comuneId}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
          onClick={() =>
            esegui(async () => {
              if (hotelId) {
                await sbusta(azioneAggiornaHotel(hotelId, dati));
                setSalvato(true);
                router.refresh();
              } else {
                const id = await sbusta(azioneCreaHotel(dati, admin));
                router.push(`/piattaforma/hotel/${id}`);
              }
            })
          }
        >
          {hotelId ? "Salva" : "Crea hotel"}
        </button>
      </div>
    </div>
  );
}
