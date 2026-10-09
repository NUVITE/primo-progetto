"use client";

import { ArrowLeft, Calculator, Copy, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LINGUE, type Lingua } from "@/lib/emailRegole";
import { CANALI_RICHIESTA, MAX_PROPOSTE, MOTIVI_RINUNCIA, STATI_PREVENTIVO, STATI_RICHIESTA_DISP, type CanaleRichiesta, type MotivoRinuncia, type StatoPreventivo, type StatoRichiestaDisp } from "@/lib/preventiviRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { CampiRichiesta, datiRichiesta, type FormRichiesta } from "../ElencoPreventivi";
import {
  azioneAnteprimaPreventivo,
  azioneCalcolaProposta,
  azioneChiudiRichiestaDisp,
  azioneCreaPreventivo,
  azioneInviaPreventivo,
  azioneModificaRichiestaDisp,
  azioneSegnaInviato,
  datiRichiestaDisp,
} from "../actions";

type Dati = Awaited<ReturnType<typeof datiRichiestaDisp>>;
type Proposta = { tipoCameraId: string; listinoId: string; trattamento: string; prezzo: string; nota: string; calcolo: null | { prezzo: number; mancante: boolean; libere: number; camere: number; pulizia: number } };

const it = (g: string) => g.split("-").reverse().join("/");
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const tra = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

export function DettaglioRichiesta({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const r = d.richiesta;
  const [modifica, setModifica] = useState<FormRichiesta | null>(null);
  const [chiudi, setChiudi] = useState<MotivoRinuncia | "">("");
  const [nuovo, setNuovo] = useState<null | { validoFino: string; acconto: string; messaggio: string; proposte: Proposta[] }>(null);
  const [email, setEmail] = useState<null | { preventivoId: number; lingua: Lingua; destinatario: string; oggetto: string; corpo: string; mancanti: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore" | "info"; testo: string } | null>(null);
  const aperta = r.stato === "nuova" || r.stato === "preventivo";
  // Una richiesta scaduta (l'ospite non ha risposto) si riprende: si corregge e le si fa un nuovo preventivo.
  const riapribile = aperta || r.stato === "scaduta";
  const listinoBase = d.listini.find((l) => l.tipo === "base") ?? d.listini[0];
  const trattamentoProposto = d.trattamenti.find((t) => r.trattamento && t.toLowerCase().includes(r.trattamento.toLowerCase())) ?? d.trattamenti[0] ?? "";

  async function esegui<T>(fn: () => Promise<T>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      const x = await fn();
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return x;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return null;
    } finally {
      setBusy(false);
    }
  }
  const nuovaProposta = (): Proposta => ({ tipoCameraId: String(d.tipi[0]?.id ?? ""), listinoId: String(listinoBase?.id ?? ""), trattamento: trattamentoProposto, prezzo: "", nota: "", calcolo: null });
  const calcola = async (i: number) => {
    if (!nuovo) return;
    const p = nuovo.proposte[i];
    const c = await esegui(() => sbusta(azioneCalcolaProposta(r.id, { tipoCameraId: Number(p.tipoCameraId), listinoId: Number(p.listinoId), trattamento: p.trattamento })));
    if (c) setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, calcolo: c, prezzo: x.prezzo || (c.mancante ? "" : String(c.prezzo)) } : x)) });
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        sopra={
          <Link href="/preventivi" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Richieste e preventivi
          </Link>
        }
        titolo={`${r.cognome} ${r.nome}`}
        sottotitolo={`${it(r.dal)} → ${it(r.al)} · ${r.notti} notti · ${r.camere} ${r.camere === 1 ? "camera" : "camere"} · ${r.adulti} ${r.adulti === 1 ? "adulto" : "adulti"}${r.etaBambini.length ? ` e ${r.etaBambini.length} ${r.etaBambini.length === 1 ? "bambino" : "bambini"} (${r.etaBambini.join(", ")} anni)` : ""} per camera`}
        azioni={<Etichetta tono={r.stato === "accettata" ? "verde" : r.stato === "nuova" ? "ambra" : "blu"}>{STATI_RICHIESTA_DISP[r.stato as StatoRichiestaDisp]}</Etichetta>}
      />
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {r.prenotazioneId && (
        <Avviso tipo="ok">
          Il preventivo è stato accettato: è nata la{" "}
          <Link href={`/prenotazioni/${r.prenotazioneId}`} className="font-semibold underline">
            prenotazione n. {r.prenotazioneId}
          </Link>{" "}
          in opzione. Assegna le camere e manda la richiesta di acconto.
        </Avviso>
      )}

      <Sezione
        titolo="Richiesta"
        azioni={
          riapribile &&
          !modifica && (
            <Pulsante
              variante="leggero"
              dimensione="piccolo"
              icona={Pencil}
              onClick={() =>
                setModifica({
                  canale: r.canale,
                  nome: r.nome,
                  cognome: r.cognome,
                  email: r.email,
                  telefono: r.telefono,
                  lingua: r.lingua,
                  dal: r.dal,
                  al: r.al,
                  adulti: String(r.adulti),
                  bambini: r.etaBambini.join(", "),
                  camere: String(r.camere),
                  trattamento: r.trattamento,
                  budget: r.budget,
                  note: r.note,
                })
              }
            >
              Modifica
            </Pulsante>
          )
        }
      >
        {modifica ? (
          <>
            <CampiRichiesta f={modifica} set={setModifica} />
            <div className="mt-3 flex gap-2">
              <Pulsante
                variante="primario"
                disabled={busy}
                onClick={async () => {
                  const x = await esegui(() => sbusta(azioneModificaRichiestaDisp(r.id, datiRichiesta(modifica))), "Richiesta aggiornata.");
                  if (x) {
                    setD(x);
                    setModifica(null);
                  }
                }}
              >
                Salva
              </Pulsante>
              <Pulsante onClick={() => setModifica(null)}>Annulla</Pulsante>
            </div>
          </>
        ) : (
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-stone-600">Arrivata da</dt>
            <dd>
              {CANALI_RICHIESTA[r.canale as CanaleRichiesta]} · {new Date(r.creataIl).toLocaleDateString("it-IT")} · {r.creataDa}
            </dd>
            <dt className="text-stone-600">Contatti</dt>
            <dd>{[r.email, r.telefono].filter(Boolean).join(" · ") || "—"}</dd>
            <dt className="text-stone-600">Lingua</dt>
            <dd>{LINGUE[r.lingua as Lingua] ?? r.lingua}</dd>
            {r.trattamento && (
              <>
                <dt className="text-stone-600">Trattamento</dt>
                <dd>{r.trattamento}</dd>
              </>
            )}
            {r.budget && (
              <>
                <dt className="text-stone-600">Budget</dt>
                <dd>{r.budget}</dd>
              </>
            )}
            {r.note && (
              <>
                <dt className="text-stone-600">Note</dt>
                <dd className="whitespace-pre-line">{r.note}</dd>
              </>
            )}
            {r.motivoRinuncia && (
              <>
                <dt className="text-stone-600">Motivo</dt>
                <dd>{MOTIVI_RINUNCIA[r.motivoRinuncia as MotivoRinuncia] ?? r.motivoRinuncia}</dd>
              </>
            )}
          </dl>
        )}
        {aperta && !modifica && (
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
            <Campo etichetta="Chiudi senza prenotazione">
              <Select value={chiudi} onChange={(e) => setChiudi(e.target.value as MotivoRinuncia)}>
                <option value="">Motivo…</option>
                {(Object.entries(MOTIVI_RINUNCIA) as [MotivoRinuncia, string][]).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <Pulsante
              variante="pericolo"
              dimensione="piccolo"
              disabled={busy || !chiudi}
              onClick={async () => {
                const x = await esegui(() => sbusta(azioneChiudiRichiestaDisp(r.id, chiudi as MotivoRinuncia)), "Richiesta chiusa.");
                if (x) setD(x);
              }}
            >
              Chiudi
            </Pulsante>
          </div>
        )}
      </Sezione>

      {riapribile && !nuovo && (
        <div>
          <Pulsante variante="primario" icona={Plus} onClick={() => setNuovo({ validoFino: tra(7), acconto: "", messaggio: "", proposte: [nuovaProposta()] })}>
            Nuovo preventivo
          </Pulsante>
        </div>
      )}

      {nuovo && (
        <Sezione titolo="Nuovo preventivo">
          <AiutoSezione breve="Fino a 3 proposte: per ognuna scegli tipo di camera, listino e trattamento e premi Calcola; il prezzo del listino si può cambiare.">
            <Esempio>Proposta 1: Doppia standard in B&amp;B; proposta 2: Vista mare in mezza pensione, con uno sconto del 5% sul listino.</Esempio>
          </AiutoSezione>
          <div className="mt-3 flex flex-col gap-3">
            {nuovo.proposte.map((p, i) => (
              <div key={i} className="rounded-md border border-stone-200 p-3">
                <p className="mb-2 text-sm font-semibold">Proposta {i + 1}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <Campo etichetta="Tipo di camera">
                    <Select value={p.tipoCameraId} onChange={(e) => setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, tipoCameraId: e.target.value, calcolo: null } : x)) })}>
                      {d.tipi.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.descrizione}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo etichetta="Listino">
                    <Select value={p.listinoId} onChange={(e) => setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, listinoId: e.target.value, calcolo: null } : x)) })}>
                      {d.listini.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.descrizione}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo etichetta="Trattamento">
                    <Select value={p.trattamento} onChange={(e) => setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, trattamento: e.target.value, calcolo: null } : x)) })}>
                      {d.trattamenti.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo etichetta="Prezzo totale (€)" aiuto="Tutte le camere e le notti, senza tassa di soggiorno.">
                    <Input inputMode="decimal" value={p.prezzo} onChange={(e) => setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, prezzo: e.target.value } : x)) })} />
                  </Campo>
                  <div className="flex items-end gap-1">
                    <Pulsante dimensione="piccolo" icona={Calculator} disabled={busy} onClick={() => calcola(i)}>
                      Calcola
                    </Pulsante>
                    {nuovo.proposte.length > 1 && (
                      <Pulsante dimensione="piccolo" variante="leggero" icona={Trash2} aria-label="Togli la proposta" onClick={() => setNuovo({ ...nuovo, proposte: nuovo.proposte.filter((_, j) => j !== i) })} />
                    )}
                  </div>
                </div>
                {p.calcolo && (
                  <p className={`mt-2 text-xs ${p.calcolo.libere < p.calcolo.camere ? "font-semibold text-red-800" : "text-stone-700"}`}>
                    {p.calcolo.mancante ? "Il listino non ha tutti i prezzi per queste date: scrivi tu il prezzo." : `Listino: ${eur(p.calcolo.prezzo)}.`}
                    {p.calcolo.pulizia > 0 && ` Più pulizia finale ${eur(p.calcolo.pulizia)}, mostrata a parte all'ospite.`} Camere libere di questo
                    tipo: {p.calcolo.libere}
                    {p.calcolo.libere < p.calcolo.camere ? ` (ne servono ${p.calcolo.camere})` : ""}.
                  </p>
                )}
                <div className="mt-2">
                  <Input placeholder="Nota per l'ospite (es. vista mare, late check-out)" value={p.nota} onChange={(e) => setNuovo({ ...nuovo, proposte: nuovo.proposte.map((x, j) => (j === i ? { ...x, nota: e.target.value } : x)) })} />
                </div>
              </div>
            ))}
            {nuovo.proposte.length < MAX_PROPOSTE && (
              <Pulsante dimensione="piccolo" icona={Plus} className="self-start" onClick={() => setNuovo({ ...nuovo, proposte: [...nuovo.proposte, nuovaProposta()] })}>
                Altra proposta
              </Pulsante>
            )}
            <div className="grid gap-2 sm:grid-cols-3">
              <Campo etichetta="Valido fino al" obbligatorio>
                <Input type="date" value={nuovo.validoFino} onChange={(e) => setNuovo({ ...nuovo, validoFino: e.target.value })} />
              </Campo>
              <Campo etichetta="Acconto richiesto (€)" aiuto="Facoltativo: alla conferma si chiede all'ospite.">
                <Input inputMode="decimal" value={nuovo.acconto} onChange={(e) => setNuovo({ ...nuovo, acconto: e.target.value })} />
              </Campo>
            </div>
            <Campo etichetta="Messaggio per l'ospite" aiuto="Compare in cima al preventivo online.">
              <Textarea rows={2} value={nuovo.messaggio} onChange={(e) => setNuovo({ ...nuovo, messaggio: e.target.value })} />
            </Campo>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                disabled={busy || nuovo.proposte.some((p) => !p.prezzo && !p.calcolo)}
                onClick={async () => {
                  const x = await esegui(
                    () =>
                      sbusta(
                        azioneCreaPreventivo(r.id, {
                          validoFino: nuovo.validoFino,
                          accontoRichiesto: nuovo.acconto.trim() ? Number(nuovo.acconto.replace(",", ".")) : null,
                          messaggio: nuovo.messaggio,
                          proposte: nuovo.proposte.map((p) => ({
                            tipoCameraId: Number(p.tipoCameraId),
                            listinoId: Number(p.listinoId),
                            trattamento: p.trattamento,
                            prezzo: p.prezzo.trim() ? Number(p.prezzo.replace(",", ".")) : null,
                            nota: p.nota,
                          })),
                        }),
                      ),
                    "Preventivo pronto: ora mandalo all'ospite.",
                  );
                  if (x) {
                    setD(x);
                    setNuovo(null);
                  }
                }}
              >
                Crea il preventivo
              </Pulsante>
              <Pulsante onClick={() => setNuovo(null)}>Annulla</Pulsante>
            </div>
          </div>
        </Sezione>
      )}

      {r.preventivi.map((p, n) => {
        const link = `${d.base}/pv/${p.codice}`;
        return (
          <Sezione key={p.id} titolo={`Preventivo ${r.preventivi.length - n} · ${STATI_PREVENTIVO[p.stato as StatoPreventivo] ?? p.stato}`}>
            <p className="text-xs text-stone-600">
              Creato il {new Date(p.creatoIl).toLocaleDateString("it-IT")} · valido fino al {it(p.validoFino)}
              {p.accontoRichiesto !== null && ` · acconto ${eur(p.accontoRichiesto)}`}
              {p.vistoIl && ` · visto dall'ospite il ${new Date(p.vistoIl).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}`}
            </p>
            {p.messaggio && <p className="mt-1 text-sm italic">«{p.messaggio}»</p>}
            <ul className="mt-2 divide-y divide-stone-100 text-sm">
              {p.proposte.map((x, i) => (
                <li key={x.id} className={`flex flex-wrap items-baseline gap-2 py-1.5 ${p.propostaAccettataId === x.id ? "font-semibold text-emerald-800" : ""}`}>
                  <span className="min-w-0 flex-1">
                    {i + 1}. {x.tipo} · {x.trattamento} <span className="text-xs text-stone-500">({x.listino})</span>
                    {x.nota && <span className="block text-xs text-stone-600">{x.nota}</span>}
                  </span>
                  <span className="font-mono">{eur(x.prezzo)}</span>
                  {x.prezzoCalcolato > 0 && x.prezzoCalcolato !== x.prezzo && <span className="text-xs text-stone-500 line-through">{eur(x.prezzoCalcolato)}</span>}
                  {p.propostaAccettataId === x.id && <Etichetta tono="verde">accettata</Etichetta>}
                </li>
              ))}
            </ul>
            {p.motivoRifiuto && <p className="mt-1 text-sm text-stone-700">Motivo del rifiuto: {p.motivoRifiuto}</p>}

            {["bozza", "inviato", "visto"].includes(p.stato) && riapribile && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                {d.emailConfigurata && email?.preventivoId !== p.id && (
                  <Pulsante
                    variante="primario"
                    dimensione="piccolo"
                    icona={Send}
                    disabled={busy}
                    onClick={async () => {
                      const a = await esegui(() => sbusta(azioneAnteprimaPreventivo(p.id, r.lingua as Lingua)));
                      if (a) setEmail({ preventivoId: p.id, lingua: r.lingua as Lingua, destinatario: a.destinatario, oggetto: a.oggetto, corpo: a.corpo, mancanti: a.mancanti });
                    }}
                  >
                    {p.stato === "bozza" ? "Invia per email" : "Invia di nuovo"}
                  </Pulsante>
                )}
                <Pulsante
                  dimensione="piccolo"
                  icona={Copy}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setMsg({ tipo: "info", testo: "Link copiato: puoi incollarlo in WhatsApp o in un messaggio." });
                    } catch {
                      setMsg({ tipo: "info", testo: `Link del preventivo: ${link}` });
                    }
                  }}
                >
                  Copia il link
                </Pulsante>
                {p.stato === "bozza" && (
                  <Pulsante dimensione="piccolo" variante="leggero" disabled={busy} onClick={async () => { const x = await esegui(() => sbusta(azioneSegnaInviato(r.id, p.id)), "Segnato come inviato."); if (x) setD(x); }}>
                    Segna come inviato (per altra via)
                  </Pulsante>
                )}
                {!d.emailConfigurata && <span className="text-xs text-stone-600">Per inviarlo per email configura la posta in Impostazioni › Email e modelli.</span>}
              </div>
            )}

            {email?.preventivoId === p.id && (
              <div className="mt-3 flex flex-col gap-2 rounded-md border border-teal-200 bg-teal-50/40 p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Campo etichetta="A">
                    <Input type="email" value={email.destinatario} onChange={(e) => setEmail({ ...email, destinatario: e.target.value })} />
                  </Campo>
                  <Campo etichetta="Lingua">
                    <Select
                      value={email.lingua}
                      onChange={async (e) => {
                        const l = e.target.value as Lingua;
                        const a = await esegui(() => sbusta(azioneAnteprimaPreventivo(p.id, l)));
                        if (a) setEmail({ ...email, lingua: l, oggetto: a.oggetto, corpo: a.corpo, mancanti: a.mancanti });
                      }}
                    >
                      {(Object.entries(LINGUE) as [Lingua, string][]).map(([k, t]) => (
                        <option key={k} value={k}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                </div>
                <Campo etichetta="Oggetto">
                  <Input value={email.oggetto} onChange={(e) => setEmail({ ...email, oggetto: e.target.value })} />
                </Campo>
                <Campo etichetta="Testo">
                  <Textarea rows={12} value={email.corpo} onChange={(e) => setEmail({ ...email, corpo: e.target.value })} />
                </Campo>
                {/\{\{\s*[a-z_]+\s*\}\}/.test(email.oggetto + email.corpo) && <Avviso tipo="avviso">Nel testo ci sono dati da completare (tra {"{{ }}"}): correggili prima di inviare.</Avviso>}
                <div className="flex gap-2">
                  <Pulsante
                    variante="primario"
                    icona={Send}
                    disabled={busy || !email.destinatario || /\{\{\s*[a-z_]+\s*\}\}/.test(email.oggetto + email.corpo)}
                    onClick={async () => {
                      const x = await esegui(() => sbusta(azioneInviaPreventivo(r.id, p.id, { destinatario: email.destinatario, oggetto: email.oggetto, corpo: email.corpo, lingua: email.lingua })));
                      if (x) {
                        setD(x.dati);
                        setEmail(null);
                        setMsg({ tipo: x.esito === "simulata" ? "info" : "ok", testo: x.esito === "simulata" ? "Email registrata come simulata (ambiente di prova)." : "Preventivo inviato." });
                      }
                    }}
                  >
                    Invia
                  </Pulsante>
                  <Pulsante onClick={() => setEmail(null)}>Annulla</Pulsante>
                </div>
              </div>
            )}
          </Sezione>
        );
      })}

      {r.emailInviate.length > 0 && (
        <Sezione titolo="Email inviate">
          <ul className="divide-y divide-stone-100 text-sm">
            {r.emailInviate.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-2 py-1.5">
                <span className="min-w-0 flex-1 truncate">
                  a {e.destinatario} · {e.oggetto}
                </span>
                <Etichetta tono={e.esito === "inviata" ? "verde" : e.esito === "simulata" ? "blu" : "rosso"}>{e.esito}</Etichetta>
                <span className="text-xs text-stone-500">
                  {new Date(e.inviataIl).toLocaleString("it-IT", { timeZone: "Europe/Rome" })} · {e.inviataDa}
                </span>
              </li>
            ))}
          </ul>
        </Sezione>
      )}
    </div>
  );
}
