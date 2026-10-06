import { notFound } from "next/navigation";
import { puo, richiediPermesso } from "@/lib/auth";
import { datiCheckin } from "@/lib/checkin";
import { PERMESSI } from "@/lib/permessi";
import { noteDegliOspiti } from "@/lib/noteAlimentari";
import { statoCamera } from "@/lib/pulizie";
import { prisma } from "@/lib/prisma";
import { CheckinCamera } from "./CheckinCamera";
import { custodiaDellaPrenotazione } from "@/lib/custodia";

export default async function CheckinPage({ params }: { params: Promise<{ id: string; segmentoId: string }> }) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const { id, segmentoId } = await params;
  const dati = await datiCheckin(utente.hotelId, Number(segmentoId), puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)).catch(() => null);
  if (!dati || dati.segmento.prenotazioneId !== Number(id)) notFound();
  // Note alimentari: solo con il permesso (dati sanitari, non lasciano il server senza).
  const puoNote = puo(utente, PERMESSI.NOTE_ALIMENTARI);
  // Pulizie: la camera non ancora pronta si segnala (non blocca: a volte l'ospite aspetta nella hall).
  const seg = puo(utente, PERMESSI.CAMERE_STATO_VEDI) ? await prisma.segmentoSoggiorno.findUnique({ where: { id: Number(segmentoId) }, select: { cameraId: true } }) : null;
  const pulizia = seg?.cameraId ? await statoCamera(utente.hotelId, seg.cameraId) : null;
  // Portineria: messaggi e posta ancora da consegnare a chi è in questa prenotazione (da dare prima che parta).
  const daConsegnare = puo(utente, PERMESSI.PORTINERIA) ? await prisma.messaggioOspite.count({ where: { hotelId: utente.hotelId, prenotazioneId: Number(id), consegnatoIl: null } }) : 0;
  // Custodia (portineria): valori ancora in cassaforte da restituire prima della partenza; chiavi della camera.
  const portineria = puo(utente, PERMESSI.PORTINERIA);
  const valoriAperti = portineria ? (await custodiaDellaPrenotazione(utente.hotelId, Number(id))).valoriAperti : 0;
  const note = puoNote ? await noteDegliOspiti(utente.hotelId, [...new Set(dati.occupanti.map((o) => o.ospiteId))]) : null;
  return <CheckinCamera iniziale={dati} puoGestire={puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)} puoIncassare={puo(utente, PERMESSI.PAGAMENTI_REGISTRA)} noteIniziali={note} puoRoomService={[PERMESSI.ROOM_SERVICE, PERMESSI.CAMERE_STATO_VEDI, PERMESSI.GUASTI_SEGNALA].some((p) => puo(utente, p))} statoPulizia={pulizia} daConsegnare={daConsegnare} valoriAperti={valoriAperti} chiavi={portineria} />;
}
