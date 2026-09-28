import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";

/**
 * Ricerca ospiti per frammento di nome/cognome (in qualunque ordine), usata dalla
 * schermata di booking per l'inserimento "free": l'operatore digita e il sistema
 * propone eventuali corrispondenze prima di creare un nuovo ospite.
 */
export async function GET(request: NextRequest) {
  const utente = await getUtenteCorrente();
  if (!utente) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }
  if (!puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)) {
    return NextResponse.json({ error: "Permesso negato." }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tokens = q.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return NextResponse.json({ risultati: [] });
  }

  const ospiti = await prisma.ospite.findMany({
    where: {
      hotelId: utente.hotelId,
      AND: tokens.map((t) => ({
        OR: [
          { nome: { contains: t } },
          { cognome: { contains: t } },
        ],
      })),
    },
    take: 10,
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
  });

  return NextResponse.json({
    risultati: ospiti.map((o) => ({
      id: o.id,
      nomeCompleto: `${o.nome} ${o.cognome}`,
      telefono: o.telefono,
    })),
  });
}
