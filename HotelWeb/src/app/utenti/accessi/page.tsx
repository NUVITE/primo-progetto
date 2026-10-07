import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { oggiItaliano } from "@/lib/cassaAperta";
import { registroAccessi } from "@/lib/accessi";
import { RegistroAccessi } from "@/components/RegistroAccessi";
import { azioneRegistroStruttura } from "./actions";

const meno = (g: string, giorni: number) => new Date(new Date(`${g}T12:00:00Z`).getTime() - giorni * 86400000).toISOString().slice(0, 10);

export default async function RegistroAccessiStrutturaPage() {
  const u = await richiediPermesso(PERMESSI.UTENTI_GESTISCI);
  const oggi = oggiItaliano();
  const filtro = { dal: meno(oggi, 30), al: oggi, utenteId: null, soloProblemi: false };
  return (
    <RegistroAccessi
      titolo="Registro degli accessi"
      descrizione={`Accessi e password degli utenti di ${u.hotelNome}.`}
      iniziale={await registroAccessi(u.hotelId, filtro)}
      filtroIniziale={filtro}
      carica={azioneRegistroStruttura}
      mostraEmail={false}
    />
  );
}
