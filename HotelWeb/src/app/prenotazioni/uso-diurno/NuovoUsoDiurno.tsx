"use client";

import { ArrowLeft, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sbusta } from "@/lib/esito";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { OspiteSearch, type OspiteValue } from "../nuova/OspiteSearch";
import { azioneCreaUsoDiurno, azionePrezzoProposto, datiUsoDiurno } from "./actions";

type Dati = Awaited<ReturnType<typeof datiUsoDiurno>>;

/** Uso diurno (day use): una camera di giorno, senza pernottamento, a ore o a forfait. */
export function NuovoUsoDiurno({ dati, cameraIniziale, giornoIniziale }: { dati: Dati; cameraIniziale: number | null; giornoIniziale: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    cameraId: cameraIniziale ? String(cameraIniziale) : String(dati.camere[0]?.id ?? ""),
    giorno: giornoIniziale,
    dalle: "10:00",
    alle: "16:00",
    prezzo: "",
    note: "",
  });
  const [ospite, setOspite] = useState<OspiteValue>({ mode: "vuoto" });
  const [proposto, setProposto] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const camera = dati.camere.find((c) => String(c.id) === f.cameraId);

  // Prezzo proposto dal prezzo orario del tipo di camera (si può sempre cambiare).
  useEffect(() => {
    if (!f.cameraId || !f.dalle || !f.alle || !dati.importiVisibili) return;
    let annullato = false;
    sbusta(azionePrezzoProposto(Number(f.cameraId), f.dalle, f.alle))
      .then((p) => !annullato && setProposto(p))
      .catch(() => !annullato && setProposto(null));
    return () => {
      annullato = true;
    };
  }, [f.cameraId, f.dalle, f.alle, dati.importiVisibili]);

  const prezzo = f.prezzo !== "" ? Number(f.prezzo.replace(",", ".")) : proposto;
  const pronto = !!f.cameraId && !!f.giorno && !!f.dalle && !!f.alle && ospite.mode !== "vuoto" && prezzo !== null && prezzo >= 0;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        sopra={
          <Link href="/" className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Planning camere
          </Link>
        }
        titolo="Uso diurno (day use)"
        sottotitolo="Una camera di giorno, senza pernottamento"
      />
      <Suggerimento id="uso-diurno" titolo="Quando si usa">
        <p>
          Per chi ha bisogno di una camera solo per qualche ora: un relatore che si prepara prima di un evento, un ospite con il volo la sera, chi
          vuole riposare tra due appuntamenti. Si paga la fascia oraria (a ore o a forfait) e la camera resta libera per la notte.
        </p>
        <p>Non c&apos;è pernottamento: niente tassa di soggiorno, schedina di Polizia né statistica ISTAT.</p>
      </Suggerimento>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}

      <Sezione titolo="Camera e orari">
        <AiutoSezione breve="La camera deve essere libera durante il giorno: chi parte la mattina o arriva la sera non la blocca.">
          <Esempio>Camera 101: l&apos;ospite di ieri parte alle 10, l&apos;uso diurno è dalle 12 alle 18, il nuovo ospite arriva alle 20.</Esempio>
        </AiutoSezione>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etichetta="Camera" obbligatorio>
            <Select value={f.cameraId} onChange={(e) => setF({ ...f, cameraId: e.target.value, prezzo: "" })}>
              {dati.camere.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codice} · {c.tipo}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etichetta="Giorno" obbligatorio>
            <Input type="date" value={f.giorno} onChange={(e) => setF({ ...f, giorno: e.target.value })} />
          </Campo>
          <Campo etichetta="Dalle" obbligatorio>
            <Input type="time" value={f.dalle} onChange={(e) => setF({ ...f, dalle: e.target.value, prezzo: "" })} />
          </Campo>
          <Campo etichetta="Alle" obbligatorio>
            <Input type="time" value={f.alle} onChange={(e) => setF({ ...f, alle: e.target.value, prezzo: "" })} />
          </Campo>
        </div>
      </Sezione>

      <Sezione titolo="Ospite e prezzo">
        <div className="grid gap-3 lg:grid-cols-2">
          <OspiteSearch value={ospite} onChange={setOspite} etichetta="Ospite" />
          <div className="flex flex-col gap-3">
            {dati.importiVisibili && (
              <Campo
                etichetta="Prezzo (€)"
                obbligatorio
                aiuto={
                  proposto !== null
                    ? `Proposto ${proposto.toFixed(2)} € (${camera?.prezzoOra?.toFixed(2)} € all'ora): scrivi un altro importo per un forfait.`
                    : "Nessun prezzo orario per questo tipo di camera (Camere > tipi): scrivi l'importo."
                }
              >
                <Input inputMode="decimal" placeholder={proposto !== null ? proposto.toFixed(2) : "0,00"} value={f.prezzo} onChange={(e) => setF({ ...f, prezzo: e.target.value })} />
              </Campo>
            )}
            <Campo etichetta="Note">
              <Textarea rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="es. relatore del convegno in sala Blu" />
            </Campo>
          </div>
        </div>
        <Pulsante
          variante="primario"
          icona={Sun}
          className="mt-4"
          disabled={busy || !pronto}
          onClick={async () => {
            setErrore(null);
            setBusy(true);
            try {
              const r = await sbusta(
                azioneCreaUsoDiurno({
                  cameraId: Number(f.cameraId),
                  giorno: f.giorno,
                  dalle: f.dalle,
                  alle: f.alle,
                  ospite: ospite.mode === "esistente" ? { id: ospite.id } : ospite.mode === "nuovo" ? { nome: ospite.nome, cognome: ospite.cognome } : { id: 0 },
                  prezzo: prezzo ?? 0,
                  note: f.note,
                }),
              );
              router.push(`/prenotazioni/${r.id}`);
            } catch (e) {
              setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
              setBusy(false);
            }
          }}
        >
          {busy ? "Salvataggio…" : "Registra l'uso diurno"}
        </Pulsante>
      </Sezione>
    </div>
  );
}
