import { NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { pdfRicevuta } from "@/lib/alloggiati";

/** Ricevuta PDF della Polizia (solo per chi invia le schedine, solo dell'hotel attivo). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!puo(utente, PERMESSI.ADEMPIMENTI_INVIA)) return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  const { id } = await params;
  const r = await pdfRicevuta(utente.hotelId, Number(id)).catch(() => null);
  if (!r) return NextResponse.json({ error: "Ricevuta non trovata." }, { status: 404 });
  return new NextResponse(new Uint8Array(r.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${r.nome}"`,
      // Documento riservato: il browser non deve tenerlo in cache dopo un cambio utente.
      "Cache-Control": "private, no-store",
    },
  });
}
