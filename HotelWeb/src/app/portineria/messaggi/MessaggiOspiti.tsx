"use client";

import { Hand, Mail, Package, Plus, Send, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { MODI_ARRIVO, MODI_CONSEGNA, TIPI_MESSAGGIO, type MessaggioInput, type ModoArrivo, type ModoConsegna, type TipoMessaggio } from "@/lib/messaggiRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneConsegnaMessaggio, azioneEliminaMessaggio, azioneRegistraMessaggio, type datiMessaggi } from "./actions";

type Dati = Awaited<ReturnType<typeof datiMessaggi>>;
type Voce = Dati["daConsegnare"][number];
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const TONO_SITUAZIONE: Record<string, "verde" | "blu" | "neutro"> = { "in casa": "verde", "in arrivo": "blu", partito: "neutro" };

const vuoto = (): MessaggioInput => ({ prenotazioneId: null, ospiteId: null, destinatario: "", tipo: "messaggio", daChi: "", modo: "telefono", recapito: "", testo: "", urgente: false, doveRiposto: "" });

export function MessaggiOspiti({ iniziale, prenotazioneIniziale }: { iniziale: Dati; prenotazioneIniziale: number | null }) {
  const [d, setD] = useState(iniziale);
  const primo = prenotazioneIniziale ? iniziale.ospiti.find((o) => o.prenotazioneId === prenotazioneIniziale) : undefined;
  const [form, setForm] = useState<MessaggioInput | null>(primo ? { ...vuoto(), prenotazioneId: primo.prenotazioneId, ospiteId: primo.ospiteId } : null);
  const [cerca, setCerca] = useState("");
  const [altro, setAltro] = useState(false);
  const [elimina, setElimina] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      setD(await fn());
      setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const filtrati = d.ospiti.filter((o) => !cerca.trim() || `${o.nome} ${o.camere}`.toLowerCase().includes(cerca.trim().toLowerCase()));
  const scelto = form && d.ospiti.find((o) => o.prenotazioneId === form.prenotazioneId && o.ospiteId === form.ospiteId);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Messaggi e posta"
        sottotitolo={d.daConsegnare.length === 1 ? "1 da consegnare" : `${d.daConsegnare.length} da consegnare`}
        azioni={
          !form && (
            <Pulsante variante="primario" icona={Plus} onClick={() => setForm(vuoto())}>
              Nuovo
            </Pulsante>
          )
        }
      />
      <Sezione>
        <AiutoSezione breve="Il blocco comunicazioni della portineria: messaggi di chi cerca un ospite, lettere e pacchi arrivati per lui. Restano qui (e in evidenza nella prenotazione e al check-out) finché non si consegnano.">
          <p>
            Privacy: a chi telefona non si conferma che una persona è ospite dell&apos;hotel se non l&apos;ha autorizzato; si prende il messaggio e lo si consegna. Un messaggio si
            può anche inoltrare all&apos;ospite per email dalla casella dell&apos;hotel, se ha lasciato l&apos;indirizzo.
          </p>
        </AiutoSezione>
      </Sezione>

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {form && (
        <Sezione titolo="Nuovo messaggio o posta">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await esegui(() => sbusta(azioneRegistraMessaggio(form)), "Registrato.")) {
                setForm(null);
                setAltro(false);
                setCerca("");
              }
            }}
          >
            <div className="flex flex-wrap gap-1 sm:col-span-2" role="group" aria-label="Tipo">
              {(Object.entries(TIPI_MESSAGGIO) as [TipoMessaggio, string][]).map(([k, v]) => (
                <Pulsante
                  key={k}
                  dimensione="piccolo"
                  variante={form.tipo === k ? "primario" : "secondario"}
                  onClick={() => setForm({ ...form, tipo: k, modo: k === "messaggio" ? "telefono" : k === "pacco" ? "corriere" : "posta" })}
                >
                  {v}
                </Pulsante>
              ))}
            </div>
            {!altro ? (
              <Campo etichetta="Per chi" obbligatorio className="sm:col-span-2" aiuto="Ospiti in casa, in arrivo nei prossimi 7 giorni o partiti da ieri.">
                <div className="flex flex-col gap-1">
                  <Input placeholder="Cerca per cognome o camera" value={cerca} onChange={(e) => setCerca(e.target.value)} aria-label="Cerca ospite" />
                  <Select
                    value={form.prenotazioneId ? `${form.prenotazioneId}:${form.ospiteId}` : ""}
                    onChange={(e) => {
                      const [p, o] = e.target.value.split(":").map(Number);
                      setForm({ ...form, prenotazioneId: p || null, ospiteId: o || null });
                    }}
                    aria-label="Ospite"
                  >
                    <option value="">Scegli l&apos;ospite…</option>
                    {filtrati.map((o) => (
                      <option key={`${o.prenotazioneId}:${o.ospiteId}`} value={`${o.prenotazioneId}:${o.ospiteId}`}>
                        {o.nome} · {o.camere} · {o.situazione}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    className="self-start text-xs text-teal-800 underline"
                    onClick={() => {
                      setAltro(true);
                      setForm({ ...form, prenotazioneId: null, ospiteId: null });
                    }}
                  >
                    Non lo trovo: scrivo il nome
                  </button>
                </div>
              </Campo>
            ) : (
              <Campo etichetta="Per chi (nome come scritto)" obbligatorio className="sm:col-span-2" aiuto="Es. posta per una persona che non risulta fra gli ospiti: resta qui finché non si chiarisce.">
                <div className="flex flex-col gap-1">
                  <Input value={form.destinatario} onChange={(e) => setForm({ ...form, destinatario: e.target.value })} />
                  <button type="button" className="self-start text-xs text-teal-800 underline" onClick={() => setAltro(false)}>
                    Scegli fra gli ospiti
                  </button>
                </div>
              </Campo>
            )}
            {scelto && (
              <p className="text-sm text-stone-700 sm:col-span-2">
                Prenotazione{" "}
                <Link href={`/prenotazioni/${scelto.prenotazioneId}`} className="text-teal-800 underline">
                  #{scelto.prenotazioneId}
                </Link>{" "}
                · camere {scelto.camere} · {scelto.situazione}
              </p>
            )}
            <Campo etichetta={form.tipo === "messaggio" ? "Chi l'ha cercato" : "Mittente"} obbligatorio={form.tipo === "messaggio"}>
              <Input value={form.daChi} onChange={(e) => setForm({ ...form, daChi: e.target.value })} />
            </Campo>
            <Campo etichetta="Come">
              <Select value={form.modo} onChange={(e) => setForm({ ...form, modo: e.target.value as ModoArrivo | "" })}>
                <option value="">—</option>
                {Object.entries(MODI_ARRIVO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Campo>
            {form.tipo === "messaggio" ? (
              <Campo etichetta="Numero o recapito da richiamare">
                <Input value={form.recapito} onChange={(e) => setForm({ ...form, recapito: e.target.value })} />
              </Campo>
            ) : (
              <Campo etichetta="Dove è stato messo" aiuto="Es. casellario, sotto il banco, back office.">
                <Input value={form.doveRiposto} onChange={(e) => setForm({ ...form, doveRiposto: e.target.value })} />
              </Campo>
            )}
            <Spunta className="self-end" etichetta="Urgente" checked={form.urgente} onChange={(e) => setForm({ ...form, urgente: e.target.checked })} />
            <Campo etichetta={form.tipo === "messaggio" ? "Messaggio" : "Note"} obbligatorio={form.tipo === "messaggio"} className="sm:col-span-2">
              <Textarea rows={3} maxLength={2000} value={form.testo} onChange={(e) => setForm({ ...form, testo: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-2">
              <Pulsante type="submit" variante="primario" disabled={busy}>
                Registra
              </Pulsante>
              <Pulsante
                disabled={busy}
                onClick={() => {
                  setForm(null);
                  setAltro(false);
                }}
              >
                Annulla
              </Pulsante>
            </div>
          </form>
        </Sezione>
      )}

      <Sezione titolo="Da consegnare">
        {d.daConsegnare.length === 0 ? (
          <p className="text-sm text-stone-600">Niente da consegnare.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {d.daConsegnare.map((m) => (
              <li key={m.id} className={`rounded-lg border p-3 text-sm ${m.urgente ? "border-red-300 bg-red-50" : "border-stone-200"}`}>
                <Intestazione m={m} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pulsante dimensione="piccolo" icona={Hand} disabled={busy} onClick={() => esegui(() => sbusta(azioneConsegnaMessaggio(m.id, "mano", "")), "Consegnato.")}>
                    Consegnato a mano
                  </Pulsante>
                  {m.tipo === "messaggio" && m.puoEmail && (
                    <Pulsante
                      dimensione="piccolo"
                      icona={Send}
                      disabled={busy || !d.emailConfigurata}
                      title={d.emailConfigurata ? undefined : "La posta dell'hotel non è configurata (Impostazioni › Email)"}
                      onClick={() => esegui(() => sbusta(azioneConsegnaMessaggio(m.id, "email", "")), "Inviato per email all'ospite.")}
                    >
                      Invia per email
                    </Pulsante>
                  )}
                  {m.tipo !== "messaggio" && (
                    <Pulsante dimensione="piccolo" icona={Truck} disabled={busy} onClick={() => esegui(() => sbusta(azioneConsegnaMessaggio(m.id, "rispedito", "")), "Segnato come rispedito.")}>
                      Rispedito
                    </Pulsante>
                  )}
                  {elimina === m.id ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs">Eliminare (registrato per errore)?</span>
                      <Pulsante dimensione="piccolo" variante="pericolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneEliminaMessaggio(m.id)), "Eliminato.").then(() => setElimina(null))}>
                        Sì, elimina
                      </Pulsante>
                      <Pulsante dimensione="piccolo" onClick={() => setElimina(null)}>
                        No
                      </Pulsante>
                    </span>
                  ) : (
                    <Pulsante dimensione="piccolo" variante="leggero" icona={Trash2} disabled={busy} onClick={() => setElimina(m.id)}>
                      Elimina
                    </Pulsante>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Consegnati negli ultimi 7 giorni">
        {d.consegnati.length === 0 ? (
          <p className="text-sm text-stone-600">Nessuno.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100">
            {d.consegnati.map((m) => (
              <li key={m.id} className="py-2 text-sm">
                <Intestazione m={m} />
                <p className="mt-1 text-xs text-stone-600">
                  {MODI_CONSEGNA[m.consegnaModo as ModoConsegna] ?? m.consegnaModo} da {m.consegnatoDa} il {quando(m.consegnatoIl!)}
                  {m.consegnaNota && ` · ${m.consegnaNota}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Sezione>
    </div>
  );
}

function Intestazione({ m }: { m: Voce }) {
  const Icona = m.tipo === "messaggio" ? Mail : Package;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Icona className="h-4 w-4 text-stone-500" aria-hidden />
        <Etichetta>{TIPI_MESSAGGIO[m.tipo as TipoMessaggio] ?? m.tipo}</Etichetta>
        {m.urgente && <Etichetta tono="rosso">Urgente</Etichetta>}
        <strong>{m.destinatario}</strong>
        {m.prenotazioneId ? (
          <Link href={`/prenotazioni/${m.prenotazioneId}`} className="text-teal-800 hover:underline">
            #{m.prenotazioneId}
          </Link>
        ) : (
          <Etichetta tono="ambra">Non abbinato a una prenotazione</Etichetta>
        )}
        {m.camere && <span className="text-stone-600">camere {m.camere}</span>}
        {m.situazione && <Etichetta tono={TONO_SITUAZIONE[m.situazione] ?? "neutro"}>{m.situazione}</Etichetta>}
      </div>
      <p className="mt-1 text-stone-700">
        {m.daChi && <>{m.tipo === "messaggio" ? "Da" : "Mittente"}: <strong>{m.daChi}</strong> </>}
        {m.modo && <>({MODI_ARRIVO[m.modo as ModoArrivo] ?? m.modo}) </>}
        {m.recapito && <>· da richiamare: {m.recapito} </>}
        {m.doveRiposto && <>· messo in: {m.doveRiposto} </>}
        <span className="text-xs text-stone-500">
          · ricevuto il {quando(m.ricevutoIl)} da {m.ricevutoDa}
        </span>
      </p>
      {m.testo && <p className="mt-1 whitespace-pre-line">«{m.testo}»</p>}
    </>
  );
}
