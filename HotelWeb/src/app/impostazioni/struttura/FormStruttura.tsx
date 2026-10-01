"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import type { caricaStruttura, DatiStruttura } from "@/lib/impostazioniHotel";
import { azioneSalvaStruttura } from "../actions";
import { Suggerimento } from "@/components/Suggerimento";
import type { elencoChiusure } from "@/lib/chiusure";
import { CalendarioChiusure } from "./CalendarioChiusure";

type Struttura = Awaited<ReturnType<typeof caricaStruttura>>;

const INPUT = "mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900";
const ETICHETTA = "flex flex-col text-xs text-stone-600";

const ISTAT: Record<string, string> = { ROSS1000: "Ross1000", SPOT: "SPOT - DMS Puglia" };

export function FormStruttura({ iniziale, chiusure }: { iniziale: Struttura; chiusure: Awaited<ReturnType<typeof elencoChiusure>> }) {
  const [dati, setDati] = useState<DatiStruttura>(iniziale.dati);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const campo = (k: keyof DatiStruttura, tipo = "text") => ({
    type: tipo,
    className: INPUT,
    value: dati[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDati({ ...dati, [k]: e.target.value }),
  });
  const s = iniziale.sola;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Dati della struttura</h1>
        <Suggerimento id="struttura" titolo="A cosa servono questi dati">
          <p>
            Ragione sociale, partita IVA, indirizzo e contatti compaiono nell&apos;intestazione di ricevute e documenti; gli orari di check-in e
            check-out sono quelli comunicati agli ospiti. Nome, comune e categoria dell&apos;hotel li gestisce il fornitore del programma, perché
            decidono la tassa di soggiorno.
          </p>
        </Suggerimento>
      </div>
      {messaggio && (
        <p className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}>
          {messaggio.testo}
        </p>
      )}

      <section className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm sm:p-5">
        <h2 className="mb-2 text-sm font-bold text-stone-900">Gestiti dalla piattaforma</h2>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div>
            <dt className="text-xs text-stone-500">Nome</dt>
            <dd className="font-semibold">{s.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Comune</dt>
            <dd className="font-semibold">{s.comune}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Categoria (tassa di soggiorno)</dt>
            <dd className="font-semibold">{s.categoria ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Statistica ISTAT</dt>
            <dd className="font-semibold">{s.sistemaIstat ? ISTAT[s.sistemaIstat] ?? s.sistemaIstat : "Non configurata"}</dd>
          </div>
        </dl>
        <p className="mt-2 text-sm text-stone-600">Per cambiarli rivolgiti al gestore della piattaforma: influiscono su tassa di soggiorno e adempimenti.</p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Dati fiscali</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={ETICHETTA}>
            Ragione sociale
            <input {...campo("ragioneSociale")} />
          </label>
          <label className={ETICHETTA}>
            Partita IVA
            <input maxLength={11} {...campo("partitaIva")} />
          </label>
          <label className={ETICHETTA}>
            Codice fiscale
            <input maxLength={16} {...campo("codiceFiscale")} />
          </label>
          <label className={ETICHETTA}>
            PEC
            <input {...campo("pec", "email")} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Indirizzo, contatti e orari</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`${ETICHETTA} sm:col-span-2`}>
            Indirizzo
            <input {...campo("indirizzo")} />
          </label>
          <label className={ETICHETTA}>
            CAP
            <input maxLength={5} {...campo("cap")} />
          </label>
          <label className={ETICHETTA}>
            Telefono
            <input {...campo("telefono", "tel")} />
          </label>
          <label className={ETICHETTA}>
            Email
            <input {...campo("email", "email")} />
          </label>
          <label className={ETICHETTA}>
            Check-in dalle
            <input {...campo("orarioCheckIn", "time")} />
          </label>
          <label className={ETICHETTA}>
            Check-out entro le
            <input {...campo("orarioCheckOut", "time")} />
          </label>
          <label className={ETICHETTA}>
            Giorni di validità di un&apos;opzione
            <input min={0} max={60} {...campo("giorniOpzione", "number")} />
            <span className="text-xs font-normal text-stone-600">Scadenza proposta per le nuove opzioni (modificabile in ogni prenotazione; 0 = nessuna).</span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
          onClick={async () => {
            setMessaggio(null);
            setBusy(true);
            try {
              const r = await sbusta(azioneSalvaStruttura(dati));
              setDati(r.dati);
              setMessaggio({ tipo: "ok", testo: "Dati salvati." });
            } catch (e) {
              setMessaggio({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
            } finally {
              setBusy(false);
            }
          }}
        >
          Salva
        </button>
      </div>

      <CalendarioChiusure iniziale={chiusure} />
    </div>
  );
}
