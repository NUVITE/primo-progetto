import { datiAgenzie } from "./actions";
import { Agenzie } from "./Agenzie";
import { paginaSpenta } from "@/components/FunzioneSpenta";

export default async function AgenziePage() {
  const spenta = await paginaSpenta("agenzie");
  if (spenta) return spenta;
  return <Agenzie iniziale={await datiAgenzie()} />;
}
