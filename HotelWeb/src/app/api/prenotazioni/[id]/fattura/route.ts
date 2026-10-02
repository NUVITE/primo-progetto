import { NextRequest, NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { datiFattura } from "@/lib/contoDiviso";

const percento = (a: number | null) => (a === null ? "" : `${String(a).replace(".", ",")}%`);
const csvCampo = (v: unknown) => {
  const t = v === null || v === undefined ? "" : typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/**
 * Dati per la fattura di un intestatario (JSON per il gestionale, oppure CSV da aprire con Excel).
 * Righe ancora da fatturare: dopo l'invio si segnano come inviate dalla pagina della prenotazione.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!puo(utente, PERMESSI.PAGAMENTI_REGISTRA) || !puo(utente, PERMESSI.IMPORTI_VEDI)) return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  const { id } = await params;
  const intestatario = request.nextUrl.searchParams.get("intestatario") ?? "ospite";
  const formato = request.nextUrl.searchParams.get("formato") === "csv" ? "csv" : "json";
  const dati = await datiFattura(utente.hotelId, Number(id), intestatario).catch(() => null);
  if (!dati) return NextResponse.json({ error: "Prenotazione o intestatario non trovati." }, { status: 404 });

  const nome = `fattura-prenotazione-${id}-${intestatario.replace(":", "-")}`;
  const intestazioni = { "Content-Disposition": `attachment; filename="${nome}.${formato}"`, "Cache-Control": "private, no-store" };
  if (formato === "json") return NextResponse.json(dati, { headers: intestazioni });

  const righe = [
    ["Intestatario", dati.intestatario.denominazione, "P.IVA", dati.intestatario.partitaIva, "C.F.", dati.intestatario.codiceFiscale],
    [],
    ["Descrizione", "Importo (IVA inclusa)", "Aliquota IVA", "Natura", "Imponibile", "IVA"],
    ...dati.righe.map((r) => [r.descrizione, r.importo, percento(r.aliquota), r.natura, r.imponibile, r.iva]),
    ...dati.noteDiCredito.map((r) => [`Nota di credito: ${r.descrizione}`, r.importo, percento(r.aliquota), r.natura, r.imponibile, r.iva]),
    [],
    ["Totale", dati.totale],
  ];
  // BOM perché Excel riconosca le lettere accentate.
  const testo = "﻿" + righe.map((r) => r.map(csvCampo).join(";")).join("\r\n");
  return new NextResponse(testo, { headers: { ...intestazioni, "Content-Type": "text/csv; charset=utf-8" } });
}
