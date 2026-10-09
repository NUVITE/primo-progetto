/**
 * Collaudo delle email: segnaposto, lingua proposta, configurazione con password cifrata, modelli
 * personalizzati e ripristino, anteprima dalla prenotazione (importi nascosti senza permesso), invio
 * con un trasporto finto (nessuna email parte davvero), errori del server nello storico.
 * Primo hotel; configurazione, modelli, email e prenotazioni di prova tornano com'erano.
 *   npx tsx scripts/collaudo-email.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { compila, linguaPerOspite } from "../src/lib/emailRegole";
import {
  anteprimaEmail,
  configurazioneEmail,
  inviaEmailPrenotazione,
  modelloEmail,
  provaConfigurazione,
  ripristinaModelloEmail,
  salvaConfigurazioneEmail,
  salvaModelloEmail,
  storicoEmail,
  type Trasporto,
} from "../src/lib/email";
import { CODICE_ITALIA } from "../src/lib/codiciPolizia";
import { creaPrenotazione } from "../src/lib/prenotazioni";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const NOME = "CollaudoEmail";
const config = { host: "smtp.esempio.invalid", porta: 465, sicurezza: "ssl", utente: "info@esempio.invalid", password: "segreta-di-prova", mittenteNome: "Hotel di prova", mittenteEmail: "info@esempio.invalid", rispondiA: "" };

async function main() {
  // Regole pure.
  const c = compila("Ciao {{nome}}, totale {{totale}} {{inesistente}}", { nome: "Mario", totale: "" });
  verifica("Segnaposto: sostituiti quelli con un valore, segnalati gli altri", c.testo === "Ciao Mario, totale {{totale}} {{inesistente}}" && c.mancanti.join() === "totale,inesistente", c);
  verifica("Lingua: italiano per gli italiani e senza cittadinanza", linguaPerOspite(null, CODICE_ITALIA, CODICE_ITALIA) === "it" && linguaPerOspite(null, null, CODICE_ITALIA) === "it");
  verifica("Lingua: inglese per gli stranieri, salvo lingua indicata", linguaPerOspite(null, "100000216", CODICE_ITALIA) === "en" && linguaPerOspite("it", "100000216", CODICE_ITALIA) === "it");

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const configPrima = await prisma.configurazioneEmail.findUnique({ where: { hotelId: hotel.id } });
  const modelliPrima = await prisma.modelloEmail.findMany({ where: { hotelId: hotel.id, chiave: "conferma", lingua: "it" } });
  const ibanPrima = hotel.iban;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const ids: number[] = [];
  const inviati: { from: string; to: string; subject: string; text: string }[] = [];
  const finto: Trasporto = { invia: async (m) => void inviati.push(m) };
  const rotto: Trasporto = {
    invia: async () => {
      throw new Error("535 autenticazione non riuscita");
    },
  };

  try {
    if (configPrima) await prisma.configurazioneEmail.delete({ where: { hotelId: hotel.id } });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { iban: "IT60X0542811101000000123456" } });
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Mario", cognome: NOME, email: "mario@esempio.invalid" },
      segmenti: [{ tipoCameraId: tipo.id, ospite: { nome: "Mario", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: "2032-07-10", dataFine: "2032-07-13", composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(p.id);
    await prisma.prenotazione.update({ where: { id: p.id }, data: { accontoRichiesto: 100, accontoEntro: new Date("2032-06-30") } });

    const e0 = await errore(() => inviaEmailPrenotazione(hotel.id, p.id, { destinatario: "mario@esempio.invalid", oggetto: "x", corpo: "y", lingua: "it", modello: null }, "Anna", finto));
    verifica("Senza posta configurata: niente invio", !!e0 && e0.includes("non è configurata"), e0 ?? "");

    const e1 = await errore(() => salvaConfigurazioneEmail(hotel.id, { ...config, password: "" }, "Anna"));
    verifica("Prima configurazione senza password: rifiutata", !!e1, e1 ?? "");
    const e2 = await errore(() => salvaConfigurazioneEmail(hotel.id, { ...config, mittenteEmail: "non-valida" }, "Anna"));
    verifica("Mittente non valido: rifiutato", !!e2, e2 ?? "");
    await salvaConfigurazioneEmail(hotel.id, config, "Anna");
    const riga = await prisma.configurazioneEmail.findUniqueOrThrow({ where: { hotelId: hotel.id } });
    verifica("Password salvata cifrata, non in chiaro", riga.passwordCifrata.startsWith("v1:") && !riga.passwordCifrata.includes("segreta"));
    await salvaConfigurazioneEmail(hotel.id, { ...config, password: "", mittenteNome: "Hotel di prova 2" }, "Anna");
    const riga2 = await prisma.configurazioneEmail.findUniqueOrThrow({ where: { hotelId: hotel.id } });
    verifica("Modifica senza password: resta quella salvata", riga2.passwordCifrata === riga.passwordCifrata && riga2.mittenteNome === "Hotel di prova 2");
    const vista = await configurazioneEmail(hotel.id);
    verifica("La configurazione letta non contiene la password", !JSON.stringify(vista).includes("segreta") && !JSON.stringify(vista).includes("v1:"));

    const esitoProva = await provaConfigurazione(hotel.id, "anna@esempio.invalid", "Anna", finto);
    verifica("Email di prova: riuscita e registrata", esitoProva === "riuscita" && inviati.at(-1)?.to === "anna@esempio.invalid");

    // Modelli.
    await salvaModelloEmail(hotel.id, "conferma", "it", { oggetto: "Confermato! n. {{numero_prenotazione}}", corpo: "Caro {{nome}}, a presto." }, "Anna");
    let m = await modelloEmail(hotel.id, "conferma", "it");
    verifica("Modello personalizzato", m.personalizzato && m.oggetto.startsWith("Confermato!"));
    await ripristinaModelloEmail(hotel.id, "conferma", "it");
    m = await modelloEmail(hotel.id, "conferma", "it");
    verifica("Ripristino al testo di partenza", !m.personalizzato && m.oggetto.startsWith("Conferma della prenotazione"));

    // Anteprima dalla prenotazione.
    const a = await anteprimaEmail(hotel.id, p.id, "acconto", null);
    verifica("Acconto: IBAN, importo e causale compilati, nessun segnaposto mancante", a.lingua === "it" && a.corpo.includes("IT60X0542811101000000123456") && a.corpo.includes("100,00") && a.mancanti.length === 0, a.mancanti);
    verifica("Destinatario proposto: l'email di chi ha prenotato", a.destinatari[0]?.email === "mario@esempio.invalid");
    const nascosti = await anteprimaEmail(hotel.id, p.id, "acconto", "it", false);
    verifica("Senza «Vedere importi»: l'acconto resta da completare", nascosti.mancanti.includes("acconto") && !nascosti.corpo.includes("100,00"));
    await prisma.ospite.update({ where: { id: p.ospitePrenotanteId }, data: { cittadinanzaCodice: "100000216" } });
    const en = await anteprimaEmail(hotel.id, p.id, "conferma", null);
    verifica("Ospite straniero: proposta in inglese", en.lingua === "en" && en.corpo.startsWith("Dear Mario"));

    // Invio.
    const e3 = await errore(() => inviaEmailPrenotazione(hotel.id, p.id, { destinatario: "mario@esempio.invalid", oggetto: a.oggetto, corpo: "Manca {{acconto}}", lingua: "it", modello: "acconto" }, "Anna", finto));
    verifica("Con segnaposto ancora da completare: non parte", !!e3, e3 ?? "");
    const e4 = await errore(() => inviaEmailPrenotazione(hotel.id, p.id, { destinatario: "non-valido", oggetto: a.oggetto, corpo: a.corpo, lingua: "it", modello: "acconto" }, "Anna", finto));
    verifica("Destinatario non valido: rifiutato", !!e4, e4 ?? "");
    const esito = await inviaEmailPrenotazione(hotel.id, p.id, { destinatario: "mario@esempio.invalid", oggetto: a.oggetto, corpo: a.corpo, lingua: "it", modello: "acconto" }, "Anna", finto);
    const ultimo = inviati.at(-1)!;
    verifica("Inviata: mittente dell'hotel, destinatario e oggetto giusti", esito === "inviata" && ultimo.from.includes("info@esempio.invalid") && ultimo.to === "mario@esempio.invalid" && ultimo.subject === a.oggetto);
    const e5 = await errore(() => inviaEmailPrenotazione(hotel.id, p.id, { destinatario: "mario@esempio.invalid", oggetto: "Prova", corpo: "Testo", lingua: "it", modello: "libera" }, "Anna", rotto));
    verifica("Errore del server di posta: segnalato", !!e5 && e5.includes("535"), e5 ?? "");
    const storico = await storicoEmail(hotel.id, p.id);
    verifica("Storico: inviata ed errore registrati, con chi l'ha mandata", storico.length === 2 && storico.some((s) => s.esito === "inviata" && s.inviataDa === "Anna") && storico.some((s) => s.esito === "errore"));
    verifica("Lo storico è collegato all'ospite", (await prisma.emailInviata.count({ where: { prenotazioneId: p.id, ospiteId: p.ospitePrenotanteId } })) === 2);
  } finally {
    await prisma.emailInviata.deleteMany({ where: { prenotazioneId: { in: ids } } });
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.configurazioneEmail.deleteMany({ where: { hotelId: hotel.id } });
    if (configPrima) await prisma.configurazioneEmail.create({ data: configPrima });
    await prisma.modelloEmail.deleteMany({ where: { hotelId: hotel.id, chiave: "conferma", lingua: "it" } });
    for (const mp of modelliPrima) await prisma.modelloEmail.create({ data: mp });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { iban: ibanPrima } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (nessuna email inviata davvero, dati ripristinati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
