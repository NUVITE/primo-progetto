import { richiediUtente } from "@/lib/auth";
import { datiProfilo } from "./actions";
import { Profilo } from "./Profilo";

export default async function ProfiloPage() {
  await richiediUtente();
  return <Profilo iniziale={await datiProfilo()} />;
}
