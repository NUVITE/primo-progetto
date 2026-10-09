import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { moduliAttivi } from "@/lib/moduli";
import { datiModulo } from "../actions";
import { FormHotel } from "../FormHotel";
import { ModuliHotel } from "./ModuliHotel";
import { ProfiloTipologia } from "./ProfiloTipologia";
import { anteprimaProfilo } from "@/lib/profili";
import { avvio } from "@/lib/avvio";
import { funzioniSpente } from "@/lib/funzioniRegole";
import { AvvioStruttura } from "./AvvioStruttura";

export default async function DettaglioHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const riferimenti = await datiModulo(); // verifica anche che sia un superadmin
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  const t = (s: string | null) => s ?? "";
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href="/piattaforma/hotel" className="text-sm text-teal-700">← Hotel</Link>
        <h1 className="text-xl font-bold">{hotel.nome}</h1>
      </div>
      <ModuliHotel hotelId={hotel.id} attivo={hotel.attivo} moduli={moduliAttivi(hotel.moduli)} />
      <AvvioStruttura avvio={await avvio(hotel.id)} funzioniSpente={funzioniSpente(hotel.funzioniSpente)} />
      <ProfiloTipologia hotelId={hotel.id} anteprima={await anteprimaProfilo(hotel.id)} />
      {/* Ancora per il passo "Statistica ISTAT" del primo avvio (sistema regionale nei dati dell'hotel). */}
      <div id="dati-hotel" className="scroll-mt-4" />
      <FormHotel
        riferimenti={riferimenti}
        hotelId={hotel.id}
        iniziale={{
          nome: hotel.nome,
          comuneId: hotel.comuneId,
          tipologia: hotel.tipologia,
          categoria: t(hotel.categoria),
          ragioneSociale: t(hotel.ragioneSociale),
          partitaIva: t(hotel.partitaIva),
          codiceFiscale: t(hotel.codiceFiscale),
          indirizzo: t(hotel.indirizzo),
          cap: t(hotel.cap),
          telefono: t(hotel.telefono),
          email: t(hotel.email),
          pec: t(hotel.pec),
          sistemaIstat: t(hotel.sistemaIstat),
        }}
      />
    </div>
  );
}
