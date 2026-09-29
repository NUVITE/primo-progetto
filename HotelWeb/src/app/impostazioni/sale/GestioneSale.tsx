"use client";

import { useState } from "react";
import { sbusta } from "@/lib/esito";
import {
  azioneEliminaFascia,
  azioneSalvaAllestimento,
  azioneSalvaFascia,
  azioneSalvaSala,
  datiConfigurazioneSale,
} from "./actions";

type Dati = Awaited<ReturnType<typeof datiConfigurazioneSale>>;
type Sala = Dati["sale"][number];
type Fascia = Dati["fasce"][number];

const CELLA =
  "w-full rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900";
const BOTTONE =
  "rounded-md bg-teal-700 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40";
const euro = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)} €`);
const numOppureNull = (s: string) =>
  s.trim() === "" ? null : Number(s.replace(",", "."));

type FormSala = {
  nome: string;
  descrizione: string;
  capienzaMax: string;
  riassettoMinuti: string;
  prezzoOrario: string;
  attiva: boolean;
  prezziFascia: Record<number, string>;
};
type FormFascia = {
  nome: string;
  inizio: string;
  fine: string;
  mostraNelPlanning: boolean;
};
type FormAllestimento = {
  nome: string;
  capienza: string;
  costo: string;
  attivo: boolean;
};

function formDaSala(s: Sala | null, fasce: Fascia[]): FormSala {
  return {
    nome: s?.nome ?? "",
    descrizione: s?.descrizione ?? "",
    capienzaMax: s?.capienzaMax?.toString() ?? "",
    riassettoMinuti: String(s?.riassettoMinuti ?? 0),
    prezzoOrario: s?.prezzoOrario?.toString() ?? "",
    attiva: s?.attiva ?? true,
    prezziFascia: Object.fromEntries(
      fasce.map((f) => [f.id, s?.prezziFascia[f.id]?.toString() ?? ""]),
    ),
  };
}

export function GestioneSale({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [messaggio, setMessaggio] = useState<{
    tipo: "ok" | "errore";
    testo: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  // Sala in modifica: id, oppure 0 = nuova.
  const [salaInModifica, setSalaInModifica] = useState<{
    id: number;
    f: FormSala;
  } | null>(null);
  const [fasciaInModifica, setFasciaInModifica] = useState<{
    id: number;
    f: FormFascia;
  } | null>(null);
  const [fasciaDaEliminare, setFasciaDaEliminare] = useState<number | null>(
    null,
  );
  const [allestimento, setAllestimento] = useState<{
    salaId: number;
    id: number;
    f: FormAllestimento;
  } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      setDati(await fn());
      setMessaggio({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMessaggio({
        tipo: "errore",
        testo: e instanceof Error ? e.message : "Errore imprevisto.",
      });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function salvaSala() {
    if (!salaInModifica) return;
    const f = salaInModifica.f;
    const d = {
      nome: f.nome,
      descrizione: f.descrizione,
      capienzaMax: numOppureNull(f.capienzaMax),
      riassettoMinuti: Number(f.riassettoMinuti || 0),
      prezzoOrario: numOppureNull(f.prezzoOrario),
      attiva: f.attiva,
      prezziFascia: Object.fromEntries(
        Object.entries(f.prezziFascia).map(([k, v]) => [
          Number(k),
          numOppureNull(v),
        ]),
      ),
    };
    if (
      await esegui(
        () => sbusta(azioneSalvaSala(salaInModifica.id || null, d)),
        salaInModifica.id ? "Sala aggiornata." : "Sala creata.",
      )
    )
      setSalaInModifica(null);
  }

  const campo = (label: string, el: React.ReactNode, className = "") => (
    <label
      className={`flex flex-col gap-1 text-xs font-semibold text-stone-600 ${className}`}
    >
      {label}
      {el}
    </label>
  );

  function editorSala() {
    if (!salaInModifica) return null;
    const f = salaInModifica.f;
    const set = (p: Partial<FormSala>) =>
      setSalaInModifica({ ...salaInModifica, f: { ...f, ...p } });
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {campo(
            "Nome",
            <input
              className={CELLA}
              value={f.nome}
              onChange={(e) => set({ nome: e.target.value })}
              placeholder="es. Sala Congressi"
            />,
          )}
          {campo(
            "Capienza massima",
            <input
              type="number"
              min={1}
              className={CELLA}
              value={f.capienzaMax}
              onChange={(e) => set({ capienzaMax: e.target.value })}
            />,
          )}
          {campo(
            "Riassetto tra eventi (minuti)",
            <input
              type="number"
              min={0}
              step={15}
              className={CELLA}
              value={f.riassettoMinuti}
              onChange={(e) => set({ riassettoMinuti: e.target.value })}
            />,
          )}
          {campo(
            "Prezzo orario (€)",
            <input
              type="number"
              min={0}
              step="0.01"
              className={CELLA}
              value={f.prezzoOrario}
              onChange={(e) => set({ prezzoOrario: e.target.value })}
              placeholder="vuoto = non a ore"
            />,
          )}
        </div>
        {campo(
          "Descrizione",
          <input
            className={CELLA}
            value={f.descrizione}
            onChange={(e) => set({ descrizione: e.target.value })}
          />,
        )}
        <div>
          <p className="mb-1 text-xs font-semibold text-stone-600">
            Prezzo per fascia (vuoto = fascia non a prezzo fisso: si contano le
            ore)
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dati.fasce.map((fa) => (
              <div key={fa.id}>
                {campo(
                  `${fa.nome} ${fa.inizio}–${fa.fine}`,
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={CELLA}
                    value={f.prezziFascia[fa.id] ?? ""}
                    onChange={(e) =>
                      set({
                        prezziFascia: {
                          ...f.prezziFascia,
                          [fa.id]: e.target.value,
                        },
                      })
                    }
                  />,
                )}
              </div>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={f.attiva}
            onChange={(e) => set({ attiva: e.target.checked })}
          />{" "}
          Attiva (prenotabile e visibile nel planning)
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            className={BOTTONE}
            onClick={salvaSala}
          >
            Salva
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-stone-600"
            onClick={() => setSalaInModifica(null)}
          >
            Annulla
          </button>
        </div>
      </div>
    );
  }

  function righeAllestimenti(s: Sala) {
    const inModifica = allestimento?.salaId === s.id ? allestimento : null;
    const setA = (p: Partial<FormAllestimento>) =>
      inModifica &&
      setAllestimento({ ...inModifica, f: { ...inModifica.f, ...p } });
    const salvaA = async () => {
      if (!inModifica) return;
      const d = {
        nome: inModifica.f.nome,
        capienza: Number(inModifica.f.capienza),
        costo: Number(inModifica.f.costo || 0),
        attivo: inModifica.f.attivo,
      };
      if (
        await esegui(
          () => sbusta(azioneSalvaAllestimento(s.id, inModifica.id || null, d)),
          "Allestimento salvato.",
        )
      )
        setAllestimento(null);
    };
    const editor = (key: string) =>
      inModifica && (
        <tr key={key} className="border-t border-stone-100 bg-teal-50/40">
          <td data-label="Allestimento" className="py-1.5 pr-2">
            <input
              className={CELLA}
              value={inModifica.f.nome}
              onChange={(e) => setA({ nome: e.target.value })}
              placeholder="es. Platea"
            />
          </td>
          <td data-label="Capienza" className="py-1.5 pr-2">
            <input
              type="number"
              min={1}
              className={CELLA}
              value={inModifica.f.capienza}
              onChange={(e) => setA({ capienza: e.target.value })}
            />
          </td>
          <td data-label="Costo" className="py-1.5 pr-2">
            <input
              type="number"
              min={0}
              step="0.01"
              className={CELLA}
              value={inModifica.f.costo}
              onChange={(e) => setA({ costo: e.target.value })}
            />
          </td>
          <td data-label="Attivo" className="py-1.5 pr-2">
            <input
              type="checkbox"
              checked={inModifica.f.attivo}
              onChange={(e) => setA({ attivo: e.target.checked })}
            />
          </td>
          <td className="cella-intera py-1.5 md:text-right">
            <button
              type="button"
              disabled={busy}
              className={`mr-2 ${BOTTONE}`}
              onClick={salvaA}
            >
              Salva
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-stone-600"
              onClick={() => setAllestimento(null)}
            >
              Annulla
            </button>
          </td>
        </tr>
      );
    return (
      <table className="tabella-responsive w-full text-sm">
        <thead className="text-left text-xs uppercase text-stone-500">
          <tr>
            <th className="pb-1 pr-2">Allestimento</th>
            <th className="pb-1 pr-2">Capienza</th>
            <th className="pb-1 pr-2">Costo</th>
            <th className="pb-1 pr-2">Attivo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {s.allestimenti.map((a) =>
            inModifica?.id === a.id ? (
              editor(`e${a.id}`)
            ) : (
              <tr
                key={a.id}
                className={`border-t border-stone-100 ${a.attivo ? "" : "text-stone-400"}`}
              >
                <td
                  data-label="Allestimento"
                  className="py-1.5 pr-2 font-semibold"
                >
                  {a.nome}
                </td>
                <td data-label="Capienza" className="py-1.5 pr-2">
                  {a.capienza}
                </td>
                <td data-label="Costo" className="py-1.5 pr-2 font-mono">
                  {euro(a.costo)}
                </td>
                <td data-label="Attivo" className="py-1.5 pr-2">
                  {a.attivo ? "Sì" : "No"}
                </td>
                <td className="cella-intera py-1.5 md:text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-teal-700"
                    onClick={() =>
                      setAllestimento({
                        salaId: s.id,
                        id: a.id,
                        f: {
                          nome: a.nome,
                          capienza: String(a.capienza),
                          costo: String(a.costo),
                          attivo: a.attivo,
                        },
                      })
                    }
                  >
                    Modifica
                  </button>
                </td>
              </tr>
            ),
          )}
          {inModifica?.id === 0 ? (
            editor("nuovo")
          ) : (
            <tr className="border-t border-stone-100">
              <td colSpan={5} className="cella-intera py-1.5">
                <button
                  type="button"
                  className="text-xs font-semibold text-teal-700"
                  onClick={() =>
                    setAllestimento({
                      salaId: s.id,
                      id: 0,
                      f: {
                        nome: "",
                        capienza: s.capienzaMax?.toString() ?? "",
                        costo: "0",
                        attivo: true,
                      },
                    })
                  }
                >
                  + Aggiungi allestimento
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  function righeFasce() {
    const f = fasciaInModifica;
    const set = (p: Partial<FormFascia>) =>
      f && setFasciaInModifica({ ...f, f: { ...f.f, ...p } });
    const salva = async () => {
      if (
        f &&
        (await esegui(
          () => sbusta(azioneSalvaFascia(f.id || null, f.f)),
          "Fascia salvata.",
        ))
      )
        setFasciaInModifica(null);
    };
    const editor = (key: string) =>
      f && (
        <tr key={key} className="border-t border-stone-100 bg-teal-50/40">
          <td data-label="Fascia" className="py-1.5 pr-2">
            <input
              className={CELLA}
              value={f.f.nome}
              onChange={(e) => set({ nome: e.target.value })}
            />
          </td>
          <td data-label="Dalle" className="py-1.5 pr-2">
            <input
              className={CELLA}
              value={f.f.inizio}
              onChange={(e) => set({ inizio: e.target.value })}
              placeholder="08:00"
            />
          </td>
          <td data-label="Alle" className="py-1.5 pr-2">
            <input
              className={CELLA}
              value={f.f.fine}
              onChange={(e) => set({ fine: e.target.value })}
              placeholder="13:00"
            />
          </td>
          <td data-label="Nel planning" className="py-1.5 pr-2">
            <input
              type="checkbox"
              checked={f.f.mostraNelPlanning}
              onChange={(e) => set({ mostraNelPlanning: e.target.checked })}
            />
          </td>
          <td className="cella-intera py-1.5 md:text-right">
            <button
              type="button"
              disabled={busy}
              className={`mr-2 ${BOTTONE}`}
              onClick={salva}
            >
              Salva
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-stone-600"
              onClick={() => setFasciaInModifica(null)}
            >
              Annulla
            </button>
          </td>
        </tr>
      );
    return (
      <>
        {dati.fasce.map((fa) =>
          f?.id === fa.id ? (
            editor(`f${fa.id}`)
          ) : (
            <tr key={fa.id} className="border-t border-stone-100">
              <td data-label="Fascia" className="py-1.5 pr-2 font-semibold">
                {fa.nome}
              </td>
              <td data-label="Dalle" className="py-1.5 pr-2 font-mono">
                {fa.inizio}
              </td>
              <td data-label="Alle" className="py-1.5 pr-2 font-mono">
                {fa.fine}
              </td>
              <td data-label="Nel planning" className="py-1.5 pr-2">
                {fa.mostraNelPlanning ? "Sì" : "No"}
              </td>
              <td className="cella-intera py-1.5 md:text-right">
                {fasciaDaEliminare === fa.id ? (
                  <span className="text-xs">
                    Eliminare {fa.nome}?{" "}
                    <button
                      type="button"
                      disabled={busy}
                      className="font-bold text-red-600"
                      onClick={async () => {
                        await esegui(
                          () => sbusta(azioneEliminaFascia(fa.id)),
                          "Fascia eliminata.",
                        );
                        setFasciaDaEliminare(null);
                      }}
                    >
                      Sì, elimina
                    </button>{" "}
                    <button
                      type="button"
                      className="font-semibold text-stone-600"
                      onClick={() => setFasciaDaEliminare(null)}
                    >
                      No
                    </button>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="mr-2 text-xs font-semibold text-teal-700"
                      onClick={() =>
                        setFasciaInModifica({
                          id: fa.id,
                          f: {
                            nome: fa.nome,
                            inizio: fa.inizio,
                            fine: fa.fine,
                            mostraNelPlanning: fa.mostraNelPlanning,
                          },
                        })
                      }
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-red-600"
                      onClick={() => setFasciaDaEliminare(fa.id)}
                    >
                      Elimina
                    </button>
                  </>
                )}
              </td>
            </tr>
          ),
        )}
        {f?.id === 0 ? (
          editor("nuova")
        ) : (
          <tr className="border-t border-stone-100">
            <td colSpan={5} className="cella-intera py-1.5">
              <button
                type="button"
                className="text-xs font-semibold text-teal-700"
                onClick={() =>
                  setFasciaInModifica({
                    id: 0,
                    f: {
                      nome: "",
                      inizio: "",
                      fine: "",
                      mostraNelPlanning: true,
                    },
                  })
                }
              >
                + Aggiungi fascia
              </button>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Sale e fasce orarie</h1>
        <p className="text-sm text-stone-600">
          Il prezzo di una sala è quello della fascia se l&apos;orario coincide
          con una fascia a prezzo fisso, altrimenti ore × prezzo orario;
          l&apos;allestimento si aggiunge a parte. Il prezzo resta correggibile
          nella singola prenotazione.
        </p>
      </div>
      {messaggio && (
        <p
          className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
        >
          {messaggio.testo}
        </p>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="mb-1 font-bold">Fasce orarie</h2>
        <p className="mb-2 text-xs text-stone-500">
          Le fasce &quot;nel planning&quot; dividono le celle del planning (es.
          Mattina, Pomeriggio, Sera); quelle che ne coprono altre (es. Giornata
          intera) servono solo per prenotare e dare il prezzo. &quot;24:00&quot;
          = mezzanotte.
        </p>
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1 pr-2">Fascia</th>
              <th className="pb-1 pr-2">Dalle</th>
              <th className="pb-1 pr-2">Alle</th>
              <th className="pb-1 pr-2">Nel planning</th>
              <th />
            </tr>
          </thead>
          <tbody>{righeFasce()}</tbody>
        </table>
      </section>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sale</h2>
        {!salaInModifica && (
          <button
            type="button"
            className="text-sm font-semibold text-teal-700"
            onClick={() =>
              setSalaInModifica({ id: 0, f: formDaSala(null, dati.fasce) })
            }
          >
            + Nuova sala
          </button>
        )}
      </div>
      {salaInModifica?.id === 0 && editorSala()}
      {dati.sale.length === 0 && !salaInModifica && (
        <p className="text-sm text-stone-500">
          Nessuna sala: creane una con &quot;+ Nuova sala&quot;.
        </p>
      )}

      {dati.sale.map((s) => (
        <section
          key={s.id}
          className={`rounded-xl border border-stone-200 bg-white p-4 sm:p-5 ${s.attiva ? "" : "opacity-70"}`}
        >
          {salaInModifica?.id === s.id ? (
            editorSala()
          ) : (
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold">
                  {s.nome}{" "}
                  {!s.attiva && (
                    <span className="ml-1 rounded bg-stone-200 px-1.5 py-0.5 text-xs text-stone-600">
                      non attiva
                    </span>
                  )}
                </h3>
                {s.descrizione && (
                  <p className="text-sm text-stone-600">{s.descrizione}</p>
                )}
                <p className="mt-1 text-xs text-stone-600">
                  Capienza {s.capienzaMax ?? "—"} · Riassetto{" "}
                  {s.riassettoMinuti} min · A ore{" "}
                  {s.prezzoOrario === null
                    ? "no"
                    : `${euro(s.prezzoOrario)}/ora`}
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  {dati.fasce
                    .filter((f) => s.prezziFascia[f.id] !== undefined)
                    .map((f) => `${f.nome} ${euro(s.prezziFascia[f.id])}`)
                    .join(" · ") || "Nessun prezzo per fascia"}
                </p>
              </div>
              {!salaInModifica && (
                <button
                  type="button"
                  className="text-xs font-semibold text-teal-700"
                  onClick={() =>
                    setSalaInModifica({
                      id: s.id,
                      f: formDaSala(s, dati.fasce),
                    })
                  }
                >
                  Modifica
                </button>
              )}
            </div>
          )}
          {righeAllestimenti(s)}
        </section>
      ))}
    </div>
  );
}
