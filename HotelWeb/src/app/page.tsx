import { puo, richiediUtente } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { SituazioneCamere } from "./camere/situazione/SituazioneCamere";
import { unitaDi } from "@/lib/tipologie";
import { funzioneAttiva } from "@/lib/funzioniRegole";
import { avvio } from "@/lib/avvio";
import Link from "next/link";
import { Avviso, classePulsante } from "@/components/ui";
import { menuVisibile } from "./menu";

export default async function Home() {
  const utente = await richiediUtente();
  // La home è anche la destinazione di chi viene respinto da una pagina senza permesso:
  // qui non si reindirizza più, si spiega (altrimenti un ruolo senza permessi andrebbe in loop).
  // Senza il planning (cucina, cameriere ai piani…): le pagine del suo ruolo, prese dallo stesso menu laterale.
  if (!puo(utente, PERMESSI.PRENOTAZIONI_VEDI)) {
    const gruppi = menuVisibile(utente.permessi, utente.superAdmin, utente.moduli, utente.funzioniSpente, unitaDi(utente.tipologia))
      .map((g) => ({ ...g, voci: g.voci.filter((v) => v.href !== "/manuale") }))
      .filter((g) => g.voci.length);
    return (
      <div className="flex w-full flex-col gap-4 p-3 sm:p-6">
        <div>
          <h1 className="text-xl font-bold">Benvenuto, {utente.nome}</h1>
          <p className="text-sm text-stone-600">
            {utente.hotelNome} · {utente.ruoloNome || "nessun ruolo"}
          </p>
        </div>
        {gruppi.length ? (
          gruppi.map((g) => (
            <section key={g.id} className="flex flex-col gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">{g.label}</h2>
              <div className="flex flex-wrap gap-2">
                {g.voci.map((v) => (
                  <Link key={v.href} href={v.href} className={classePulsante("secondario")}>
                    {v.label}
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <p className="text-sm text-stone-600">
            Il tuo ruolo non comprende ancora nessuna funzione. Se ti serve accedere a qualcosa, chiedi a chi gestisce gli utenti dell&apos;hotel.
          </p>
        )}
        <p className="text-sm text-stone-600">
          Come si usa ogni pagina: <Link href="/manuale" className="font-semibold text-teal-800 underline">Manuale</Link>.
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
