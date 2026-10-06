import { NextRequest, NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { estrattoContoAgenzia } from "@/lib/agenzie";

const campo = (v: unknown) => {
  const t = v === null || v === undefined ? "" : typeof v === "number" ? v.toFixed(2).replace(".", ",") : String(v);
  return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** Estratto conto dell'agenzia in CSV (Excel), per il periodo delle partenze. */
export async function GET(request: NextRequest) {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  if (!puo(utente, PERMESSI.PAGAMENTI_REGISTRA) || !puo(utente, PERMESSI.IMPORTI_VEDI)) return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  const q = request.nextUrl.searchParams;
  const e = await estrattoContoAgenzia(utente.hotelId, Number(q.get("agenzia")), q.get("dal") ?? "", q.get("al") ?? "").catch(() => null);
  if (!e) return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  const righe = [
    ["Estratto conto", e.agenzia.denominazione, "Partenze dal", e.dal, "al", e.al, "Commissione %", e.agenzia.commissione ?? ""],
    [],
    ["Prenotazione", "Ospite", "Arrivo", "Partenza", "Voucher", "Soggiorno", "Commissione", "Netto", "A carico agenzia", "Pagato agenzia", "Saldo agenzia"],
    ...e.righe.map((r) => [r.prenotazioneId, r.ospite + (r.annullata ? " (annullata, penale)" : ""), r.arrivo, r.partenza, r.voucher, r.soggiorno, r.commissione, r.netto, r.aCaricoAgenzia, r.pagatoAgenzia, r.saldoAgenzia]),
    [],
    ["Totale", "", "", "", "", e.totali.soggiorno, e.totali.commissione, e.totali.netto, e.totali.aCaricoAgenzia, e.totali.pagatoAgenzia, e.totali.saldoAgenzia],
  ];
  const testo = "﻿" + righe.map((r) => r.map(campo).join(";")).join("\r\n");
  return new NextResponse(testo, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="estratto-conto-agenzia-${e.agenzia.id}-${e.dal}-${e.al}.csv"`, "Cache-Control": "private, no-store" },
  });
}
