import { redirect } from "next/navigation";
import { utenteInVerifica } from "@/lib/auth";
import { GIORNI_DISPOSITIVO } from "@/lib/dueFattori";
import { verificaCodiceLogin } from "../actions";

/** Secondo passaggio del login: codice a 6 cifre dall'app sul telefono, o un codice di riserva. */
export default async function VerificaPage({ searchParams }: { searchParams: Promise<{ errore?: string }> }) {
  if (!(await utenteInVerifica())) redirect("/login?errore=scaduta");
  const { errore } = await searchParams;
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50">
      <form action={verificaCodiceLogin} className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-stone-900">Verifica in due passaggi</h1>
        <p className="mb-6 text-sm text-stone-600">Apri l&apos;app di autenticazione sul telefono e scrivi il codice di 6 cifre di HotelWeb.</p>
        {errore && (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            Codice non corretto. Controlla che sia quello attuale (cambia ogni 30 secondi).
          </p>
        )}
        <label className="mb-1 block text-xs text-stone-600">Codice</label>
        <input
          name="codice"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="text"
          maxLength={14}
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-center font-mono text-lg tracking-widest text-stone-900"
          placeholder="123456"
        />
        <label className="mb-6 flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="ricorda" value="si" className="h-4 w-4" />
          Ricorda questo dispositivo per {GIORNI_DISPOSITIVO} giorni
        </label>
        <button type="submit" className="w-full rounded-md bg-teal-700 py-2.5 text-sm font-bold text-white">
          Verifica
        </button>
        <p className="mt-4 text-xs text-stone-600">
          Telefono non a portata di mano? Scrivi uno dei codici di riserva che hai salvato quando hai attivato la verifica. Se li hai persi, chiedi a chi gestisce gli
          utenti di azzerare la verifica. Non spuntare &quot;Ricorda&quot; su un computer usato da altri.
        </p>
      </form>
    </div>
  );
}
