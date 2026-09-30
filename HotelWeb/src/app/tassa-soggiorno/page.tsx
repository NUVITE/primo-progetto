import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { Suggerimento } from "@/components/Suggerimento";

const it = (d: Date) => d.toISOString().slice(0, 10).split("-").reverse().join("/");

const TIPO: Record<string, string> = {
  eta: "Automatica per età",
  dichiarata: "Esenzione da dichiarare",
  riduzione: "Riduzione",
  tetto_annuo: "Tetto annuo",
};

/**
 * Regole della tassa di soggiorno del comune dell'hotel attivo, in sola lettura: la reception deve
 * sapere cosa chiedere agli ospiti. Le modifica solo il superadmin (Piattaforma > Tassa di soggiorno).
 */
export default async function RegoleTassaPage() {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: utente.hotelId }, include: { comune: true } });
  const oggi = new Date();
  const versione = await prisma.regolamentoTassa.findFirst({
    where: { comuneId: hotel.comuneId, validoDal: { lte: oggi }, OR: [{ validoAl: null }, { validoAl: { gte: oggi } }] },
    include: { tariffe: { orderBy: { categoria: "asc" } }, regole: { orderBy: [{ tipo: "asc" }, { descrizione: "asc" }] } },
  });
  const tariffaHotel = versione?.tariffe.find((t) => t.categoria === hotel.categoria) ?? versione?.tariffe.find((t) => t.predefinita);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Regole tassa di soggiorno</h1>
        <Suggerimento id="regole-tassa" titolo="A cosa serve questa pagina">
          <p>
            Riassume il regolamento della tassa di soggiorno di <strong>{hotel.comune.nome}</strong> in vigore oggi: tariffe, tetto di notti,
            esenzioni e riduzioni. Il calcolo nelle prenotazioni è automatico; se noti qualcosa di diverso dal regolamento del Comune avvisa il
            fornitore del programma.
          </p>
        </Suggerimento>
      </div>

      {!versione ? (
        <p className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm text-sm text-stone-600">
          Nel comune di {hotel.comune.nome} oggi non si applica la tassa di soggiorno.
        </p>
      ) : (
        <>
          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="text-sm">
              <strong>In vigore dal {it(versione.validoDal)}</strong>
              {versione.attoRiferimento && <span className="text-stone-600"> — {versione.attoRiferimento}</span>}
            </div>
            {versione.fonteUrl && (
              <a href={versione.fonteUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-700 underline">
                Fonte ufficiale
              </a>
            )}
            <ul className="mt-2 list-disc pl-5 text-sm text-stone-700">
              <li>{versione.stagionalitaDal ? `Si applica dal ${versione.stagionalitaDal} al ${versione.stagionalitaAl} di ogni anno.` : "Si applica tutto l'anno."}</li>
              <li>{versione.esclusiResidenti ? "I residenti nel comune sono fuori campo." : "Il regolamento non esclude i residenti."}</li>
            </ul>
            {tariffaHotel && (
              <p className="mt-3 rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-900">
                Per questo hotel ({hotel.categoria ?? "categoria non indicata"}): <strong>€ {Number(tariffaHotel.importo).toFixed(2)}</strong> a persona a notte
                {tariffaHotel.tettoNotti ? `, per un massimo di ${tariffaHotel.tettoNotti} notti` : ""}
                {tariffaHotel.modoTetto === "consecutive_anche_altrove" ? " consecutive, contando anche quelle già pagate in altre strutture (ricevuta dell'ospite)" : " consecutive"}.
              </p>
            )}
            {versione.daConfermare && (
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Da confermare con il Comune:</strong> {versione.daConfermare}
              </p>
            )}
            {versione.note && <p className="mt-3 text-xs text-stone-600">{versione.note}</p>}
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-stone-900">Esenzioni, riduzioni e tetti speciali</h2>
            <ul className="flex flex-col gap-2">
              {versione.regole.map((r) => (
                <li key={r.id} className="border-t border-stone-100 pt-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong>{r.descrizione}</strong>
                    <span className="text-xs text-stone-500">
                      {TIPO[r.tipo] ?? r.tipo}
                      {r.percentualeRiduzione ? ` ${r.percentualeRiduzione}%` : ""}
                      {r.nottiTettoAnnuo ? ` (${r.nottiTettoAnnuo} notti)` : ""}
                      {r.articolo ? ` · ${r.articolo}` : ""}
                    </span>
                  </div>
                  {r.documentoRichiesto && <div className="text-xs text-stone-600">Documento: {r.documentoRichiesto}</div>}
                  {r.limite && <div className="text-xs font-semibold text-amber-800">Limite: {r.limite}</div>}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-3 text-sm font-bold text-stone-900">Tutte le tariffe del comune</h2>
            <table className="tabella-responsive w-full text-sm">
              <thead className="text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="pb-1">Categoria</th>
                  <th className="pb-1">€ / persona / notte</th>
                  <th className="pb-1">Tetto notti</th>
                </tr>
              </thead>
              <tbody>
                {versione.tariffe.map((t) => (
                  <tr key={t.id} className={`border-t border-stone-100 ${t.id === tariffaHotel?.id ? "bg-teal-50 font-semibold" : ""}`}>
                    <td className="cella-intera py-1.5">{t.categoria}{t.predefinita ? " (predefinita)" : ""}</td>
                    <td data-label="€ / persona / notte" className="py-1.5 font-mono">{Number(t.importo).toFixed(2)}</td>
                    <td data-label="Tetto notti" className="py-1.5">{t.tettoNotti ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
