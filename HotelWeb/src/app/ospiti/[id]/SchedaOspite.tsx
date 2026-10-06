"use client";

import { ArrowLeft, Merge, Save } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LINGUE } from "@/lib/emailRegole";
import { MODI_CONSENSO, etichettaRitorno, type ModoConsenso } from "@/lib/ospitiRegole";
import { Avviso, Campo, Dato, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneConsensoMarketing, azioneSalvaOspite, azioneUnisciOspiti, type datiScheda } from "../actions";
import type { DatiOspite } from "@/lib/ospiti";

type Dati = Awaited<ReturnType<typeof datiScheda>>;
const it = (g: string | null) => (g ? g.slice(0, 10).split("-").reverse().join("/") : "—");
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const STATO_SOGGIORNO = { passato: { testo: "Concluso", tono: "neutro" }, "in corso": { testo: "In corso", tono: "verde" }, futuro: { testo: "In arrivo", tono: "blu" }, annullata: { testo: "Annullata", tono: "rosso" } } as const;

const formDa = (o: Dati["ospite"]): DatiOspite => ({
  nome: o.nome,
  cognome: o.cognome,
  telefono: o.telefono,
  email: o.email,
  dataNascita: o.dataNascita,
  lingua: o.lingua,
  note: o.note,
  preferenze: o.preferenze,
  riguardo: o.riguardo,
});

export function SchedaOspite({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const o = d.ospite;
  const [form, setForm] = useState<DatiOspite>(formDa(iniziale.ospite));
  const [modo, setModo] = useState<ModoConsenso | "">("");
  const [unisci, setUnisci] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore" | "info"; testo: string } | null>(null);
  const modificato = JSON.stringify(form) !== JSON.stringify(formDa(o));
  const ritorno = etichettaRitorno(d.riepilogo.soggiorni);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      const nuovi = await fn();
      setD(nuovi);
      setForm(formDa(nuovi.ospite));
      setMsg({ tipo: "ok", testo: ok });
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }
  const campo = (k: keyof DatiOspite) => ({
    value: String(form[k]),
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        sopra={
          <Link href="/ospiti" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Ospiti
          </Link>
        }
        titolo={
          <span className="flex flex-wrap items-center gap-2">
            {o.nome} {o.cognome}
            {o.riguardo && <Etichetta tono="viola">Di riguardo</Etichetta>}
            {ritorno && <Etichetta tono="verde">{ritorno}</Etichetta>}
          </span>
        }
        sottotitolo={o.dataNascita ? `Nato/a il ${it(o.dataNascita)}` : undefined}
      />

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <Sezione titolo="In breve">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Dato etichetta="Soggiorni">{d.riepilogo.soggiorni}</Dato>
          <Dato etichetta="Notti">{d.riepilogo.notti}</Dato>
          <Dato etichetta="Ultima partenza">{it(d.riepilogo.ultimo)}</Dato>
          <Dato etichetta="Prossimo arrivo">{it(d.riepilogo.prossimo)}</Dato>
          <Dato etichetta="Annullate">{d.riepilogo.annullate}</Dato>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Etichetta tono={o.datiSchedina ? "verde" : "ambra"}>{o.datiSchedina ? "Dati per la schedina presenti" : "Dati per la schedina da completare al check-in"}</Etichetta>
          {o.haNotaAlimentare && <Etichetta tono="ambra">Ha note alimentari (si vedono al check-in)</Etichetta>}
        </div>
      </Sezione>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Sezione titolo="Anagrafica e preferenze">
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                esegui(() => sbusta(azioneSalvaOspite(o.id, form)), "Scheda salvata.");
              }}
            >
              <Campo etichetta="Nome" obbligatorio>
                <Input {...campo("nome")} />
              </Campo>
              <Campo etichetta="Cognome" obbligatorio>
                <Input {...campo("cognome")} />
              </Campo>
              <Campo etichetta="Telefono">
                <Input type="tel" {...campo("telefono")} />
              </Campo>
              <Campo etichetta="Email">
                <Input type="email" {...campo("email")} />
              </Campo>
              <Campo etichetta="Data di nascita">
                <Input type="date" {...campo("dataNascita")} />
              </Campo>
              <Campo etichetta="Lingua delle email" aiuto="Vuota = italiano per gli italiani, altrimenti inglese.">
                <Select {...campo("lingua")}>
                  <option value="">Automatica</option>
                  {Object.entries(LINGUE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Campo>
              <Campo etichetta="Preferenze" aiuto="Si vedono nella prenotazione: es. camera ai piani alti, cuscino basso, quotidiano al mattino." className="sm:col-span-2">
                <Textarea rows={2} {...campo("preferenze")} />
              </Campo>
              <Campo etichetta="Note interne" className="sm:col-span-2">
                <Textarea rows={2} {...campo("note")} />
              </Campo>
              <Spunta
                className="sm:col-span-2"
                etichetta="Ospite di riguardo (VIP): viene segnalato nella prenotazione"
                checked={form.riguardo}
                onChange={(e) => setForm({ ...form, riguardo: e.target.checked })}
              />
              <div className="flex gap-2 sm:col-span-2">
                <Pulsante type="submit" variante="primario" icona={Save} disabled={busy || !modificato}>
                  Salva
                </Pulsante>
                {modificato && (
                  <Pulsante onClick={() => setForm(formDa(o))} disabled={busy}>
                    Annulla modifiche
                  </Pulsante>
                )}
              </div>
            </form>
          </Sezione>

          <Sezione titolo="Soggiorni e prenotazioni">
            {d.storico.length === 0 ? (
              <p className="text-sm text-stone-600">Nessuna prenotazione.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-stone-600">
                    <tr>
                      <th className="py-1 pr-3">Prenotazione</th>
                      <th className="py-1 pr-3">Date</th>
                      <th className="py-1 pr-3">Camere</th>
                      <th className="py-1 pr-3">Come</th>
                      <th className="py-1">Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.storico.map((s) => (
                      <tr key={s.id} className="border-t border-stone-100 align-top">
                        <td className="py-1 pr-3">
                          <Link href={`/prenotazioni/${s.id}`} className="font-semibold text-teal-800 hover:underline">
                            #{s.id}
                          </Link>
                          <div className="text-xs text-stone-500">{s.ruolo}</div>
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {it(s.dal)} → {it(s.al)}
                          <div className="text-xs text-stone-500">{s.notti === 1 ? "1 notte" : `${s.notti} notti`}</div>
                        </td>
                        <td className="py-1 pr-3">{s.camere}</td>
                        <td className="py-1 pr-3">{s.agenzia ?? s.canale}</td>
                        <td className="py-1">
                          <Etichetta tono={STATO_SOGGIORNO[s.quando as keyof typeof STATO_SOGGIORNO].tono}>{STATO_SOGGIORNO[s.quando as keyof typeof STATO_SOGGIORNO].testo}</Etichetta>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Sezione>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:w-96">
          <Sezione titolo="Consenso al marketing">
            <AiutoSezione breve="Separato dalla privacy del soggiorno: senza consenso l'ospite riceve solo le email della sua prenotazione.">
              <p>Si registra come è stato dato (modulo firmato, email, a voce, dal sito), quando e chi l&apos;ha raccolto. Si può revocare in qualunque momento.</p>
            </AiutoSezione>
            <p className="mt-3 text-sm">
              {o.consensoMarketing ? (
                <>
                  <Etichetta tono="verde">Dato</Etichetta> il {quando(o.consensoMarketingIl!)} · {MODI_CONSENSO[o.consensoMarketingModo as ModoConsenso] ?? o.consensoMarketingModo} · raccolto da {o.consensoMarketingDa}
                </>
              ) : o.consensoMarketingIl ? (
                <>
                  <Etichetta tono="rosso">Revocato</Etichetta> il {quando(o.consensoMarketingIl)} ({o.consensoMarketingDa})
                </>
              ) : (
                <Etichetta>Non dato</Etichetta>
              )}
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              {o.consensoMarketing ? (
                <Pulsante variante="pericolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneConsensoMarketing(o.id, false, null)), "Consenso revocato.")}>
                  Revoca il consenso
                </Pulsante>
              ) : (
                <>
                  <Campo etichetta="Come è stato dato">
                    <Select value={modo} onChange={(e) => setModo(e.target.value as ModoConsenso | "")}>
                      <option value="">Scegli…</option>
                      {Object.entries(MODI_CONSENSO).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Campo>
                  <Pulsante
                    variante="primario"
                    disabled={busy || !modo}
                    onClick={() => esegui(() => sbusta(azioneConsensoMarketing(o.id, true, modo || null)), "Consenso registrato.")}
                  >
                    Registra il consenso
                  </Pulsante>
                </>
              )}
            </div>
          </Sezione>

          {(d.doppioni.length > 0 || d.unioni.length > 0) && (
            <Sezione titolo="Possibili doppioni">
              {d.doppioni.length === 0 && <p className="text-sm text-stone-600">Nessun altro doppione trovato.</p>}
              <ul className="flex flex-col gap-3">
                {d.doppioni.map((x) => (
                  <li key={x.id} className="rounded border border-amber-200 bg-amber-50 p-2 text-sm">
                    <Link href={`/ospiti/${x.id}`} className="font-semibold text-teal-800 hover:underline">
                      {x.nome} {x.cognome}
                    </Link>{" "}
                    {x.dataNascita && <span className="text-stone-600">· {it(x.dataNascita)}</span>}
                    <div className="text-xs text-stone-700">
                      {[x.email, x.telefono].filter(Boolean).join(" · ")}
                      {x.soggiorni > 0 && ` · ${x.soggiorni === 1 ? "1 soggiorno" : `${x.soggiorni} soggiorni`}`}
                    </div>
                    <div className="text-xs text-amber-900">Perché: {x.motivi.join(", ")}</div>
                    {d.puoUnire &&
                      (unisci === x.id ? (
                        <div className="mt-2 rounded border border-red-200 bg-white p-2">
                          <p className="text-xs text-stone-800">
                            Le prenotazioni, i soggiorni e le email di <strong>{x.nome} {x.cognome}</strong> passano a questa scheda; i dati mancanti qui si completano con i suoi e la sua scheda viene eliminata. Non si può annullare.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <Pulsante
                              variante="pericolo"
                              dimensione="piccolo"
                              icona={Merge}
                              disabled={busy}
                              onClick={() =>
                                esegui(async () => {
                                  const r = await sbusta(azioneUnisciOspiti(o.id, x.id));
                                  setUnisci(null);
                                  return r.scheda;
                                }, "Schede unite.")
                              }
                            >
                              Conferma l&apos;unione
                            </Pulsante>
                            <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setUnisci(null)}>
                              Annulla
                            </Pulsante>
                          </div>
                        </div>
                      ) : (
                        <Pulsante className="mt-2" dimensione="piccolo" icona={Merge} disabled={busy} onClick={() => setUnisci(x.id)}>
                          Unisci in questa scheda
                        </Pulsante>
                      ))}
                  </li>
                ))}
              </ul>
              {d.unioni.length > 0 && (
                <div className="mt-3 text-xs text-stone-600">
                  Già unite qui:{" "}
                  {d.unioni.map((u) => `${u.nome} (${quando(u.unitoIl)}, ${u.unitoDa})`).join("; ")}
                </div>
              )}
            </Sezione>
          )}

          {d.reclami && d.reclami.length > 0 && (
            <Sezione titolo="Reclami">
              <ul className="flex flex-col gap-2 text-sm">
                {d.reclami.map((r) => (
                  <li key={r.id}>
                    <span className="flex flex-wrap items-center gap-2">
                      <Etichetta tono={r.stato === "aperto" ? "ambra" : "verde"}>{r.stato === "aperto" ? "Aperto" : "Risolto"}</Etichetta>
                      <span className="text-xs text-stone-600">{quando(r.creatoIl)}</span>
                      {r.prenotazioneId && (
                        <Link href={`/prenotazioni/${r.prenotazioneId}`} className="text-xs text-teal-800 hover:underline">
                          #{r.prenotazioneId}
                        </Link>
                      )}
                    </span>
                    <span className="text-stone-700">{r.descrizione}</span>
                  </li>
                ))}
              </ul>
              <Link href="/portineria/reclami" className="mt-2 inline-block text-xs text-teal-800 underline">
                Registro dei reclami
              </Link>
            </Sezione>
          )}

          <Sezione titolo="Email inviate">
            {d.email.length === 0 ? (
              <p className="text-sm text-stone-600">Nessuna email.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {d.email.map((e) => (
                  <li key={e.id}>
                    <div className="font-medium">{e.oggetto}</div>
                    <div className="text-xs text-stone-600">
                      {quando(e.inviataIl)} · {e.destinatario} · {e.esito}
                      {e.prenotazioneId && (
                        <>
                          {" · "}
                          <Link href={`/prenotazioni/${e.prenotazioneId}`} className="text-teal-800 hover:underline">
                            #{e.prenotazioneId}
                          </Link>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Sezione>
        </div>
      </div>
    </div>
  );
}
