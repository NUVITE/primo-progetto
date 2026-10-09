"use client";

import { CheckCircle2, ChevronLeft, ChevronRight, Download, FileCheck2, Send } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Etichetta, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import type { inviaGiorniRoss1000 } from "@/lib/movimentoIstat";
import { azioneFileSpot, azioneInviaRoss1000, azioneMese, azioneSegnaCaricati, datiIstat } from "./actions";

type Dati = Awaited<ReturnType<typeof datiIstat>>;
type EsitoRoss = Awaited<ReturnType<typeof inviaGiorniRoss1000>>;

const it = (g: string) => g.split("-").reverse().join("/");
const giornoSettimana = (g: string) => new Date(`${g}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", timeZone: "UTC" });
const nomeMese = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const spostaMese = (m: string, n: number) => {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mm - 1 + n, 1)).toISOString().slice(0, 7);
};

const STATI = {
  da_inviare: { tono: "ambra", testo: "da comunicare" },
  inviato: { tono: "verde", testo: "comunicato" },
  da_rinviare: { tono: "ambra", testo: "cambiato dopo l'invio" },
  errore: { tono: "rosso", testo: "scarti" },
} as const;

export function MovimentoIstat({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [esitoRoss, setEsitoRoss] = useState<EsitoRoss | null>(null);
  // Dopo il download del file SPOT: i giorni contenuti, da segnare come caricati.
  const [fileScaricato, setFileScaricato] = useState<{ giorni: string[]; conAvvio: boolean } | null>(null);
  const ross = dati.sistema === "ROSS1000";
  const nPendenti = dati.pendenti.giorni.length;
  const giorniPronti = nPendenti - new Set(dati.pendenti.incompleti.map((i) => i.giorno)).size;

  async function esegui<T>(fn: () => Promise<T>) {
    setErrore(null);
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const titolo = (
    <IntestazionePagina
      titolo="ISTAT movimento turistico"
      sottotitolo={ross ? "Comunicazione giornaliera a Ross1000 (Regione)" : dati.sistema === "SPOT" ? "Comunicazione a SPOT - DMS Puglia" : "Arrivi, partenze e camere occupate per la statistica ISTAT"}
    />
  );

  if (!dati.sistema || !dati.primoGiorno) {
    return (
      <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
        {titolo}
        <Avviso tipo="info">
          {!dati.sistema ? (
            <>
              Non è ancora indicato il sistema ISTAT della regione (Ross1000 o SPOT): lo imposta il gestore della piattaforma, chiedi a lui di
              attivarlo.
            </>
          ) : (
            <>
              Manca il primo giorno da comunicare all&apos;ISTAT con HotelWeb.{" "}
              {dati.puoConfigurare ? (
                <Link href="/impostazioni/adempimenti" className="font-semibold underline">
                  Indicalo in Impostazioni &gt; Adempimenti
                </Link>
              ) : (
                "Chiedi all'amministratore dell'hotel di indicarlo."
              )}
            </>
          )}
        </Avviso>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      {titolo}
      <Suggerimento id={`istat-${ross ? "ross" : "spot"}`} titolo="Come funziona la comunicazione ISTAT">
        {ross ? (
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Ogni giorno la Regione vuole sapere se la struttura era aperta, quante camere erano occupate e chi è arrivato e partito. Lo calcola
              HotelWeb dai check-in e check-out.
            </li>
            <li>
              Premi <strong>Invia alla Regione</strong>: partono tutti i giorni fino a ieri non ancora comunicati. Il termine è{" "}
              <strong>la fine del mese successivo</strong>, ma conviene inviare spesso.
            </li>
            <li>
              Se dopo l&apos;invio correggi un check-in, il giorno torna «cambiato dopo l&apos;invio»: basta inviare di nuovo, la Regione sostituisce i dati.
            </li>
          </ol>
        ) : (
          <ol className="list-decimal space-y-1 pl-5">
            <li>SPOT vuole tutti i giorni, uno dopo l&apos;altro senza buchi: aperture, camere occupate, arrivi e partenze (senza nomi).</li>
            <li>
              Premi <strong>Scarica il file</strong>, caricalo sul portale SPOT e poi segna i giorni come caricati. Il termine è{" "}
              <strong>il 10 del mese successivo</strong>.
            </li>
            <li>Un giorno già caricato e poi modificato qui va corretto anche sul portale SPOT, a mano.</li>
          </ol>
        )}
      </Suggerimento>

      {ross && !dati.credenzialiRoss && (
        <Avviso tipo="info">
          L&apos;invio non è ancora configurato: mancano codice struttura e credenziali di Ross1000.{" "}
          {dati.puoConfigurare ? (
            <Link href="/impostazioni/adempimenti" className="font-semibold underline">
              Inseriscili in Impostazioni &gt; Adempimenti
            </Link>
          ) : (
            "Chiedi all'amministratore dell'hotel di inserirli."
          )}
        </Avviso>
      )}
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
      {esitoRoss && (
        <Avviso tipo={esitoRoss.risultati.every((r) => r.ok) && esitoRoss.risultati.length ? "ok" : "avviso"}>
          <strong>
            {esitoRoss.risultati.length === 0
              ? "Nessun giorno inviato."
              : `Inviati ${esitoRoss.risultati.filter((r) => !r.errore).length} giorni: ${esitoRoss.risultati.filter((r) => r.ok).length} accettati per intero.`}
          </strong>
          {esitoRoss.risultati
            .filter((r) => !r.ok)
            .map((r) => (
              <div key={r.giorno}>
                {it(r.giorno)}: {r.errore ?? r.scarti.map((s) => `${s.nome} — ${s.errore}`).join("; ")}
              </div>
            ))}
          {esitoRoss.saltati.length > 0 && <div>Non inviati perché ci sono dati incompleti: {esitoRoss.saltati.map(it).join(", ")}.</div>}
        </Avviso>
      )}

      <Sezione
        titolo={nPendenti ? `Da comunicare (${nPendenti} ${nPendenti === 1 ? "giorno" : "giorni"})` : "Da comunicare"}
        azioni={
          nPendenti > 0 &&
          (ross ? (
            <Pulsante
              variante="primario"
              icona={Send}
              disabled={busy || !dati.credenzialiRoss || giorniPronti === 0}
              onClick={async () => {
                const r = await esegui(() => sbusta(azioneInviaRoss1000(dati.mese)));
                if (r) {
                  setEsitoRoss(r.esito);
                  setDati(r.dati);
                }
              }}
            >
              {busy ? "Invio in corso…" : `Invia alla Regione (${giorniPronti})`}
            </Pulsante>
          ) : (
            <Pulsante
              variante="primario"
              icona={Download}
              disabled={busy}
              onClick={async () => {
                const f = await esegui(() => sbusta(azioneFileSpot()));
                if (!f) return;
                const url = URL.createObjectURL(new Blob([f.xml], { type: "application/xml;charset=utf-8" }));
                const link = document.createElement("a");
                link.href = url;
                link.download = f.nome;
                link.click();
                URL.revokeObjectURL(url);
                setFileScaricato({ giorni: f.giorni, conAvvio: f.conAvvio });
              }}
            >
              Scarica il file
            </Pulsante>
          ))
        }
      >
        {fileScaricato && (
          <Avviso
            tipo="info"
            className="mb-3"
            azione={
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                icona={FileCheck2}
                disabled={busy}
                onClick={async () => {
                  const r = await esegui(() => sbusta(azioneSegnaCaricati(fileScaricato.giorni, dati.mese)));
                  if (r) {
                    setDati(r);
                    setFileScaricato(null);
                  }
                }}
              >
                Sì, segna come caricati
              </Pulsante>
            }
          >
            File scaricato con i giorni dal {it(fileScaricato.giorni[0])} al {it(fileScaricato.giorni[fileScaricato.giorni.length - 1])}
            {fileScaricato.conAvvio ? " (con l'avvio: gli ospiti già presenti la sera prima)" : ""}. Dopo averlo caricato sul portale SPOT ed
            esserti accertato che sia stato accettato, segna i giorni come caricati.
          </Avviso>
        )}
        {nPendenti === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Tutti i giorni fino a ieri sono comunicati.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-stone-800">
              Dal <strong>{it(dati.pendenti.giorni[0])}</strong>
              {nPendenti > 1 && (
                <>
                  {" "}
                  al <strong>{it(dati.pendenti.giorni[nPendenti - 1])}</strong>
                </>
              )}
              .{" "}
              {dati.pendenti.primaScadenza && (
                <span className={dati.pendenti.scaduti ? "font-semibold text-red-700" : "text-stone-700"}>
                  {dati.pendenti.scaduti
                    ? `${dati.pendenti.scaduti} ${dati.pendenti.scaduti === 1 ? "giorno è" : "giorni sono"} oltre il termine.`
                    : `Primo termine: ${it(dati.pendenti.primaScadenza)}.`}
                </span>
              )}
            </p>
            {dati.pendenti.incompleti.length > 0 && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-950">
                <p className="font-semibold">
                  {ross ? "Questi giorni non partono finché non completi i dati al check-in:" : "Il file si ferma al primo giorno con dati incompleti. Completa al check-in:"}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {dati.pendenti.incompleti.map((i, k) => (
                    <li key={k}>
                      {it(i.giorno)} ·{" "}
                      <Link href={`/prenotazioni/${i.prenotazioneId}`} className="font-semibold underline">
                        {i.nome}
                      </Link>
                      : mancano {i.mancanti.join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Sezione>

      <Sezione
        titolo={<span className="capitalize">{nomeMese(dati.mese)}</span>}
        azioni={
          <>
            <Pulsante
              dimensione="piccolo"
              icona={ChevronLeft}
              disabled={busy}
              aria-label="Mese precedente"
              onClick={async () => {
                const r = await esegui(() => sbusta(azioneMese(spostaMese(dati.mese, -1))));
                if (r) setDati(r);
              }}
            >
              Mese prima
            </Pulsante>
            <Pulsante
              dimensione="piccolo"
              disabled={busy}
              onClick={async () => {
                const r = await esegui(() => sbusta(azioneMese(spostaMese(dati.mese, 1))));
                if (r) setDati(r);
              }}
            >
              Mese dopo <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Pulsante>
          </>
        }
      >
        <AiutoSezione breve="Cosa è stato (o sarà) comunicato per ogni giorno del mese, fino a ieri.">
          <p>
            <strong>Camere</strong> = occupate su disponibili (le camere fuori servizio non contano; nei giorni del calendario di chiusura tutto vale zero).{" "}
            <strong>Letti</strong> = posti letto delle camere disponibili, senza i letti aggiunti. <strong>Presenti</strong> = persone che hanno dormito
            in struttura quella notte.
          </p>
          <Esempio>
            Il 10 arrivano due coniugi e partono il 13: risultano «arrivi» il 10, «presenti» il 10, 11 e 12, «partenze» il 13. Un cambio camera a metà
            soggiorno non è una nuova partenza.
          </Esempio>
        </AiutoSezione>
        {dati.giorni.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Nessun giorno da mostrare: il mese è prima del primo giorno comunicato ({it(dati.primoGiorno)}) o non è ancora iniziato.</p>
        ) : (
          <table className="tabella-responsive mt-3 w-full text-sm">
            <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
              <tr>
                <th className="py-1.5 pr-2">Giorno</th>
                <th className="py-1.5 pr-2">Camere</th>
                <th className="py-1.5 pr-2">Letti</th>
                <th className="py-1.5 pr-2">Arrivi</th>
                <th className="py-1.5 pr-2">Partenze</th>
                <th className="py-1.5 pr-2">Presenti</th>
                <th className="py-1.5 pr-2">Stato</th>
              </tr>
            </thead>
            <tbody>
              {dati.giorni.map((g) => {
                const s = STATI[g.stato];
                const note = g.incompleti.length + g.avvisi.length + g.scarti.length > 0 || !!g.erroreInvio || (g.stato === "da_rinviare" && !ross);
                return (
                  <Fragment key={g.giorno}>
                    <tr className={`${note ? "" : "border-b border-stone-100"} align-top`}>
                      <td data-label="Giorno" className="py-1.5 pr-2 font-semibold whitespace-nowrap text-stone-900">
                        {giornoSettimana(g.giorno)}
                      </td>
                      <td data-label="Camere" className="py-1.5 pr-2 font-mono">
                        {g.aperto ? `${g.camereOccupate} / ${g.camereDisponibili}` : <Etichetta>chiuso</Etichetta>}
                      </td>
                      <td data-label="Letti" className="py-1.5 pr-2 font-mono">
                        {g.aperto ? g.lettiDisponibili : "—"}
                      </td>
                      <td data-label="Arrivi" className="py-1.5 pr-2" title={g.arrivi.map((a) => a.nome).join(", ")}>
                        {g.arrivi.length || "—"}
                      </td>
                      <td data-label="Partenze" className="py-1.5 pr-2" title={g.partenze.map((a) => a.nome).join(", ")}>
                        {g.partenze.length || "—"}
                      </td>
                      <td data-label="Presenti" className="py-1.5 pr-2">
                        {g.presenti || "—"}
                      </td>
                      <td data-label="Stato" className="py-1.5 pr-2">
                        <Etichetta tono={g.incompleti.length && g.stato !== "inviato" ? "rosso" : s.tono}>
                          {g.incompleti.length && g.stato !== "inviato" ? "dati incompleti" : s.testo}
                        </Etichetta>
                        {g.inviatoIl && (
                          <div className="mt-0.5 text-xs text-stone-500">
                            {new Date(g.inviatoIl).toLocaleDateString("it-IT")} · {g.inviatoDa}
                          </div>
                        )}
                      </td>
                    </tr>
                    {note && (
                      <tr className="border-b border-stone-100">
                        <td colSpan={7} className="pb-2 text-xs">
                          <ul className="space-y-0.5 rounded bg-stone-50 px-2 py-1">
                            {g.incompleti.map((i, k) => (
                              <li key={`i${k}`} className="text-red-800">
                                <Link href={`/prenotazioni/${i.prenotazioneId}`} className="font-semibold underline">
                                  {i.nome}
                                </Link>
                                : mancano {i.mancanti.join(", ")}
                              </li>
                            ))}
                            {g.scarti.map((x, k) => (
                              <li key={`s${k}`} className="text-red-800">
                                Scartato dalla Regione ({x.idswh}): {x.errore}
                              </li>
                            ))}
                            {g.avvisi.map((a, k) => (
                              <li key={`a${k}`} className="text-amber-900">
                                {a}
                              </li>
                            ))}
                            {g.stato === "da_rinviare" && !ross && (
                              <li className="text-amber-900">Già caricato su SPOT e poi modificato qui: correggi il giorno anche sul portale SPOT.</li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Sezione>
    </div>
  );
}
