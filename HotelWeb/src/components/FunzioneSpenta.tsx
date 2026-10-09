import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { FUNZIONI, funzioneAttiva, type Funzione } from "@/lib/funzioniRegole";

/**
 * Pagina di una funzione che la struttura ha spento: invece della pagina si spiega dove riaccenderla.
 * Uso nelle pagine: `const spenta = await paginaSpenta("agenzie"); if (spenta) return spenta;`
 */
export async function paginaSpenta(f: Funzione) {
  const utente = await richiediUtente();
  if (funzioneAttiva(utente.funzioniSpente, f)) return null;
  return (
    <div className="flex w-full flex-col gap-2 p-3 sm:p-6">
      <h1 className="text-xl font-bold">{FUNZIONI[f].nome}</h1>
      <p className="max-w-2xl text-sm text-stone-700">
        Questa funzione è spenta per {utente.hotelNome}: non compare nei menu e nelle maschere. I dati già registrati restano e tornano visibili
        riaccendendola in{" "}
        <Link href="/impostazioni/struttura" className="font-semibold text-teal-800 underline">
          Impostazioni › Struttura
        </Link>
        .
      </p>
    </div>
  );
}
