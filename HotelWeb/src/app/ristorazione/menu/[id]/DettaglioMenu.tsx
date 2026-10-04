"use client";

import { ArrowLeft, Copy, Plus, Printer, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { REGIMI, type Regime } from "@/lib/allergeni";
import { CATEGORIE_PIATTO, ORDINE_CATEGORIE, descriviMenu, numeroAllergene, type Categoria } from "@/lib/menuRegole";
import { ELENCO_PASTI, PASTI, type Pasto } from "@/lib/pastiRegole";
import { Avviso, Campo, classePulsante, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import {
  azioneAggiungiPiattoMenu,
  azioneDuplicaMenu,
  azioneImpostaVoce,
  azioneSalvaTestataMenu,
  azioneSpostaVoce,
  azioneTogliVoce,
  datiMenu,
} from "../../actions";

type Dati = Awaited<ReturnType<typeof datiMenu>>;
type Testata = { nome: string; pasti: Pasto[]; giorno: string; dalle: string; alle: string; roomService: boolean; attivo: boolean; note: string };

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const domani = (g: string | null) => {
  const base = g ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  return new Date(Date.parse(`${base}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
};

/** Un menu: dati (servizi, giorno, orari), piatti in ordine con disponibilità e prezzo, duplica e stampa. */
export function DettaglioMenu({ iniziale }: { iniziale: Dati }) {
  const router = useRouter();
  const [d, setD] = useState(iniziale);
  const m = d.menu;
  const [testata, setTestata] = useState<Testata | null>(null);
  const [aggiungi, setAggiungi] = useState("");
  const [prezzi, setPrezzi] = useState<Record<number, string>>({});
  const [duplica, setDuplica] = useState<null | { nome: string; giorno: string }>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const nelMenu = new Set(m.voci.map((v) => v.piattoId));
  const daAggiungere = d.piatti.filter((p) => !nelMenu.has(p.id));

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        sopra={
          <Link href="/ristorazione/menu" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Menu
          </Link>
        }
        titolo={m.nome}
        sottotitolo={`${descriviMenu(m)}${m.attivo ? "" : " · non attivo"}`}
        azioni={
          <span className="flex gap-2">
            <Link href={`/ristorazione/menu/${m.id}/stampa`} target="_blank" className={classePulsante("secondario", "piccolo")}>
              <Printer className="h-3.5 w-3.5" aria-hidden /> Stampa
            </Link>
            {!duplica && (
              <Pulsante dimensione="piccolo" icona={Copy} onClick={() => setDuplica({ nome: m.nome, giorno: m.giorno ? domani(m.giorno) : "" })}>
                Duplica
              </Pulsante>
            )}
          </span>
        }
      />
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {duplica && (
        <Sezione titolo="Duplica il menu">
          <div className="flex flex-wrap items-end gap-3">
            <Campo etichetta="Nome">
              <Input value={duplica.nome} onChange={(e) => setDuplica({ ...duplica, nome: e.target.value })} />
            </Campo>
            <Campo etichetta="Solo per il giorno" aiuto="Vuoto = vale sempre.">
              <Input type="date" value={duplica.giorno} onChange={(e) => setDuplica({ ...duplica, giorno: e.target.value })} />
            </Campo>
            <Pulsante
              variante="primario"
              disabled={busy || !duplica.nome.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  const id = await sbusta(azioneDuplicaMenu(m.id, duplica.nome, duplica.giorno || null));
                  router.push(`/ristorazione/menu/${id}`);
                } catch (e) {
                  setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
                  setBusy(false);
                }
              }}
            >
              Crea la copia
            </Pulsante>
            <Pulsante onClick={() => setDuplica(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <Sezione
        titolo="Dati del menu"
        azioni={
          !testata && (
            <Pulsante
              variante="leggero"
              dimensione="piccolo"
              onClick={() => setTestata({ nome: m.nome, pasti: m.pasti, giorno: m.giorno ?? "", dalle: m.dalle, alle: m.alle, roomService: m.roomService, attivo: m.attivo, note: m.note })}
            >
              Modifica
            </Pulsante>
          )
        }
      >
        {testata ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etichetta="Nome" obbligatorio>
                <Input value={testata.nome} onChange={(e) => setTestata({ ...testata, nome: e.target.value })} />
              </Campo>
              <Campo etichetta="Solo per il giorno" aiuto="Vuoto = vale sempre.">
                <Input type="date" value={testata.giorno} onChange={(e) => setTestata({ ...testata, giorno: e.target.value })} />
              </Campo>
              <Campo etichetta="Dalle">
                <Input type="time" value={testata.dalle} onChange={(e) => setTestata({ ...testata, dalle: e.target.value })} />
              </Campo>
              <Campo etichetta="Alle">
                <Input type="time" value={testata.alle} onChange={(e) => setTestata({ ...testata, alle: e.target.value })} />
              </Campo>
            </div>
            <div className="flex flex-wrap gap-4">
              {ELENCO_PASTI.map((p) => (
                <Spunta
                  key={p}
                  etichetta={PASTI[p]}
                  checked={testata.pasti.includes(p)}
                  onChange={(e) => setTestata({ ...testata, pasti: e.target.checked ? [...testata.pasti, p] : testata.pasti.filter((x) => x !== p) })}
                />
              ))}
              <Spunta etichetta="Room service" checked={testata.roomService} onChange={(e) => setTestata({ ...testata, roomService: e.target.checked })} />
              <Spunta etichetta="Attivo" checked={testata.attivo} onChange={(e) => setTestata({ ...testata, attivo: e.target.checked })} />
            </div>
            <Campo etichetta="Note in fondo al menu" aiuto="es. «Coperto compreso. Chiedere al personale per gli allergeni.»">
              <Textarea rows={2} value={testata.note} onChange={(e) => setTestata({ ...testata, note: e.target.value })} />
            </Campo>
            <div className="flex gap-2">
              <Pulsante
                variante="primario"
                icona={Save}
                disabled={busy || !testata.nome.trim()}
                onClick={async () => {
                  if (await esegui(() => sbusta(azioneSalvaTestataMenu(m.id, { ...testata, giorno: testata.giorno || null })), "Menu salvato.")) setTestata(null);
                }}
              >
                Salva
              </Pulsante>
              <Pulsante onClick={() => setTestata(null)}>Annulla</Pulsante>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-700">{m.note || "Nessuna nota."}</p>
        )}
      </Sezione>

      <Sezione titolo={`Piatti (${m.voci.length})`}>
        <div className="flex flex-wrap items-end gap-2">
          <Campo etichetta="Aggiungi un piatto">
            <Select value={aggiungi} onChange={(e) => setAggiungi(e.target.value)}>
              <option value="">Scegli…</option>
              {ORDINE_CATEGORIE.map((c) => {
                const lista = daAggiungere.filter((p) => p.categoria === c);
                return lista.length ? (
                  <optgroup key={c} label={CATEGORIE_PIATTO[c]}>
                    {lista.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </Select>
          </Campo>
          <Pulsante
            variante="primario"
            icona={Plus}
            disabled={busy || !aggiungi}
            onClick={async () => {
              if (await esegui(() => sbusta(azioneAggiungiPiattoMenu(m.id, Number(aggiungi))))) setAggiungi("");
            }}
          >
            Aggiungi
          </Pulsante>
          <Link href="/ristorazione/piatti" className="pb-2 text-xs font-semibold text-teal-800 hover:underline">
            Un piatto nuovo si crea in Piatti e allergeni
          </Link>
        </div>

        {ORDINE_CATEGORIE.map((cat: Categoria) => {
          const voci = m.voci.filter((v) => v.categoria === cat);
          if (!voci.length) return null;
          return (
            <div key={cat} className="mt-3">
              <p className="text-xs font-bold uppercase text-stone-600">{CATEGORIE_PIATTO[cat]}</p>
              <ul className="divide-y divide-stone-100 text-sm">
                {voci.map((v) => {
                  const i = m.voci.findIndex((x) => x.id === v.id);
                  return (
                    <li key={v.id} className={`flex flex-wrap items-center gap-2 py-1.5 ${v.disponibile ? "" : "text-stone-400"}`}>
                      <span className="flex flex-col">
                        <button type="button" aria-label="Sposta su" disabled={busy || i === 0} className="text-xs leading-none disabled:opacity-30" onClick={() => esegui(() => sbusta(azioneSpostaVoce(m.id, v.id, -1)))}>
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label="Sposta giù"
                          disabled={busy || i === m.voci.length - 1}
                          className="text-xs leading-none disabled:opacity-30"
                          onClick={() => esegui(() => sbusta(azioneSpostaVoce(m.id, v.id, 1)))}
                        >
                          ▼
                        </button>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`font-semibold ${v.disponibile ? "" : "line-through"}`}>{v.nome}</span>
                        {!v.piattoAttivo && <Etichetta className="ml-1">piatto non attivo</Etichetta>}
                        <span className="block text-xs">
                          {v.allergeni.length ? (
                            <span className="text-red-800">allergeni {v.allergeni.map(numeroAllergene).join(", ")}</span>
                          ) : (
                            <span className="text-emerald-800">senza allergeni</span>
                          )}
                          {v.regimi.length > 0 && <span className="text-stone-600"> · {v.regimi.map((r) => REGIMI[r as Regime]?.toLowerCase() ?? r).join(", ")}</span>}
                        </span>
                      </span>
                      <Spunta
                        etichetta="disponibile"
                        checked={v.disponibile}
                        disabled={busy}
                        onChange={(e) => esegui(() => sbusta(azioneImpostaVoce(m.id, v.id, { disponibile: e.target.checked, prezzo: v.prezzo })))}
                      />
                      <Input
                        className="w-24"
                        inputMode="decimal"
                        aria-label={`Prezzo ${v.nome}`}
                        placeholder={v.prezzoPiatto === null ? "compreso" : eur(v.prezzoPiatto)}
                        value={prezzi[v.id] ?? (v.prezzo === null ? "" : String(v.prezzo))}
                        onChange={(e) => setPrezzi({ ...prezzi, [v.id]: e.target.value })}
                        onBlur={() => {
                          const t = prezzi[v.id];
                          if (t === undefined) return;
                          const nuovo = t.trim() === "" ? null : Number(t.replace(",", "."));
                          if (nuovo !== v.prezzo) esegui(() => sbusta(azioneImpostaVoce(m.id, v.id, { disponibile: v.disponibile, prezzo: nuovo })), "Prezzo salvato.");
                        }}
                      />
                      <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label={`Togli ${v.nome}`} disabled={busy} onClick={() => esegui(() => sbusta(azioneTogliVoce(m.id, v.id)))} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {m.voci.length === 0 && <p className="mt-3 text-sm text-stone-600">Nessun piatto nel menu.</p>}
        <p className="mt-3 text-xs text-stone-600">
          Il prezzo vuoto usa quello del piatto. Togli la spunta «disponibile» quando un piatto finisce: resta nel menu ma non si propone.
        </p>
      </Sezione>
    </div>
  );
}
