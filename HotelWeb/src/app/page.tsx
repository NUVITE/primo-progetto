import { puo, richiediUtente } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { SituazioneCamere } from "./camere/situazione/SituazioneCamere";
import { unitaDi } from "@/lib/tipologie";
import { funzioneAttiva } from "@/lib/funzioniRegole";
import { avvio } from "@/lib/avvio";
import Link from "next/link";
import { Avviso, classePulsante } from "@/components/ui";

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
  // Promemoria del primo avvio per chi configura la struttura, finché manca qualcosa.
  const primoAvvio = puo(utente, PERMESSI.HOTEL_CONFIGURA) ? await avvio(utente.hotelId) : null;
  return (
    <>
      {primoAvvio && !primoAvvio.completo && (
        <div className="px-3 pt-3 sm:px-6 sm:pt-4 print:hidden">
          <Avviso
            tipo="info"
            azione={
              <Link href="/impostazioni/avvio" className={classePulsante("secondario", "piccolo")}>
                Primo avvio
              </Link>
            }
          >
            Configurazione della struttura: <strong>{primoAvvio.fatti} passi fatti su {primoAvvio.totale}</strong>. Prossimo passo: {primoAvvio.passi.find((p) => !p.fatto)?.titolo}.
          </Avviso>
        </div>
      )}
    <SituazioneCamere
      puoGestire={puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)}
      unitaPlurale={unitaDi(utente.tipologia).plurale}
      usoDiurno={funzioneAttiva(utente.funzioniSpente, "uso_diurno")}
    />
    </>
  );
}
