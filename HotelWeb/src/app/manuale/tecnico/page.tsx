import { richiediSuperAdmin } from "@/lib/auth";
import { indice } from "@/lib/manuale";
import { IntestazionePagina } from "@/components/ui";
import { RicercaManuale } from "../RicercaManuale";

/** Manuale tecnico: architettura, sviluppo, collaudi, deploy e backup (solo il gestore della piattaforma). */
export default async function ManualeTecnicoPage() {
  const u = await richiediSuperAdmin();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Manuale tecnico" sottotitolo="Per chi sviluppa e gestisce il programma: architettura, sviluppo, collaudi, deploy, backup." />
      <RicercaManuale voci={await indice("tecnico", u)} base="/manuale/tecnico" />
    </div>
  );
}
