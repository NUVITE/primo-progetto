import { datiMessaggi } from "./actions";
import { MessaggiOspiti } from "./MessaggiOspiti";

export default async function MessaggiPage({ searchParams }: { searchParams: Promise<{ prenotazione?: string }> }) {
  const { prenotazione } = await searchParams;
  return <MessaggiOspiti iniziale={await datiMessaggi()} prenotazioneIniziale={Number(prenotazione) || null} />;
}
