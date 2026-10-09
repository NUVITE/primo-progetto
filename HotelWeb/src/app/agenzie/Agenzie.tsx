"use client";

import { Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, classePulsante, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneEliminaAllotment, azioneEstratto, azioneSalvaAllotment, datiAgenzie } from "./actions";

type Dati = Awaited<ReturnType<typeof datiAgenzie>>;
type Estratto = Awaited<ReturnType<typeof azioneEstratto>> extends infer R ? (R extends { ok: true; valore: infer V } ? V : never) : never;
type FormAllotment = { id: number | null; clienteId: string; tipoCameraId: string; dal: string; al: string; camere: string; releaseGiorni: string; note: string };

const it = (g: string) => g.split("-").reverse().join("/");
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const inizioMese = () => `${oggi().slice(0, 8)}01`;

/** Agenzie e tour operator: allotment (camere riservate con release) ed estratto conto con le commissioni. */
export function Agenzie({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [form, setForm] = useState<FormAllotment | null>(null);
  const [togli, setTogli] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<string>("");
  const [periodo, setPeriodo] = useState({ agenzia: iniziale.agenzie[0] ? String(iniziale.agenzie[0].id) : "", dal: inizioMese(), al: oggi() });
  const [estratto, setEstratto] = useState<Estratto | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui<T>(fn: () => Promise<T>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fn();
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return r;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return null;
    } finally {
      setBusy(false);
    }
  }
  const allotment = d.allotment.filter((a) => (!filtro || String(a.clienteId) === filtro) && !a.concluso);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Agenzie e allotment" sottotitolo={d.agenzie.length === 1 ? "1 agenzia o portale" : `${d.agenzie.length} agenzie e portali`} />
      <Suggerimento id="agenzie" titolo="Come funziona">
        <p>
          Un <strong>allotment</strong> riserva a un&apos;agenzia un certo numero di camere di un tipo in un periodo: le prenotazioni con quell&apos;agenzia
          le usano, gli altri non le vedono come libere. Le camere non usate tornano in vendita da sole al <strong>release</strong> (es. 7 giorni prima di
          ogni notte). Nella prenotazione dell&apos;agenzia si segna il <strong>voucher</strong> e il conto si divide da solo.
        </p>
        <p>L&apos;estratto conto riepiloga per periodo soggiorni, commissioni, quanto è a carico dell&apos;agenzia e quanto ha già pagato.</p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}
      {d.agenzie.length === 0 && (
        <Avviso tipo="info">
          Nessuna agenzia: in <Link href="/clienti" className="font-semibold underline">Clienti e aziende</Link> crea un cliente di tipo «agenzia» o «portale», con la
          sua commissione.
        </Avviso>
      )}

      <Sezione
        titolo="Allotment in corso e futuri"
        azioni={
          d.puoAllotment &&
          !form &&
          d.agenzie.length > 0 && (
            <Pulsante
              variante="primario"
              dimensione="piccolo"
              icona={Plus}
              onClick={() => setForm({ id: null, clienteId: String(d.agenzie[0].id), tipoCameraId: String(d.tipi[0]?.id ?? ""), dal: "", al: "", camere: "1", releaseGiorni: "7", note: "" })}
            >
              Nuovo allotment
            </Pulsante>
          )
        }
      >
        <AiutoSezione breve="Ogni riga: quante camere sono riservate, quante ne ha usate l'agenzia, quante sono ancora bloccate e quando tornano in vendita.">
          <Esempio>Agenzia Sole: 4 doppie dal 1 al 31 luglio, release 14 giorni. Il 17 luglio le camere non usate per la notte del 31 tornano in vendita.</Esempio>
        </AiutoSezione>
        {form && (
          <div className="mt-3 grid gap-2 rounded-md border border-teal-200 bg-teal-50/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etichetta="Agenzia">
              <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                {d.agenzie.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.denominazione}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Tipo di camera">
              <Select value={form.tipoCameraId} onChange={(e) => setForm({ ...form, tipoCameraId: e.target.value })}>
                {d.tipi.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.descrizione}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Dal (prima notte)" obbligatorio>
              <Input type="date" value={form.dal} onChange={(e) => setForm({ ...form, dal: e.target.value })} />
            </Campo>
            <Campo etichetta="Al (giorno di fine, escluso)" obbligatorio>
              <Input type="date" value={form.al} onChange={(e) => setForm({ ...form, al: e.target.value })} />
            </Campo>
            <Campo etichetta="Camere" obbligatorio>
              <Input type="number" min={1} value={form.camere} onChange={(e) => setForm({ ...form, camere: e.target.value })} />
            </Campo>
            <Campo etichetta="Release (giorni prima)" aiuto="0 = mai: restano riservate fino alla notte.">
              <Input type="number" min={0} value={form.releaseGiorni} onChange={(e) => setForm({ ...form, releaseGiorni: e.target.value })} />
            </Campo>
            <div className="sm:col-span-2">
              <Campo etichetta="Note">
                <Input value={form.note} placeholder="es. contratto 2027, prezzo netto concordato" onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </Campo>
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <Pulsante
                variante="primario"
                disabled={busy || !form.dal || !form.al}
                onClick={async () => {
                  const r = await esegui(
                    () =>
                      sbusta(
                        azioneSalvaAllotment(form.id, {
                          clienteId: Number(form.clienteId),
                          tipoCameraId: Number(form.tipoCameraId),
                          dal: form.dal,
                          al: form.al,
                          camere: Number(form.camere),
                          releaseGiorni: Number(form.releaseGiorni),
                          note: form.note,
                        }),
                      ),
                    "Allotment salvato.",
                  );
                  if (r) {
                    setD(r);
                    setForm(null);
                  }
                }}
              >
                Salva
              </Pulsante>
              <Pulsante onClick={() => setForm(null)}>Annulla</Pulsante>
            </div>
          </div>
        )}
        <div className="mt-3 w-60">
          <Select aria-label="Agenzia" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Tutte le agenzie</option>
            {d.agenzie.map((a) => (
              <option key={a.id} value={a.id}>
                {a.denominazione}
              </option>
            ))}
          </Select>
        </div>
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {allotment.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{a.agenzia}</span> · {a.camere} {a.tipo} · {it(a.dal)} → {it(a.al)}
                <span className="block text-xs text-stone-600">
                  usate al massimo {a.usateMassimo} · release {a.releaseGiorni} giorni prima
                  {a.prossimoRelease && ` (prossimo il ${it(a.prossimoRelease)})`}
                  {a.note && ` · ${a.note}`}
                </span>
              </span>
              {a.ancoraBloccate > 0 ? <Etichetta tono="ambra">{a.ancoraBloccate} notti-camera bloccate</Etichetta> : <Etichetta tono="neutro">niente di bloccato</Etichetta>}
              {d.puoAllotment &&
                (togli === a.id ? (
                  <span className="flex items-center gap-1">
                    <Pulsante
                      variante="pericolo"
                      dimensione="piccolo"
                      disabled={busy}
                      onClick={async () => {
                        const r = await esegui(() => sbusta(azioneEliminaAllotment(a.id)), "Allotment eliminato: le camere tornano in vendita.");
                        if (r) {
                          setD(r);
                          setTogli(null);
                        }
                      }}
                    >
                      Elimina
                    </Pulsante>
                    <Pulsante dimensione="piccolo" onClick={() => setTogli(null)}>
                      No
                    </Pulsante>
                  </span>
                ) : (
                  <span className="flex gap-1">
                    <Pulsante
                      variante="leggero"
                      dimensione="piccolo"
                      icona={Pencil}
                      disabled={!!form}
                      onClick={() =>
                        setForm({ id: a.id, clienteId: String(a.clienteId), tipoCameraId: String(a.tipoCameraId), dal: a.dal, al: a.al, camere: String(a.camere), releaseGiorni: String(a.releaseGiorni), note: a.note })
                      }
                    >
                      Modifica
                    </Pulsante>
                    <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label="Elimina" onClick={() => setTogli(a.id)} />
                  </span>
                ))}
            </li>
          ))}
          {allotment.length === 0 && <li className="py-2 text-stone-600">Nessun allotment in corso.</li>}
        </ul>
      </Sezione>

      {d.puoEstratto && d.agenzie.length > 0 && (
        <Sezione titolo="Estratto conto">
          <AiutoSezione breve="Le prenotazioni dell'agenzia con partenza nel periodo (anche le annullate con penale).">
            <p>
              <strong>Soggiorno</strong> = camere e servizi prenotati, base della commissione. <strong>A carico dell&apos;agenzia</strong> = la sua parte del conto
              diviso (con il voucher). Il saldo è quello che l&apos;agenzia deve ancora pagare.
            </p>
            <Esempio>Soggiorno 1.000 €, commissione 15% = 150 €, netto 850 €: con un voucher «camere e trattamento» l&apos;agenzia paga 1.000 € e trattiene o fattura i 150 €.</Esempio>
          </AiutoSezione>
          <div className="mt-2 flex flex-wrap items-end gap-2 print:hidden">
            <Campo etichetta="Agenzia">
              <Select value={periodo.agenzia} onChange={(e) => setPeriodo({ ...periodo, agenzia: e.target.value })}>
                {d.agenzie.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.denominazione}
                    {a.commissione !== null ? ` (${a.commissione}%)` : ""}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Partenze dal">
              <Input type="date" value={periodo.dal} onChange={(e) => setPeriodo({ ...periodo, dal: e.target.value })} />
            </Campo>
            <Campo etichetta="al">
              <Input type="date" value={periodo.al} onChange={(e) => setPeriodo({ ...periodo, al: e.target.value })} />
            </Campo>
            <Pulsante variante="primario" disabled={busy || !periodo.agenzia} onClick={async () => setEstratto(await esegui(() => sbusta(azioneEstratto(Number(periodo.agenzia), periodo.dal, periodo.al))))}>
              Mostra
            </Pulsante>
            {estratto && (
              <>
                <a href={`/api/agenzie/estratto?agenzia=${estratto.agenzia.id}&dal=${estratto.dal}&al=${estratto.al}`} className={classePulsante("secondario", "piccolo")}>
                  <Download className="h-3.5 w-3.5" aria-hidden /> CSV
                </a>
                <Pulsante dimensione="piccolo" icona={Printer} onClick={() => window.print()}>
                  Stampa
                </Pulsante>
              </>
            )}
          </div>
          {estratto && (
            <div className="mt-3 overflow-x-auto">
              <p className="mb-2 text-sm font-semibold">
                {estratto.agenzia.denominazione} · partenze dal {it(estratto.dal)} al {it(estratto.al)}
                {estratto.agenzia.commissione !== null ? ` · commissione ${estratto.agenzia.commissione}%` : " · commissione non indicata"}
              </p>
              <table className="w-full text-sm">
                <thead className="border-b border-stone-200 text-left text-xs font-semibold text-stone-600">
                  <tr>
                    <th className="py-1.5 pr-2">Prenotazione</th>
                    <th className="py-1.5 pr-2">Date</th>
                    <th className="py-1.5 pr-2">Voucher</th>
                    <th className="py-1.5 pr-2 text-right">Soggiorno</th>
                    <th className="py-1.5 pr-2 text-right">Commissione</th>
                    <th className="py-1.5 pr-2 text-right">Netto</th>
                    <th className="py-1.5 pr-2 text-right">A carico agenzia</th>
                    <th className="py-1.5 pr-2 text-right">Pagato</th>
                    <th className="py-1.5 pr-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {estratto.righe.map((r) => (
                    <tr key={r.prenotazioneId} className="border-b border-stone-100">
                      <td className="py-1.5 pr-2">
                        <Link href={`/prenotazioni/${r.prenotazioneId}`} className="hover:underline">
                          {r.ospite}
                        </Link>
                        {r.annullata && <Etichetta className="ml-1">annullata, penale</Etichetta>}
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-xs">
                        {it(r.arrivo)} → {it(r.partenza)}
                      </td>
                      <td className="py-1.5 pr-2">{r.voucher || "—"}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(r.soggiorno)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(r.commissione)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(r.netto)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(r.aCaricoAgenzia)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(r.pagatoAgenzia)}</td>
                      <td className={`py-1.5 pr-2 text-right font-mono ${r.saldoAgenzia > 0.005 ? "font-semibold text-red-700" : ""}`}>{eur(r.saldoAgenzia)}</td>
                    </tr>
                  ))}
                  {estratto.righe.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-3 text-center text-stone-600">
                        Nessuna prenotazione dell&apos;agenzia con partenza nel periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
                {estratto.righe.length > 0 && (
                  <tfoot className="font-bold">
                    <tr>
                      <td colSpan={3} className="py-1.5 pr-2 text-right">
                        Totale
                      </td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.soggiorno)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.commissione)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.netto)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.aCaricoAgenzia)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.pagatoAgenzia)}</td>
                      <td className="py-1.5 pr-2 text-right font-mono">{eur(estratto.totali.saldoAgenzia)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Sezione>
      )}
    </div>
  );
}
