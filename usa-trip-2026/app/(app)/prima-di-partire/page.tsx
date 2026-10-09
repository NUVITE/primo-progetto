import { Plane } from "lucide-react";
import { ChecklistPartenza } from "@/components/ChecklistPartenza";
import { daysUntilTrip } from "@/lib/trip";

export default function PrimaDiPartirePage() {
  const mancano = daysUntilTrip();

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm">
        <h1 className="flex items-center gap-2 text-[20px] font-extrabold leading-tight">
          <Plane size={22} strokeWidth={2.1} className="text-brand-200" />
          Prima di partire
        </h1>
        <p className="mt-1.5 text-[14px] leading-snug text-brand-100">
          {mancano > 0
            ? `Mancano ${mancano} ${mancano === 1 ? "giorno" : "giorni"}. Alcune cose vanno preparate a casa: una volta là non si rimedia.`
            : "Tenetela come promemoria: qui c'è tutto quello che serviva preparare da casa."}
        </p>
      </div>

      <ChecklistPartenza />

      <p className="rounded-xl bg-sand-100 px-4 py-3 text-[14px] leading-snug text-ink-500">
        Le voci contrassegnate come <strong>importante</strong> sono quelle che, se mancano, creano
        un problema vero sul posto: un ingresso negato, una cauzione rifiutata, un telefono che non
        si ricarica.
      </p>
    </div>
  );
}
