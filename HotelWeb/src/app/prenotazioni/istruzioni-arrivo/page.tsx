import Link from "next/link";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { arriviSenzaIstruzioni } from "@/lib/arrivo";
import { GIORNI_PROMEMORIA } from "@/lib/arrivoRegole";
import { oggiItaliano } from "@/lib/cassaAperta";
import { Etichetta, IntestazionePagina, Sezione } from "@/components/ui";

const it = (g: string) => g.split("-").reverse().join("/");

/** Promemoria: arrivi autonomi dei prossimi giorni a cui non sono ancora partite le istruzioni. */
export default async function IstruzioniArrivoPage() {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  const oggi = oggiItaliano();
  const arrivi = await arriviSenzaIstruzioni(utente.hotelId, oggi);
  return (
    <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Istruzioni di arrivo da inviare"
        sottotitolo={`Arrivi da oggi ai prossimi ${GIORNI_PROMEMORIA} giorni in unità con istruzioni o codice di accesso, senza l'email «Istruzioni di arrivo». Si invia dalla prenotazione, nel riquadro Arrivo autonomo.`}
      />
      <Sezione titolo={arrivi.length ? `${arrivi.length} da inviare` : "Niente da inviare"}>
        {arrivi.length === 0 ? (
          <p className="text-sm text-stone-600">Tutti gli arrivi autonomi dei prossimi giorni hanno già ricevuto le istruzioni.</p>
        ) : (
          <table className="tabella-responsive w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="pb-1">Arrivo</th>
                <th className="pb-1">Prenotazione</th>
                <th className="pb-1">Ospite</th>
                <th className="pb-1">Unità</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {arrivi.map((a) => (
                <tr key={a.prenotazioneId} className="border-t border-stone-100">
                  <td data-label="Arrivo" className="py-1.5 font-mono">
                    {it(a.arrivo)} {a.arrivo === oggi && <Etichetta tono="rosso">oggi</Etichetta>}
                  </td>
                  <td data-label="Prenotazione" className="py-1.5">
                    n. {a.prenotazioneId}
                  </td>
                  <td data-label="Ospite" className="py-1.5">
                    {a.ospite} {!a.email && <Etichetta tono="ambra">senza email</Etichetta>}
                  </td>
                  <td data-label="Unità" className="py-1.5">
                    {a.camere.join(", ")}
                  </td>
                  <td className="cella-intera py-1.5 md:text-right">
                    <Link href={`/prenotazioni/${a.prenotazioneId}`} className="font-semibold text-teal-800 underline">
                      Apri la prenotazione
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Sezione>
    </div>
  );
}
