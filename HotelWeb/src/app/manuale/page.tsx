import { richiediUtente } from "@/lib/auth";
import { indice } from "@/lib/manuale";
import { IntestazionePagina } from "@/components/ui";
import { RicercaManuale } from "./RicercaManuale";

/** Manuale operativo: i capitoli delle funzioni che l'utente può usare, con la ricerca. */
export default async function ManualePage() {
  const u = await richiediUtente();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Manuale" sottotitolo="Come si usa il programma, passo per passo. Vedi i capitoli delle funzioni che il tuo ruolo può usare." />
      <RicercaManuale voci={await indice("operativo", u)} base="/manuale" />
    </div>
  );
}
