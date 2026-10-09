import { richiediSuperAdmin } from "@/lib/auth";
import { oggiItaliano } from "@/lib/cassaAperta";
import { registroAccessi } from "@/lib/accessi";
import { RegistroAccessi } from "@/components/RegistroAccessi";
import { azioneRegistroPiattaforma } from "./actions";

const meno = (g: string, giorni: number) => new Date(new Date(`${g}T12:00:00Z`).getTime() - giorni * 86400000).toISOString().slice(0, 10);

export default async function RegistroAccessiPiattaformaPage() {
  await richiediSuperAdmin();
  const oggi = oggiItaliano();
  const filtro = { dal: meno(oggi, 7), al: oggi, utenteId: null, soloProblemi: false };
  return (
    <RegistroAccessi
      titolo="Accessi alla piattaforma"
      descrizione="Tutti gli accessi di tutte le strutture, compresi i tentativi con email che non appartengono a nessun utente."
      iniziale={await registroAccessi(null, filtro)}
      filtroIniziale={filtro}
      carica={azioneRegistroPiattaforma}
      mostraEmail
    />
  );
}
