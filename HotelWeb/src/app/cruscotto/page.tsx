import Link from "next/link";
import type { ReactNode } from "react";
import { richiediUtente } from "@/lib/auth";
import { cruscotto } from "@/lib/cruscotto";
import { conUnita, maiuscola } from "@/lib/funzioniRegole";
import { unitaDi } from "@/lib/tipologie";
import { IntestazionePagina } from "@/components/ui";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const dataLunga = (g: string) => maiuscola(new Date(`${g}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }));

type Tono = "neutro" | "ambra" | "rosso" | "verde";
const TONI: Record<Tono, string> = {
  neutro: "border-stone-200 bg-white",
  verde: "border-emerald-200 bg-emerald-50/60",
  ambra: "border-amber-300 bg-amber-50",
  rosso: "border-red-300 bg-red-50",
};

/** Riquadro del cruscotto: titolo, numero grande, dettaglio e pagina dove si lavora. */
function Riquadro({ titolo, valore, dettaglio, href, tono = "neutro" }: { titolo: string; valore: ReactNode; dettaglio?: ReactNode; href: string; tono?: Tono }) {
  return (
    <Link href={href} className={`flex min-w-0 flex-col gap-1 rounded-xl border p-4 shadow-sm transition hover:shadow-md ${TONI[tono]}`}>
      <span className="text-xs font-bold uppercase tracking-wide text-stone-500">{titolo}</span>
      <span className="text-3xl font-bold tabular-nums text-stone-900">{valore}</span>
      {dettaglio && <span className="text-sm text-stone-700">{dettaglio}</span>}
    </Link>
  );
}

/** Cruscotto del giorno: arrivi, partenze, occupazione e quello che c'è da fare, per quello che ognuno può vedere. */
export default async function CruscottoPage() {
  const u = await richiediUtente();
  const c = await cruscotto(u);
  const unita = unitaDi(u.tipologia);
  const t = (s: string) => conUnita(s, unita);
  const r = c.ricevimento;
  const nessuno = !r && c.opzioni === null && c.conti === null && c.cassa === null && !c.pulizie && !c.adempimenti;
  // Concordanze con l'unità: "camere arrivate" / "appartamenti arrivati".
  const f = (femminile: string, maschile: string) => (unita.femminile ? femminile : maschile);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Cruscotto" sottotitolo={dataLunga(c.oggi)} />
      {nessuno && <p className="text-sm text-stone-600">Con i permessi del tuo ruolo il cruscotto non ha numeri da mostrare.</p>}

      {r && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Riquadro
            titolo="Arrivi di oggi"
            valore={r.arrivi.camere}
            dettaglio={r.arrivi.camere ? t(`{camere} · ${r.arrivi.persone} persone · ${r.arrivi.arrivate} già ${f("arrivate", "arrivati")}`) : "Nessun arrivo"}
            href="/prenotazioni?filtro=arrivi"
          />
          <Riquadro
            titolo="Partenze di oggi"
            valore={r.partenze.camere}
            dettaglio={r.partenze.camere ? `${r.partenze.partite} già ${f("partite", "partiti")}, ${r.partenze.camere - r.partenze.partite} da salutare` : "Nessuna partenza"}
            href="/"
          />
          <Riquadro
            titolo="Occupazione stanotte"
            valore={`${r.stanotte.percentuale}%`}
            dettaglio={t(`${r.stanotte.camere} {camere} su ${r.stanotte.disponibili} · ${r.stanotte.persone} persone${r.stanotte.fuoriServizio ? ` · ${r.stanotte.fuoriServizio} fuori servizio` : ""}`)}
            href="/"
            tono={r.stanotte.percentuale >= 90 ? "verde" : "neutro"}
          />
          {c.cassa && (
            <Riquadro titolo="Incassi di oggi" valore={eur(c.cassa.totale)} dettaglio={c.cassa.chiusa ? "Giornata chiusa" : "Cassa aperta"} href="/cassa" />
          )}
        </section>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {c.opzioni !== null && (
          <Riquadro
            titolo="Opzioni in scadenza"
            valore={c.opzioni}
            dettaglio={c.opzioni ? "Da confermare o lasciar andare entro due giorni" : "Nessuna opzione in scadenza"}
            href="/prenotazioni?filtro=opzioni"
            tono={c.opzioni ? "ambra" : "neutro"}
          />
        )}
        {c.acconti !== null && (
          <Riquadro
            titolo="Acconti non arrivati"
            valore={c.acconti}
            dettaglio={c.acconti ? "Scadenza passata: sollecitare o liberare" : "Tutti gli acconti scaduti sono arrivati"}
            href="/prenotazioni"
            tono={c.acconti ? "ambra" : "neutro"}
          />
        )}
        {c.conti !== null && (
          <Riquadro titolo="Conti aperti" valore={c.conti} dettaglio={c.conti ? "Ospiti partiti con qualcosa da pagare" : "Nessun conto aperto"} href="/conti" tono={c.conti ? "ambra" : "neutro"} />
        )}
        {c.istruzioniArrivo !== null && c.istruzioniArrivo > 0 && (
          <Riquadro titolo="Istruzioni di arrivo" valore={c.istruzioniArrivo} dettaglio="Arrivi autonomi senza istruzioni inviate" href="/prenotazioni/istruzioni-arrivo" tono="ambra" />
        )}
        {c.pulizie && (
          <Riquadro
            titolo={t("{Camere} da pulire")}
            valore={c.pulizie.daPulire}
            dettaglio={`${c.pulizie.inPulizia} in pulizia · ${c.pulizie.daControllare} da controllare · ${c.pulizie.pronte} pronte`}
            href="/pulizie"
            tono={c.pulizie.daPulire ? "ambra" : "verde"}
          />
        )}
        {c.adempimenti && (
          <Riquadro
            titolo="Schedine di Polizia"
            valore={c.schedine?.quante ?? 0}
            dettaglio={c.schedine ? (c.schedine.scadute ? `${c.schedine.scadute} oltre le 24 ore` : "Da inviare") : "Tutte inviate"}
            href="/schedine"
            tono={c.schedine?.scadute ? "rosso" : c.schedine ? "ambra" : "verde"}
          />
        )}
        {c.istat && (
          <Riquadro titolo="ISTAT" valore={c.istat.giorni} dettaglio={c.istat.scaduti ? `Giorni da comunicare, ${c.istat.scaduti} in ritardo` : "Giorni da comunicare"} href="/istat" tono={c.istat.scaduti ? "rosso" : "ambra"} />
        )}
      </section>
    </div>
  );
}
