"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { datiPlanningSale } from "../actions";

type Dati = Awaited<ReturnType<typeof datiPlanningSale>>;

const GIORNI_SETTIMANA = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const sposta = (iso: string, giorni: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + giorni);
  return d.toISOString().slice(0, 10);
};
const COLORE: Record<string, string> = {
  libera: "bg-white hover:bg-teal-50",
  opzione: "bg-amber-200 text-amber-950 hover:bg-amber-300",
  confermata: "bg-teal-600 text-white hover:bg-teal-700",
};

/** Righe = sale, colonne = giorni; ogni giorno è diviso nelle fasce "nel planning" (es. M/P/S). */
export function PlanningSale({ dati, dal, giorni }: { dati: Dati; dal: string; giorni: number }) {
  const router = useRouter();
  const oggi = new Date().toISOString().slice(0, 10);
  const vai = (nuovo: string) => router.push(`/sale/planning?dal=${nuovo}`);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">Planning sale</h1>
        <button type="button" className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-sm" onClick={() => vai(sposta(dal, -7))}>
          ← 7 giorni
        </button>
        <button type="button" className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-sm" onClick={() => vai(oggi)}>
          Oggi
        </button>
        <input type="date" className="rounded-md border border-stone-300 px-2 py-1 text-sm" value={dal} onChange={(e) => e.target.value && vai(e.target.value)} />
        <button type="button" className="rounded-md border border-stone-300 bg-white px-2.5 py-1 text-sm" onClick={() => vai(sposta(dal, 7))}>
          7 giorni →
        </button>
        {dati.puoGestire && (
          <Link href="/sale/prenotazioni/nuova" className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-bold text-white">
            + Nuova
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-stone-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm border border-stone-300 bg-white" /> Libera
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" /> Opzione
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-teal-600" /> Confermata
        </span>
        <span>Fasce: {dati.fasce.map((f) => `${f.nome[0]} = ${f.nome} ${f.inizio}–${f.fine}`).join(", ")}</span>
      </div>

      {dati.sale.length === 0 ? (
        <p className="text-sm text-stone-500">Nessuna sala attiva: creale in Impostazioni &gt; Sale e fasce orarie.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-32 border-b border-r border-stone-200 bg-stone-50 px-2 py-1 text-left">Sala</th>
                {dati.giorni.map((g) => {
                  const data = new Date(`${g}T00:00:00Z`);
                  const festivo = data.getUTCDay() === 0 || data.getUTCDay() === 6;
                  return (
                    <th
                      key={g}
                      colSpan={dati.fasce.length}
                      className={`border-b border-r border-stone-200 px-1 py-1 text-center font-semibold ${g === oggi ? "bg-teal-50 text-teal-900" : festivo ? "bg-stone-100" : "bg-stone-50"}`}
                    >
                      {GIORNI_SETTIMANA[data.getUTCDay()]} {g.slice(8, 10)}/{g.slice(5, 7)}
                    </th>
                  );
                })}
              </tr>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-stone-50" />
                {dati.giorni.map((g) =>
                  dati.fasce.map((f, i) => (
                    <th
                      key={`${g}-${f.id}`}
                      title={`${f.nome} ${f.inizio}–${f.fine}`}
                      className={`border-b border-stone-200 bg-stone-50 px-0.5 font-normal text-stone-500 ${i === dati.fasce.length - 1 ? "border-r" : ""}`}
                    >
                      {f.nome[0]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {dati.sale.map((s) => (
                <tr key={s.id}>
                  <th className="sticky left-0 z-10 border-b border-r border-stone-200 bg-white px-2 py-1 text-left font-semibold">{s.nome}</th>
                  {dati.giorni.map((g) =>
                    s.celle[g].map((c, i) => {
                      const ultima = i === s.celle[g].length - 1;
                      const classi = `h-8 w-7 min-w-7 border-b border-stone-200 p-0 ${ultima ? "border-r" : ""}`;
                      const fascia = dati.fasce[i];
                      if (c.stato === "libera") {
                        return (
                          <td key={`${g}-${c.fasciaId}`} className={classi}>
                            {dati.puoGestire ? (
                              <Link
                                href={`/sale/prenotazioni/nuova?sala=${s.id}&giorno=${g}&fascia=${c.fasciaId}`}
                                title={`${s.nome} · ${fascia.nome} ${g.split("-").reverse().join("/")}: libera, clicca per prenotare`}
                                className={`block h-full w-full ${COLORE.libera}`}
                              />
                            ) : (
                              <span className="block h-full w-full" />
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={`${g}-${c.fasciaId}`} className={classi}>
                          <Link
                            href={`/sale/prenotazioni/${c.prenotazioneSalaId}`}
                            title={`${s.nome} · ${fascia.nome}: ${c.titolo} (${c.stato})`}
                            className={`flex h-full w-full items-center justify-center overflow-hidden text-[10px] font-bold ${COLORE[c.stato] ?? COLORE.opzione}`}
                          >
                            {c.titolo?.[0]}
                          </Link>
                        </td>
                      );
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-stone-500">
        Dal {dal.split("-").reverse().join("/")} per {giorni} giorni. Clicca una fascia libera per prenotarla, una occupata per aprire l&apos;evento.
      </p>
    </div>
  );
}
