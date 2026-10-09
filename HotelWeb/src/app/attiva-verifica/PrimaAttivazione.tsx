"use client";

import { useRouter } from "next/navigation";
import { AttivaVerifica } from "../profilo/AttivaVerifica";
import { effettuaLogout } from "../logout-action";

/** Schermata senza menu: chi gestisce utenti o impostazioni attiva la verifica prima di continuare. */
export function PrimaAttivazione({ nome }: { nome: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-stone-900">Attiva la verifica in due passaggi</h1>
        <p className="mb-6 text-sm text-stone-600">
          Ciao {nome}: chi gestisce utenti o impostazioni deve proteggere l&apos;accesso anche con un codice dal telefono. Ci vogliono due minuti.
        </p>
        <AttivaVerifica
          dopo={() => {
            // refresh: il layout (menu laterale) si ridisegna ora che l'utente conta come collegato.
            router.replace("/");
            router.refresh();
          }}
        />
        <form action={effettuaLogout} className="mt-4">
          <button type="submit" className="text-sm text-stone-600 underline">
            Esci
          </button>
        </form>
      </div>
    </div>
  );
}
