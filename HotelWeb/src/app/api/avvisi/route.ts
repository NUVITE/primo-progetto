import { NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { avvisoSchedine } from "@/lib/alloggiati";
import { avvisoIstat } from "@/lib/movimentoIstat";

/**
 * Avvisi degli adempimenti per la barra in cima all'app (schedine di Polizia e giorni ISTAT da
 * comunicare). Solo per chi ha il permesso di inviarli; letto dal client a ogni cambio pagina.
 */
export async function GET() {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!puo(utente, PERMESSI.ADEMPIMENTI_INVIA)) return NextResponse.json({ schedine: null, istat: null });
  const [schedine, istat] = await Promise.all([avvisoSchedine(utente.hotelId), avvisoIstat(utente.hotelId).catch(() => null)]);
  return NextResponse.json({ schedine, istat }, { headers: { "Cache-Control": "no-store" } });
}
