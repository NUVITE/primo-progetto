"use client";

import { Pencil, Plus, ShieldCheck, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { ALLERGENI, CONSENSI, MODI_CONSENSO, REGIMI, TIPI_VOCE, nomeVoce, type CodiceAllergene, type NotaInput, type Regime, type TipoVoce } from "@/lib/allergeni";
import type { NotaOspite } from "@/lib/noteAlimentari";
import { Avviso, Campo, Etichetta, Input, Pulsante, Select, Spunta, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { azioneCancellaNota, azioneSalvaNota } from "./actions";

type Form = {
  allergeni: Partial<Record<CodiceAllergene, TipoVoce>>;
  altre: { testo: string; tipo: TipoVoce }[];
  regimi: Regime[];
  esigenze: string;
  consenso: NotaInput["consenso"];
  consensoModo: NotaInput["consensoModo"];
  consensoDato: boolean;
};

function daNota(n: NotaOspite | null): Form {
  const allergeni: Form["allergeni"] = {};
  const altre: Form["altre"] = [];
  for (const v of n?.voci ?? []) {
    if (v.codice) allergeni[v.codice] = v.tipo;
    else if (v.testo) altre.push({ testo: v.testo, tipo: v.tipo });
  }
  return {
    allergeni,
    altre,
    regimi: (n?.regimi ?? []) as Regime[],
    esigenze: n?.esigenze ?? "",
    consenso: (n?.consenso as Form["consenso"]) ?? "soggiorno",
    consensoModo: (n?.consensoModo as Form["consensoModo"]) ?? "a_voce",
    // Il consenso si conferma ogni volta che si salva.
    consensoDato: false,
  };
}

/**
 * Allergie, intolleranze e regimi di una persona: dati sanitari (e religiosi), si registrano solo con
 * il consenso esplicito dell'ospite e si cancellano subito se lo revoca.
 */
export function NoteAlimentari({
  segmentoId,
  ospiteId,
  nome,
  nota,
  onAggiorna,
}: {
  segmentoId: number;
  ospiteId: number;
  nome: string;
  nota: NotaOspite | null;
  onAggiorna: (note: Record<number, NotaOspite>) => void;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [revoca, setRevoca] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function esegui(fn: () => Promise<Record<number, NotaOspite>>) {
    setErrore(null);
    setBusy(true);
    try {
      onAggiorna(await fn());
      setForm(null);
      setRevoca(false);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  const toggleAllergene = (c: CodiceAllergene) =>
    form && setForm({ ...form, allergeni: { ...form.allergeni, [c]: form.allergeni[c] ? undefined : "allergia" } });

  return (
    <div className={`rounded-lg border p-3 text-sm ${nota?.allergie ? "border-red-300 bg-red-50/60" : "border-stone-200 bg-white"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Utensils className="h-4 w-4 text-teal-700" aria-hidden />
        <span className="font-semibold text-stone-800">Note alimentari di {nome}</span>
        {nota && !form && (
          <>
            <Pulsante variante="leggero" dimensione="piccolo" icona={Pencil} onClick={() => setForm(daNota(nota))}>
              Modifica
            </Pulsante>
            {!revoca && (
              <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} onClick={() => setRevoca(true)}>
                Cancella
              </Pulsante>
            )}
          </>
        )}
        {!nota && !form && (
          <Pulsante dimensione="piccolo" icona={Plus} onClick={() => setForm(daNota(null))}>
            Aggiungi
          </Pulsante>
        )}
      </div>
      {errore && <Avviso tipo="errore" className="mt-2">{errore}</Avviso>}

      {nota && !form && (
        <div className="mt-1">
          <p className={nota.allergie ? "font-semibold text-red-800" : "text-stone-800"}>{nota.sintesi}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-stone-600">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Consenso {MODI_CONSENSO[nota.consensoModo as keyof typeof MODI_CONSENSO]?.toLowerCase() ?? nota.consensoModo}, raccolto da {nota.consensoDa} il{" "}
            {new Date(nota.consensoIl).toLocaleDateString("it-IT")} · {nota.consenso === "sempre" ? "vale anche per i prossimi soggiorni" : "solo per questo soggiorno"}
          </p>
          {revoca && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span>Cancellare le note (ad esempio se l&apos;ospite revoca il consenso)? Non restano copie.</span>
              <Pulsante variante="pericolo" dimensione="piccolo" disabled={busy} onClick={() => esegui(() => sbusta(azioneCancellaNota(segmentoId, ospiteId)))}>
                Sì, cancella
              </Pulsante>
              <Pulsante dimensione="piccolo" onClick={() => setRevoca(false)}>
                No
              </Pulsante>
            </div>
          )}
        </div>
      )}

      {form && (
        <div className="mt-2 flex flex-col gap-3">
          <AiutoSezione breve="Allergie e intolleranze sono dati sulla salute, i regimi come halal o kosher rivelano la religione: servono il consenso esplicito e una traccia di chi l'ha raccolto.">
            <p>
              <strong>Allergia</strong>: anche una traccia può essere pericolosa, la cucina deve evitare contaminazioni. <strong>Intolleranza</strong>:
              l&apos;alimento va evitato ma senza rischio immediato. I regimi sono scelte (vegetariano) o regole religiose (halal, kosher).
            </p>
            <Esempio>Allergia alle arachidi e intolleranza al latte, consenso a voce solo per questo soggiorno.</Esempio>
          </AiutoSezione>

          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">I 14 allergeni (Reg. UE 1169/2011): tocca per segnare, poi scegli allergia o intolleranza</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {ALLERGENI.map((a) => {
                const tipo = form.allergeni[a.codice];
                return (
                  <div key={a.codice} className={`flex items-center gap-1 rounded-md border px-2 py-1 ${tipo === "allergia" ? "border-red-300 bg-red-50" : tipo ? "border-amber-300 bg-amber-50" : "border-stone-200"}`}>
                    <label className="flex min-w-0 flex-1 items-center gap-1.5" title={a.descrizione}>
                      <input type="checkbox" checked={!!tipo} onChange={() => toggleAllergene(a.codice)} />
                      <span className="truncate">{a.nome}</span>
                    </label>
                    {tipo && (
                      <select
                        aria-label={`Tipo per ${a.nome}`}
                        className="rounded border border-stone-300 bg-white text-xs"
                        value={tipo}
                        onChange={(e) => setForm({ ...form, allergeni: { ...form.allergeni, [a.codice]: e.target.value as TipoVoce } })}
                      >
                        {Object.entries(TIPI_VOCE).map(([v, t]) => (
                          <option key={v} value={v}>
                            {t.toLowerCase()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-stone-700">Altri alimenti (es. kiwi, pomodoro, fragole)</p>
            {form.altre.map((x, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="max-w-xs"
                  value={x.testo}
                  aria-label="Alimento"
                  onChange={(e) => setForm({ ...form, altre: form.altre.map((y, j) => (j === i ? { ...y, testo: e.target.value } : y)) })}
                />
                <Select className="w-36" value={x.tipo} aria-label="Tipo" onChange={(e) => setForm({ ...form, altre: form.altre.map((y, j) => (j === i ? { ...y, tipo: e.target.value as TipoVoce } : y)) })}>
                  {Object.entries(TIPI_VOCE).map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Pulsante variante="leggero" dimensione="piccolo" icona={Trash2} aria-label="Togli" onClick={() => setForm({ ...form, altre: form.altre.filter((_, j) => j !== i) })} />
              </div>
            ))}
            <Pulsante variante="leggero" dimensione="piccolo" icona={Plus} className="self-start" onClick={() => setForm({ ...form, altre: [...form.altre, { testo: "", tipo: "allergia" }] })}>
              Aggiungi un alimento
            </Pulsante>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-stone-700">Regime alimentare</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {(Object.entries(REGIMI) as [Regime, string][]).map(([r, t]) => (
                <Spunta
                  key={r}
                  etichetta={t}
                  checked={form.regimi.includes(r)}
                  onChange={(e) => setForm({ ...form, regimi: e.target.checked ? [...form.regimi, r] : form.regimi.filter((x) => x !== r) })}
                />
              ))}
            </div>
          </div>

          <Campo etichetta="Altre esigenze" aiuto="es. seggiolone, pappe per il neonato, niente piccante">
            <Textarea rows={2} value={form.esigenze} onChange={(e) => setForm({ ...form, esigenze: e.target.value })} />
          </Campo>

          <div className="grid gap-2 rounded-md border border-teal-200 bg-teal-50/50 p-3 sm:grid-cols-2">
            <Campo etichetta="Per quanto tempo">
              <Select value={form.consenso} onChange={(e) => setForm({ ...form, consenso: e.target.value as Form["consenso"] })}>
                {Object.entries(CONSENSI).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo etichetta="Come è stato dato">
              <Select value={form.consensoModo} onChange={(e) => setForm({ ...form, consensoModo: e.target.value as Form["consensoModo"] })}>
                {Object.entries(MODI_CONSENSO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </Campo>
            <div className="sm:col-span-2">
              <Spunta
                etichetta={<strong>L&apos;ospite ha dato il consenso esplicito a registrare questi dati per preparare i pasti</strong>}
                checked={form.consensoDato}
                onChange={(e) => setForm({ ...form, consensoDato: e.target.checked })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Pulsante
              variante="primario"
              dimensione="piccolo"
              disabled={busy || !form.consensoDato}
              onClick={() =>
                esegui(() =>
                  sbusta(
                    azioneSalvaNota(segmentoId, ospiteId, {
                      voci: [
                        ...(Object.entries(form.allergeni).filter(([, t]) => t) as [CodiceAllergene, TipoVoce][]).map(([codice, tipo]) => ({ codice, tipo })),
                        ...form.altre.filter((x) => x.testo.trim()),
                      ],
                      regimi: form.regimi,
                      esigenze: form.esigenze,
                      consenso: form.consenso,
                      consensoModo: form.consensoModo,
                      consensoDato: form.consensoDato,
                    }),
                  ),
                )
              }
            >
              Salva note
            </Pulsante>
            <Pulsante dimensione="piccolo" onClick={() => setForm(null)}>
              Annulla
            </Pulsante>
            {!form.consensoDato && <Etichetta>serve il consenso</Etichetta>}
          </div>
          {Object.values(form.allergeni).some(Boolean) && (
            <p className="text-xs text-stone-600">
              Segnati:{" "}
              {(Object.entries(form.allergeni).filter(([, t]) => t) as [CodiceAllergene, TipoVoce][])
                .map(([codice, tipo]) => `${nomeVoce({ codice, tipo })} (${TIPI_VOCE[tipo].toLowerCase()})`)
                .join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
