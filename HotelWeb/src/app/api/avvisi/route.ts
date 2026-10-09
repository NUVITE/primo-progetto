import { NextResponse } from "next/server";
import { getUtenteCorrente, puo } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { avvisoSchedine } from "@/lib/alloggiati";
import { avvisoIstat } from "@/lib/movimentoIstat";
import { risposteDaVedere } from "@/lib/preventivi";
import { votiBassiDaLeggere } from "@/lib/questionari";
import { consegneDaLeggere } from "@/lib/consegne";
import { arriviSenzaIstruzioni } from "@/lib/arrivo";
import { oggiItaliano } from "@/lib/cassaAperta";
import { statoBackup } from "@/lib/backup";

/**
 * Avvisi degli adempimenti per la barra in cima all'app (schedine di Polizia e giorni ISTAT da
 * comunicare). Solo per chi ha il permesso di inviarli; letto dal client a ogni cambio pagina.
 */
export async function GET() {
  const utente = await getUtenteCorrente();
  if (!utente) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  const adempimenti = puo(utente, PERMESSI.ADEMPIMENTI_INVIA);
  // Preventivi a cui l'ospite ha risposto online (accettati o rifiutati) e non ancora guardati.
  const preventivi =
    puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI) && puo(utente, PERMESSI.IMPORTI_VEDI) && !utente.funzioniSpente.includes("preventivi") ? await risposteDaVedere(utente.hotelId) : 0;
  // Questionari di gradimento con voto basso non ancora letti dalla direzione.
  const questionari = puo(utente, PERMESSI.QUESTIONARI_VEDI) ? await votiBassiDaLeggere(utente.hotelId) : 0;
  // Consegne fra turni lasciate dai colleghi e non ancora lette da questo utente (portineria).
  const consegne = puo(utente, PERMESSI.PORTINERIA) ? await consegneDaLeggere(utente.hotelId, utente.id) : 0;
  // Arrivi autonomi dei prossimi giorni senza istruzioni inviate: per chi gestisce le prenotazioni e invia le email.
  const arrivi =
    puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI) && puo(utente, PERMESSI.EMAIL_INVIA) ? (await arriviSenzaIstruzioni(utente.hotelId, oggiItaliano())).length : 0;
  // Backup notturni con problemi: solo per il gestore della piattaforma.
  const v = utente.superAdmin ? (await statoBackup()).valutazione : null;
  const backup = v && (v.livello === "errore" || v.livello === "avviso") ? v : null;
  const [schedine, istat] = adempimenti ? await Promise.all([avvisoSchedine(utente.hotelId), avvisoIstat(utente.hotelId).catch(() => null)]) : [null, null];
  return NextResponse.json({ schedine, istat, preventivi, questionari, consegne, arrivi, backup }, { headers: { "Cache-Control": "no-store" } });
}
