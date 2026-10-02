import { unstable_rethrow } from "next/navigation";

/**
 * In produzione Next.js sostituisce il messaggio di un errore lanciato da una server action
 * con un testo generico: un errore di dominio ("camera non disponibile", "servizio già
 * usato"...) non arriverebbe mai all'operatore. Le action quindi non lanciano: restituiscono
 * un Esito, e il client lo "sbusta" riottenendo un normale throw con il messaggio giusto.
 */
export type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

function messaggioPerUtente(e: unknown): string {
  // Errori scritti da noi in src/lib (new Error("...")): il messaggio è pensato per l'operatore.
  if (e instanceof Error && e.constructor === Error) return e.message;

  const codice = (e as { code?: unknown })?.code;
  if (codice === "P2025") return "Elemento non trovato oppure non accessibile da questo hotel.";
  if (codice === "P2002") return "Esiste già un elemento con questo codice o questa email.";

  // Tutto il resto (DB irraggiungibile, bug...) non va mostrato così com'è: resta nei log.
  console.error(e);
  return "Operazione non riuscita per un errore imprevisto. Riprova o contatta l'assistenza.";
}

/** Lato server: esegue l'azione e converte gli errori in Esito (redirect/notFound passano invariati). */
export async function conEsito<T>(fn: () => Promise<T>): Promise<Esito<T>> {
  try {
    return { ok: true, valore: await fn() };
  } catch (e) {
    unstable_rethrow(e);
    return { ok: false, errore: messaggioPerUtente(e) };
  }
}

/** Lato client: riporta un Esito al comportamento "valore o throw" che i componenti già gestiscono. */
export async function sbusta<T>(esito: Promise<Esito<T>>): Promise<T> {
  const r = await esito;
  if (!r.ok) throw new Error(r.errore);
  return r.valore;
}

/** Tipo del valore restituito da una action che risponde con Esito (per useState e simili). */
export type ValoreDi<F extends (...args: never[]) => Promise<Esito<unknown>>> =
  Extract<Awaited<ReturnType<F>>, { ok: true }>["valore"];
