"use client";

import { Mail, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { LINGUE, MODELLI, type ChiaveModello, type Lingua } from "@/lib/emailRegole";
import { Avviso, Campo, Etichetta, Input, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneAnteprimaEmail, azioneInviaEmail, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Bozza = {
  chiave: ChiaveModello;
  lingua: Lingua;
  destinatario: string;
  altro: string;
  oggetto: string;
  corpo: string;
  mancanti: string[];
  destinatari: { email: string; nome: string; ruolo: string }[];
};

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Email all'ospite dalla prenotazione: modello, anteprima modificabile, invio e storico. */
export function ComunicazioniPrenotazione({ prenotazione: p, aggiorna }: { prenotazione: Prenotazione; aggiorna: (p: Prenotazione) => void }) {
  const [bozza, setBozza] = useState<Bozza | null>(null);
  const [aperta, setAperta] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore" | "info"; testo: string } | null>(null);
  if (!p.email) return null;
  const email = p.email;

  async function prepara(chiave: ChiaveModello, lingua: Lingua | null, destinatario?: string) {
    setMsg(null);
    setBusy(true);
    try {
      const a = await sbusta(azioneAnteprimaEmail(p.id, chiave, lingua));
      setBozza({ chiave, lingua: a.lingua, destinatario: destinatario ?? a.destinatari[0]?.email ?? "", altro: "", oggetto: a.oggetto, corpo: a.corpo, mancanti: a.mancanti, destinatari: a.destinatari });
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
    } finally {
      setBusy(false);
    }
  }
  const destinatario = bozza ? (bozza.destinatario === "altro" ? bozza.altro : bozza.destinatario) : "";
  const restano = bozza ? [...new Set([...(bozza.oggetto + bozza.corpo).matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]))] : [];

  return (
    <Sezione
      titolo={
        <span className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-teal-700" aria-hidden /> Comunicazioni
        </span>
      }
      azioni={
        !bozza &&
        email.configurata && (
          <Pulsante dimensione="piccolo" icona={Send} disabled={busy} onClick={() => prepara("conferma", null)}>
            Scrivi un&apos;email
          </Pulsante>
        )
      }
    >
      <AiutoSezione breve="Conferme, richieste di acconto e promemoria partono dalla casella dell'hotel, con i dati di questa prenotazione già inseriti." />
      {!email.configurata && (
        <Avviso tipo="info" className="mt-2">
          La posta non è configurata: inseriscila in <Link href="/impostazioni/email" className="font-semibold underline">Impostazioni › Email e modelli</Link>.
        </Avviso>
      )}
      {msg && (
        <Avviso tipo={msg.tipo} className="mt-2">
          {msg.testo}
        </Avviso>
      )}

      {bozza && (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/40 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Campo etichetta="Modello">
              <Select value={bozza.chiave} disabled={busy} onChange={(e) => prepara(e.target.value as ChiaveModello, bozza.lingua, bozza.destinatario)}>
                {(Object.entries(MODELLI) as [ChiaveModello, string][]).filter(([k]) => k !== "preventivo").map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Lingua">
              <Select value={bozza.lingua} disabled={busy} onChange={(e) => prepara(bozza.chiave, e.target.value as Lingua, bozza.destinatario)}>
                {(Object.entries(LINGUE) as [Lingua, string][]).map(([k, t]) => (
                  <option key={k} value={k}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="A">
              <Select value={bozza.destinatario} onChange={(e) => setBozza({ ...bozza, destinatario: e.target.value })}>
                {bozza.destinatari.map((d) => (
                  <option key={d.email} value={d.email}>
                    {d.nome} ({d.ruolo}) · {d.email}
                  </option>
                ))}
                <option value="altro">Un altro indirizzo…</option>
              </Select>
            </Campo>
            {(bozza.destinatario === "altro" || !bozza.destinatari.length) && (
              <Campo etichetta="Indirizzo">
                <Input type="email" value={bozza.altro} onChange={(e) => setBozza({ ...bozza, destinatario: "altro", altro: e.target.value })} />
              </Campo>
            )}
          </div>
          {!bozza.destinatari.length && <p className="text-xs text-stone-600">L&apos;ospite non ha un indirizzo email: scrivilo qui o aggiungilo nella sua anagrafica.</p>}
          <Campo etichetta="Oggetto">
            <Input value={bozza.oggetto} onChange={(e) => setBozza({ ...bozza, oggetto: e.target.value })} />
          </Campo>
          <Campo etichetta="Testo">
            <Textarea rows={14} value={bozza.corpo} onChange={(e) => setBozza({ ...bozza, corpo: e.target.value })} />
          </Campo>
          {restano.length > 0 && (
            <Avviso tipo="avviso">
              Mancano dei dati: {restano.map((m) => `{{${m}}}`).join(", ")}. Completali nel testo (o nella prenotazione e nelle impostazioni) prima di inviare.
            </Avviso>
          )}
          <div className="flex gap-2">
            <Pulsante
              variante="primario"
              icona={Send}
              disabled={busy || !destinatario || restano.length > 0}
              onClick={async () => {
                setMsg(null);
                setBusy(true);
                try {
                  const r = await sbusta(azioneInviaEmail(p.id, { destinatario, oggetto: bozza.oggetto, corpo: bozza.corpo, lingua: bozza.lingua, modello: bozza.chiave }));
                  aggiorna(r.prenotazione);
                  setBozza(null);
                  setMsg({ tipo: r.esito === "simulata" ? "info" : "ok", testo: r.esito === "simulata" ? "Email registrata come simulata (ambiente di prova: non è partita)." : `Email inviata a ${destinatario}.` });
                } catch (e) {
                  setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Invia
            </Pulsante>
            <Pulsante onClick={() => setBozza(null)}>Annulla</Pulsante>
          </div>
        </div>
      )}

      {email.storico.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 text-sm">
          {email.storico.map((e) => (
            <li key={e.id} className="py-1.5">
              <button type="button" className="flex w-full flex-wrap items-center gap-2 text-left" onClick={() => setAperta(aperta === e.id ? null : e.id)}>
                <span className="font-semibold">{e.modello ? MODELLI[e.modello as ChiaveModello] : "Email"}</span>
                <span className="min-w-0 flex-1 truncate text-stone-600">
                  a {e.destinatario} · {e.oggetto}
                </span>
                <Etichetta tono={e.esito === "inviata" ? "verde" : e.esito === "simulata" ? "blu" : "rosso"}>{e.esito}</Etichetta>
                <span className="text-xs text-stone-500">
                  {quando(e.inviataIl)} · {e.inviataDa}
                </span>
              </button>
              {aperta === e.id && (
                <div className="mt-1 rounded-md bg-stone-50 p-2 text-xs whitespace-pre-line text-stone-800">
                  {e.errore && <p className="mb-1 font-semibold text-red-800">Errore: {e.errore}</p>}
                  {e.corpo}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sezione>
  );
}
