"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneEliminaCliente, azioneSalvaCliente, datiClienti } from "./actions";
import { clienteVuoto, FormCliente } from "./FormCliente";
import { Suggerimento } from "@/components/Suggerimento";

type Dati = Awaited<ReturnType<typeof datiClienti>>;

export function GestioneClienti({ iniziale }: { iniziale: Dati }) {
  const [clienti, setClienti] = useState(iniziale);
  const [cerca, setCerca] = useState("");
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // id del cliente in modifica, 0 = nuovo.
  const [inModifica, setInModifica] = useState<number | null>(null);
  const [daEliminare, setDaEliminare] = useState<number | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      setClienti(await fn());
      setMessaggio({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const q = cerca.trim().toLowerCase();
  const visibili = clienti.filter(
    (c) => !q || [c.dati.denominazione, c.dati.partitaIva, c.dati.codiceFiscale, c.dati.comune, c.dati.referente, c.dati.email].some((v) => v.toLowerCase().includes(q)),
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Clienti e aziende</h1>
        <Suggerimento id="clienti" titolo="Chi sono i clienti e le aziende">
          <p>
            Sono i committenti di eventi e sale e gli intestatari dei documenti (anche per la fattura elettronica: partita IVA, codice SDI, PEC).
            Gli ospiti che dormono in hotel sono un&apos;anagrafica a parte, compilata al check-in. Un cliente già usato non si elimina: si disattiva.
          </p>
        </Suggerimento>
      </div>
      {messaggio && (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}>
          {messaggio.testo}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input className="w-full max-w-xs rounded-md border border-stone-300 px-2 py-1.5 text-sm" placeholder="Cerca per nome, P.IVA, comune…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        {inModifica === null && (
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10" onClick={() => setInModifica(0)}>
            + Nuovo cliente
          </button>
        )}
      </div>
      {inModifica === 0 && (
        <FormCliente
          iniziale={clienteVuoto()}
          busy={busy}
          onAnnulla={() => setInModifica(null)}
          onSalva={async (d) => {
            if (await esegui(async () => (await sbusta(azioneSalvaCliente(null, d))).clienti, "Cliente creato.")) setInModifica(null);
          }}
        />
      )}
      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1 pr-2">Cliente</th>
              <th className="pb-1 pr-2">P.IVA / C.F.</th>
              <th className="pb-1 pr-2">Comune</th>
              <th className="pb-1 pr-2">Contatti</th>
              <th className="pb-1 pr-2">Eventi</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibili.map((c) =>
              inModifica === c.id ? (
                <tr key={c.id} className="border-t border-stone-100">
                  <td colSpan={6} className="cella-intera py-2">
                    <FormCliente
                      iniziale={c.dati}
                      busy={busy}
                      onAnnulla={() => setInModifica(null)}
                      onSalva={async (d) => {
                        if (await esegui(async () => (await sbusta(azioneSalvaCliente(c.id, d))).clienti, "Cliente aggiornato.")) setInModifica(null);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className={`border-t border-stone-100 ${c.dati.attivo ? "" : "text-stone-400"}`}>
                  <td data-label="Cliente" className="py-1.5 pr-2">
                    <span className="font-semibold">{c.dati.denominazione}</span>
                    <span className="ml-1 text-xs text-stone-500">{c.dati.tipo === "azienda" ? "azienda" : "privato"}</span>
                    {!c.dati.attivo && <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-600">non attivo</span>}
                    {c.dati.referente && <div className="text-xs text-stone-500">Rif. {c.dati.referente}</div>}
                  </td>
                  <td data-label="P.IVA / C.F." className="py-1.5 pr-2 font-mono text-xs">{c.dati.partitaIva || c.dati.codiceFiscale || "—"}</td>
                  <td data-label="Comune" className="py-1.5 pr-2">{c.dati.comune ? `${c.dati.comune}${c.dati.provincia ? ` (${c.dati.provincia})` : ""}` : "—"}</td>
                  <td data-label="Contatti" className="py-1.5 pr-2 text-xs">{[c.dati.telefono, c.dati.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td data-label="Eventi" className="py-1.5 pr-2">{c.eventi}</td>
                  <td className="cella-intera py-1.5 md:text-right">
                    {daEliminare === c.id ? (
                      <span className="text-xs">
                        Eliminare?{" "}
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                          onClick={async () => {
                            await esegui(() => sbusta(azioneEliminaCliente(c.id)), "Cliente eliminato.");
                            setDaEliminare(null);
                          }}
                        >
                          Sì, elimina
                        </button>{" "}
                        <button type="button" className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaEliminare(null)}>
                          No
                        </button>
                      </span>
                    ) : (
                      inModifica === null && (
                        <>
                          <button type="button" className="mr-2 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9" onClick={() => setInModifica(c.id)}>
                            Modifica
                          </button>
                          {c.eventi === 0 && (
                            <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaEliminare(c.id)}>
                              Elimina
                            </button>
                          )}
                        </>
                      )
                    )}
                  </td>
                </tr>
              ),
            )}
            {visibili.length === 0 && (
              <tr>
                <td colSpan={6} className="cella-intera py-3 text-sm text-stone-500">
                  {clienti.length ? "Nessun cliente corrisponde alla ricerca." : "Nessun cliente."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
