import { NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { avvisoSchedine } from "@/lib/alloggiati";
import { avvisoIstat } from "@/lib/movimentoIstat";
import { risposteDaVedere } from "@/lib/preventivi";

/**
 * Avvisi degli adempimenti per la barra in cima all'app (schedine di Polizia e giorni ISTAT da
 * comunicare). Solo per chi ha il permesso di inviarli; letto dal client a ogni cambio pagina.
 */
export async function GET() {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const adempimenti = puo(utente, PERMESSI.ADEMPIMENTI_INVIA);
  // Preventivi a cui l'ospite ha risposto online (accettati o rifiutati) e non ancora guardati.
  const preventivi = puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI) && puo(utente, PERMESSI.IMPORTI_VEDI) ? await risposteDaVedere(utente.hotelId) : 0;
  const [schedine, istat] = adempimenti ? await Promise.all([avvisoSchedine(utente.hotelId), avvisoIstat(utente.hotelId).catch(() => null)]) : [null, null];
  return NextResponse.json({ schedine, istat, preventivi }, { headers: { "Cache-Control": "no-store" } });
}
