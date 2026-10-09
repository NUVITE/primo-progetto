import { richiediUtente } from "@/lib/auth";
import { datiProfilo } from "./actions";
import { Profilo } from "./Profilo";

export default async function ProfiloPage({ searchParams }: { searchParams: Promise<{ riserva?: string }> }) {
  await richiediUtente();
  return <Profilo iniziale={await datiProfilo()} pochiCodici={(await searchParams).riserva === "pochi"} />;
}
