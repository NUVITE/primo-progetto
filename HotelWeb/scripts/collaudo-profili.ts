/**
 * Collaudo dei profili per tipologia: differenze pure (sale mai toccata, titolare unico solo con al
 * massimo un utente), struttura nuova che nasce già con il profilo della sua tipologia, cambio di
 * tipologia e nuovo profilo senza cancellare nulla (trattamenti disattivati, non eliminati).
 * Crea un hotel di prova e lo cancella alla fine.
 *   npx tsx scripts/collaudo-profili.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { PROFILI, differenzeProfilo } from "../src/lib/profiliRegole";
import { TIPOLOGIE, type Tipologia } from "../src/lib/tipologie";
import { anteprimaProfilo, applicaProfilo } from "../src/lib/profili";
import { aggiornaHotel, creaHotel, type DatiHotel } from "../src/lib/hotel";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
const SUFFISSO = "@collaudo-profili.invalid";

async function main() {
  // Regole pure.
  verifica("Ogni tipologia ha il suo profilo", (Object.keys(TIPOLOGIE) as Tipologia[]).every((t) => !!PROFILI[t]));
  verifica("Nessun profilo accende o spegne il modulo Sale", Object.values(PROFILI).every((p) => !p.moduli.includes("sale")));
  const conSale = differenzeProfilo({ modalitaUtenti: "ruoli", moduli: ["sale", "ristorazione"], utenti: 1, trattamentiAttivi: ["B&B", "Mezza pensione"], funzioniSpente: [] }, PROFILI.bb);
  verifica(
    "B&B da un albergo con sale: spegne ristorazione, lascia sale, passa al titolare, toglie la mezza pensione",
    conSale.moduliDaSpegnere.join() === "ristorazione" && conSale.modalita === "titolare" && conSale.trattamentiDaDisattivare.join() === "Mezza pensione" && !conSale.moduliDaAccendere.length,
    conSale,
  );
  const dueUtenti = differenzeProfilo({ modalitaUtenti: "ruoli", moduli: [], utenti: 2, trattamentiAttivi: ["B&B"], funzioniSpente: [] }, PROFILI.bb);
  verifica("Titolare unico con due utenti: non si cambia e si avvisa", dueUtenti.modalita === null && dueUtenti.titolareImpossibile);
  verifica(
    "Già come il profilo: nessuna modifica",
    differenzeProfilo({ modalitaUtenti: "titolare", moduli: ["sale"], utenti: 1, trattamentiAttivi: ["B&B"], funzioniSpente: ["gruppi", "agenzie", "uso_diurno"] }, PROFILI.bb).nessunaModifica,
  );

  // Struttura nuova di prova.
  const comune = await prisma.comune.findFirstOrThrow({ orderBy: { id: "asc" } });
  const dati: DatiHotel = { nome: "__Collaudo profili", comuneId: comune.id, tipologia: "bb", categoria: "", ragioneSociale: "", partitaIva: "", codiceFiscale: "", indirizzo: "", cap: "", telefono: "", email: "", pec: "", sistemaIstat: "" };
  const hotel = await creaHotel(dati, { nome: "Titolare di prova", email: `titolare${SUFFISSO}`, password: "password-di-prova" });
  try {
    let h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id }, include: { trattamenti: true } });
    const attivi = () => h.trattamenti.filter((t) => t.attivo).map((t) => t.nome).sort();
    verifica("B&B nuovo: titolare unico, nessun modulo, solo il trattamento B&B attivo", h.modalitaUtenti === "titolare" && JSON.stringify(h.moduli) === "[]" && attivi().join() === "B&B", { modalita: h.modalitaUtenti, moduli: h.moduli, trattamenti: attivi() });
    verifica("B&B nuovo: gruppi, agenzie e uso diurno spenti", JSON.stringify(h.funzioniSpente) === JSON.stringify(["gruppi", "agenzie", "uso_diurno"]), h.funzioniSpente);
    verifica("Gli altri trattamenti predefiniti ci sono ma disattivati (niente si cancella)", h.trattamenti.length === 3 && h.trattamenti.filter((t) => !t.attivo).length === 2);
    verifica("Anteprima dopo l'applicazione: nessuna modifica", (await anteprimaProfilo(hotel.id)).differenze.nessunaModifica);

    // Diventa casa vacanze: si aggiunge "Solo pernottamento", si spegne il B&B, si accende Pulizie.
    await prisma.hotel.update({ where: { id: hotel.id }, data: { moduli: ["sale"] } });
    await aggiornaHotel(hotel.id, { ...dati, tipologia: "casa_vacanze" });
    const ant = await anteprimaProfilo(hotel.id);
    verifica("Anteprima casa vacanze: accende pulizie, offre solo pernottamento, toglie il B&B", ant.differenze.moduliDaAccendere.join() === "pulizie" && ant.differenze.trattamentiDaAttivare.join() === "Solo pernottamento" && ant.differenze.trattamentiDaDisattivare.join() === "B&B", ant.differenze);
    await applicaProfilo(hotel.id);
    h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id }, include: { trattamenti: true } });
    verifica("Applicato: sale rimasta, pulizie accesa, solo pernottamento creato e unico attivo", JSON.stringify(h.moduli) === JSON.stringify(["sale", "pulizie"]) && attivi().join() === "Solo pernottamento" && h.trattamenti.length === 4, { moduli: h.moduli, trattamenti: attivi() });

    // Diventa albergo con due utenti: passa ai ruoli; poi un B&B con due utenti resta a ruoli.
    await applicaProfilo(hotel.id, "albergo");
    h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id }, include: { trattamenti: true } });
    verifica("Albergo: ruoli, tutti i moduli operativi più sale, tre trattamenti con i pasti", h.tipologia === "albergo" && h.modalitaUtenti === "ruoli" && (h.moduli as string[]).length === 5 && attivi().join() === "B&B,Mezza pensione,Pensione completa");
    const ruolo = await prisma.ruolo.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Reception" } });
    await prisma.utente.create({ data: { nome: "Secondo", email: `secondo${SUFFISSO}`, passwordHash: "x", accessi: { create: { hotelId: hotel.id, ruoloId: ruolo.id } } } });
    const d = await applicaProfilo(hotel.id, "bb");
    h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id }, include: { trattamenti: true } });
    verifica("B&B con due utenti: tipologia e trattamenti cambiano, la gestione resta a ruoli", h.tipologia === "bb" && h.modalitaUtenti === "ruoli" && d.titolareImpossibile && attivi().join() === "B&B");
  } finally {
    await prisma.trattamento.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.listino.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.fasciaOraria.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.repartoAddebito.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.ruoloAggiuntivo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utenteHotel.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utente.deleteMany({ where: { email: { endsWith: SUFFISSO } } });
    await prisma.ruolo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (hotel di prova cancellato)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
