"use client";

import { useRouter } from "next/navigation";
import { CambioPassword } from "../profilo/CambioPassword";
import { effettuaLogout } from "../logout-action";

/** Schermata senza menu: finché la password temporanea non è cambiata non si fa altro. */
export function PrimoCambio({ nome }: { nome: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-stone-900">Scegli la tua password</h1>
        <p className="mb-6 text-sm text-stone-600">
          Ciao {nome}: stai usando una password che ti è stata data da un altro. Prima di continuare scegline una che conosci solo tu.
        </p>
        <CambioPassword etichettaAttuale="Password che ti è stata data" dopo={() => {
            // refresh: il layout (menu laterale) si ridisegna ora che l'utente conta come collegato.
            router.replace("/");
            router.refresh();
          }} />
        <form action={effettuaLogout} className="mt-4">
          <button type="submit" className="text-sm text-stone-600 underline">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
