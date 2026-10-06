/**
 * Collaudo dell'agenda del portiere: sveglie dal banco (limiti di orario, "non risponde", fatta),
 * servizi prenotati (validazioni, passaggi di stato, annullo con motivo), esborso sul conto (fuori
 * campo IVA, uno per servizio, di nuovo dopo uno storno), nota degli esborsi, servizi da confermare
 * in altri giorni, isolamento fra hotel. Primo hotel; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-agenda.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { validaServizio, PASSAGGI, type ServizioInput } from "../src/lib/agendaRegole";
import { addebitaEsborso, agendaDelGiorno, camerePerSveglia, cambiaStatoServizio, creaServizio, creaSveglia, esitoSveglia, notaEsborsi } from "../src/lib/agenda";
import { stornaAddebito } from "../src/lib/conto";
import { assegnaCamera, creaPrenotazioneGenerica } from "../src/lib/prenotazioni";

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

const COGNOME = "CollaudoAgenda";
const roma = (ms: number) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  return { giorno: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour}:${p.minute}` };
};
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));
const base = (x: Partial<ServizioInput> = {}): ServizioInput => ({ prenotazioneId: null, destinatario: "", tipo: "taxi", giorno: giorno(0), ora: "10:00", persone: 2, dettagli: "Stazione centrale", fornitore: "Radio Taxi", riferimento: "", ...x });

async function main() {
  // Regole pure.
  verifica("Servizio senza ospite né nome: rifiutato", !!(await errore(async () => validaServizio(base()))));
  verifica("Ora mancante: rifiutato", !!(await errore(async () => validaServizio(base({ destinatario: "X", ora: "" })))));
  verifica("Persone non valide: rifiutato", !!(await errore(async () => validaServizio(base({ destinatario: "X", persone: 0 })))));
  verifica("'Altro' senza dettagli: rifiutato", !!(await errore(async () => validaServizio(base({ destinatario: "X", tipo: "altro", dettagli: "" })))));
  verifica("Fatto e annullato non si riaprono", PASSAGGI.fatto.length === 0 && PASSAGGI.annullato.length === 0);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } }, include: { camere: { where: { attivo: true } } } });
  const ids: number[] = [];
  // Prenotazione di oggi con una camera libera assegnata (in produzione poche camere per tipo: si provano tutte).
  const prenota = async (nome: string) => {
    for (const t of tipi) {
      let p;
      try {
        p = await creaPrenotazioneGenerica(hotel.id, {
          ospitePrenotante: { nome, cognome: COGNOME },
          listinoId: listino.id,
          trattamento,
          dataInizio: giorno(0),
          dataFine: giorno(2),
          richieste: [{ tipoCameraId: t.id, quantita: 1, composizione: { adulti: 1, etaBambini: [] } }],
        });
      } catch {
        continue;
      }
      ids.push(p.id);
      for (const c of t.camere) {
        if (!(await errore(() => assegnaCamera(hotel.id, p.segmenti[0].id, c.id)))) return { p, camera: c };
      }
    }
    throw new Error("Nessuna camera libera per oggi.");
  };

  try {
    const { p, camera } = await prenota("Paolo");
    verifica("Camere per la sveglia: c'è la camera della prenotazione", (await camerePerSveglia(hotel.id)).some((c) => c.cameraId === camera.id && c.prenotazioneId === p.id));

    // Sveglie.
    const fra2ore = roma(Date.now() + 2 * 3600000);
    verifica("Sveglia nel passato: rifiutata", !!(await errore(() => creaSveglia(hotel.id, camera.id, roma(Date.now() - 3600000).giorno, roma(Date.now() - 3600000).ora, "", "Marco"))));
    verifica("Sveglia fra tre giorni: rifiutata", !!(await errore(() => creaSveglia(hotel.id, camera.id, giorno(3), "07:00", "", "Marco"))));
    await creaSveglia(hotel.id, camera.id, fra2ore.giorno, fra2ore.ora, "Colazione in camera, Taxi", "Marco");
    let ag = await agendaDelGiorno(hotel.id, fra2ore.giorno);
    const sv = ag.sveglie.find((s) => s.camera === camera.codice && s.dettaglio === "Colazione in camera, Taxi");
    verifica("Sveglia nell'agenda del giorno, all'ora giusta, con l'ospite", !!sv && sv.ora === fra2ore.ora && sv.ospite === `Paolo ${COGNOME}` && sv.prenotazioneId === p.id, sv);
    await esitoSveglia(hotel.id, sv!.id, "non_risponde", "Marco");
    ag = await agendaDelGiorno(hotel.id, fra2ore.giorno);
    const sv2 = ag.sveglie.find((s) => s.id === sv!.id)!;
    verifica("Non risponde: resta aperta con la nota del tentativo", sv2.stato === "aperta" && !!sv2.nota?.startsWith("Non risponde alle"));
    await esitoSveglia(hotel.id, sv!.id, "fatta", "Marco");
    verifica("Fatta: chiusa da chi l'ha fatta", (await prisma.richiestaOspite.findUniqueOrThrow({ where: { id: sv!.id } })).chiusaDa === "Marco");
    verifica("Sveglia già chiusa: rifiutato", !!(await errore(() => esitoSveglia(hotel.id, sv!.id, "fatta", "Marco"))));
    const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altroHotel) verifica("Sveglia di un altro hotel: non trovata", !!(await errore(() => esitoSveglia(altroHotel.id, sv!.id, "fatta", "X"))));

    // Servizi.
    const taxi = await creaServizio(hotel.id, base({ prenotazioneId: p.id, ora: "10:30" }), "Marco");
    const cena = await creaServizio(hotel.id, base({ prenotazioneId: p.id, tipo: "ristorante", ora: "20:00", dettagli: "Tavolo vista mare", fornitore: "Da Mario" }), "Marco");
    const esterno = await creaServizio(hotel.id, base({ destinatario: `Signora ${COGNOME}`, tipo: "biglietti", ora: "21:00", dettagli: "Concerto", fornitore: "" }), "Marco");
    const domani = await creaServizio(hotel.id, base({ prenotazioneId: p.id, tipo: "transfer", giorno: giorno(1), ora: "06:30", dettagli: "Aeroporto" }), "Marco");
    ag = await agendaDelGiorno(hotel.id, giorno(0));
    const t = ag.servizi.find((x) => x.id === taxi);
    verifica("Servizio: destinatario = chi ha prenotato, camere della prenotazione, da confermare", t?.destinatario === `Paolo ${COGNOME}` && t.camere === camera.codice && t.stato === "da_confermare", t);
    verifica("Agenda di oggi in ordine di ora: taxi prima della cena", ag.servizi.findIndex((x) => x.id === taxi) < ag.servizi.findIndex((x) => x.id === cena));
    verifica("Il transfer di domani è fra i 'da confermare in altri giorni'", ag.daConfermare.some((x) => x.id === domani && x.giorno === giorno(1)));

    await cambiaStatoServizio(hotel.id, taxi, "confermato", "TX-77", "", "Marco");
    await cambiaStatoServizio(hotel.id, taxi, "fatto", "", "", "Marco");
    const ft = await prisma.servizioPortineria.findUniqueOrThrow({ where: { id: taxi } });
    verifica("Confermato con il numero e poi fatto", ft.stato === "fatto" && ft.riferimento === "TX-77" && ft.aggiornatoDa === "Marco");
    verifica("Da fatto non si annulla", !!(await errore(() => cambiaStatoServizio(hotel.id, taxi, "annullato", "", "errore", "Marco"))));
    verifica("Annullare senza motivo: rifiutato", !!(await errore(() => cambiaStatoServizio(hotel.id, cena, "annullato", "", "", "Marco"))));
    await cambiaStatoServizio(hotel.id, cena, "annullato", "", "Ha cambiato idea", "Marco");

    // Esborsi.
    verifica("Esborso su un servizio senza prenotazione: rifiutato", !!(await errore(() => addebitaEsborso(hotel.id, esterno, 30, "", "Marco"))));
    verifica("Esborso su un servizio annullato: rifiutato", !!(await errore(() => addebitaEsborso(hotel.id, cena, 30, "", "Marco"))));
    verifica("Importo zero: rifiutato", !!(await errore(() => addebitaEsborso(hotel.id, taxi, 0, "", "Marco"))));
    await addebitaEsborso(hotel.id, taxi, 25.5, "", "Marco");
    const ad = await prisma.addebitoConto.findFirstOrThrow({ where: { prenotazioneId: p.id, tipo: "esborso" } });
    verifica("Esborso sul conto: fuori campo IVA, descrizione dal servizio", Number(ad.prezzoUnitario) === 25.5 && ad.aliquotaIva === null && ad.descrizione === "Taxi - Stazione centrale", ad.descrizione);
    verifica("Un solo esborso per servizio", !!(await errore(() => addebitaEsborso(hotel.id, taxi, 10, "", "Marco"))));
    ag = await agendaDelGiorno(hotel.id, giorno(0));
    verifica("Nell'agenda il taxi mostra l'esborso", ag.servizi.find((x) => x.id === taxi)?.esborso === 25.5);
    await addebitaEsborso(hotel.id, domani, 40, "Transfer aeroporto (pedaggio)", "Marco");
    let nota = await notaEsborsi(hotel.id, p.id);
    verifica("Nota degli esborsi: 2 righe, totale 65,50, camera e ospite", nota.righe.length === 2 && nota.totale === 65.5 && nota.ospite === `Paolo ${COGNOME}` && nota.camere === camera.codice, nota);
    await stornaAddebito(hotel.id, ad.id, "Importo sbagliato", "Marco");
    nota = await notaEsborsi(hotel.id, p.id);
    verifica("Esborso stornato: esce dalla nota", nota.righe.length === 1 && nota.totale === 40);
    await addebitaEsborso(hotel.id, taxi, 22, "", "Marco");
    verifica("Dopo lo storno si può riaddebitare", (await notaEsborsi(hotel.id, p.id)).totale === 62);

    await prisma.prenotazione.update({ where: { id: p.id }, data: { stato: "ANNULLATA" } });
    verifica("Prenotazione annullata: niente nuovi servizi", !!(await errore(() => creaServizio(hotel.id, base({ prenotazioneId: p.id }), "Marco"))));
  } finally {
    await prisma.servizioPortineria.deleteMany({ where: { hotelId: hotel.id, OR: [{ prenotazioneId: { in: ids } }, { destinatario: { contains: COGNOME } }] } });
    await prisma.richiestaOspite.deleteMany({ where: { segmento: { prenotazioneId: { in: ids } } } });
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
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
