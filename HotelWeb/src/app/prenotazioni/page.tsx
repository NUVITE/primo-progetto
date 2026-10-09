import Link from "next/link";
import { arriviDelGiorno, elencoPrenotazioni, opzioniDaSeguire } from "@/lib/prenotazioni";
import { prisma } from "@/lib/prisma";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { PrenotazioniLista } from "./PrenotazioniLista";
import { Plus } from "lucide-react";
import { classePulsante, IntestazionePagina } from "@/components/ui";
import { Suggerimento } from "@/components/Suggerimento";
import { adessoItalia, righeElenco } from "./righe";

export default async function ElencoPrenotazioniPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { hotelId } = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const { filtro } = await searchParams;
  const vista = filtro === "opzioni" ? "opzioni" : filtro === "arrivi" ? "arrivi" : "ultime";
  const [ultime, opzioni, arrivi, hotel] = await Promise.all([
    vista === "ultime" ? elencoPrenotazioni(hotelId) : Promise.resolve([]),
    opzioniDaSeguire(hotelId),
    arriviDelGiorno(hotelId, adessoItalia().giorno),
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { orarioLimiteArrivo: true } }),
  ]);
  const righeArrivi = righeElenco(arrivi, hotel.orarioLimiteArrivo);
  const noShow = righeArrivi.filter((r) => r.arrivoOggi?.possibileNoShow).length;
  const scheda = (attiva: boolean) => classePulsante(attiva ? "primario" : "secondario", "piccolo");

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
          confermare o annullare. <strong>Arrivi di oggi</strong> mostra chi è atteso e chi è già arrivato; le prenotazioni senza garanzia
          oltre l&apos;orario limite sono segnalate come possibile no-show. Per un altro periodo usa il <strong>Planning camere</strong>.
        </p>
      </Suggerimento>

      <div className="flex flex-wrap gap-2" role="tablist">
        <Link href="/prenotazioni" role="tab" aria-selected={vista === "ultime"} className={scheda(vista === "ultime")}>
          Ultime prenotazioni
        </Link>
        <Link href="/prenotazioni?filtro=arrivi" role="tab" aria-selected={vista === "arrivi"} className={scheda(vista === "arrivi")}>
          Arrivi di oggi
          {righeArrivi.length > 0 && <span className="ml-1 rounded-full bg-sky-200 px-1.5 text-xs font-bold text-sky-950">{righeArrivi.length}</span>}
          {noShow > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{noShow} no-show?</span>}
        </Link>
        <Link href="/prenotazioni?filtro=opzioni" role="tab" aria-selected={vista === "opzioni"} className={scheda(vista === "opzioni")}>
          Opzioni da seguire
          {opzioni.length > 0 && <span className="ml-1 rounded-full bg-amber-400 px-1.5 text-xs font-bold text-amber-950">{opzioni.length}</span>}
        </Link>
      </div>

      <PrenotazioniLista
        key={vista}
        iniziale={vista === "arrivi" ? righeArrivi : righeElenco(vista === "opzioni" ? opzioni : ultime, hotel.orarioLimiteArrivo)}
        vista={vista}
      />
    </div>
  );
}
