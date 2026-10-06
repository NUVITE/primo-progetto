"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { CATEGORIE_RECLAMO, FASI_RECLAMO, STATI_RECLAMO, type CategoriaReclamo } from "@/lib/reclamiRegole";
import type { ReclamoInput } from "@/lib/reclami";
import { Avviso, Campo, Dato, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { azioneAbbuonoReclamo, azioneAnalisiReclamo, azioneCaricaReclami, azioneRegistraReclamo, azioneRisolviReclamo, type datiReclami } from "./actions";

type Dati = Awaited<ReturnType<typeof datiReclami>>;
type Riga = Dati["righe"][number];
type Azione = null | { id: number; tipo: "risolvi" | "abbuono" | "analisi"; testo: string; gesto: string };
const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const vuoto = (): ReclamoInput => ({ prenotazioneId: null, ospiteId: null, nome: "", categoria: "camera", descrizione: "" });

export function RegistroReclami({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [periodo, setPeriodo] = useState({ dal: iniziale.dal, al: iniziale.al });
  const [form, setForm] = useState<ReclamoInput | null>(null);
  const [azione, setAzione] = useState<Azione>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);
  const r = d.riepilogo;

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setBusy(true);
    setMsg(null);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : String(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const aperti = d.righe.filter((x) => x.stato === "aperto");
  const risolti = d.righe.filter((x) => x.stato !== "aperto");

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Reclami"
        sottotitolo={aperti.length === 0 ? "Nessun reclamo aperto" : aperti.length === 1 ? "1 reclamo aperto" : `${aperti.length} reclami aperti`}
        azioni={
          !form && (
            <Pulsante variante="primario" icona={Plus} onClick={() => setForm(vuoto())}>
              Nuovo reclamo
            </Pulsante>
          )
        }
      />
      <Sezione>
        <p className="text-sm font-semibold text-stone-800">Come si gestisce un reclamo</p>
        <ol className="mt-1 list-decimal pl-5 text-sm text-stone-700">
          {FASI_RECLAMO.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ol>
      </Sezione>

      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {form && (
        <Sezione titolo="Nuovo reclamo">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await esegui(() => sbusta(azioneRegistraReclamo(form, d.dal, d.al)), "Reclamo registrato.")) setForm(null);
            }}
          >
            <Campo etichetta="Ospite" obbligatorio>
              <Select
                value={form.prenotazioneId ? `${form.prenotazioneId}:${form.ospiteId}` : ""}
                onChange={(e) => {
                  const [p, o] = e.target.value.split(":").map(Number);
                  setForm({ ...form, prenotazioneId: p || null, ospiteId: o || null });
                }}
              >
                <option value="">Scrivo il nome…</option>
                {d.ospiti.map((o) => (
                  <option key={`${o.prenotazioneId}:${o.ospiteId}`} value={`${o.prenotazioneId}:${o.ospiteId}`}>
                    {o.nome} · {o.camere} · {o.situazione}
                  </option>
                ))}
              </Select>
            </Campo>
            {!form.prenotazioneId ? (
              <Campo etichetta="Nome" obbligatorio>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </Campo>
            ) : (
              <span />
            )}
            <Campo etichetta="Categoria" obbligatorio>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaReclamo })}>
                {Object.entries(CATEGORIE_RECLAMO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Che cosa lamenta l'ospite" obbligatorio className="sm:col-span-2">
              <Textarea rows={3} maxLength={2000} value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
            </Campo>
            <div className="flex gap-2 sm:col-span-2">
              <Pulsante type="submit" variante="primario" disabled={busy}>
                Registra
              </Pulsante>
              <Pulsante onClick={() => setForm(null)}>Annulla</Pulsante>
            </div>
          </form>
        </Sezione>
      )}

      <Sezione titolo={`Aperti (${aperti.length})`}>
        {aperti.length === 0 ? (
          <p className="text-sm text-stone-600">Nessun reclamo aperto.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {aperti.map((x) => (
              <VoceReclamo key={x.id} x={x} d={d} busy={busy} azione={azione} setAzione={setAzione} esegui={esegui} />
            ))}
          </ul>
        )}
      </Sezione>

      <Sezione titolo="Riepilogo del periodo">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            esegui(() => sbusta(azioneCaricaReclami(periodo.dal, periodo.al)));
          }}
        >
          <Campo etichetta="Dal">
            <Input type="date" value={periodo.dal} onChange={(e) => setPeriodo({ ...periodo, dal: e.target.value })} />
          </Campo>
          <Campo etichetta="Al">
            <Input type="date" value={periodo.al} onChange={(e) => setPeriodo({ ...periodo, al: e.target.value })} />
          </Campo>
          <Pulsante type="submit" disabled={busy}>
            Mostra
          </Pulsante>
        </form>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dato etichetta="Reclami">{r.totale}</Dato>
          <Dato etichetta="Ancora aperti">{r.aperti}</Dato>
          <Dato etichetta="Tempo medio di soluzione">{r.oreMedieSoluzione === null ? "—" : r.oreMedieSoluzione < 1 ? "meno di un'ora" : r.oreMedieSoluzione < 24 ? `${r.oreMedieSoluzione.toLocaleString("it-IT")} ore` : `${(r.oreMedieSoluzione / 24).toLocaleString("it-IT", { maximumFractionDigits: 1 })} giorni`}</Dato>
          <Dato etichetta="Abbuoni concessi">{eur(r.abbuoni)}</Dato>
        </div>
        {r.perCategoria.length > 0 && (
          <table className="mt-3 w-full max-w-md text-sm">
            <thead className="text-left text-xs text-stone-600">
              <tr>
                <th className="py-1">Categoria</th>
                <th className="py-1 text-right">Reclami</th>
                <th className="py-1 text-right">Aperti</th>
              </tr>
            </thead>
            <tbody>
              {r.perCategoria.map((c) => (
                <tr key={c.categoria} className="border-t border-stone-100">
                  <td className="py-1">{CATEGORIE_RECLAMO[c.categoria]}</td>
                  <td className="py-1 text-right font-mono">{c.totale}</td>
                  <td className="py-1 text-right font-mono">{c.aperti}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {risolti.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {risolti.map((x) => (
              <VoceReclamo key={x.id} x={x} d={d} busy={busy} azione={azione} setAzione={setAzione} esegui={esegui} />
            ))}
          </ul>
        )}
      </Sezione>
    </div>
  );
}

function VoceReclamo({
  x,
  d,
  busy,
  azione,
  setAzione,
  esegui,
}: {
  x: Riga;
  d: Dati;
  busy: boolean;
  azione: Azione;
  setAzione: (a: Azione) => void;
  esegui: (fn: () => Promise<Dati>, ok?: string) => Promise<boolean>;
}) {
  const mia = azione?.id === x.id ? azione : null;
  return (
    <li className={`rounded-lg border p-3 text-sm ${x.stato === "aperto" ? "border-amber-300 bg-amber-50" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Etichetta tono={x.stato === "aperto" ? "ambra" : "verde"}>{STATI_RECLAMO[x.stato as keyof typeof STATI_RECLAMO] ?? x.stato}</Etichetta>
        <Etichetta>{CATEGORIE_RECLAMO[x.categoria] ?? x.categoria}</Etichetta>
        {x.ospiteId ? (
          <Link href={`/ospiti/${x.ospiteId}`} className="font-semibold text-teal-800 hover:underline">
            {x.nome}
          </Link>
        ) : (
          <strong>{x.nome}</strong>
        )}
        {x.prenotazioneId && (
          <Link href={`/prenotazioni/${x.prenotazioneId}`} className="text-teal-800 hover:underline">
            #{x.prenotazioneId}
          </Link>
        )}
        {x.camera && <span className="text-stone-600">camera {x.camera}</span>}
        <span className="text-xs text-stone-500">
          {quando(x.creatoIl)} · {x.creatoDa}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line">«{x.descrizione}»</p>
      {x.soluzione && (
        <p className="mt-1 text-stone-700">
          <strong>Soluzione:</strong> {x.soluzione}
          {x.gesto && <> · gesto: {x.gesto}</>}
          <span className="text-xs text-stone-500">
            {" "}
            ({x.risoltoDa}, {quando(x.risoltoIl!)})
          </span>
        </p>
      )}
      {x.abbuono !== null && <p className="mt-1 text-stone-700">Abbuono sul conto: {eur(x.abbuono)}</p>}
      {x.analisi && (
        <p className="mt-1 text-stone-700">
          <strong>Analisi:</strong> {x.analisi}
        </p>
      )}
      {mia ? (
        <form
          className="mt-2 flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok =
              mia.tipo === "risolvi"
                ? await esegui(() => sbusta(azioneRisolviReclamo(x.id, mia.testo, mia.gesto, d.dal, d.al)), "Reclamo risolto.")
                : mia.tipo === "abbuono"
                  ? await esegui(() => sbusta(azioneAbbuonoReclamo(x.id, Number(mia.testo.replace(",", ".")), d.dal, d.al)), "Abbuono registrato sul conto.")
                  : await esegui(() => sbusta(azioneAnalisiReclamo(x.id, mia.testo, d.dal, d.al)), "Analisi salvata.");
            if (ok) setAzione(null);
          }}
        >
          {mia.tipo === "abbuono" ? (
            <Input className="w-32" inputMode="decimal" placeholder="Importo €" value={mia.testo} onChange={(e) => setAzione({ ...mia, testo: e.target.value })} aria-label="Importo dell'abbuono" />
          ) : (
            <Textarea
              rows={2}
              placeholder={mia.tipo === "risolvi" ? "Cosa si è fatto (es. cambiata camera, mandato il manutentore)" : "Causa e come evitare che si ripeta"}
              value={mia.testo}
              onChange={(e) => setAzione({ ...mia, testo: e.target.value })}
              aria-label="Testo"
            />
          )}
          {mia.tipo === "risolvi" && (
            <Input placeholder="Gesto di cortesia offerto (facoltativo, es. aperitivo, late check-out)" value={mia.gesto} onChange={(e) => setAzione({ ...mia, gesto: e.target.value })} aria-label="Gesto di cortesia" />
          )}
          <div className="flex gap-2">
            <Pulsante type="submit" dimensione="piccolo" variante="primario" disabled={busy}>
              {mia.tipo === "risolvi" ? "Segna risolto" : mia.tipo === "abbuono" ? "Abbuona sul conto" : "Salva l'analisi"}
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setAzione(null)}>
              Indietro
            </Pulsante>
          </div>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {x.stato === "aperto" && (
            <Pulsante dimensione="piccolo" variante="primario" disabled={busy} onClick={() => setAzione({ id: x.id, tipo: "risolvi", testo: "", gesto: "" })}>
              Risolto
            </Pulsante>
          )}
          {d.puoAbbuonare && x.prenotazioneId && x.abbuono === null && (
            <Pulsante dimensione="piccolo" disabled={busy} onClick={() => setAzione({ id: x.id, tipo: "abbuono", testo: "", gesto: "" })}>
              Abbuono sul conto
            </Pulsante>
          )}
          <Pulsante dimensione="piccolo" variante="leggero" disabled={busy} onClick={() => setAzione({ id: x.id, tipo: "analisi", testo: x.analisi ?? "", gesto: "" })}>
            {x.analisi ? "Modifica l'analisi" : "Analisi della causa"}
          </Pulsante>
        </div>
      )}
    </li>
  );
}
