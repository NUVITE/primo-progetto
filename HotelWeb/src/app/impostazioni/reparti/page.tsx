import { datiReparti } from "./actions";
import { RepartiIva } from "./RepartiIva";

export default async function RepartiPage() {
  return <RepartiIva iniziale={await datiReparti()} />;
}
