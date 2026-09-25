import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// MVP: un solo hotel. Quando si aggiunge multi-hotel, l'hotelId va preso dalla sessione utente.
const HOTEL_ID = 1;

/**
 * Ricerca ospiti per frammento di nome/cognome (in qualunque ordine), usata dalla
 * schermata di booking per l'inserimento "free": l'operatore digita e il sistema
 * propone eventuali corrispondenze prima di creare un nuovo ospite.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const tokens = q.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return NextResponse.json({ risultati: [] });
  }

  const ospiti = await prisma.ospite.findMany({
    where: {
      hotelId: HOTEL_ID,
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
