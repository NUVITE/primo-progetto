"use client";

import { Pencil, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Campo, Dato, Etichetta, Input, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneOpzioniProvenienza, azionePolitica, azioneProvenienza, caricaPrenotazione } from "./actions";

type Prenotazione = Awaited<ReturnType<typeof caricaPrenotazione>>;
type Opzioni = Awaited<ReturnType<typeof azioneOpzioniProvenienza>> extends infer R ? (R extends { ok: true; valore: infer V } ? V : never) : never;
type Esegui = <T>(fn: () => Promise<T>) => Promise<T | null>;

const TIPI_CLIENTE: Record<string, string> = { azienda: "azienda", privato: "privato", agenzia: "agenzia", portale: "portale" };

/**
 * Da dove arriva la prenotazione (canale e mezzo, azienda/agenzia/portale), chi paga, garanzia,
 * ora di arrivo e politica di cancellazione accettata dal cliente.
 */
export function ProvenienzaCondizioni({
  prenotazione: p,
  puoGestire,
  salvando,
  esegui,
  aggiorna,
}: {
  prenotazione: Prenotazione;
  puoGestire: boolean;
  salvando: boolean;
  esegui: Esegui;
  aggiorna: (p: Prenotazione) => void;
}) {
  const [opzioni, setOpzioni] = useState<Opzioni | null>(null);
  const [f, setF] = useState<null | {
    canale: string;
    mezzo: string;
    intermediarioId: string;
    clientePaganteId: string;
    garanzia: string;
    oraArrivo: string;
    politicaId: string;
  }>(null);
  const v = p.provenienza;
  const annullata = p.stato === "ANNULLATA";

  async function modifica() {
    const o = opzioni ?? (await esegui(() => sbusta(azioneOpzioniProvenienza())));
    if (!o) return;
    setOpzioni(o);
    setF({
      canale: v.canale,
      mezzo: v.mezzo,
      intermediarioId: v.intermediarioId ? String(v.intermediarioId) : "",
      clientePaganteId: v.clientePaganteId ? String(v.clientePaganteId) : "",
      garanzia: v.garanzia,
      oraArrivo: v.oraArrivo,
      politicaId: p.politica ? String(p.politica.id) : "",
    });
  }

  async function salva() {
    if (!f) return;
    const r = await esegui(async () => {
      let x = await sbusta(
        azioneProvenienza(p.id, {
          canale: f.canale,
          mezzo: f.mezzo || null,
          intermediarioId: f.intermediarioId ? Number(f.intermediarioId) : null,
          clientePaganteId: f.clientePaganteId ? Number(f.clientePaganteId) : null,
          garanzia: f.garanzia,
          oraArrivo: f.oraArrivo || null,
        }),
      );
      const prima = p.politica ? String(p.politica.id) : "";
      if (f.politicaId !== prima) x = await sbusta(azionePolitica(p.id, f.politicaId ? Number(f.politicaId) : null));
      return x;
    });
    if (r) {
      aggiorna(r);
      setF(null);
    }
  }

  // Intermediari possibili: aziende, agenzie e portali; paganti: tutti i clienti.
  const intermediari = opzioni?.clienti.filter((c) => c.tipo !== "privato") ?? [];

  return (
    <Sezione
      titolo={
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden /> Provenienza e condizioni
        </span>
      }
      azioni={
        puoGestire &&
        !annullata &&
        !f && (
          <Pulsante dimensione="piccolo" variante="leggero" icona={Pencil} disabled={salvando} onClick={modifica}>
            Modifica
          </Pulsante>
        )
      }
    >
      <AiutoSezione breve="Chi ha portato la prenotazione e come, chi paga, la garanzia e la politica di cancellazione accettata.">
        <p>
          <strong>Garanzia</strong>: una prenotazione garantita (caparra, carta, prepagata) tiene la camera anche se l&apos;ospite arriva tardi. Senza
          garanzia, superato l&apos;orario limite di arrivo l&apos;ospite che non si è presentato è un possibile no-show e la camera si può liberare. Della
          carta di credito si segna solo che c&apos;è: i suoi dati non si scrivono qui.
        </p>
        <p>
          <strong>Politica di cancellazione</strong>: è quella valida quando la prenotazione è nata e resta la stessa anche se l&apos;hotel la cambia
          dopo. All&apos;annullamento propone la penale.
        </p>
        <Esempio>Agenzia Viaggi Sole, via email, garantita con caparra, arrivo previsto alle 21:30: la camera resta tenuta anche dopo le 18.</Esempio>
      </AiutoSezione>

      {!f ? (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          <Dato etichetta="Canale">
            {v.canaleTesto}
            {v.mezzoTesto && <span className="text-stone-600"> · {v.mezzoTesto}</span>}
          </Dato>
          <Dato etichetta="Tramite">{v.intermediario ?? "—"}</Dato>
          <Dato etichetta="Paga">{v.clientePagante ?? "l'ospite"}</Dato>
          <Dato etichetta="Garanzia">{v.garanzia === "nessuna" ? <Etichetta tono="ambra">non garantita</Etichetta> : v.garanziaTesto}</Dato>
          <Dato etichetta="Arrivo previsto">{v.oraArrivo ? `ore ${v.oraArrivo}` : "—"}</Dato>
          <Dato etichetta="Politica di cancellazione" className="col-span-2">
            {p.politica ? (
              <>
                <strong>{p.politica.nome}</strong>
                <ul className="mt-0.5 list-disc pl-4 text-xs text-stone-700">
                  {p.politica.righe.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </>
            ) : (
              <span className="text-stone-600">nessuna: la penale si decide all&apos;annullamento</span>
            )}
          </Dato>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3 rounded-md border border-teal-200 bg-teal-50/50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etichetta="Canale">
              <Select value={f.canale} onChange={(e) => setF({ ...f, canale: e.target.value })}>
                {opzioni?.canali.map((c) => (
                  <option key={c.valore} value={c.valore}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Mezzo">
              <Select value={f.mezzo} onChange={(e) => setF({ ...f, mezzo: e.target.value })}>
                <option value="">—</option>
                {opzioni?.mezzi.map((m) => (
                  <option key={m.valore} value={m.valore}>
                    {m.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Tramite (azienda, agenzia, portale)" aiuto="Si aggiungono in Anagrafiche > Clienti e aziende.">
              <Select value={f.intermediarioId} onChange={(e) => setF({ ...f, intermediarioId: e.target.value })}>
                <option value="">—</option>
                {intermediari.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.denominazione} ({TIPI_CLIENTE[c.tipo] ?? c.tipo})
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Chi paga" aiuto="Vuoto = paga l'ospite.">
              <Select value={f.clientePaganteId} onChange={(e) => setF({ ...f, clientePaganteId: e.target.value })}>
                <option value="">l&apos;ospite</option>
                {opzioni?.clienti.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.denominazione}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Garanzia">
              <Select value={f.garanzia} onChange={(e) => setF({ ...f, garanzia: e.target.value })}>
                {opzioni?.garanzie.map((g) => (
                  <option key={g.valore} value={g.valore}>
                    {g.nome}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Ora di arrivo prevista">
              <Input type="time" value={f.oraArrivo} onChange={(e) => setF({ ...f, oraArrivo: e.target.value })} />
            </Campo>
            <Campo etichetta="Politica di cancellazione" className="sm:col-span-2" aiuto="Cambiarla vale solo se il cliente è d'accordo (es. tariffa non rimborsabile).">
              <Select value={f.politicaId} onChange={(e) => setF({ ...f, politicaId: e.target.value })}>
                <option value="">nessuna</option>
                {p.politica && !opzioni?.politiche.some((x) => x.id === p.politica!.id) && <option value={p.politica.id}>{p.politica.nome} (accettata alla prenotazione)</option>}
                {opzioni?.politiche.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                    {x.predefinita ? " (predefinita)" : ""}
                  </option>
                ))}
              </Select>
            </Campo>
          </div>
          <div className="flex gap-2">
            <Pulsante variante="primario" disabled={salvando} onClick={salva}>
              Salva
            </Pulsante>
            <Pulsante onClick={() => setF(null)}>Annulla</Pulsante>
          </div>
        </div>
      )}
    </Sezione>
  );
}
