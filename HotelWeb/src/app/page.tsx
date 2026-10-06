import { puo, richiediUtente } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { SituazioneCamere } from "./camere/situazione/SituazioneCamere";
import { unitaDi } from "@/lib/tipologie";
import { funzioneAttiva } from "@/lib/funzioniRegole";

export default async function Home() {
  const utente = await richiediUtente();
  // La home è anche la destinazione di chi viene respinto da una pagina senza permesso:
  // qui non si reindirizza più, si spiega (altrimenti un ruolo senza permessi andrebbe in loop).
  if (!puo(utente, PERMESSI.PRENOTAZIONI_VEDI)) {
    return (
      <div className="flex w-full flex-col gap-2 p-3 sm:p-6">
        <h1 className="text-xl font-bold">Benvenuto, {utente.nome}</h1>
        <p className="text-sm text-stone-600">
          Il tuo ruolo in {utente.hotelNome} ({utente.ruoloNome || "nessun ruolo"}) non comprende ancora funzioni disponibili in
          questa versione. Se ti serve accedere a qualcosa, chiedi all&apos;amministratore dell&apos;hotel.
        </p>
      </div>
    );
  }
  return (
    <SituazioneCamere
      puoGestire={puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)}
      unitaPlurale={unitaDi(utente.tipologia).plurale}
      usoDiurno={funzioneAttiva(utente.funzioniSpente, "uso_diurno")}
    />
  );
}
