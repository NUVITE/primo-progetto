import Link from "next/link";
import { datiModulo } from "../actions";
import { FormHotel, HOTEL_VUOTO } from "../FormHotel";
import { Suggerimento } from "@/components/Suggerimento";

export default async function NuovoHotelPage() {
  const riferimenti = await datiModulo();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href="/piattaforma/hotel" className="text-sm text-teal-700">← Hotel</Link>
        <h1 className="text-xl font-bold">Nuovo hotel</h1>
        <Suggerimento id="nuovo-hotel" titolo="Cosa succede alla creazione">
          <p>
            L&apos;hotel riceve i ruoli predefiniti, un listino base, i trattamenti e le fasce orarie delle sale. Se indichi un amministratore, può
            entrare subito e configurare camere e tariffe dall&apos;hotel stesso.
          </p>
        </Suggerimento>
      </div>
      <FormHotel riferimenti={riferimenti} iniziale={HOTEL_VUOTO} />
    </div>
  );
}
