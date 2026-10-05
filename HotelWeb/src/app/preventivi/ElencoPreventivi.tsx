"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CANALI_RICHIESTA, MOTIVI_RINUNCIA, STATI_PREVENTIVO, STATI_RICHIESTA_DISP, type CanaleRichiesta, type MotivoRinuncia, type StatoPreventivo, type StatoRichiestaDisp } from "@/lib/preventiviRegole";
import { LINGUE, type Lingua } from "@/lib/emailRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaPreventivi, azioneNuovaRichiestaDisp, datiPreventivi } from "./actions";

type Dati = Awaited<ReturnType<typeof datiPreventivi>>;
const it = (g: string) => g.split("-").reverse().join("/");

export const vuotaRichiesta = () => ({
  canale: "telefono",
  nome: "",
  cognome: "",
  email: "",
  telefono: "",
  lingua: "it",
  dal: "",
  al: "",
  adulti: "2",
  bambini: "",
  camere: "1",
  trattamento: "",
  budget: "",
  note: "",
});
export type FormRichiesta = ReturnType<typeof vuotaRichiesta>;

/** Da modulo a dati: età dei bambini scritte separate da virgola (es. "8, 3"). */
export function datiRichiesta(f: FormRichiesta) {
  return {
    canale: f.canale,
    nome: f.nome,
    cognome: f.cognome,
    email: f.email,
    telefono: f.telefono,
    lingua: f.lingua,
    dal: f.dal,
    al: f.al,
    adulti: Number(f.adulti),
    etaBambini: f.bambini.split(/[,\s]+/).filter(Boolean).map(Number),
    camere: Number(f.camere),
    trattamento: f.trattamento,
    budget: f.budget,
    note: f.note,
  };
}

/** Campi della richiesta (nuova o da modificare). */
export function CampiRichiesta({ f, set }: { f: FormRichiesta; set: (f: FormRichiesta) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Campo etichetta="Arrivata da">
        <Select value={f.canale} onChange={(e) => set({ ...f, canale: e.target.value })}>
          {(Object.entries(CANALI_RICHIESTA) as [CanaleRichiesta, string][]).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      </Campo>
      <Campo etichetta="Nome" obbligatorio>
        <Input value={f.nome} onChange={(e) => set({ ...f, nome: e.target.value })} />
      </Campo>
      <Campo etichetta="Cognome" obbligatorio>
        <Input value={f.cognome} onChange={(e) => set({ ...f, cognome: e.target.value })} />
      </Campo>
      <Campo etichetta="Lingua">
        <Select value={f.lingua} onChange={(e) => set({ ...f, lingua: e.target.value })}>
          {(Object.entries(LINGUE) as [Lingua, string][]).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </Select>
      </Campo>
      <Campo etichetta="Email">
        <Input type="email" value={f.email} onChange={(e) => set({ ...f, email: e.target.value })} />
      </Campo>
      <Campo etichetta="Telefono">
        <Input value={f.telefono} onChange={(e) => set({ ...f, telefono: e.target.value })} />
      </Campo>
      <Campo etichetta="Arrivo" obbligatorio>
        <Input type="date" value={f.dal} onChange={(e) => set({ ...f, dal: e.target.value })} />
      </Campo>
      <Campo etichetta="Partenza" obbligatorio>
        <Input type="date" value={f.al} onChange={(e) => set({ ...f, al: e.target.value })} />
      </Campo>
      <Campo etichetta="Camere">
        <Input type="number" min={1} value={f.camere} onChange={(e) => set({ ...f, camere: e.target.value })} />
      </Campo>
      <Campo etichetta="Adulti per camera">
        <Input type="number" min={1} value={f.adulti} onChange={(e) => set({ ...f, adulti: e.target.value })} />
      </Campo>
      <Campo etichetta="Età dei bambini" aiuto="Per camera, separate da virgola (es. 8, 3).">
        <Input value={f.bambini} onChange={(e) => set({ ...f, bambini: e.target.value })} />
      </Campo>
      <Campo etichetta="Trattamento desiderato">
        <Input value={f.trattamento} placeholder="es. mezza pensione" onChange={(e) => set({ ...f, trattamento: e.target.value })} />
      </Campo>
      <Campo etichetta="Budget">
        <Input value={f.budget} placeholder="es. 100 € a notte" onChange={(e) => set({ ...f, budget: e.target.value })} />
      </Campo>
      <div className="sm:col-span-2 lg:col-span-3">
        <Campo etichetta="Note">
          <Textarea rows={2} value={f.note} onChange={(e) => set({ ...f, note: e.target.value })} />
        </Campo>
      </div>
    </div>
  );
}

/** Richieste di disponibilità: da preparare, preventivi inviati, risposte online; statistiche dei 90 giorni. */
export function ElencoPreventivi({ iniziale }: { iniziale: Dati }) {
  const router = useRouter();
  const [d, setD] = useState(iniziale);
  const [nuova, setNuova] = useState<FormRichiesta | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const st = d.statistiche;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Richieste e preventivi"
        sottotitolo={`${d.richieste.length} ${d.vista === "aperte" ? "aperte" : "chiuse"} · conversione a 90 giorni ${st.conversione.toLocaleString("it-IT")}%`}
        azioni={
          !nuova && (
            <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => setNuova(vuotaRichiesta())}>
              Nuova richiesta
            </Pulsante>
          )
        }
      />
      <Suggerimento id="preventivi" titolo="Come funziona">
        <p>
          Ogni «avete posto?» si registra qui: date, persone, da dove arriva. Dalla richiesta prepari un <strong>preventivo</strong> con 1-3 proposte (il
          prezzo si calcola dal listino e lo puoi cambiare) e lo mandi per email: l&apos;ospite apre il link, vede prezzi e condizioni e può{" "}
          <strong>accettare online</strong>. Nasce la prenotazione in opzione con la richiesta di acconto e qui compare l&apos;avviso.
        </p>
      </Suggerimento>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      {nuova && (
        <Sezione titolo="Nuova richiesta">
          <AiutoSezione breve="Bastano nome, date e persone; il resto aiuta a fare la proposta giusta.">
            <Esempio>Famiglia Rossi al telefono: 2 adulti e un bambino di 8 anni, 10-13 giugno, mezza pensione, budget 120 € a notte.</Esempio>
          </AiutoSezione>
          <div className="mt-2">
            <CampiRichiesta f={nuova} set={setNuova} />
          </div>
          <div className="mt-3 flex gap-2">
            <Pulsante
              variante="primario"
              disabled={busy || !nuova.nome.trim() || !nuova.cognome.trim() || !nuova.dal || !nuova.al}
              onClick={async () => {
                setErrore(null);
                setBusy(true);
                try {
                  const id = await sbusta(azioneNuovaRichiestaDisp(datiRichiesta(nuova)));
                  router.push(`/preventivi/${id}`);
                } catch (e) {
                  setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                  setBusy(false);
                }
              }}
            >
              Salva e prepara il preventivo
            </Pulsante>
            <Pulsante onClick={() => setNuova(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <div className="flex gap-2">
        {(["aperte", "chiuse"] as const).map((v) => (
          <Pulsante
            key={v}
            dimensione="piccolo"
            variante={d.vista === v ? "primario" : "secondario"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                setD(await sbusta(azioneCaricaPreventivi(v)));
              } finally {
                setBusy(false);
              }
            }}
          >
            {v === "aperte" ? "Aperte" : "Chiuse"}
          </Pulsante>
        ))}
      </div>

      <ul className="flex flex-col gap-2">
        {d.richieste.map((r) => (
          <li key={r.id}>
            <Link href={`/preventivi/${r.id}`} className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 text-sm shadow-sm hover:bg-stone-50 ${r.daVedere ? "border-teal-500" : "border-stone-200"}`}>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{r.nome}</span>
                <span className="block text-xs text-stone-600">
                  {it(r.dal)} → {it(r.al)} · {r.camere} {r.camere === 1 ? "camera" : "camere"}, {r.persone} {r.persone === 1 ? "persona" : "persone"} per camera ·{" "}
                  {CANALI_RICHIESTA[r.canale as CanaleRichiesta] ?? r.canale}
                </span>
              </span>
              {r.daVedere && <Etichetta tono="verde">risposta online da guardare</Etichetta>}
              <Etichetta tono={r.stato === "accettata" ? "verde" : r.stato === "nuova" ? "ambra" : r.stato === "preventivo" ? "blu" : "neutro"}>
                {STATI_RICHIESTA_DISP[r.stato as StatoRichiestaDisp] ?? r.stato}
              </Etichetta>
              {r.preventivo && r.stato === "preventivo" && (
                <span className="text-xs text-stone-600">
                  {STATI_PREVENTIVO[r.preventivo.stato as StatoPreventivo]} · valido fino al {it(r.preventivo.validoFino)}
                </span>
              )}
              {r.motivoRinuncia && <span className="text-xs text-stone-600">{MOTIVI_RINUNCIA[r.motivoRinuncia as MotivoRinuncia] ?? r.motivoRinuncia}</span>}
            </Link>
          </li>
        ))}
        {d.richieste.length === 0 && <li className="text-sm text-stone-600">Nessuna richiesta in questo elenco.</li>}
      </ul>

      <Sezione titolo={`Ultimi ${st.giorni} giorni`}>
        <AiutoSezione breve="Quante richieste diventano prenotazioni, da quale canale arrivano e perché si perdono." />
        <dl className="mt-2 grid max-w-md grid-cols-2 gap-1 text-sm">
          <dt>Richieste</dt>
          <dd className="text-right font-mono">{st.richieste}</dd>
          <dt>Con preventivo</dt>
          <dd className="text-right font-mono">{st.conPreventivo}</dd>
          <dt>Diventate prenotazioni</dt>
          <dd className="text-right font-mono">{st.accettate}</dd>
          <dt className="font-bold">Conversione</dt>
          <dd className="text-right font-mono font-bold">{st.conversione.toLocaleString("it-IT")}%</dd>
        </dl>
        {st.perCanale.length > 0 && (
          <table className="mt-3 w-full max-w-md text-sm">
            <thead className="text-left text-xs text-stone-600">
              <tr>
                <th className="py-1">Canale</th>
                <th className="py-1 text-right">Richieste</th>
                <th className="py-1 text-right">Prenotate</th>
                <th className="py-1 text-right">Conversione</th>
              </tr>
            </thead>
            <tbody>
              {st.perCanale.map((c) => (
                <tr key={c.canale} className="border-t border-stone-100">
                  <td className="py-1">{CANALI_RICHIESTA[c.canale as CanaleRichiesta]}</td>
                  <td className="py-1 text-right font-mono">{c.richieste}</td>
                  <td className="py-1 text-right font-mono">{c.accettate}</td>
                  <td className="py-1 text-right font-mono">{c.conversione.toLocaleString("it-IT")}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {st.motivi.length > 0 && (
          <p className="mt-2 text-sm text-stone-700">
            Perché si perdono: {st.motivi.map((m) => `${MOTIVI_RINUNCIA[m.motivo as MotivoRinuncia]} (${m.quante})`).join(", ")}
          </p>
        )}
      </Sezione>
    </div>
  );
}
