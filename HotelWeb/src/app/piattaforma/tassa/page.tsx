import Link from "next/link";
import { richiediSuperAdmin } from "@/lib/auth";
import { elencoRegolamenti } from "@/lib/regolamentiTassa";
import { NuovaVersione } from "./NuovaVersione";

const it = (iso: string) => iso.split("-").reverse().join("/");

export default async function TassaPiattaformaPage() {
  await richiediSuperAdmin();
  const comuni = await elencoRegolamenti();

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Tassa di soggiorno</h1>
        <p className="text-sm text-stone-600">
          Regolamenti per comune, a versioni datate: una versione usata in soggiorni chiusi non si modifica, se ne crea una nuova da una data.
        </p>
      </div>

      {comuni.map((c) => (
        <section key={c.id} className="rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold">
              {c.nome} <span className="text-sm font-normal text-stone-500">({c.provincia})</span>
            </h2>
            <span className="text-xs text-stone-500">{c.hotel.length ? `Hotel: ${c.hotel.join(", ")}` : "Nessun hotel"}</span>
          </div>
          {c.versioni.length === 0 ? (
            <p className="text-sm text-stone-500">Nessun regolamento: in questo comune la tassa non si applica.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {c.versioni.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/piattaforma/tassa/${v.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-100 px-3 py-2 text-sm hover:border-teal-200 hover:bg-teal-50"
                  >
                    <span>
                      <strong>
                        Dal {it(v.validoDal)}
                        {v.validoAl ? ` al ${it(v.validoAl)}` : ""}
                      </strong>
                      {v.attoRiferimento && <span className="text-stone-600"> — {v.attoRiferimento}</span>}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-stone-500">
                      {v.tariffe} tariffe · {v.regole} regole
                      {v.daConfermare && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">da confermare</span>}
                      {v.inVigore && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800">in vigore</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <NuovaVersione comuneId={c.id} versioni={c.versioni.map((v) => ({ id: v.id, etichetta: `dal ${it(v.validoDal)}` }))} />
        </section>
      ))}
    </div>
  );
}
