"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { azioneCreaPrenotazioneSala } from "../../actions";
import {
  BOTTONE,
  CampiOccupazione,
  CampiTestata,
  inputOccupazione,
  inputTestata,
  occupazioneVuota,
  type Contesto,
  type FormOccupazione,
  type FormTestata,
} from "../../componenti";

const domani = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function NuovaPrenotazioneSala({ contestoIniziale, sala, giorno, fascia }: { contestoIniziale: Contesto; sala: string; giorno: string; fascia: string }) {
  const router = useRouter();
  const [contesto, setContesto] = useState(contestoIniziale);
  const primaFascia = String(contesto.fasce[0]?.id ?? "");
  const [testata, setTestata] = useState<FormTestata>({
    titolo: "",
    clienteId: "",
    prenotazioneId: "",
    stato: "opzione",
    scadenzaOpzione: "",
    partecipanti: "",
    note: "",
  });
  const [occupazioni, setOccupazioni] = useState<FormOccupazione[]>([occupazioneVuota({ salaId: sala, giorno, fasciaId: fascia || primaFascia })]);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (contesto.sale.length === 0) {
    return (
      <div className="p-3 sm:p-6">
        <h1 className="text-xl font-bold">Nuova prenotazione di sala</h1>
        <p className="mt-2 text-sm text-stone-600">Non ci sono sale attive: creale prima in Impostazioni &gt; Sale e fasce orarie.</p>
      </div>
    );
  }

  async function crea() {
    setErrore(null);
    setBusy(true);
    try {
      const id = await sbusta(azioneCreaPrenotazioneSala(inputTestata(testata), occupazioni.map(inputOccupazione)));
      router.push(`/sale/prenotazioni/${id}`);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href="/sale/planning" className="text-xs font-semibold text-teal-700">
          ← Planning sale
        </Link>
        <h1 className="text-xl font-bold">Nuova prenotazione di sala</h1>
        <p className="text-sm text-stone-600">Le opzioni bloccano la sala come le conferme; alla scadenza compare solo un avviso.</p>
      </div>
      {errore && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{errore}</p>}
      <section className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <CampiTestata contesto={contesto} valore={testata} onChange={setTestata} onContesto={setContesto} />
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="font-bold">Sale e orari</h2>
        {occupazioni.map((o, i) => (
          <div key={i} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
            <CampiOccupazione contesto={contesto} valore={o} onChange={(n) => setOccupazioni(occupazioni.map((x, j) => (j === i ? n : x)))} />
            {occupazioni.length > 1 && (
              <button type="button" className="mt-1 text-xs font-semibold text-red-600" onClick={() => setOccupazioni(occupazioni.filter((_, j) => j !== i))}>
                Togli
              </button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-teal-700"
            onClick={() => {
              const ultima = occupazioni[occupazioni.length - 1];
              setOccupazioni([...occupazioni, { ...ultima, giorno: ultima.giorno ? domani(ultima.giorno) : "" }]);
            }}
          >
            + Giorno successivo (stessa sala e orario)
          </button>
          <button type="button" className="text-xs font-semibold text-teal-700" onClick={() => setOccupazioni([...occupazioni, occupazioneVuota({ fasciaId: primaFascia })])}>
            + Altra sala o orario
          </button>
        </div>
      </section>
      <div>
        <button type="button" disabled={busy} className={BOTTONE} onClick={crea}>
          Crea prenotazione
        </button>
      </div>
    </div>
  );
}
