import Link from "next/link";
import { elencoPrenotazioni } from "@/lib/prenotazioni";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { PrenotazioniLista } from "./PrenotazioniLista";

function isoGiorno(d: Date) {
  return d.toISOString().slice(0, 10).split("-").reverse().join("/");
}

export default async function ElencoPrenotazioniPage() {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const prenotazioni = await elencoPrenotazioni(hotelId);

  const iniziale = prenotazioni.map((p) => {
    const dal = p.segmenti.length ? new Date(Math.min(...p.segmenti.map((s) => s.dataInizio.getTime()))) : null;
    const al = p.segmenti.length ? new Date(Math.max(...p.segmenti.map((s) => s.dataFine.getTime()))) : null;
    return {
      id: p.id,
      ospitePrenotante: `${p.ospitePrenotante.nome} ${p.ospitePrenotante.cognome}`,
      gruppoNome: p.gruppo?.nome ?? null,
      camere: p.segmenti.map((s) => s.camera?.codice ?? `${s.tipoCamera.descrizione} (da assegnare)`).join(", ") || null,
      periodo: dal && al ? `${isoGiorno(dal)} – ${isoGiorno(al)}` : null,
      stato: p.stato,
    };
  });

  return (
    <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Prenotazioni</h1>
        <Link href="/prenotazioni/nuova" className="rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white">
          + Nuova prenotazione
        </Link>
      </div>

      <PrenotazioniLista iniziale={iniziale} />
    </div>
  );
}
