import { richiediSuperAdmin } from "@/lib/auth";
import { statoTabellePolizia } from "@/lib/tabellePolizia";
import { AggiornaTabelle } from "./AggiornaTabelle";
import { Suggerimento } from "@/components/Suggerimento";

export default async function TabellePoliziaPage() {
  await richiediSuperAdmin();
  const stato = await statoTabellePolizia();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Tabelle Polizia</h1>
        <Suggerimento id="tabelle-polizia" titolo="Quando aggiornare le tabelle">
          <p>
            Comuni, stati e documenti ufficiali di Alloggiati Web servono al check-in per la schedina di Polizia e per l&apos;ISTAT. Aggiornale
            quando la Polizia pubblica nuove tabelle (per esempio dopo la nascita o la fusione di comuni): i codici cessati restano, perché servono
            per chi è nato in un comune che non esiste più.
          </p>
        </Suggerimento>
      </div>
      <AggiornaTabelle iniziale={stato} />
    </div>
  );
}
