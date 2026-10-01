import Link from "next/link";
import { elencoPrenotazioni, opzioniDaSeguire } from "@/lib/prenotazioni";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { PrenotazioniLista } from "./PrenotazioniLista";
import { Plus } from "lucide-react";
import { classePulsante, IntestazionePagina } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { righeElenco } from "./righe";

export default async function ElencoPrenotazioniPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const { filtro } = await searchParams;
  const soloOpzioni = filtro === "opzioni";
  const [ultime, opzioni] = await Promise.all([soloOpzioni ? Promise.resolve([]) : elencoPrenotazioni(hotelId), opzioniDaSeguire(hotelId)]);

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
          passate. Clicca sul nome per aprire la prenotazione. Con <strong>Opzioni da seguire</strong> vedi le opzioni scadute o in scadenza, da
          confermare o annullare. Per vedere chi arriva in un certo periodo usa il <strong>Planning camere</strong>.
        </p>
      </Suggerimento>

      <div className="flex flex-wrap gap-2" role="tablist">
        <Link href="/prenotazioni" role="tab" aria-selected={!soloOpzioni} className={classePulsante(soloOpzioni ? "secondario" : "primario", "piccolo")}>
          Ultime prenotazioni
        </Link>
        <Link href="/prenotazioni?filtro=opzioni" role="tab" aria-selected={soloOpzioni} className={classePulsante(soloOpzioni ? "primario" : "secondario", "piccolo")}>
          Opzioni da seguire
          {opzioni.length > 0 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">{opzioni.length}</span>}
        </Link>
      </div>

      <PrenotazioniLista key={soloOpzioni ? "opzioni" : "ultime"} iniziale={righeElenco(soloOpzioni ? opzioni : ultime)} soloOpzioni={soloOpzioni} />
    </div>
  );
}
