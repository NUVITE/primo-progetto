import type { statoBackup } from "@/lib/backup";

type Stato = Awaited<ReturnType<typeof statoBackup>>;

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const COLORI = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  avviso: "border-amber-300 bg-amber-50 text-amber-950",
  errore: "border-red-300 bg-red-50 text-red-900",
  assente: "border-stone-200 bg-stone-50 text-stone-700",
} as const;
const TITOLI = { ok: "Backup a posto", avviso: "Backup: da controllare", errore: "Backup: attenzione", assente: "Backup non installati" } as const;

/** Per il fornitore: ultimo backup notturno, copie conservate e copia sul PC. */
export function StatoBackup({ stato: s }: { stato: Stato }) {
  const v = s.valutazione;
  return (
    <section className={`rounded-xl border p-4 text-sm ${COLORI[v.livello]}`}>
      <h2 className="mb-1 font-bold">{TITOLI[v.livello]}</h2>
      {v.messaggi.map((m) => (
        <p key={m} className="font-semibold">
          {m}
        </p>
      ))}
      {v.livello !== "assente" && (
        <ul className="mt-1 space-y-0.5">
          <li>
            Ultimo backup riuscito: <strong>{s.ultimoRiuscito ? quando(s.ultimoRiuscito) : "nessuno"}</strong>
            {s.stato?.esito === "ok" && (
              <>
                {" "}
                · {Math.round(s.stato.dimensione / 1024)} KB, {s.stato.tabelle} tabelle, verificato
              </>
            )}
          </li>
          <li>
            Copie sul server: {s.copie.giornalieri} giornaliere, {s.copie.settimanali} settimanali, {s.copie.mensili} mensili
          </li>
          <li>Copia sul PC: {s.copiaPc ? <strong>{quando(s.copiaPc.quando)}</strong> : "mai scaricata"}</li>
        </ul>
      )}
      <p className="mt-2 text-xs opacity-80">
        Ogni notte alle 3 il server copia e verifica il database; il PC scarica l&apos;ultima copia quando è acceso. La chiave CHIAVE_CREDENZIALI del server va
        conservata a parte (in un gestore di password): senza, dopo un ripristino le password di posta, Alloggiati e Ross1000 vanno reinserite.
      </p>
    </section>
  );
}
