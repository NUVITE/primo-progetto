/**
 * Collaudo del questionario di gradimento e del ringraziamento: validazione delle risposte e medie,
 * link (uno per prenotazione), pagina pubblica, compilazione una volta sola, scadenza, recensione
 * proposta solo ai voti alti, ringraziamento a mano e automatico (solo con tutti partiti, una volta,
 * trasporto finto: nessuna email parte), partenze da ringraziare, risultati e voti bassi da leggere.
 * Primo hotel; configurazione della posta e impostazioni tornano com'erano, i dati di prova si cancellano.
 *   npx tsx scripts/collaudo-questionari.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { cifra } from "../src/lib/cifratura";
import type { Trasporto } from "../src/lib/email";
import { riepilogoQuestionari, validaRisposta, type RispostaQuestionario } from "../src/lib/questionariRegole";
import {
  compilaQuestionario,
  daRingraziare,
  linkQuestionario,
  paginaQuestionario,
  ringraziamentoAutomatico,
  ringraziaPartenza,
  risultatiQuestionari,
  segnaLetto,
  votiBassiDaLeggere,
} from "../src/lib/questionari";
import { creaPrenotazioneGenerica } from "../src/lib/prenotazioni";

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

const COGNOME = "CollaudoQuestionario";
const BASE = "https://hotel.test";
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));
const codiceDi = (link: string) => link.split("/qs/")[1];

async function main() {
  // Regole pure.
  const r = (x: Partial<RispostaQuestionario>): RispostaQuestionario => ({ generale: 4, voti: {}, consiglia: null, commento: "", ...x });
  verifica("Voto complessivo mancante: rifiutato", !!(await errore(async () => validaRisposta(r({ generale: 0 })))));
  verifica("Voto fuori scala: rifiutato", !!(await errore(async () => validaRisposta(r({ voti: { camera: 6 } })))));
  const pulita = validaRisposta(r({ voti: { camera: 5, inventata: 3 } as never, commento: "  bello  " }));
  verifica("Voci sconosciute scartate, commento ripulito", JSON.stringify(pulita.voti) === '{"camera":5}' && pulita.commento === "bello");
  verifica("Commento troppo lungo: rifiutato", !!(await errore(async () => validaRisposta(r({ commento: "x".repeat(2001) })))));
  const rie = riepilogoQuestionari([
    { generale: 5, voti: { camera: 4 }, consiglia: true },
    { generale: 2, voti: { camera: 3, pulizia: 2 }, consiglia: false },
    { generale: 4, voti: {}, consiglia: null },
  ]);
  verifica(
    "Medie: complessivo 3,7, camera 3,5 su 2 risposte, consigliano 50%",
    rie.mediaGenerale === 3.7 && rie.perVoce.find((v) => v.voce === "camera")?.media === 3.5 && rie.perVoce.find((v) => v.voce === "camera")?.risposte === 2 && rie.consigliaPercentuale === 50,
    rie,
  );

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const impPrima = { ringraziamentoAuto: hotel.ringraziamentoAuto, linkRecensioni: hotel.linkRecensioni };
  const configPrima = await prisma.configurazioneEmail.findUnique({ where: { hotelId: hotel.id } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const ids: number[] = [];
  const inviati: { to: string; subject: string; text: string }[] = [];
  const finto: Trasporto = { invia: async (m) => void inviati.push(m) };
  // Prenotazioni appena finite: si prova ogni tipo di camera (in produzione ce ne sono poche per tipo).
  const prenota = async (nome: string, email: string | undefined, dal: string, al: string) => {
    let ultimo: unknown;
    for (const t of tipi) {
      try {
        const p = await creaPrenotazioneGenerica(hotel.id, {
          ospitePrenotante: { nome, cognome: COGNOME, email },
          listinoId: listino.id,
          trattamento,
          dataInizio: dal,
          dataFine: al,
          richieste: [{ tipoCameraId: t.id, quantita: 1, composizione: { adulti: 1, etaBambini: [] } }],
        });
        ids.push(p.id);
        return p;
      } catch (e) {
        ultimo = e;
      }
    }
    throw ultimo;
  };
  const partiti = (id: number) => prisma.presenza.updateMany({ where: { segmento: { prenotazioneId: id } }, data: { stato: "partito", partenzaIl: new Date() } });

  try {
    await prisma.configurazioneEmail.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.configurazioneEmail.create({
      data: { hotelId: hotel.id, host: "smtp.esempio.invalid", porta: 587, sicurezza: "starttls", utente: "prova", passwordCifrata: cifra("prova"), mittenteNome: "Hotel di prova", mittenteEmail: "hotel@esempio.invalid", aggiornataDa: "collaudo" },
    });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { ringraziamentoAuto: false, linkRecensioni: null } });

    const a = await prenota("Anna", "anna.questionario@esempio.invalid", giorno(-3), giorno(-1));
    const b = await prenota("Bruno", undefined, giorno(-4), giorno(-2));

    // Link: uno per prenotazione.
    const l1 = await linkQuestionario(hotel.id, a.id, "it", BASE);
    const l2 = await linkQuestionario(hotel.id, a.id, "en", BASE);
    verifica("Link al questionario: uno solo per prenotazione", l1 === l2 && l1.startsWith(`${BASE}/qs/`));
    verifica("Codice inventato: nessuna pagina", (await paginaQuestionario("codice-inventato-di-prova-12345")) === null);

    // Ringraziamento automatico: solo se attivo e con tutti partiti.
    verifica("Partenze da ringraziare: compaiono le due prenotazioni (check-out non registrato)", (await daRingraziare(hotel.id)).filter((x) => ids.includes(x.id)).every((x) => !x.partiti) && (await daRingraziare(hotel.id)).filter((x) => ids.includes(x.id)).length === 2);
    verifica("Automatico spento: niente", (await ringraziamentoAutomatico(hotel.id, a.id, BASE, "Anna", finto)) === null && inviati.length === 0);
    await prisma.hotel.update({ where: { id: hotel.id }, data: { ringraziamentoAuto: true } });
    verifica("Automatico acceso ma ospiti non partiti: niente", (await ringraziamentoAutomatico(hotel.id, a.id, BASE, "Anna", finto)) === null && inviati.length === 0);
    await partiti(a.id);
    const msg = await ringraziamentoAutomatico(hotel.id, a.id, BASE, "Anna", finto);
    verifica("Tutti partiti: ringraziamento inviato a chi ha prenotato", !!msg?.includes("anna.questionario@esempio.invalid") && inviati.length === 1 && inviati[0].to === "anna.questionario@esempio.invalid", msg);
    verifica("Nel testo c'è il link del questionario della prenotazione", inviati[0].text.includes(l1) && !inviati[0].text.includes("{{"));
    const storico = await prisma.emailInviata.findFirst({ where: { prenotazioneId: a.id, modello: "ringraziamento" } });
    verifica("Registrato nello storico come ringraziamento automatico", storico?.inviataDa === "Anna (automatico)");
    verifica("Una volta sola: il secondo check-out non rimanda", (await ringraziamentoAutomatico(hotel.id, a.id, BASE, "Anna", finto)) === null && inviati.length === 1);
    verifica("Ringraziamento a mano già fatto: rifiutato", !!(await errore(() => ringraziaPartenza(hotel.id, a.id, BASE, "Anna", finto))));
    verifica("Partenze da ringraziare: la prenotazione ringraziata non c'è più", !(await daRingraziare(hotel.id)).some((x) => x.id === a.id));
    await partiti(b.id);
    const mb = await ringraziamentoAutomatico(hotel.id, b.id, BASE, "Anna", finto);
    verifica("Ospite senza email: messaggio per l'operatore, nessun invio", !!mb?.startsWith("Ringraziamento automatico non inviato") && inviati.length === 1, mb);

    // Pagina pubblica e compilazione.
    const ca = codiceDi(l1);
    let pa = await paginaQuestionario(ca);
    verifica("Pagina: aperta, nome e date del soggiorno", pa?.stato === "aperto" && pa.nome === "Anna" && pa.al === giorno(-1), pa);
    verifica("Risposta non valida: rifiutata", !!(await errore(() => compilaQuestionario(ca, r({ generale: 9 })))));
    const bassiPrima = await votiBassiDaLeggere(hotel.id);
    await compilaQuestionario(ca, r({ generale: 2, voti: { pulizia: 1 }, consiglia: false, commento: "Bagno poco pulito" }));
    pa = await paginaQuestionario(ca);
    verifica("Compilato: grazie, nessuna recensione proposta per un voto basso", pa?.stato === "compilato" && pa.linkRecensioni === null);
    verifica("Una volta sola: secondo invio rifiutato", !!(await errore(() => compilaQuestionario(ca, r({ generale: 5 })))));
    verifica("Voto basso da leggere: avviso +1", (await votiBassiDaLeggere(hotel.id)) === bassiPrima + 1);

    // Voto alto con pagina delle recensioni.
    await prisma.hotel.update({ where: { id: hotel.id }, data: { linkRecensioni: "https://recensioni.esempio.invalid/hotel" } });
    const cb = codiceDi(await linkQuestionario(hotel.id, b.id, "en", BASE));
    await compilaQuestionario(cb, r({ generale: 5, voti: { personale: 5 }, consiglia: true }));
    const pb = await paginaQuestionario(cb);
    verifica("Voto alto: si propone la recensione, pagina in inglese", pb?.linkRecensioni === "https://recensioni.esempio.invalid/hotel" && pb.lingua === "en");

    // Scadenza.
    const c = await prenota("Carla", "carla.questionario@esempio.invalid", giorno(-6), giorno(-5));
    const cc = codiceDi(await linkQuestionario(hotel.id, c.id, "it", BASE));
    await prisma.questionario.update({ where: { codice: cc }, data: { creatoIl: new Date(Date.now() - 100 * 86400000) } });
    verifica("Dopo 90 giorni: scaduto e non compilabile", (await paginaQuestionario(cc))?.stato === "scaduto" && !!(await errore(() => compilaQuestionario(cc, r({})))));

    // Risultati e lettura.
    const ris = await risultatiQuestionari(hotel.id, oggi(), oggi());
    const mie = ris.righe.filter((x) => ids.includes(x.prenotazioneId));
    verifica("Risultati: i due questionari di oggi, quello di Anna è basso", mie.length === 2 && mie.find((x) => x.prenotazioneId === a.id)?.basso === true && mie.find((x) => x.prenotazioneId === b.id)?.basso === false);
    verifica("Periodo non valido: rifiutato", !!(await errore(() => risultatiQuestionari(hotel.id, "2026-12-01", "2026-01-01"))));
    const qa = mie.find((x) => x.prenotazioneId === a.id)!;
    await segnaLetto(hotel.id, qa.id, "Direttore");
    verifica("Segnato come letto: l'avviso torna com'era", (await votiBassiDaLeggere(hotel.id)) === bassiPrima);
    verifica("Già letto: rifiutato", !!(await errore(() => segnaLetto(hotel.id, qa.id, "Direttore"))));
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Questionario di un altro hotel: non si tocca", !!(await errore(() => segnaLetto(altroHotel.id, mie[1].id, "X"))));
  } finally {
    await prisma.emailInviata.deleteMany({ where: { prenotazioneId: { in: ids } } });
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
    await prisma.configurazioneEmail.deleteMany({ where: { hotelId: hotel.id } });
    if (configPrima) await prisma.configurazioneEmail.create({ data: configPrima });
    await prisma.hotel.update({ where: { id: hotel.id }, data: impPrima });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
