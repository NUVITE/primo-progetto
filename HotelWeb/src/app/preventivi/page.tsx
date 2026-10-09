import { datiPreventivi } from "./actions";
import { ElencoPreventivi } from "./ElencoPreventivi";
import { paginaSpenta } from "@/components/FunzioneSpenta";

export default async function PreventiviPage() {
  const spenta = await paginaSpenta("preventivi");
  if (spenta) return spenta;
  return <ElencoPreventivi iniziale={await datiPreventivi()} />;
}
