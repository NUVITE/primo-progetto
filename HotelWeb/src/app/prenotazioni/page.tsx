import Link from "next/link";
import { elencoPrenotazioni } from "@/lib/prenotazioni";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { PrenotazioniLista } from "./PrenotazioniLista";
import { Plus } from "lucide-react";
import { classePulsante, IntestazionePagina } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";

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
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Prenotazioni"
        azioni={
          <Link href="/prenotazioni/nuova" className={classePulsante("primario")}>
            <Plus className="h-4 w-4" aria-hidden />
            Nuova prenotazione
          </Link>
        }
      />
      <Suggerimento id="elenco-prenotazioni" titolo="Come si trova una prenotazione">
        <p>
          Scrivi un nome o un cognome nella ricerca: trova chi ha prenotato e chiunque sia registrato nelle camere, anche nelle prenotazioni
          passate. Clicca sul nome per aprire la prenotazione. Per vedere chi arriva in un certo periodo usa il <strong>Planning camere</strong>.
        </p>
      </Suggerimento>

      <PrenotazioniLista iniziale={iniziale} />
    </div>
  );
}
