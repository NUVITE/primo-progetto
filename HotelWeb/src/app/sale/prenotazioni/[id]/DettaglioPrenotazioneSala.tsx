"use client";

import Link from "next/link";
import { Suggerimento } from "@/components/Suggerimento";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import {
  azioneAggiornaTestata,
  azioneAggiungiOccupazione,
  azioneAggiungiServizio,
  azioneModificaOccupazione,
  azionePrezzoOccupazione,
  azioneRimuoviOccupazione,
  azioneRimuoviServizio,
  datiDettaglioSala,
} from "../../actions";
import {
  BOTTONE,
  CampiOccupazione,
  CampiTestata,
  CELLA,
  ETICHETTA_STATO,
  euro,
  inputOccupazione,
  inputTestata,
  it,
  occupazioneVuota,
  type Contesto,
  type FormOccupazione,
  type FormTestata,
} from "../../componenti";

type Dettaglio = Awaited<ReturnType<typeof datiDettaglioSala>>["dettaglio"];
type FormServizio = {
  servizioCatalogoId: string;
  descrizione: string;
  prezzoUnitario: string;
  quantita: string;
  data: string;
  note: string;
};

export function DettaglioPrenotazioneSala({
  iniziale,
  contestoIniziale,
}: {
  iniziale: Dettaglio;
  contestoIniziale: Contesto | null;
}) {
  const [d, setD] = useState(iniziale);
  const [contesto, setContesto] = useState(contestoIniziale);
  const puoGestire = contesto !== null;
  const [messaggio, setMessaggio] = useState<{
    tipo: "ok" | "errore";
    testo: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [testata, setTestata] = useState<FormTestata | null>(null);
  // Occupazione in modifica: id, 0 = nuova.
  const [occupazione, setOccupazione] = useState<{
    id: number;
    f: FormOccupazione;
  } | null>(null);
  const [prezzo, setPrezzo] = useState<{ id: number; valore: string } | null>(
    null,
  );
  const [daRimuovere, setDaRimuovere] = useState<number | null>(null);
  const [servizioDaTogliere, setServizioDaTogliere] = useState<number | null>(
    null,
  );
  const [servizio, setServizio] = useState<FormServizio | null>(null);

  async function esegui(fn: () => Promise<Dettaglio>, ok: string) {
    setMessaggio(null);
    setBusy(true);
    try {
      setD(await fn());
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

  const stato = ETICHETTA_STATO[d.stato] ?? ETICHETTA_STATO.opzione;
  const annullata = d.stato === "annullata";
  const primaFascia = String(contesto?.fasce[0]?.id ?? "");

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link
          href="/sale/prenotazioni"
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
        >
          ← Prenotazioni sale
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{d.titolo}</h1>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${stato.classe}`}
          >
            {stato.testo}
          </span>
          {d.stato === "opzione" && d.scadenzaOpzione && (
            <span className="text-xs text-stone-600">
              fino al {it(d.scadenzaOpzione)}
            </span>
          )}
        </div>
        <p className="text-sm text-stone-600">
          {d.cliente && <>Cliente: {d.cliente.denominazione}</>}
          {d.cliente && d.prenotazione && " · "}
          {d.prenotazione && (
            <>
              Prenotazione camere{" "}
              <Link
                className="font-semibold text-teal-700"
                href={`/prenotazioni/${d.prenotazione.id}`}
              >
                #{d.prenotazione.id} {d.prenotazione.intestatario}
              </Link>
            </>
          )}
          {d.partecipanti ? ` · ${d.partecipanti} partecipanti` : ""}
        </p>
        {d.note && <p className="text-sm text-stone-600">Note: {d.note}</p>}
      </div>

      <Suggerimento id="dettaglio-evento" titolo="Come si gestisce un evento">
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Con <strong>Modifica dati, stato o cliente</strong> confermi
            l&apos;opzione, cambi cliente o partecipanti, oppure annulli
            l&apos;evento (le sale si liberano).
          </li>
          <li>
            In <strong>Sale e orari</strong> aggiungi altri giorni o sale; con{" "}
            <strong>Prezzo</strong> correggi il prezzo di una sala (per uno
            sconto concordato).
          </li>
          <li>
            In <strong>Servizi</strong> aggiungi coffee break, pranzi,
            attrezzature: il totale dell&apos;evento si aggiorna subito.
          </li>
        </ol>
      </Suggerimento>
      {messaggio && (
        <p
          className={`rounded-md px-3 py-2 text-sm font-semibold ${messaggio.tipo === "ok" ? "border border-emerald-300 bg-emerald-50 text-emerald-900" : "border border-red-300 bg-red-50 text-red-800"}`}
        >
          {messaggio.testo}
        </p>
      )}
      {d.avvisi.map((a) => (
        <p
          key={a}
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {a}
        </p>
      ))}

      {puoGestire &&
        (testata ? (
          <section className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 sm:p-5">
            <CampiTestata
              contesto={contesto}
              valore={testata}
              onChange={setTestata}
              onContesto={setContesto}
              statiAmmessi={["opzione", "confermata", "annullata"]}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className={BOTTONE}
                onClick={async () => {
                  if (
                    await esegui(
                      () =>
                        sbusta(
                          azioneAggiornaTestata(d.id, inputTestata(testata)),
                        ),
                      "Prenotazione aggiornata.",
                    )
                  )
                    setTestata(null);
                }}
              >
                Salva
              </button>
              <button
                type="button"
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                onClick={() => setTestata(null)}
              >
                Annulla
              </button>
            </div>
          </section>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-10"
              onClick={() =>
                setTestata({
                  titolo: d.titolo,
                  clienteId: d.cliente ? String(d.cliente.id) : "",
                  prenotazioneId: d.prenotazione
                    ? String(d.prenotazione.id)
                    : "",
                  stato: d.stato,
                  scadenzaOpzione: d.scadenzaOpzione,
                  partecipanti: d.partecipanti ? String(d.partecipanti) : "",
                  note: d.note,
                })
              }
            >
              Modifica dati, stato o cliente
            </button>
          </div>
        ))}

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-2 font-bold">Sale e orari</h2>
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1 pr-2">Giorno</th>
              <th className="pb-1 pr-2">Sala</th>
              <th className="pb-1 pr-2">Orario</th>
              <th className="pb-1 pr-2">Allestimento</th>
              <th className="pb-1 pr-2">Persone</th>
              <th className="pb-1 pr-2 md:text-right">Sala €</th>
              <th className="pb-1 pr-2 md:text-right">Allest. €</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {d.occupazioni.map((o) =>
              occupazione?.id === o.id && contesto ? (
                <tr key={o.id} className="border-t border-stone-100">
                  <td colSpan={8} className="cella-intera py-2">
                    <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3">
                      <CampiOccupazione
                        contesto={contesto}
                        valore={occupazione.f}
                        onChange={(f) => setOccupazione({ id: o.id, f })}
                        escludiOccupazioneId={o.id}
                      />
                      <p className="mt-1 text-sm text-stone-600">
                        Salvando si ricalcola il prezzo (anche se era stato
                        corretto a mano).
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          className={BOTTONE}
                          onClick={async () => {
                            if (
                              await esegui(
                                () =>
                                  sbusta(
                                    azioneModificaOccupazione(
                                      d.id,
                                      o.id,
                                      inputOccupazione(occupazione.f),
                                    ),
                                  ),
                                "Orario aggiornato.",
                              )
                            )
                              setOccupazione(null);
                          }}
                        >
                          Salva
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                          onClick={() => setOccupazione(null)}
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={o.id} className="border-t border-stone-100">
                  <td data-label="Giorno" className="py-1.5 pr-2 font-mono">
                    {it(o.giorno)}
                  </td>
                  <td data-label="Sala" className="py-1.5 pr-2 font-semibold">
                    {o.sala}
                  </td>
                  <td data-label="Orario" className="py-1.5 pr-2">
                    {o.inizio}–{o.fine}
                    {o.fascia && (
                      <span className="ml-1 text-xs text-stone-500">
                        {o.fascia}
                      </span>
                    )}
                  </td>
                  <td data-label="Allestimento" className="py-1.5 pr-2">
                    {o.allestimento ?? "—"}
                  </td>
                  <td data-label="Persone" className="py-1.5 pr-2">
                    {o.partecipanti ?? d.partecipanti ?? "—"}
                  </td>
                  <td
                    data-label="Sala €"
                    className="whitespace-nowrap py-1.5 pr-2 font-mono md:text-right"
                  >
                    {prezzo?.id === o.id ? (
                      <span className="flex items-center gap-1 md:justify-end">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${CELLA} w-24`}
                          value={prezzo.valore}
                          onChange={(e) =>
                            setPrezzo({ id: o.id, valore: e.target.value })
                          }
                        />
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                          onClick={async () => {
                            if (
                              await esegui(
                                () =>
                                  sbusta(
                                    azionePrezzoOccupazione(
                                      d.id,
                                      o.id,
                                      Number(prezzo.valore),
                                    ),
                                  ),
                                "Prezzo corretto.",
                              )
                            )
                              setPrezzo(null);
                          }}
                        >
                          OK
                        </button>
                      </span>
                    ) : (
                      <>
                        {euro(o.prezzo)}
                        {o.prezzoManuale && (
                          <span
                            className="ml-1 text-xs text-amber-700"
                            title="Prezzo corretto a mano"
                          >
                            ✎
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td
                    data-label="Allest. €"
                    className="whitespace-nowrap py-1.5 pr-2 font-mono md:text-right"
                  >
                    {o.costoAllestimento ? euro(o.costoAllestimento) : "—"}
                  </td>
                  <td className="cella-intera py-1.5 md:text-right">
                    {puoGestire &&
                      !annullata &&
                      !occupazione &&
                      (daRimuovere === o.id ? (
                        <span className="text-xs">
                          Togliere?{" "}
                          <button
                            type="button"
                            disabled={busy}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                            onClick={async () => {
                              await esegui(
                                () =>
                                  sbusta(azioneRimuoviOccupazione(d.id, o.id)),
                                "Sala tolta dall'evento.",
                              );
                              setDaRimuovere(null);
                            }}
                          >
                            Sì
                          </button>{" "}
                          <button
                            type="button"
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                            onClick={() => setDaRimuovere(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <span className="flex flex-wrap gap-2 md:justify-end">
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                            onClick={() =>
                              setOccupazione({
                                id: o.id,
                                f: {
                                  salaId: String(o.salaId),
                                  giorno: o.giorno,
                                  fasciaId: o.fasciaId
                                    ? String(o.fasciaId)
                                    : "",
                                  inizio: o.inizio,
                                  fine: o.fine,
                                  allestimentoId: o.allestimentoId
                                    ? String(o.allestimentoId)
                                    : "",
                                  partecipanti: o.partecipanti
                                    ? String(o.partecipanti)
                                    : "",
                                },
                              })
                            }
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                            onClick={() =>
                              setPrezzo({ id: o.id, valore: String(o.prezzo) })
                            }
                          >
                            Prezzo
                          </button>
                          {d.occupazioni.length > 1 && (
                            <button
                              type="button"
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                              onClick={() => setDaRimuovere(o.id)}
                            >
                              Togli
                            </button>
                          )}
                        </span>
                      ))}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {puoGestire &&
          !annullata &&
          contesto &&
          (occupazione?.id === 0 ? (
            <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50/40 p-3">
              <CampiOccupazione
                contesto={contesto}
                valore={occupazione.f}
                onChange={(f) => setOccupazione({ id: 0, f })}
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={BOTTONE}
                  onClick={async () => {
                    if (
                      await esegui(
                        () =>
                          sbusta(
                            azioneAggiungiOccupazione(
                              d.id,
                              inputOccupazione(occupazione.f),
                            ),
                          ),
                        "Sala aggiunta.",
                      )
                    )
                      setOccupazione(null);
                  }}
                >
                  Aggiungi
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                  onClick={() => setOccupazione(null)}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            !occupazione && (
              <button
                type="button"
                className="mt-2 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                onClick={() => {
                  const ultima = d.occupazioni[d.occupazioni.length - 1];
                  setOccupazione({
                    id: 0,
                    f: occupazioneVuota(
                      ultima
                        ? {
                            salaId: String(ultima.salaId),
                            fasciaId: ultima.fasciaId
                              ? String(ultima.fasciaId)
                              : "",
                            inizio: ultima.inizio,
                            fine: ultima.fine,
                          }
                        : { fasciaId: primaFascia },
                    ),
                  });
                }}
              >
                + Aggiungi giorno, sala o orario
              </button>
            )
          ))}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-2 font-bold">Servizi</h2>
        {d.servizi.length > 0 ? (
          <table className="tabella-responsive w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="pb-1 pr-2">Servizio</th>
                <th className="pb-1 pr-2">Giorno</th>
                <th className="pb-1 pr-2 md:text-right">Prezzo</th>
                <th className="pb-1 pr-2 md:text-right">Q.tà</th>
                <th className="pb-1 pr-2 md:text-right">Totale</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.servizi.map((s) => (
                <tr key={s.id} className="border-t border-stone-100">
                  <td data-label="Servizio" className="py-1.5 pr-2">
                    {s.nome}
                    {s.note && (
                      <div className="text-xs text-stone-500">{s.note}</div>
                    )}
                  </td>
                  <td data-label="Giorno" className="py-1.5 pr-2 font-mono">
                    {s.data ? it(s.data) : "—"}
                  </td>
                  <td
                    data-label="Prezzo"
                    className="whitespace-nowrap py-1.5 pr-2 font-mono md:text-right"
                  >
                    {euro(s.prezzoUnitario)}
                  </td>
                  <td data-label="Q.tà" className="py-1.5 pr-2 md:text-right">
                    {s.quantita}
                  </td>
                  <td
                    data-label="Totale"
                    className="whitespace-nowrap py-1.5 pr-2 font-mono md:text-right"
                  >
                    {euro(s.totale)}
                  </td>
                  <td className="cella-intera py-1.5 md:text-right">
                    {puoGestire &&
                      !annullata &&
                      (servizioDaTogliere === s.id ? (
                        <span className="flex flex-wrap items-center justify-end gap-2 text-sm">
                          <span className="font-semibold text-red-800">
                            Togliere?
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                            onClick={async () => {
                              await esegui(
                                () => sbusta(azioneRimuoviServizio(d.id, s.id)),
                                "Servizio tolto.",
                              );
                              setServizioDaTogliere(null);
                            }}
                          >
                            Sì, togli
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                            onClick={() => setServizioDaTogliere(null)}
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                          onClick={() => setServizioDaTogliere(s.id)}
                        >
                          Togli
                        </button>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-stone-500">Nessun servizio.</p>
        )}
        {puoGestire &&
          !annullata &&
          contesto &&
          (servizio ? (
            <div className="mt-3 grid gap-2 rounded-lg border border-teal-200 bg-teal-50/40 p-3 sm:grid-cols-3 lg:grid-cols-6">
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600 sm:col-span-2">
                Servizio
                <select
                  className={CELLA}
                  value={servizio.servizioCatalogoId}
                  onChange={(e) => {
                    const c = contesto.servizi.find(
                      (x) => x.id === Number(e.target.value),
                    );
                    setServizio({
                      ...servizio,
                      servizioCatalogoId: e.target.value,
                      prezzoUnitario: c
                        ? String(c.prezzo)
                        : servizio.prezzoUnitario,
                    });
                  }}
                >
                  <option value="">Altro (descrizione libera)</option>
                  {contesto.servizi.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({euro(c.prezzo)})
                    </option>
                  ))}
                </select>
              </label>
              {!servizio.servizioCatalogoId && (
                <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                  Descrizione
                  <input
                    className={CELLA}
                    value={servizio.descrizione}
                    onChange={(e) =>
                      setServizio({ ...servizio, descrizione: e.target.value })
                    }
                  />
                </label>
              )}
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Prezzo unitario
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={CELLA}
                  value={servizio.prezzoUnitario}
                  onChange={(e) =>
                    setServizio({ ...servizio, prezzoUnitario: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Quantità
                <input
                  type="number"
                  min={1}
                  className={CELLA}
                  value={servizio.quantita}
                  onChange={(e) =>
                    setServizio({ ...servizio, quantita: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                Giorno
                <input
                  type="date"
                  className={CELLA}
                  value={servizio.data}
                  onChange={(e) =>
                    setServizio({ ...servizio, data: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600 sm:col-span-3">
                Note
                <input
                  className={CELLA}
                  value={servizio.note}
                  onChange={(e) =>
                    setServizio({ ...servizio, note: e.target.value })
                  }
                />
              </label>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={BOTTONE}
                  onClick={async () => {
                    const ok = await esegui(
                      () =>
                        sbusta(
                          azioneAggiungiServizio(d.id, {
                            servizioCatalogoId: servizio.servizioCatalogoId
                              ? Number(servizio.servizioCatalogoId)
                              : null,
                            descrizione: servizio.descrizione,
                            prezzoUnitario: Number(
                              servizio.prezzoUnitario || 0,
                            ),
                            quantita: Number(servizio.quantita || 1),
                            data: servizio.data,
                            note: servizio.note,
                          }),
                        ),
                      "Servizio aggiunto.",
                    );
                    if (ok) setServizio(null);
                  }}
                >
                  Aggiungi
                </button>
                <button
                  type="button"
                  className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                  onClick={() => setServizio(null)}
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mt-2 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
              onClick={() =>
                setServizio({
                  servizioCatalogoId: "",
                  descrizione: "",
                  prezzoUnitario: "",
                  quantita: String(d.partecipanti ?? 1),
                  data: d.occupazioni[0]?.giorno ?? "",
                  note: "",
                })
              }
            >
              + Aggiungi servizio (coffee break, pranzo, attrezzature…)
            </button>
          ))}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <dl className="grid max-w-sm grid-cols-2 gap-1 text-sm">
          <dt>Sale e allestimenti</dt>
          <dd className="text-right font-mono">{euro(d.totali.sale)}</dd>
          <dt>Servizi</dt>
          <dd className="text-right font-mono">{euro(d.totali.servizi)}</dd>
          <dt className="font-bold">Totale evento</dt>
          <dd className="text-right font-mono font-bold">
            {euro(d.totali.totale)}
          </dd>
        </dl>
      </section>
    </div>
  );
}
