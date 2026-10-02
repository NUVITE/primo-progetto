"use client";

import { Ban, CalendarClock, CheckCircle2, Plus, RotateCcw, Undo2, Wallet } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Dato, Etichetta, Input, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import {
  azioneAnnulla,
  azioneConferma,
  azionePenaleProposta,
  azioneRegistraPagamento,
  azioneRiattiva,
  azioneScadenze,
  azioneStornaPagamento,
  caricaPrenotazione,
} from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;

const eur = (n: number) => `€ ${n.toFixed(2)}`;
const it = (iso: string) => iso.split("-").reverse().join("/");
const oggiIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pannello = "flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3";

const MOTIVI = [
  { valore: "cliente", testo: "Annullata dal cliente" },
  { valore: "no_show", testo: "Mancato arrivo (no-show)" },
  { valore: "errore", testo: "Errore di inserimento" },
  { valore: "altro", testo: "Altro" },
] as const;
const METODI = [
  ["contanti", "Contanti"],
  ["carta", "Carta di credito"],
  ["bancomat", "Bancomat"],
  ["bonifico", "Bonifico"],
  ["assegno", "Assegno"],
  ["altro", "Altro"],
] as const;

/** Stato della prenotazione in testa al dettaglio: conferma, annullamento guidato, riattivazione. */
export function BarraStato({
  prenotazione,
  puoGestire,
  puoIncassare,
  salvando,
  esegui,
  aggiorna,
}: {
  prenotazione: Prenotazione;
  puoGestire: boolean;
  puoIncassare: boolean;
  salvando: boolean;
  esegui: Esegui;
  aggiorna: (p: Prenotazione) => void;
}) {
  const [annulla, setAnnulla] = useState<null | {
    motivo: (typeof MOTIVI)[number]["valore"];
    nota: string;
    penale: string;
    spiegazione: string;
    rimborsa: boolean;
    metodo: string;
  }>(null);
  const p = prenotazione;
  const incassato = p.totali.pagato;
  const scaduta = p.stato === "OPZIONE" && p.scadenzaOpzione && p.scadenzaOpzione < oggiIso();
  const conArrivi = p.segmenti.some((s) => s.occupanti.some((o) => o.stato !== "attesa"));

  // Penale proposta dalla politica di cancellazione per quel motivo: si può sempre cambiare.
  async function apriAnnulla(motivo: (typeof MOTIVI)[number]["valore"], base?: NonNullable<typeof annulla>) {
    const r = await esegui(() => sbusta(azionePenaleProposta(p.id, motivo)));
    setAnnulla({
      nota: "",
      metodo: "contanti",
      rimborsa: true,
      ...base,
      motivo,
      penale: r?.importo == null ? "" : String(r.importo),
      spiegazione: r?.spiegazione ?? "",
    });
  }

  if (p.stato === "ANNULLATA" && p.annullamento) {
    const a = p.annullamento;
    return (
      <Avviso
        tipo="info"
        azione={
          puoGestire && (
            <Pulsante dimensione="piccolo" icona={RotateCcw} disabled={salvando} onClick={async () => { const r = await esegui(() => sbusta(azioneRiattiva(p.id))); if (r) aggiorna(r); }}>
              Riattiva
            </Pulsante>
          )
        }
      >
        <strong>Prenotazione annullata</strong> il {new Date(a.il).toLocaleDateString("it-IT")} da {a.da} — {a.motivo}
        {a.nota && <>: {a.nota}</>}.
        {a.penale !== null && p.importiVisibili && <> Penale trattenuta: <strong>{eur(a.penale)}</strong>.</>} Le camere sono di nuovo libere.
        {puoGestire && " Si può riattivare solo se le camere sono ancora libere."}
      </Avviso>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {scaduta && (
        <Avviso tipo="avviso">
          <strong>Opzione scaduta il {it(p.scadenzaOpzione)}</strong>: le camere restano bloccate finché non confermi o annulli la prenotazione.
        </Avviso>
      )}
      {puoGestire && !annulla && (
        <div className="flex flex-wrap items-center gap-2">
          {p.stato === "OPZIONE" && (
            <Pulsante variante="primario" icona={CheckCircle2} disabled={salvando} onClick={async () => { const r = await esegui(() => sbusta(azioneConferma(p.id))); if (r) aggiorna(r); }}>
              Conferma prenotazione
            </Pulsante>
          )}
          {!conArrivi && (
            <Pulsante variante="pericolo" icona={Ban} disabled={salvando} onClick={() => apriAnnulla("cliente")}>
              Annulla prenotazione
            </Pulsante>
          )}
          {p.stato === "OPZIONE" && p.scadenzaOpzione && !scaduta && <span className="text-sm text-stone-700">Opzione valida fino al <strong>{it(p.scadenzaOpzione)}</strong></span>}
          {p.stato === "CONFERMATA" && p.confermataIl && <span className="text-sm text-stone-700">Confermata il {new Date(p.confermataIl).toLocaleDateString("it-IT")}</span>}
        </div>
      )}
      {annulla && (
        <div className="flex flex-col gap-3 rounded-md border border-red-300 bg-red-50/60 p-3">
          <p className="text-sm font-bold text-red-900">Annullare la prenotazione #{p.id}? Le camere torneranno libere e la tassa di soggiorno si azzera.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etichetta="Motivo" obbligatorio>
              <Select value={annulla.motivo} disabled={salvando} onChange={(e) => apriAnnulla(e.target.value as typeof annulla.motivo, annulla)}>
                {MOTIVI.map((m) => (
                  <option key={m.valore} value={m.valore}>{m.testo}</option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Nota">
              <Input value={annulla.nota} onChange={(e) => setAnnulla({ ...annulla, nota: e.target.value })} placeholder="es. disdetta per telefono" />
            </Campo>
          </div>
          {p.importiVisibili && (
            <div className="flex flex-col gap-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo
                  etichetta="Penale (€)"
                  obbligatorio
                  aiuto={annulla.spiegazione || "Importo che il cliente deve all'hotel per l'annullamento (0 = nessuna penale)."}
                >
                  <Input type="number" min={0} step="0.01" value={annulla.penale} onChange={(e) => setAnnulla({ ...annulla, penale: e.target.value })} />
                </Campo>
                {incassato > 0 && <Dato etichetta="Già incassato">{eur(incassato)}</Dato>}
              </div>
              {(() => {
                const pen = Number(annulla.penale);
                if (annulla.penale === "" || !(pen >= 0)) return null;
                const differenza = Math.round((incassato - pen) * 100) / 100;
                if (differenza > 0)
                  return (
                    <div className="flex flex-col gap-1.5 text-sm">
                      <span className="text-stone-800">
                        Sono stati incassati <strong>{eur(differenza)}</strong> in più della penale. Cosa fai con la differenza?
                      </span>
                      <label className="inline-flex flex-wrap items-center gap-2">
                        <input type="radio" checked={annulla.rimborsa} onChange={() => setAnnulla({ ...annulla, rimborsa: true })} />
                        La rimborso
                        {annulla.rimborsa && (
                          <Select aria-label="Metodo del rimborso" className="w-44" value={annulla.metodo} onChange={(e) => setAnnulla({ ...annulla, metodo: e.target.value })}>
                            {METODI.map(([v, t]) => (
                              <option key={v} value={v}>{t}</option>
                            ))}
                          </Select>
                        )}
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input type="radio" checked={!annulla.rimborsa} onChange={() => setAnnulla({ ...annulla, rimborsa: false })} />
                        La trattengo: la penale diventa {eur(incassato)}
                      </label>
                    </div>
                  );
                if (differenza < 0) return <p className="text-sm text-amber-900">Resteranno da incassare <strong>{eur(-differenza)}</strong> di penale.</p>;
                return null;
              })()}
              {incassato > 0 && !puoIncassare && <p className="text-xs text-red-800">Per trattenere o rimborsare serve il permesso «Registrare pagamenti».</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Pulsante
              variante="pericolo"
              icona={Ban}
              disabled={salvando || (p.importiVisibili && (annulla.penale === "" || !(Number(annulla.penale) >= 0)))}
              onClick={async () => {
                const r = await esegui(() =>
                  sbusta(
                    azioneAnnulla(p.id, {
                      motivo: annulla.motivo,
                      nota: annulla.nota,
                      penale: p.importiVisibili ? Number(annulla.penale) : 0,
                      rimborsaEccedenza: annulla.rimborsa,
                      metodoRimborso: annulla.metodo,
                    }),
                  ),
                );
                if (r) {
                  aggiorna(r);
                  setAnnulla(null);
                }
              }}
            >
              Sì, annulla la prenotazione
            </Pulsante>
            <Pulsante onClick={() => setAnnulla(null)}>No, torna indietro</Pulsante>
          </div>
        </div>
      )}
    </div>
  );
}

/** Riepilogo con pagato e da pagare, opzione e acconto, elenco e registrazione dei pagamenti. */
export function PannelloPagamenti({
  prenotazione,
  puoGestire,
  puoIncassare,
  salvando,
  esegui,
  aggiorna,
}: {
  prenotazione: Prenotazione;
  puoGestire: boolean;
  puoIncassare: boolean;
  salvando: boolean;
  esegui: Esegui;
  aggiorna: (p: Prenotazione) => void;
}) {
  const p = prenotazione;
  const annullata = p.stato === "ANNULLATA";
  const [nuovo, setNuovo] = useState<null | { data: string; importo: string; metodo: string; tipo: string; nota: string }>(null);
  const [storno, setStorno] = useState<null | { id: number; motivo: string }>(null);
  const [scadenze, setScadenze] = useState<null | { scadenzaOpzione: string; accontoEntro: string; accontoRichiesto: string }>(null);
  const accontoMancante = p.accontoRichiesto ? Math.max(0, p.accontoRichiesto - p.accontoRicevuto) : 0;
  const accontoScaduto = accontoMancante > 0 && p.accontoEntro && p.accontoEntro < oggiIso();

  return (
    <Sezione
      titolo={
        <span className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-teal-700" aria-hidden /> Pagamenti
        </span>
      }
    >
      <AiutoSezione breve="Acconti e saldi incassati su questa prenotazione.">
        <p>
          Con <strong>Registra pagamento</strong> segni ogni incasso (acconto, saldo) o rimborso con data e metodo. Un incasso sbagliato non si
          cancella: si <strong>storna</strong> indicando il motivo, e resta visibile. &quot;Da pagare&quot; comprende la tassa di soggiorno.
        </p>
        <p>Non è una ricevuta né una fattura: i documenti fiscali arriveranno con la fatturazione.</p>
        <Esempio>totale 400 €, acconto di 100 € con bonifico: da pagare 300 € al check-out.</Esempio>
      </AiutoSezione>


      {!annullata && accontoMancante > 0 && (
        <Avviso tipo={accontoScaduto ? "avviso" : "info"} className="mt-3">
          Acconto da ricevere: <strong>{eur(accontoMancante)}</strong>
          {p.accontoEntro && <> entro il {it(p.accontoEntro)}{accontoScaduto && " (scaduto)"}</>}.
        </Avviso>
      )}

      {/* Opzione e acconto */}
      {!annullata &&
        puoGestire &&
        (scadenze ? (
          <div className={`mt-3 ${pannello}`}>
            {p.stato === "OPZIONE" && (
              <Campo etichetta="Opzione valida fino al" aiuto="Alla scadenza compare un avviso; la prenotazione non si annulla da sola.">
                <Input type="date" value={scadenze.scadenzaOpzione} onChange={(e) => setScadenze({ ...scadenze, scadenzaOpzione: e.target.value })} />
              </Campo>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Campo etichetta="Acconto richiesto (€)">
                <Input type="number" min={0} step="0.01" value={scadenze.accontoRichiesto} onChange={(e) => setScadenze({ ...scadenze, accontoRichiesto: e.target.value })} />
              </Campo>
              <Campo etichetta="Entro il">
                <Input type="date" value={scadenze.accontoEntro} onChange={(e) => setScadenze({ ...scadenze, accontoEntro: e.target.value })} />
              </Campo>
            </div>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                disabled={salvando}
                onClick={async () => {
                  const r = await esegui(() =>
                    sbusta(
                      azioneScadenze(p.id, {
                        scadenzaOpzione: scadenze.scadenzaOpzione,
                        accontoEntro: scadenze.accontoEntro,
                        accontoRichiesto: scadenze.accontoRichiesto === "" ? null : Number(scadenze.accontoRichiesto),
                      }),
                    ),
                  );
                  if (r) {
                    aggiorna(r);
                    setScadenze(null);
                  }
                }}
              >
                Salva
              </Pulsante>
              <Pulsante dimensione="piccolo" onClick={() => setScadenze(null)}>
                Annulla
              </Pulsante>
            </div>
          </div>
        ) : (
          <Pulsante
            variante="leggero"
            dimensione="piccolo"
            icona={CalendarClock}
            className="-ml-2 mt-2"
            onClick={() => setScadenze({ scadenzaOpzione: p.scadenzaOpzione, accontoEntro: p.accontoEntro, accontoRichiesto: p.accontoRichiesto ? String(p.accontoRichiesto) : "" })}
          >
            {p.stato === "OPZIONE" ? "Scadenza opzione e acconto" : "Acconto richiesto"}
          </Pulsante>
        ))}

      {/* Elenco pagamenti */}
      {p.pagamenti.length > 0 ? (
        <ul className="mt-3 flex flex-col divide-y divide-stone-100 border-t border-stone-200 text-sm">
          {p.pagamenti.map((x) => (
            <li key={x.id} className={`py-2 ${x.stornato ? "text-stone-400" : ""}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={x.stornato ? "line-through" : "font-semibold text-stone-900"}>
                  {x.tipoTesto} · {x.metodo}
                </span>
                <span className={`font-mono ${x.stornato ? "line-through" : x.tipo === "rimborso" ? "text-red-700" : "font-semibold"}`}>
                  {x.tipo === "rimborso" ? "−" : ""}
                  {eur(x.importo)}
                </span>
              </div>
              <div className="text-xs text-stone-600">
                {it(x.data)} · {x.registratoDa}
                {x.nota && ` · ${x.nota}`}
              </div>
              {x.stornato && (
                <div className="text-xs font-semibold text-red-800">
                  Stornato il {new Date(x.stornato.il).toLocaleDateString("it-IT")} da {x.stornato.da}: {x.stornato.motivo}
                </div>
              )}
              {puoIncassare &&
                !x.stornato &&
                (storno?.id === x.id ? (
                  <div className="mt-1 flex flex-wrap items-end gap-2">
                    <Campo etichetta="Motivo dello storno" className="min-w-40 flex-1">
                      <Input autoFocus value={storno.motivo} onChange={(e) => setStorno({ id: x.id, motivo: e.target.value })} placeholder="es. importo sbagliato" />
                    </Campo>
                    <Pulsante
                      variante="pericolo"
                      dimensione="piccolo"
                      disabled={salvando || !storno.motivo.trim()}
                      onClick={async () => {
                        const r = await esegui(() => sbusta(azioneStornaPagamento(x.id, storno.motivo)));
                        if (r) {
                          aggiorna(r);
                          setStorno(null);
                        }
                      }}
                    >
                      Storna
                    </Pulsante>
                    <Pulsante dimensione="piccolo" onClick={() => setStorno(null)}>
                      Annulla
                    </Pulsante>
                  </div>
                ) : (
                  <Pulsante variante="leggero" dimensione="piccolo" icona={Undo2} className="-ml-2" onClick={() => setStorno({ id: x.id, motivo: "" })}>
                    Storna
                  </Pulsante>
                ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-600">Nessun pagamento registrato.</p>
      )}

      {puoIncassare &&
        (nuovo ? (
          <div className={`mt-3 ${pannello}`}>
            <div className="grid grid-cols-2 gap-2">
              <Campo etichetta="Tipo">
                <Select value={nuovo.tipo} onChange={(e) => setNuovo({ ...nuovo, tipo: e.target.value })}>
                  <option value="caparra">Caparra confirmatoria</option>
                  <option value="acconto">Acconto</option>
                  <option value="saldo">Saldo</option>
                  <option value="rimborso">Rimborso</option>
                </Select>
              </Campo>
              <Campo etichetta="Importo (€)" obbligatorio>
                <Input type="number" min={0} step="0.01" value={nuovo.importo} onChange={(e) => setNuovo({ ...nuovo, importo: e.target.value })} />
              </Campo>
              <Campo etichetta="Metodo">
                <Select value={nuovo.metodo} onChange={(e) => setNuovo({ ...nuovo, metodo: e.target.value })}>
                  {METODI.map(([v, t]) => (
                    <option key={v} value={v}>{t}</option>
                  ))}
                </Select>
              </Campo>
              <Campo etichetta="Data">
                <Input type="date" value={nuovo.data} onChange={(e) => setNuovo({ ...nuovo, data: e.target.value })} />
              </Campo>
            </div>
            <Campo etichetta="Nota">
              <Textarea rows={1} value={nuovo.nota} onChange={(e) => setNuovo({ ...nuovo, nota: e.target.value })} placeholder="es. numero del bonifico" />
            </Campo>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                dimensione="piccolo"
                disabled={salvando || !(Number(nuovo.importo) > 0)}
                onClick={async () => {
                  const r = await esegui(() =>
                    sbusta(azioneRegistraPagamento(p.id, { data: nuovo.data, importo: Number(nuovo.importo), metodo: nuovo.metodo, tipo: nuovo.tipo, nota: nuovo.nota })),
                  );
                  if (r) {
                    aggiorna(r);
                    setNuovo(null);
                  }
                }}
              >
                Registra
              </Pulsante>
              <Pulsante dimensione="piccolo" onClick={() => setNuovo(null)}>
                Annulla
              </Pulsante>
            </div>
          </div>
        ) : (
          <Pulsante
            icona={Plus}
            dimensione="piccolo"
            className="mt-3"
            onClick={() =>
              setNuovo({
                data: oggiIso(),
                // Proposta: l'acconto che manca, altrimenti quanto resta da pagare.
                importo: accontoMancante > 0 ? accontoMancante.toFixed(2) : p.totali.daPagare > 0 ? p.totali.daPagare.toFixed(2) : "",
                metodo: "contanti",
                tipo: p.totali.daPagare < 0 ? "rimborso" : accontoMancante > 0 ? "acconto" : "saldo",
                nota: "",
              })
            }
          >
            Registra pagamento
          </Pulsante>
        ))}
      {!puoIncassare && p.importiVisibili && <p className="mt-2 text-xs text-stone-600">Per registrare pagamenti serve il permesso «Registrare pagamenti».</p>}
    </Sezione>
  );
}
