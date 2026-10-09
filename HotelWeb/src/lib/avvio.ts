/** Primo avvio guidato: legge dal database lo stato di ogni passo (vedi avvioRegole.ts). */
import { prisma } from "@/lib/prisma";
import { unitaDi } from "@/lib/tipologie";
import { passiAvvio, riepilogoAvvio, type StatoAvvio } from "@/lib/avvioRegole";

const oggiItalia = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

export async function statoAvvio(hotelId: number): Promise<StatoAvvio> {
  const oggi = new Date(`${oggiItalia()}T00:00:00.000Z`);
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } });
  const [camere, tipi, politiche, regolamento, email, utenti] = await Promise.all([
    prisma.camera.count({ where: { hotelId, attivo: true } }),
    // Tipi con camere attive e quanti periodi del listino base valgono da oggi in poi.
    prisma.tipoCamera.findMany({
      where: { hotelId, camere: { some: { attivo: true } } },
      select: { descrizione: true, periodiTariffari: { where: { al: { gte: oggi }, listino: { tipo: "base" } }, select: { id: true }, take: 1 } },
    }),
    prisma.politicaCancellazione.count({ where: { hotelId, attiva: true } }),
    prisma.regolamentoTassa.findFirst({ where: { comuneId: hotel.comuneId, validoDal: { lte: oggi }, OR: [{ validoAl: null }, { validoAl: { gte: oggi } }] }, select: { id: true } }),
    prisma.configurazioneEmail.findUnique({ where: { hotelId }, select: { ultimaProvaEsito: true } }),
    prisma.utenteHotel.count({ where: { hotelId, utente: { superAdmin: false } } }),
  ]);
  const mancanti = [
    !hotel.indirizzo && "indirizzo",
    !hotel.telefono && "telefono",
    !hotel.email && "email",
    !hotel.orarioCheckIn && "orario di check-in",
    !hotel.orarioCheckOut && "orario di check-out",
  ].filter((x): x is string => !!x);
  const ross = hotel.sistemaIstat === "ROSS1000";
  return {
    unita: unitaDi(hotel.tipologia),
    datiMancanti: mancanti,
    camereAttive: camere,
    tipiSenzaPrezzi: tipi.filter((t) => t.periodiTariffari.length === 0).map((t) => t.descrizione),
    politiche,
    regolamentoTassa: !!regolamento,
    alloggiati: { utente: !!hotel.alloggiatiUtente, verificato: !!hotel.alloggiatiVerificatoIl },
    istat: {
      sistema: hotel.sistemaIstat,
      completo: ross ? !!(hotel.ross1000Codice && hotel.ross1000Utente && hotel.ross1000Password) : !!hotel.istatPrimoGiorno,
    },
    email: { configurata: !!email, provaRiuscita: !!email?.ultimaProvaEsito?.startsWith("riuscita") },
    utenti: { titolare: hotel.modalitaUtenti === "titolare", quanti: utenti },
  };
}

export async function avvio(hotelId: number) {
  const passi = passiAvvio(await statoAvvio(hotelId));
  return { passi, ...riepilogoAvvio(passi) };
}
