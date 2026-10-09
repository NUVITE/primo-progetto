"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ALLERGENI, REGIMI, type CodiceAllergene, type Regime } from "@/lib/allergeni";
import { CATEGORIE_PIATTO, ORDINE_CATEGORIE, numeroAllergene, type Categoria } from "@/lib/menuRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneEliminaPiatto, azioneSalvaPiatto, datiPiatti } from "../actions";

type Dati = Awaited<ReturnType<typeof datiPiatti>>;
type Piatto = Dati["piatti"][number];
type Form = {
  id: number | null;
  nome: string;
  descrizione: string;
  categoria: Categoria;
  prezzo: string;
  repartoId: string;
  allergeni: CodiceAllergene[];
  senzaAllergeni: boolean;
  regimi: Regime[];
  attivo: boolean;
};

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const nomeAllergene = (c: string) => ALLERGENI.find((a) => a.codice === c)?.nome ?? c;

/** Piatti e bevande con allergeni (obbligatori), prezzo e reparto per l'IVA. */
export function GestionePiatti({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const [form, setForm] = useState<Form | null>(null);
  const [daTogliere, setDaTogliere] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore"; testo: string } | null>(null);

  async function esegui(fn: () => Promise<Dati>, ok: string) {
    setMsg(null);
    setBusy(true);
    try {
      setD(await fn());
      setMsg({ tipo: "ok", testo: ok });
      return true;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const ristorante = d.reparti.find((r) => r.nome.toLowerCase().startsWith("ristorante"));
  const apri = (p: Piatto | null) =>
    setForm(
      p
        ? {
            id: p.id,
            nome: p.nome,
            descrizione: p.descrizione,
            categoria: p.categoria as Categoria,
            prezzo: p.prezzo === null ? "" : String(p.prezzo),
            repartoId: p.repartoId ? String(p.repartoId) : "",
            allergeni: p.allergeni as CodiceAllergene[],
            senzaAllergeni: p.senzaAllergeni,
            regimi: p.regimi as Regime[],
            attivo: p.attivo,
          }
        : { id: null, nome: "", descrizione: "", categoria: "primi", prezzo: "", repartoId: ristorante ? String(ristorante.id) : "", allergeni: [], senzaAllergeni: false, regimi: [], attivo: true },
    );
  const visibili = d.piatti.filter((p) => !filtro.trim() || p.nome.toLowerCase().includes(filtro.trim().toLowerCase()));

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Piatti e allergeni"
        sottotitolo={`${d.piatti.length} piatti e bevande`}
        azioni={
          !form && (
            <Pulsante variante="primario" dimensione="piccolo" icona={Plus} onClick={() => apri(null)}>
              Nuovo piatto
            </Pulsante>
          )
        }
      />
      <Suggerimento id="piatti" titolo="A cosa serve">
        <p>
          Qui si scrivono una volta sola i piatti e le bevande, con gli <strong>allergeni</strong> (obbligatori per legge: Reg. UE 1169/2011) e il
          prezzo. Poi si mettono nei menu. Il reparto decide l&apos;IVA quando il piatto si addebita sul conto. Un piatto senza prezzo è compreso nel
          trattamento (es. il menu della mezza pensione).
        </p>
      </Suggerimento>
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      {form && (
        <Sezione titolo={form.id ? `Modifica: ${form.nome}` : "Nuovo piatto"}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etichetta="Nome" obbligatorio>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Campo>
            <Campo etichetta="Categoria">
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}>
                {ORDINE_CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIE_PIATTO[c]}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Prezzo (€, IVA inclusa)" aiuto="Vuoto = compreso nel trattamento, non si vende a parte.">
              <Input inputMode="decimal" value={form.prezzo} onChange={(e) => setForm({ ...form, prezzo: e.target.value })} />
            </Campo>
            <Campo etichetta="Reparto (IVA)">
              <Select value={form.repartoId} onChange={(e) => setForm({ ...form, repartoId: e.target.value })}>
                <option value="">—</option>
                {d.reparti.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                    {r.aliquotaIva !== null ? ` (${r.aliquotaIva}%)` : ""}
                  </option>
                ))}
              </Select>
            </Campo>
            <div className="sm:col-span-2 lg:col-span-4">
              <Campo etichetta="Descrizione (compare nel menu)">
                <Textarea rows={2} value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} />
              </Campo>
            </div>
          </div>

          <div className="mt-3">
            <AiutoSezione breve="Segna tutti gli allergeni presenti, anche negli ingredienti composti (es. il pane grattugiato contiene glutine).">
              <Esempio>Lasagne alla bolognese: glutine (pasta), uova (pasta all&apos;uovo), latte (besciamella), sedano (soffritto).</Esempio>
            </AiutoSezione>
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
              {ALLERGENI.map((a, i) => (
                <label
                  key={a.codice}
                  title={a.descrizione}
                  className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm ${form.allergeni.includes(a.codice) ? "border-red-300 bg-red-50" : "border-stone-200"}`}
                >
                  <input
                    type="checkbox"
                    checked={form.allergeni.includes(a.codice)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        senzaAllergeni: false,
                        allergeni: e.target.checked ? [...form.allergeni, a.codice] : form.allergeni.filter((x) => x !== a.codice),
                      })
                    }
                  />
                  <span className="text-xs text-stone-500">{i + 1}</span> {a.nome}
                </label>
              ))}
            </div>
            {form.allergeni.length === 0 && (
              <div className="mt-2">
                <Spunta
                  etichetta={<strong>Ho verificato: non contiene nessuno dei 14 allergeni</strong>}
                  checked={form.senzaAllergeni}
                  onChange={(e) => setForm({ ...form, senzaAllergeni: e.target.checked })}
                />
              </div>
            )}
          </div>

          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-stone-700">Adatto a</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(Object.entries(REGIMI) as [Regime, string][]).map(([r, t]) => (
                <Spunta
                  key={r}
                  etichetta={t}
                  checked={form.regimi.includes(r)}
                  onChange={(e) => setForm({ ...form, regimi: e.target.checked ? [...form.regimi, r] : form.regimi.filter((x) => x !== r) })}
                />
              ))}
              <Spunta etichetta="Attivo" checked={form.attivo} onChange={(e) => setForm({ ...form, attivo: e.target.checked })} />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Pulsante
              variante="primario"
              disabled={busy || !form.nome.trim() || (form.allergeni.length === 0 && !form.senzaAllergeni)}
              onClick={async () => {
                const ok = await esegui(
                  () =>
                    sbusta(
                      azioneSalvaPiatto(form.id, {
                        nome: form.nome,
                        descrizione: form.descrizione,
                        categoria: form.categoria,
                        prezzo: form.prezzo.trim() === "" ? null : Number(form.prezzo.replace(",", ".")),
                        repartoId: form.repartoId ? Number(form.repartoId) : null,
                        allergeni: form.allergeni,
                        senzaAllergeni: form.senzaAllergeni,
                        regimi: form.regimi,
                        attivo: form.attivo,
                      }),
                    ),
                  "Piatto salvato.",
                );
                if (ok) setForm(null);
              }}
            >
              Salva
            </Pulsante>
            <Pulsante onClick={() => setForm(null)}>Annulla</Pulsante>
          </div>
        </Sezione>
      )}

      <Sezione titolo="Elenco">
        <Input className="max-w-xs" placeholder="Cerca un piatto…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        {ORDINE_CATEGORIE.map((cat) => {
          const lista = visibili.filter((p) => p.categoria === cat);
          if (!lista.length) return null;
          return (
            <div key={cat} className="mt-3">
              <p className="text-xs font-bold uppercase text-stone-600">{CATEGORIE_PIATTO[cat]}</p>
              <ul className="divide-y divide-stone-100 text-sm">
                {lista.map((p) => (
                  <li key={p.id} className={`flex flex-wrap items-center gap-2 py-1.5 ${p.attivo ? "" : "text-stone-400"}`}>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{p.nome}</span>
                      {!p.attivo && <Etichetta className="ml-1">non attivo</Etichetta>}
                      <span className="block text-xs">
                        {p.senzaAllergeni ? (
                          <span className="text-emerald-800">senza allergeni</span>
                        ) : (
                          <span className="text-red-800">{p.allergeni.map((a) => `${numeroAllergene(a)} ${nomeAllergene(a).toLowerCase()}`).join(", ")}</span>
                        )}
                        {p.regimi.length > 0 && <span className="text-stone-600"> · {p.regimi.map((r) => REGIMI[r as Regime]?.toLowerCase() ?? r).join(", ")}</span>}
                        {p.nelMenu > 0 && <span className="text-stone-500"> · in {p.nelMenu} menu</span>}
                      </span>
                    </span>
                    <span className="font-mono">{p.prezzo === null ? "compreso" : eur(p.prezzo)}</span>
                    {daTogliere === p.id ? (
                      <span className="flex items-center gap-1">
                        <Pulsante variante="pericolo" dimensione="piccolo" disabled={busy} onClick={async () => (await esegui(() => sbusta(azioneEliminaPiatto(p.id)), "Piatto eliminato.")) && setDaTogliere(null)}>
                          Elimina
                        </Pulsante>
                        <Pulsante dimensione="piccolo" onClick={() => setDaTogliere(null)}>
                          No
                        </Pulsante>
                      </span>
                    ) : (
                      <span className="flex gap-1">
                        <Pulsante variante="leggero" dimensione="piccolo" icona={Pencil} disabled={!!form} onClick={() => apri(p)}>
                          Modifica
                        </Pulsante>
                        <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label="Elimina" onClick={() => setDaTogliere(p.id)} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {d.piatti.length === 0 && <p className="mt-3 text-sm text-stone-600">Nessun piatto: inizia da «Nuovo piatto».</p>}
      </Sezione>
    </div>
  );
}
