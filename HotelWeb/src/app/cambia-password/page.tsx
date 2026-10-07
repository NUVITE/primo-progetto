import { redirect } from "next/navigation";
import { getUtenteCorrente, utenteDaCambiarePassword } from "@/lib/auth";
import { PrimoCambio } from "./PrimoCambio";

/** Primo accesso con una password temporanea (iniziale o reimpostata): va cambiata prima di tutto. */
export default async function CambiaPasswordPage() {
  const u = await utenteDaCambiarePassword();
  if (!u) redirect((await getUtenteCorrente()) ? "/profilo" : "/login");
  return <PrimoCambio nome={u.nome} />;
}
