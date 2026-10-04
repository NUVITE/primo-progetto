import { notFound } from "next/navigation";
import { richiediPermesso } from "@/lib/auth";
import { ALLERGENI } from "@/lib/allergeni";
import { dettaglioMenu } from "@/lib/menu";
import { CATEGORIE_PIATTO, ORDINE_CATEGORIE, numeroAllergene } from "@/lib/menuRegole";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { BottoneStampa } from "@/app/prenotazioni/[id]/proforma/BottoneStampa";

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/**
 * Menu da stampare o esporre: piatti disponibili per categoria con il numero degli allergeni e, in
 * fondo, la legenda dei 14 allergeni del Reg. UE 1169/2011 (Allegato II).
 */
export default async function StampaMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const utente = await richiediPermesso(PERMESSI.MENU_GESTISCI);
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const m = await dettaglioMenu(utente.hotelId, id).catch(() => null);
  if (!m) notFound();
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: utente.hotelId } });
  const voci = m.voci.filter((v) => v.disponibile && v.piattoAttivo);
  const usati = new Set(voci.flatMap((v) => v.allergeni));

  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-6 text-stone-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BottoneStampa />
      </div>
      <header className="border-b border-stone-300 pb-3 text-center">
        <p className="text-sm uppercase tracking-widest text-stone-600">{hotel.nome}</p>
        <h1 className="mt-1 text-2xl font-bold">{m.nome}</h1>
        {m.giorno && <p className="text-sm">{new Date(`${m.giorno}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>}
        {m.dalle && m.alle && (
          <p className="text-sm text-stone-600">
            dalle {m.dalle} alle {m.alle}
          </p>
        )}
      </header>

      {ORDINE_CATEGORIE.map((cat) => {
        const lista = voci.filter((v) => v.categoria === cat);
        if (!lista.length) return null;
        return (
          <section key={cat} className="mt-5 break-inside-avoid">
            <h2 className="mb-2 border-b border-stone-200 text-sm font-bold uppercase tracking-wide text-stone-700">{CATEGORIE_PIATTO[cat]}</h2>
            <ul className="flex flex-col gap-2">
              {lista.map((v) => {
                const prezzo = v.prezzo ?? v.prezzoPiatto;
                return (
                  <li key={v.id} className="flex items-baseline gap-3">
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{v.nome}</span>
                      {v.allergeni.length > 0 && <sup className="ml-1 text-xs text-stone-600">{v.allergeni.map(numeroAllergene).join(",")}</sup>}
                      {v.descrizione && <span className="block text-sm italic text-stone-600">{v.descrizione}</span>}
                    </span>
                    {prezzo !== null && <span className="font-mono text-sm">{eur(prezzo)}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {voci.length === 0 && <p className="mt-6 text-center text-stone-600">Nessun piatto disponibile.</p>}

      {m.note && <p className="mt-6 text-center text-sm text-stone-700">{m.note}</p>}

      <footer className="mt-8 border-t border-stone-300 pt-3 text-xs text-stone-700">
        <p className="font-semibold">Allergeni (Reg. UE 1169/2011, Allegato II)</p>
        <p className="mt-1">
          {ALLERGENI.map((a, i) => (
            <span key={a.codice} className={usati.has(a.codice) ? "font-semibold" : ""}>
              {i + 1}. {a.nome}
              {i < ALLERGENI.length - 1 ? " · " : ""}
            </span>
          ))}
        </p>
        <p className="mt-1">Per informazioni su allergeni e intolleranze rivolgersi al personale di sala.</p>
      </footer>
    </div>
  );
}
