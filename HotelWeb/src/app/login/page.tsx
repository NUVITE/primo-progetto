import { effettuaLogin } from "./actions";
import { destinazioneSicura } from "@/lib/accessiRegole";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ errore?: string; da?: string; minuti?: string }>;
}) {
  const { errore, da, minuti } = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50">
      <form action={effettuaLogin} className="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-stone-900">HotelWeb</h1>
        <p className="mb-6 text-sm text-stone-600">Accedi al gestionale</p>

        <input type="hidden" name="destinazione" value={destinazioneSicura(da)} />

        {errore && (
          <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
            {errore === "bloccato"
              ? `Troppi tentativi sbagliati: per sicurezza l'accesso è sospeso. Riprova tra ${Number(minuti) || 15} ${Number(minuti) === 1 ? "minuto" : "minuti"}.`
              : "Email o password non corrette."}
          </p>
        )}

        <label className="mb-1 block text-xs text-stone-600">Email</label>
        <input
          name="email"
          type="email"
          required
          autoFocus
          className="mb-4 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
          placeholder="nome@hotel.it"
        />

        <label className="mb-1 block text-xs text-stone-600">Password</label>
        <input
          name="password"
          type="password"
          required
          className="mb-6 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
        />

        <button type="submit" className="w-full rounded-md bg-teal-700 py-2.5 text-sm font-bold text-white">
          Accedi
        </button>
      </form>
    </div>
  );
}
