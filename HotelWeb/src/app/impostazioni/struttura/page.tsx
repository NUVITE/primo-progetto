import { richiediPermesso } from "@/lib/auth";
import { caricaStruttura } from "@/lib/impostazioniHotel";
import { elencoChiusure } from "@/lib/chiusure";
import { PERMESSI } from "@/lib/permessi";
import { FormStruttura } from "./FormStruttura";
import { FunzioniStruttura } from "./FunzioniStruttura";
import { funzioniDellaStruttura } from "@/lib/funzioni";

export default async function StrutturaPage() {
  const u = await richiediPermesso(PERMESSI.HOTEL_CONFIGURA);
  const [struttura, chiusure, spente] = await Promise.all([caricaStruttura(u.hotelId), elencoChiusure(u.hotelId), funzioniDellaStruttura(u.hotelId)]);
  return (
    <>
      <FormStruttura iniziale={struttura} chiusure={chiusure} />
      <FunzioniStruttura iniziali={spente} />
    </>
  );
}
