/**
 * Collaudo della portineria, messaggi e posta: validazioni, ospiti a cui lasciare un messaggio,
 * persona che deve far parte della prenotazione, posta senza prenotazione, ordine (urgenti prima),
 * consegna a mano / per email (trasporto finto: nessuna email parte) / rispedito, una sola consegna,
 * eliminazione solo se non consegnato, isolamento fra hotel. Primo hotel; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-messaggi.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { cifra } from "../src/lib/cifratura";
import type { Trasporto } from "../src/lib/email";
import { testoEmailMessaggio, validaMessaggio, type MessaggioInput } from "../src/lib/messaggiRegole";
import { consegnaMessaggio, elencoMessaggi, eliminaMessaggio, messaggiDaConsegnare, ospitiPerMessaggi, registraMessaggio } from "../src/lib/messaggi";
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

const COGNOME = "CollaudoMessaggi";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));
const base = (x: Partial<MessaggioInput> = {}): MessaggioInput => ({
  prenotazioneId: null,
  ospiteId: null,
  destinatario: "",
  tipo: "messaggio",
  daChi: "Luca (figlio)",
  modo: "telefono",
  recapito: "333 000000",
  testo: "Richiamare con urgenza",
  urgente: false,
  doveRiposto: "",
  ...x,
});

async function main() {
  // Regole pure.
  verifica("Senza destinatario: rifiutato", !!(await errore(async () => validaMessaggio(base()))));
  verifica("Messaggio senza testo: rifiutato", !!(await errore(async () => validaMessaggio(base({ destinatario: "X", testo: " " })))));
  verifica("Messaggio senza chi ha cercato: rifiutato", !!(await errore(async () => validaMessaggio(base({ destinatario: "X", daChi: "" })))));
  verifica("Pacco senza testo: va bene", (await errore(async () => validaMessaggio(base({ destinatario: "X", tipo: "pacco", testo: "", daChi: "" })))) === null);
  const ad = new Date("2026-08-08T09:45:00Z");
  const it = testoEmailMessaggio("it", { destinatario: "Anna", daChi: null, modo: "posta", recapito: null, testo: null, ricevutoIl: ad, tipo: "lettera" }, "Hotel Prova");
  verifica("Email in italiano per una lettera: concordanze giuste", it.corpo.includes("è arrivata una lettera") && it.corpo.includes("ritirarla") && it.oggetto === "Hotel Prova - c'è una lettera per lei", it);
  const en = testoEmailMessaggio("en", { destinatario: "John", daChi: "Mary", modo: "telefono", recapito: "+44 1", testo: "Call me", ricevutoIl: ad, tipo: "messaggio" }, "Hotel Prova");
  verifica("Email in inglese per un messaggio", en.corpo.includes("Mary looked for you") && en.corpo.includes("To call back: +44 1") && en.corpo.includes("Call me"));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const configPrima = await prisma.configurazioneEmail.findUnique({ where: { hotelId: hotel.id } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const ids: number[] = [];
  const inviati: { to: string; subject: string; text: string }[] = [];
  const finto: Trasporto = { invia: async (m) => void inviati.push(m) };
  // In produzione ci sono poche camere per tipo: si prova ogni tipo.
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
          richieste: [{ tipoCameraId: t.id, quantita: 1, composizione: { adulti: 2, etaBambini: [] } }],
        });
        ids.push(p.id);
        return p;
      } catch (e) {
        ultimo = e;
      }
    }
    throw ultimo;
  };

  try {
    await prisma.configurazioneEmail.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.configurazioneEmail.create({
      data: { hotelId: hotel.id, host: "smtp.esempio.invalid", porta: 587, sicurezza: "starttls", utente: "prova", passwordCifrata: cifra("prova"), mittenteNome: "Hotel di prova", mittenteEmail: "hotel@esempio.invalid", aggiornataDa: "collaudo" },
    });
    const p = await prenota("Anna", "anna.messaggi@esempio.invalid", giorno(0), giorno(2));
    const lontana = await prenota("Zeno", undefined, "2033-09-01", "2033-09-03");
    const bruno = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Bruno", cognome: COGNOME } });
    await prisma.presenza.create({ data: { segmentoId: p.segmenti[0].id, ospiteId: bruno.id } });

    const ospiti = (await ospitiPerMessaggi(hotel.id)).filter((o) => ids.includes(o.prenotazioneId));
    verifica("Ospiti per i messaggi: Anna e Bruno (in arrivo oggi), non la prenotazione del 2033", ospiti.length === 2 && ospiti.every((o) => o.prenotazioneId === p.id && o.situazione === "in arrivo"), ospiti);
    const prenotante = p.ospitePrenotanteId ?? ospiti.find((o) => o.nome.endsWith("Anna"))!.ospiteId;

    const eAltra = await errore(() => registraMessaggio(hotel.id, base({ prenotazioneId: lontana.id, ospiteId: bruno.id }), "Marco"));
    verifica("Persona che non è nella prenotazione: rifiutato", !!eAltra?.includes("non fa parte"), eAltra ?? "");
    await registraMessaggio(hotel.id, base({ prenotazioneId: p.id, ospiteId: bruno.id }), "Marco");
    await registraMessaggio(hotel.id, base({ prenotazioneId: p.id, ospiteId: prenotante, urgente: true, testo: "Chiamare lo studio" }), "Marco");
    await registraMessaggio(hotel.id, base({ destinatario: `Signor ${COGNOME}`, tipo: "pacco", daChi: "Amazon", modo: "corriere", testo: "", doveRiposto: "back office" }), "Marco");

    const el = await elencoMessaggi(hotel.id);
    const miei = el.daConsegnare.filter((m) => m.destinatario.includes(COGNOME));
    verifica("Da consegnare: 3, l'urgente per primo", miei.length === 3 && miei[0].urgente && miei[0].destinatario === `Anna ${COGNOME}`, miei.map((m) => m.destinatario));
    verifica("Destinatario dal nome dell'ospite e camere/situazione della prenotazione", miei.some((m) => m.destinatario === `Bruno ${COGNOME}` && m.situazione === "in arrivo" && !!m.camere));
    const pacco = miei.find((m) => m.tipo === "pacco")!;
    verifica("Pacco senza prenotazione: resta col nome scritto", pacco.prenotazioneId === null && pacco.doveRiposto === "back office");
    const dellaPren = await messaggiDaConsegnare(hotel.id, p.id);
    verifica("Nella prenotazione: i 2 messaggi (non il pacco senza prenotazione)", dellaPren.length === 2);

    // Consegne.
    const mb = miei.find((m) => m.destinatario === `Bruno ${COGNOME}`)!;
    const ma = miei.find((m) => m.destinatario === `Anna ${COGNOME}`)!;
    verifica("Bruno senza email: invio per email rifiutato", !!(await errore(() => consegnaMessaggio(hotel.id, mb.id, "email", "", "Marco", finto))) && !mb.puoEmail);
    await consegnaMessaggio(hotel.id, ma.id, "email", "", "Marco", finto);
    verifica("Anna: inoltrato per email (italiano, con recapito)", inviati.length === 1 && inviati[0].to === "anna.messaggi@esempio.invalid" && inviati[0].text.includes("Chiamare lo studio") && inviati[0].text.includes("Da richiamare: 333 000000"));
    const em = await prisma.emailInviata.findFirst({ where: { prenotazioneId: p.id, destinatario: "anna.messaggi@esempio.invalid" } });
    verifica("Email nello storico della prenotazione e dell'ospite", em?.ospiteId === prenotante);
    verifica("Già consegnato: seconda consegna rifiutata", !!(await errore(() => consegnaMessaggio(hotel.id, ma.id, "mano", "", "Marco", finto))));
    const rotto: Trasporto = {
      invia: async () => {
        throw new Error("535 autenticazione non riuscita");
      },
    };
    await prisma.ospite.update({ where: { id: bruno.id }, data: { email: "bruno.messaggi@esempio.invalid" } });
    verifica("Invio per email non riuscito: il messaggio resta da consegnare", !!(await errore(() => consegnaMessaggio(hotel.id, mb.id, "email", "", "Marco", rotto))) && (await messaggiDaConsegnare(hotel.id, p.id)).some((m) => m.id === mb.id));
    await consegnaMessaggio(hotel.id, mb.id, "mano", "in reception", "Marco");
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Messaggio di un altro hotel: non si tocca", !!(await errore(() => consegnaMessaggio(altroHotel.id, pacco.id, "mano", "", "X"))));
    verifica("Eliminare un consegnato: rifiutato", !!(await errore(() => eliminaMessaggio(hotel.id, mb.id))));
    await eliminaMessaggio(hotel.id, pacco.id);
    const dopo = await elencoMessaggi(hotel.id);
    verifica("Dopo: niente più da consegnare, 2 fra i consegnati con modo e nota", !dopo.daConsegnare.some((m) => m.destinatario.includes(COGNOME)) && dopo.consegnati.filter((m) => m.destinatario.includes(COGNOME)).length === 2 && dopo.consegnati.some((m) => m.consegnaModo === "mano" && m.consegnaNota === "in reception"));

    await prisma.prenotazione.update({ where: { id: lontana.id }, data: { stato: "ANNULLATA" } });
    verifica("Prenotazione annullata: niente messaggi", !!(await errore(() => registraMessaggio(hotel.id, base({ prenotazioneId: lontana.id }), "Marco"))));
  } finally {
    await prisma.messaggioOspite.deleteMany({ where: { hotelId: hotel.id, destinatario: { contains: COGNOME } } });
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
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (nessuna email inviata davvero, dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
