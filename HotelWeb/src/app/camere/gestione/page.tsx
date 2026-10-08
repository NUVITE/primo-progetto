import { richiediUtente } from "@/lib/auth";
import { unitaDi } from "@/lib/tipologie";
import { datiGestione } from "./actions";
import { GestioneCamere } from "./GestioneCamere";

export default async function GestioneCamerePage() {
  const dati = await datiGestione();
  // Case vacanze, residence…: "appartamenti" invece di "camere".
  const u = await richiediUtente();
  return <GestioneCamere iniziale={dati} unita={unitaDi(u.tipologia)} />;
}
