import { richiediPermesso } from "@/lib/auth";
import { caricaStruttura } from "@/lib/impostazioniHotel";
import { PERMESSI } from "@/lib/permessi";
import { FormStruttura } from "./FormStruttura";

export default async function StrutturaPage() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  return <FormStruttura iniziale={await caricaStruttura(u.hotelId)} />;
}
