"use client";

import { azioneCambiaHotel } from "./cambia-hotel-action";

export function HotelSwitcher({ hotelId, hotels }: { hotelId: number; hotels: { id: number; nome: string }[] }) {
  return (
    <form action={azioneCambiaHotel} className="inline-block max-w-full">
      <select
        name="hotelId"
        defaultValue={hotelId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-full truncate rounded-md border border-stone-300 bg-white px-2 py-1 font-bold text-stone-900"
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>{h.nome}</option>
        ))}
      </select>
    </form>
  );
}
