import { NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { avvisoSchedine } from "@/lib/alloggiati";

/**
 * Avvisi degli adempimenti per la barra in cima all'app (schedine di Polizia da inviare, più avanti
 * l'ISTAT). Solo per chi ha il permesso di inviarli; letto dal client a ogni cambio pagina.
 */
export async function GET() {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!puo(utente, PERMESSI.ADEMPIMENTI_INVIA)) return NextResponse.json({ schedine: null });
  return NextResponse.json({ schedine: await avvisoSchedine(utente.hotelId) }, { headers: { "Cache-Control": "no-store" } });
}
