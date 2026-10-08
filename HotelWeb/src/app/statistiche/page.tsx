import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { oggiItaliano } from "@/lib/cassaAperta";
import { unitaDi } from "@/lib/tipologie";
import { datiStatistiche } from "./actions";
import { Statistiche } from "./Statistiche";

/** Statistiche: si parte dal mese in corso. */
export default async function StatistichePage() {
  const u = await richiediPermesso(PERMESSI.STATISTICHE_VEDI);
  const oggi = oggiItaliano();
  const dal = `${oggi.slice(0, 7)}-01`;
  const al = new Date(Date.UTC(Number(oggi.slice(0, 4)), Number(oggi.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return <Statistiche iniziale={await datiStatistiche(dal, al)} oggi={oggi} unita={unitaDi(u.tipologia)} hotelNome={u.hotelNome} />;
}
