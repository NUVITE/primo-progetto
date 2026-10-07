import { redirect } from "next/navigation";
import { getUtenteCorrente, utenteDaAttivareVerifica } from "@/lib/auth";
import { PrimaAttivazione } from "./PrimaAttivazione";

/** Verifica in due passaggi obbligatoria per il ruolo e non ancora attiva: si attiva prima di tutto. */
export default async function AttivaVerificaPage() {
  const u = await utenteDaAttivareVerifica();
  if (!u) redirect((await getUtenteCorrente()) ? "/profilo" : "/login");
  return <PrimaAttivazione nome={u.nome} />;
}
