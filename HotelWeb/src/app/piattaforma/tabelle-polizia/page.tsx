import { richiediSuperAdmin } from "@/lib/auth";
import { statoTabellePolizia } from "@/lib/tabellePolizia";
import { AggiornaTabelle } from "./AggiornaTabelle";

export default async function TabellePoliziaPage() {
  await richiediSuperAdmin();
  const stato = await statoTabellePolizia();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Tabelle Polizia</h1>
        <p className="text-sm text-stone-600">
          Comuni, stati e documenti ufficiali di Alloggiati Web, usati al check-in per la schedina PS e per l&apos;ISTAT. Si scaricano dai
          link pubblici del portale; i codici cessati restano (servono per le date di nascita).
        </p>
      </div>
      <AggiornaTabelle iniziale={stato} />
    </div>
  );
}
