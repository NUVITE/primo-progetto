import { notFound } from "next/navigation";
import { richiediPermesso } from "@/lib/auth";
import { cartellinoBagagli } from "@/lib/custodia";
import { PERMESSI } from "@/lib/permessi";
import { BottoneStampa } from "@/app/prenotazioni/[id]/proforma/BottoneStampa";

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });

/** Cartellino del deposito bagagli: due metà con lo stesso numero (all'ospite e sui bagagli). */
export default async function CartellinoPage({ params }: { params: Promise<{ id: string }> }) {
  const utente = await richiediPermesso(PERMESSI.PORTINERIA);
  const id = Number((await params).id);
  const c = Number.isInteger(id) ? await cartellinoBagagli(utente.hotelId, id).catch(() => null) : null;
  if (!c) notFound();
  const meta = (per: string) => (
    <div className="flex-1 rounded border-2 border-dashed border-stone-400 p-4 text-center">
      <p className="text-xs uppercase tracking-widest text-stone-500">{c.hotel}</p>
      <p className="text-xs font-semibold uppercase">Deposito bagagli · {per}</p>
      <p className="my-2 font-mono text-5xl font-bold">{c.numero}</p>
      <p className="font-semibold">{c.nome}</p>
      {c.camere && <p className="text-xs">Camera {c.camere}</p>}
      <p className="text-sm">{c.colli === 1 ? "1 collo" : `${c.colli} colli`}</p>
      {c.descrizione && <p className="text-xs text-stone-600">{c.descrizione}</p>}
      <p className="mt-1 text-xs text-stone-500">
        {quando(c.depositatoIl)} · {c.depositatoDa}
      </p>
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-2xl bg-white p-6 text-sm text-stone-900 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <BottoneStampa />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row print:flex-row">
        {meta("per l'ospite")}
        {meta("da attaccare ai bagagli")}
      </div>
      <p className="mt-3 text-center text-xs text-stone-500">I bagagli si ritirano mostrando la parte dell&apos;ospite.</p>
    </div>
  );
}
