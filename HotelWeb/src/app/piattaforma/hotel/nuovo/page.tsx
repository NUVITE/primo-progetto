import Link from "next/link";
import { datiModulo } from "../actions";
import { FormHotel, HOTEL_VUOTO } from "../FormHotel";

export default async function NuovoHotelPage() {
  const riferimenti = await datiModulo();
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <Link href="/piattaforma/hotel" className="text-sm text-teal-700">← Hotel</Link>
        <h1 className="text-xl font-bold">Nuovo hotel</h1>
        <p className="text-sm text-stone-600">
          Alla creazione l&apos;hotel riceve i ruoli predefiniti e un listino base. Camere e tariffe si configurano poi dall&apos;hotel stesso.
        </p>
      </div>
      <FormHotel riferimenti={riferimenti} iniziale={HOTEL_VUOTO} />
    </div>
  );
}
