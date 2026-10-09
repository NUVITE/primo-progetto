"use client";

import { Briefcase, KeyRound, Lock, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { MAX_COLLI, MOVIMENTI_VALORI, type BagagliInput, type TipoMovimentoValori } from "@/lib/custodiaRegole";
import { Avviso, Campo, classePulsante, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneApriCustodia, azioneChiavi, azioneDepositaBagagli, azioneMovimentoValori, azioneRitiraBagagli, type datiCustodia } from "./actions";

type Dati = Awaited<ReturnType<typeof datiCustodia>>;
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const numero = (s: string) => (s.trim() ? Number(s.replace(",", ".")) : null);
const bagagliVuoto = (): BagagliInput => ({ prenotazioneId: null, nome: "", colli: 1, descrizione: "", posizione: "" });

export function Custodia({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [bagagli, setBagagli] = useState<BagagliInput | null>(null);
  const [valori, setValori] = useState<null | { prenotazioneId: string; descrizione: string; importo: string }>(null);
  const [ritiro, setRitiro] = useState<null | { id: number; numero: string; nota: string }>(null);
  const [movimento, setMovimento] = useState<null | { id: number; tipo: Exclude<TipoMovimentoValori, "deposito">; descrizione: string; importo: string }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string; link?: { href: string; testo: string } } | null>(null);

  async function esegui<T extends { dati: Dati }>(fn: () => Promise<T>, ok: (r: T) => { testo: string; link?: { href: string; testo: string } }) {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      setD(r.dati);
      setMsg({ tipo: "ok", ...ok(r) });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const sceltaPrenotazione = (valore: string | number | null, onChange: (v: string) => void, conNome: boolean) => (
    <Select value={valore ?? ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{conNome ? "Scrivo il nome…" : "Scegli…"}</option>
      {d.prenotazioni.map((p) => (
        <option key={p.prenotazioneId} value={p.prenotazioneId}>
          {p.nome} · {p.camere} · {p.situazione}
        </option>
      ))}
    </Select>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Custodia" sottotitolo="Bagagli in deposito, valori nella cassaforte dell'hotel, chiavi fuori" />
      {msg && (
        <Avviso
          tipo={msg.tipo}
          azione={
            msg.link && (
              <Link href={msg.link.href} className={classePulsante("secondario", "piccolo")}>
                {msg.link.testo}
              </Link>
            )
          }
        >
          {msg.testo}
        </Avviso>
      )}

      {/* ---------------- Bagagli ---------------- */}
      <Sezione
        titolo={
          <span className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" aria-hidden /> Bagagli in deposito ({d.bagagli.inDeposito.length})
          </span>
        }
        azioni={
          !bagagli && (
            <Pulsante dimensione="piccolo" icona={Plus} onClick={() => setBagagli(bagagliVuoto())}>
              Nuovo deposito
            </Pulsante>
          )
        }
      >
        <AiutoSezione breve="Per chi arriva prima del check-in o parte dopo il check-out. Il cartellino ha due metà con lo stesso numero: una all'ospite, una sui bagagli.">
          <p>Al ritiro chiedi la metà dell&apos;ospite e scrivi il numero: se non corrisponde i bagagli non si consegnano.</p>
        </AiutoSezione>
        {bagagli && (
          <form
            className="mt-3 grid gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await esegui(
                  () => sbusta(azioneDepositaBagagli(bagagli)),
                  (r) => ({ testo: `Deposito registrato: cartellino n. ${r.numero}.`, link: { href: `/portineria/custodia/cartellino/${r.id}`, testo: "Stampa il cartellino" } }),
                )
              )
                setBagagli(null);
            }}
          >
            <Campo etichetta="Ospite" obbligatorio className="sm:col-span-2">
              {sceltaPrenotazione(bagagli.prenotazioneId, (v) => setBagagli({ ...bagagli, prenotazioneId: Number(v) || null }), true)}
            </Campo>
            {!bagagli.prenotazioneId && (
              <Campo etichetta="Nome" className="sm:col-span-2">
                <Input value={bagagli.nome} onChange={(e) => setBagagli({ ...bagagli, nome: e.target.value })} />
              </Campo>
            )}
            <Campo etichetta="Colli" obbligatorio>
              <Input type="number" min={1} max={MAX_COLLI} value={bagagli.colli} onChange={(e) => setBagagli({ ...bagagli, colli: Number(e.target.value) })} />
            </Campo>
            <Campo etichetta="Descrizione" className="sm:col-span-2">
              <Input placeholder="Es. 2 trolley neri, 1 sacca" value={bagagli.descrizione} onChange={(e) => setBagagli({ ...bagagli, descrizione: e.target.value })} />
            </Campo>
            <Campo etichetta="Dove">
              <Input placeholder="Es. deposito, scaffale B" value={bagagli.posizione} onChange={(e) => setBagagli({ ...bagagli, posizione: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-4">
              <Pulsante type="submit" variante="primario" disabled={busy}>
                Registra
              </Pulsante>
              <Pulsante onClick={() => setBagagli(null)}>Annulla</Pulsante>
            </div>
          </form>
        )}
        {d.bagagli.inDeposito.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Nessun bagaglio in deposito.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-stone-100">
            {d.bagagli.inDeposito.map((b) => (
              <li key={b.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
                <div>
                  <span className="flex flex-wrap items-center gap-2">
                    <Etichetta tono="blu">n. {b.numero}</Etichetta>
                    <strong>{b.nome}</strong>
                    {b.prenotazioneId && (
                      <Link href={`/prenotazioni/${b.prenotazioneId}`} className="text-teal-800 hover:underline">
                        #{b.prenotazioneId}
                      </Link>
                    )}
                    {b.camere && <span className="text-stone-600">camere {b.camere}</span>}
                    <span>· {b.colli === 1 ? "1 collo" : `${b.colli} colli`}</span>
                  </span>
                  <p className="text-xs text-stone-600">
                    {[b.descrizione, b.posizione && `in ${b.posizione}`].filter(Boolean).join(" · ")} · lasciati il {quando(b.depositatoIl)} ({b.depositatoDa})
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/portineria/custodia/cartellino/${b.id}`} className={classePulsante("leggero", "piccolo")}>
                    <Printer className="h-3.5 w-3.5" aria-hidden /> Cartellino
                  </Link>
                  {ritiro?.id === b.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await esegui(() => sbusta(azioneRitiraBagagli(b.id, Number(ritiro.numero), ritiro.nota)), () => ({ testo: `Bagagli n. ${b.numero} consegnati.` }))) setRitiro(null);
                      }}
                    >
                      <Input className="w-28" inputMode="numeric" placeholder="N. cartellino" value={ritiro.numero} onChange={(e) => setRitiro({ ...ritiro, numero: e.target.value })} aria-label="Numero del cartellino" />
                      <Input className="w-40" placeholder="Nota (facoltativa)" value={ritiro.nota} onChange={(e) => setRitiro({ ...ritiro, nota: e.target.value })} aria-label="Nota" />
                      <Pulsante type="submit" dimensione="piccolo" variante="primario" disabled={busy || !ritiro.numero}>
                        Consegna
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setRitiro(null)}>
                        Indietro
                      </Pulsante>
                    </form>
                  ) : (
                    <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setRitiro({ id: b.id, numero: "", nota: "" })}>
                      Ritiro
                    </Pulsante>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.bagagli.ritirati.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-stone-600">Ritirati negli ultimi 7 giorni ({d.bagagli.ritirati.length})</summary>
            <ul className="mt-1">
              {d.bagagli.ritirati.map((b) => (
                <li key={b.id} className="text-xs text-stone-600">
                  n. {b.numero} · {b.nome} · {b.colli} colli · ritirati il {quando(b.ritiratoIl!)} ({b.ritiratoDa}){b.ritiroNota && ` · ${b.ritiroNota}`}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Sezione>

      {/* ---------------- Valori ---------------- */}
      <Sezione
        titolo={
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden /> Valori in custodia ({d.valori.aperte.length})
          </span>
        }
        azioni={
          !valori && (
            <Pulsante dimensione="piccolo" icona={Plus} onClick={() => setValori({ prenotazioneId: "", descrizione: "", importo: "" })}>
              Nuova custodia
            </Pulsante>
          )
        }
      >
        <AiutoSezione breve="Denaro, gioielli o documenti che l'ospite lascia nella cassaforte dell'hotel: si rilascia una ricevuta numerata e ogni movimento (prelievo, versamento, ritiro) si annota sul retro con la firma dell'ospite.">
          <p>
            L&apos;albergatore risponde delle cose consegnate in custodia senza i limiti previsti per quelle tenute in camera (artt. 1783-1786 del codice civile). Meglio una busta
            chiusa e firmata sui lembi: si descrive la busta, non il contenuto.
          </p>
        </AiutoSezione>
        {valori && (
          <form
            className="mt-3 grid gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await esegui(
                  () => sbusta(azioneApriCustodia({ prenotazioneId: Number(valori.prenotazioneId), descrizione: valori.descrizione, importo: numero(valori.importo) })),
                  (r) => ({ testo: `Custodia registrata: ricevuta n. ${r.numero}.`, link: { href: `/portineria/custodia/ricevuta/${r.id}`, testo: "Stampa la ricevuta" } }),
                )
              )
                setValori(null);
            }}
          >
            <Campo etichetta="Ospite" obbligatorio className="sm:col-span-2">
              {sceltaPrenotazione(valori.prenotazioneId, (v) => setValori({ ...valori, prenotazioneId: v }), false)}
            </Campo>
            <Campo etichetta="Contanti (€)" aiuto="Solo se c'è denaro contato davanti all'ospite.">
              <Input inputMode="decimal" value={valori.importo} onChange={(e) => setValori({ ...valori, importo: e.target.value })} />
            </Campo>
            <Campo etichetta="Cosa viene lasciato" obbligatorio className="sm:col-span-4">
              <Input placeholder="Es. busta chiusa firmata sui lembi; orologio; passaporto" value={valori.descrizione} onChange={(e) => setValori({ ...valori, descrizione: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-4">
              <Pulsante type="submit" variante="primario" disabled={busy || !valori.prenotazioneId}>
                Registra
              </Pulsante>
              <Pulsante onClick={() => setValori(null)}>Annulla</Pulsante>
            </div>
          </form>
        )}
        {d.valori.aperte.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Nessun valore in custodia.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {d.valori.aperte.map((c) => (
              <li key={c.id} className="rounded-lg border border-stone-200 p-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Etichetta tono="viola">Ricevuta n. {c.numero}</Etichetta>
                  <strong>{c.nome}</strong>
                  <Link href={`/prenotazioni/${c.prenotazioneId}`} className="text-teal-800 hover:underline">
                    #{c.prenotazioneId}
                  </Link>
                  {c.camera && <span className="text-stone-600">camera {c.camera}</span>}
                  {c.saldo > 0 && <Etichetta tono="verde">Contanti {eur(c.saldo)}</Etichetta>}
                </span>
                <ul className="mt-1 text-xs text-stone-700">
                  {c.movimenti.map((m) => (
                    <li key={m.id}>
                      {quando(m.data)} · {MOVIMENTI_VALORI[m.tipo]}
                      {m.descrizione && `: ${m.descrizione}`}
                      {m.importo !== null && ` · ${eur(m.importo)}`} · {m.registratoDa}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link href={`/portineria/custodia/ricevuta/${c.id}`} className={classePulsante("leggero", "piccolo")}>
                    <Printer className="h-3.5 w-3.5" aria-hidden /> Ricevuta
                  </Link>
                  {movimento?.id === c.id ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (
                          await esegui(
                            () => sbusta(azioneMovimentoValori(c.id, movimento.tipo, movimento.descrizione, movimento.tipo === "ritiro" ? null : numero(movimento.importo))),
                            () => ({ testo: movimento.tipo === "ritiro" ? `Valori della ricevuta n. ${c.numero} restituiti: custodia chiusa.` : "Movimento registrato." }),
                          )
                        )
                          setMovimento(null);
                      }}
                    >
                      <Select value={movimento.tipo} onChange={(e) => setMovimento({ ...movimento, tipo: e.target.value as typeof movimento.tipo })} aria-label="Movimento">
                        <option value="prelievo">{MOVIMENTI_VALORI.prelievo}</option>
                        <option value="versamento">{MOVIMENTI_VALORI.versamento}</option>
                        <option value="ritiro">{MOVIMENTI_VALORI.ritiro}</option>
                      </Select>
                      {movimento.tipo !== "ritiro" && (
                        <Input className="w-28" inputMode="decimal" placeholder="Importo €" value={movimento.importo} onChange={(e) => setMovimento({ ...movimento, importo: e.target.value })} aria-label="Importo" />
                      )}
                      <Input className="w-48" placeholder="Descrizione" value={movimento.descrizione} onChange={(e) => setMovimento({ ...movimento, descrizione: e.target.value })} aria-label="Descrizione" />
                      <Pulsante type="submit" dimensione="piccolo" variante={movimento.tipo === "ritiro" ? "pericolo" : "primario"} disabled={busy}>
                        {movimento.tipo === "ritiro" ? "Restituisci tutto e chiudi" : "Registra"}
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setMovimento(null)}>
                        Indietro
                      </Pulsante>
                    </form>
                  ) : (
                    <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setMovimento({ id: c.id, tipo: "prelievo", descrizione: "", importo: "" })}>
                      Movimento
                    </Pulsante>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {d.valori.chiuse.length > 0 && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-stone-600">Chiuse negli ultimi 30 giorni ({d.valori.chiuse.length})</summary>
            <ul className="mt-1">
              {d.valori.chiuse.map((c) => (
                <li key={c.id} className="text-xs text-stone-600">
                  <Link href={`/portineria/custodia/ricevuta/${c.id}`} className="underline">
                    Ricevuta n. {c.numero}
                  </Link>{" "}
                  · {c.nome} · ritirati il {quando(c.chiusaIl!)} ({c.chiusaDa})
                </li>
              ))}
            </ul>
          </details>
        )}
      </Sezione>

      {/* ---------------- Chiavi ---------------- */}
      <Sezione
        titolo={
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" aria-hidden /> Chiavi fuori ({d.chiavi.length})
          </span>
        }
      >
        <AiutoSezione breve="Camere con chiavi o key card consegnate e non ancora restituite. Le chiavi si segnano dalla pagina di check-in della camera; al check-out si avvisa se ne mancano." />
        {d.chiavi.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Tutte le chiavi sono rientrate.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-stone-100 text-sm">
            {d.chiavi.map((k) => (
              <li key={k.segmentoId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  Camera <strong>{k.camera}</strong> · {k.ospite} ·{" "}
                  <Link href={`/prenotazioni/${k.prenotazioneId}/checkin/${k.segmentoId}`} className="text-teal-800 hover:underline">
                    #{k.prenotazioneId}
                  </Link>{" "}
                  · consegnate {k.consegnate}, restituite {k.restituite}
                  {k.partiti && <Etichetta tono="rosso" className="ml-2">Partiti senza restituirle</Etichetta>}
                </span>
                <Pulsante
                  dimensione="piccolo"
                  disabled={busy}
                  onClick={() => esegui(() => sbusta(azioneChiavi(k.segmentoId, k.consegnate, k.consegnate)), () => ({ testo: `Chiavi della camera ${k.camera} rientrate.` }))}
                >
                  Rientrate tutte
                </Pulsante>
              </li>
            ))}
          </ul>
        )}
      </Sezione>
    </div>
  );
}
