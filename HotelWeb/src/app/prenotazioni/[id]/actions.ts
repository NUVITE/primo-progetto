"use server";

import { conEsito } from "@/lib/esito";
import {
  aggiornaComposizione,
  aggiungiSegmentoAPrenotazione,
  annullaCamera,
  annullaPrenotazione,
  aggiornaProvenienza,
  cambiaPoliticaPrenotazione,
  CANALI,
  GARANZIE,
  MEZZI,
  penaleProposta,
  pagatoNetto,
  type ProvenienzaInput,
  confermaPrenotazione,
  impostaPrezzoConcordato,
  impostaScadenze,
  METODI_PAGAMENTO,
  MOTIVI_ANNULLAMENTO,
  registraPagamento,
  riattivaPrenotazione,
  stornaPagamento,
  TIPI_PAGAMENTO,
  type MotivoAnnullamento,
  assegnaCamera,
  calcolaTotaliPrenotazione,
  cambiaCameraSegmento,
  cambiaDataFineSegmento,
  trovaPrenotazione,
  type NuovoSegmentoInput,
} from "@/lib/prenotazioni";
import {
  aggiungiServizioAPrenotazione,
  modificaServizio,
  rimuoviServizioDaPrenotazione,
  type AggiungiServizioInput,
  type ModificaServizioInput,
} from "@/lib/servizi";
import { puo, richiediPermesso, type UtenteSessione } from "@/lib/auth";
import {
  aggiungiDichiarazione,
  chiudiPosizione,
  datiTassaPrenotazione,
  impostaDatiPosizione,
  riapriPosizione,
  rimuoviDichiarazione,
  type DatiPosizioneInput,
  type DichiarazioneInput,
} from "@/lib/posizioneTassa";
import { PERMESSI } from "@/lib/permessi";
import { descriviPolitica, elencoPolitiche, type PoliticaCopiata } from "@/lib/politiche";
import { prisma } from "@/lib/prisma";
import { noteDellaPrenotazione } from "@/lib/noteAlimentari";
import { impostaPastoPrincipale } from "@/lib/foglioPasti";
import { pastiEffettivi, pastoScambiabile } from "@/lib/pastiRegole";
import { sospendiConto, statoConto, togliSospeso } from "@/lib/contiSospesi";
import { elencoReparti, registraAddebito, riepilogoIva, stornaAddebito, type AddebitoInput } from "@/lib/conto";
import { dividiConto, impostaRegolaConto, REGOLE_CONTO, segnaFatturate, spostaRiga, type RegolaConto } from "@/lib/contoDiviso";
import { composizioneDi, composizioneReale, descriviComposizione, stessaComposizione, type Composizione, type DettaglioNotte } from "@/lib/pricing";

import { datiIniziali as _datiIniziali } from "@/app/prenotazioni/nuova/actions";

export async function datiIniziali() {
  return _datiIniziali();
}

/**
 * Senza il permesso "Vedere importi" gli importi non lasciano il server: arrivano a zero e
 * importiVisibili=false dice all'interfaccia di nasconderli (nasconderli solo a video non basta).
 */
async function serializza(prenotazione: Awaited<ReturnType<typeof trovaPrenotazione>>, utente: UtenteSessione) {
  const importiVisibili = puo(utente, PERMESSI.IMPORTI_VEDI);
  const imp = (n: number) => (importiVisibili ? n : 0);
  const totali = calcolaTotaliPrenotazione(prenotazione);
  const tassa = await datiTassaPrenotazione(utente.hotelId, prenotazione.id);
  // Conto con IVA per voce (solo per chi vede gli importi) e reparti per gli addebiti.
  const hotelConto = await prisma.hotel.findUniqueOrThrow({ where: { id: utente.hotelId }, select: { aliquotaAlloggio: true } });
  const diviso = importiVisibili ? dividiConto(prenotazione, Number(hotelConto.aliquotaAlloggio)) : null;
  const righe = diviso?.righe ?? [];
  const riepilogo = riepilogoIva(righe);
  const puoAddebitare = puo(utente, PERMESSI.ADDEBITI_REGISTRA);
  const reparti = puoAddebitare ? await elencoReparti(utente.hotelId, true) : [];
  // Note alimentari (dati sanitari): solo con il permesso, altrimenti non lasciano il server.
  const noteAlimentari = puo(utente, PERMESSI.NOTE_ALIMENTARI) ? await noteDellaPrenotazione(utente.hotelId, prenotazione.id) : null;
  // Ristorazione: in mezza pensione si sceglie pranzo o cena (solo con il modulo attivo).
  const trattamentiPasti = utente.moduli.includes("ristorazione")
    ? new Map((await prisma.trattamento.findMany({ where: { hotelId: utente.hotelId } })).map((t) => [t.nome, t]))
    : null;
  return {
    importiVisibili,
    noteAlimentari,
    contoVoci: {
      righe,
      riepilogoIva: riepilogo,
      reparti,
      puoAddebitare,
      puoAbbuonare: puo(utente, PERMESSI.PREZZI_MODIFICA),
      aliquotaAlloggio: Number(hotelConto.aliquotaAlloggio),
      // Conto diviso fra ospite e cliente che paga, e righe da passare al gestionale per la fattura.
      regola: diviso?.regola ?? "predefinita",
      regole: Object.entries(REGOLE_CONTO),
      intestatari: (diviso?.intestatari ?? []).map((x) => ({
        chiave: x.chiave,
        nome: x.nome,
        tipo: x.tipo,
        totale: x.totale,
        pagato: x.pagato,
        daPagare: x.daPagare,
        fatturato: x.fatturato,
        daFatturare: x.daFatturare.reduce((t, r) => t + r.importo, 0),
        righeDaFatturare: x.daFatturare.length,
        notaDiCredito: x.notaDiCredito.reduce((t, r) => t + r.importo, 0),
      })),
      puoDividere: puo(utente, PERMESSI.PAGAMENTI_REGISTRA),
    },
    tassa: {
      ...tassa,
      ospiti: tassa.ospiti.map((o) => ({ ...o, notti: o.notti.map((n) => ({ ...n, importo: imp(n.importo) })) })),
    },
    id: prenotazione.id,
    stato: prenotazione.stato,
    ospitePrenotante: `${prenotazione.ospitePrenotante.nome} ${prenotazione.ospitePrenotante.cognome}`,
    gruppoNome: prenotazione.gruppo?.nome ?? null,
    // Conto da chiudere dopo la partenza (o penale da incassare) ed eventuale sospeso.
    conto: (() => {
      const c = statoConto(prenotazione);
      return { aperto: c.aperto, sospeso: c.sospeso };
    })(),
    provenienza: {
      canale: prenotazione.canale,
      canaleTesto: CANALI[prenotazione.canale as keyof typeof CANALI] ?? prenotazione.canale,
      mezzo: prenotazione.mezzo ?? "",
      mezzoTesto: prenotazione.mezzo ? (MEZZI[prenotazione.mezzo as keyof typeof MEZZI] ?? prenotazione.mezzo) : "",
      intermediarioId: prenotazione.intermediarioId,
      intermediario: prenotazione.intermediario?.denominazione ?? null,
      clientePaganteId: prenotazione.clientePaganteId,
      clientePagante: prenotazione.clientePagante?.denominazione ?? null,
      garanzia: prenotazione.garanzia,
      garanziaTesto: GARANZIE[prenotazione.garanzia as keyof typeof GARANZIE] ?? prenotazione.garanzia,
      oraArrivo: prenotazione.oraArrivo ?? "",
    },
    politica: prenotazione.politica
      ? {
          id: (prenotazione.politica as PoliticaCopiata).id,
          nome: (prenotazione.politica as PoliticaCopiata).nome,
          righe: descriviPolitica(prenotazione.politica as PoliticaCopiata),
        }
      : null,
    accontoRichiesto: importiVisibili && prenotazione.accontoRichiesto ? Number(prenotazione.accontoRichiesto) : null,
    totali: {
      subtotale: imp(totali.subtotale),
      tassa: imp(totali.tassa),
      servizi: imp(totali.servizi),
      extra: imp(totali.extra),
      totale: imp(totali.totale),
      pagato: imp(totali.pagato),
      daPagare: imp(totali.daPagare),
    },
    scadenzaOpzione: prenotazione.scadenzaOpzione?.toISOString().slice(0, 10) ?? "",
    accontoEntro: prenotazione.accontoEntro?.toISOString().slice(0, 10) ?? "",
    confermataIl: prenotazione.confermataIl?.toISOString() ?? null,
    annullamento: prenotazione.annullataIl
      ? {
          il: prenotazione.annullataIl.toISOString(),
          da: prenotazione.annullataDa ?? "",
          motivo: MOTIVI_ANNULLAMENTO[prenotazione.motivoAnnullamento as MotivoAnnullamento] ?? prenotazione.motivoAnnullamento ?? "",
          nota: prenotazione.notaAnnullamento ?? "",
          penale: prenotazione.penale === null ? null : imp(Number(prenotazione.penale)),
        }
      : null,
    // Acconti ricevuti (al netto di storni), per l'avviso "acconto da ricevere".
    accontoRicevuto: imp(
      prenotazione.pagamenti.filter((x) => !x.stornatoIl && (x.tipo === "acconto" || x.tipo === "caparra")).reduce((t, x) => t + Number(x.importo), 0),
    ),
    pagamenti: importiVisibili
      ? prenotazione.pagamenti.map((x) => ({
          id: x.id,
          data: x.data.toISOString().slice(0, 10),
          importo: Number(x.importo),
          metodo: METODI_PAGAMENTO[x.metodo as keyof typeof METODI_PAGAMENTO] ?? x.metodo,
          tipo: x.tipo,
          tipoTesto: TIPI_PAGAMENTO[x.tipo as keyof typeof TIPI_PAGAMENTO] ?? x.tipo,
          nota: x.nota ?? "",
          intestatario: x.intestatario ?? "ospite",
          registratoDa: x.registratoDa,
          stornato: x.stornatoIl ? { il: x.stornatoIl.toISOString(), da: x.stornatoDa ?? "", motivo: x.motivoStorno ?? "" } : null,
        }))
      : [],
    segmenti: prenotazione.segmenti.map((s) => {
      const composizione = composizioneDi(s);
      // Il confronto parte dal check-in: prima c'è solo l'intestatario, non la camera completa.
      const registrate = s.presenze.filter((p) => p.stato !== "attesa");
      const reale = composizioneReale(s.dataInizio, s.presenze.map((p) => ({ dataNascita: p.ospite.dataNascita, dal: p.dal })));
      return {
      id: s.id,
      annullata: s.stato === "ANNULLATO",
      usoDiurno: s.usoDiurno ? { dalle: s.oraDal ?? "", alle: s.oraAl ?? "", prezzo: importiVisibili ? Number(s.prezzoUsoDiurno ?? 0) : 0 } : null,
      prezzoConcordato: importiVisibili && s.prezzoConcordato !== null ? Number(s.prezzoConcordato) : null,
      prezzoConcordatoNota: s.prezzoConcordatoNota ?? "",
      prezzoConcordatoDa: s.prezzoConcordatoDa ?? "",
      composizione,
      composizioneTesto: descriviComposizione(composizione),
      // Persone registrate diverse da quelle prenotate: si propone il ricalcolo (mai automatico).
      composizioneReale:
        registrate.length > 0 && !stessaComposizione(reale.composizione, composizione)
          ? { ...reale, testo: descriviComposizione(reale.composizione) }
          : null,
      // Dettaglio del calcolo per notte (solo con "Vedere importi").
      dettaglioNotti: importiVisibili
        ? s.notti
            .map((n) => {
              const d = n.dettaglio as DettaglioNotte | null;
              return { data: n.data.toISOString().slice(0, 10), prezzo: Number(n.prezzo), righe: d?.righe ?? [], gratuita: d?.gratuita ?? 0, mancante: n.motivoPrezzo === "mancante" };
            })
            .sort((a, b) => a.data.localeCompare(b.data))
        : [],
      cameraId: s.cameraId,
      cameraCodice: s.camera?.codice ?? null,
      pasti: (() => {
        const t = trattamentiPasti?.get(s.trattamento);
        if (!t || s.usoDiurno || !pastoScambiabile(t)) return null;
        return { principale: pastiEffettivi(t, s.pastoPrincipale).pranzo ? ("pranzo" as const) : ("cena" as const), tavolo: s.tavolo ?? "" };
      })(),
      tipoCameraId: s.tipoCameraId,
      tipoCameraNome: s.tipoCamera.descrizione,
      ospiteId: s.ospiteId,
      ospiteNome: `${s.ospite.nome} ${s.ospite.cognome}`,
      trattamento: s.trattamento,
      listinoId: s.listinoId,
      dataInizio: s.dataInizio.toISOString().slice(0, 10),
      dataFine: s.dataFine.toISOString().slice(0, 10),
      stato: s.stato,
      segmentoPrecedenteId: s.segmentoPrecedenteId,
      notti: s.notti.length,
      subtotale: imp(s.notti.reduce((t, n) => t + Number(n.prezzo), 0)),
      tassa: imp(s.notti.reduce((t, n) => t + n.tasse.reduce((x, r) => x + Number(r.importo), 0), 0)),
      // Persone nella camera (la tassa è per persona, il prezzo per camera).
      occupanti: s.presenze.map((p) => ({
        presenzaId: p.id,
        ospiteId: p.ospiteId,
        nome: `${p.ospite.nome} ${p.ospite.cognome}`,
        tipoAlloggiato: p.tipoAlloggiato,
        stato: p.stato,
        dal: p.dal?.toISOString().slice(0, 10) ?? null,
        al: p.al?.toISOString().slice(0, 10) ?? null,
      })),
      // Notti create senza trovare una tariffa (prenotazione bloccata comunque, da sistemare
      // aggiungendo il listino mancante) — vedi generaNottiETasse in src/lib/prenotazioni.ts.
      tariffaIncompleta: s.notti.some((n) => n.motivoPrezzo === "mancante"),
    };
    }),
    serviziAggiunti: prenotazione.serviziAggiunti.map((s) => ({
      id: s.id,
      nome: s.servizioCatalogo?.nome ?? s.descrizione ?? "Servizio",
      daCatalogo: s.servizioCatalogoId !== null,
      descrizione: s.descrizione,
      prezzoUnitario: imp(Number(s.prezzoUnitario)),
      quantita: s.quantita,
      // Unità richieste e modo di addebito (quantita = unita x notti / persone x notti).
      unita: s.unita,
      addebito: s.addebito,
      totale: imp(Number(s.prezzoUnitario) * s.quantita),
      data: s.data ? s.data.toISOString().slice(0, 10) : null,
      note: s.note,
      // Vuoto = si applica a tutta la prenotazione.
      segmenti: s.segmenti.map((sg) => ({
        segmentoId: sg.segmentoId,
        etichetta: `${sg.segmento.ospite.nome} ${sg.segmento.ospite.cognome}${sg.segmento.camera ? " — " + sg.segmento.camera.codice : ""}`,
      })),
    })),
  };
}

export async function caricaPrenotazione(id: number) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  return await serializza(await trovaPrenotazione(utente.hotelId, id), utente);
}

/** Cambia le persone di una camera; con ricalcola=true riscrive anche i prezzi delle sue notti. */
export async function azioneComposizione(segmentoId: number, composizione: Composizione, ricalcola: boolean) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    return serializza(await aggiornaComposizione(utente.hotelId, segmentoId, composizione, ricalcola), utente);
  });
}

// --- Stato della prenotazione ---

async function suPrenotazione(permesso: (typeof PERMESSI)[keyof typeof PERMESSI], fn: (u: UtenteSessione) => Promise<Awaited<ReturnType<typeof trovaPrenotazione>>>) {
  return conEsito(async () => {
    const utente = await richiediPermesso(permesso);
    return serializza(await fn(utente), utente);
  });
}

export async function azioneConferma(id: number) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => confermaPrenotazione(u.hotelId, id));
}
export async function azioneAnnulla(id: number, dati: { motivo: MotivoAnnullamento; nota: string; penale: number; rimborsaEccedenza: boolean; metodoRimborso?: string }) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    // Trattenere o rimborsare denaro è un'operazione di cassa.
    const p = await prisma.prenotazione.findFirstOrThrow({ where: { id, hotelId: utente.hotelId }, include: { pagamenti: true } });
    if (pagatoNetto(p.pagamenti) > 0 && !puo(utente, PERMESSI.PAGAMENTI_REGISTRA)) {
      throw new Error("Ci sono incassi da trattenere o rimborsare: serve il permesso «Registrare pagamenti».");
    }
    return serializza(await annullaPrenotazione(utente.hotelId, id, dati, utente.nome), utente);
  });
}

/** Penale proposta dalla politica per quel motivo (sempre modificabile prima di confermare). */
export async function azionePenaleProposta(id: number, motivo: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    if (!puo(utente, PERMESSI.IMPORTI_VEDI)) return { importo: null, spiegazione: "", incassato: 0 };
    return penaleProposta(utente.hotelId, id, motivo);
  });
}

export async function azioneProvenienza(id: number, dati: ProvenienzaInput) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => aggiornaProvenienza(u.hotelId, id, dati));
}

export async function azionePolitica(id: number, politicaId: number | null) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => cambiaPoliticaPrenotazione(u.hotelId, id, politicaId));
}

/** Scelte per provenienza e politica: clienti (aziende, agenzie, portali) e politiche dell'hotel. */
export async function azioneOpzioniProvenienza() {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
    const [clienti, politiche] = await Promise.all([
      prisma.cliente.findMany({ where: { hotelId: utente.hotelId, attivo: true }, select: { id: true, denominazione: true, tipo: true }, orderBy: { denominazione: "asc" } }),
      elencoPolitiche(utente.hotelId),
    ]);
    return {
      clienti,
      politiche: politiche.map((p) => ({ id: p.id, nome: p.nome, predefinita: p.predefinita })),
      canali: Object.entries(CANALI).map(([valore, nome]) => ({ valore, nome })),
      mezzi: Object.entries(MEZZI).map(([valore, nome]) => ({ valore, nome })),
      garanzie: Object.entries(GARANZIE).map(([valore, nome]) => ({ valore, nome })),
    };
  });
}
export async function azioneAnnullaCamera(segmentoId: number) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => annullaCamera(u.hotelId, segmentoId));
}
export async function azioneRiattiva(id: number) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => riattivaPrenotazione(u.hotelId, id));
}
export async function azioneScadenze(id: number, d: { scadenzaOpzione: string; accontoEntro: string; accontoRichiesto: number | null }) {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, (u) => impostaScadenze(u.hotelId, id, d));
}

// --- Pagamenti ---

export async function azioneRegistraPagamento(id: number, d: { data: string; importo: number; metodo: string; tipo: string; nota: string; intestatario?: string | null }) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => registraPagamento(u.hotelId, id, d, u.nome));
}
export async function azioneStornaPagamento(pagamentoId: number, motivo: string) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => stornaPagamento(u.hotelId, pagamentoId, motivo, u.nome));
}

export async function azioneAccorciaEstendi(segmentoId: number, nuovaDataFine: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await cambiaDataFineSegmento(utente.hotelId, segmentoId, nuovaDataFine);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneCambiaCamera(segmentoId: number, dataCambio: string, nuovaCameraId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await cambiaCameraSegmento(utente.hotelId, segmentoId, dataCambio, nuovaCameraId);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAggiungiSegmento(prenotazioneId: number, input: NuovoSegmentoInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await aggiungiSegmentoAPrenotazione(utente.hotelId, prenotazioneId, input);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAssegnaCamera(segmentoId: number, cameraId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    const prenotazione = await assegnaCamera(utente.hotelId, segmentoId, cameraId);
    return await serializza(prenotazione, utente);
  });
}

export async function azioneAggiungiServizio(prenotazioneId: number, input: AggiungiServizioInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await aggiungiServizioAPrenotazione(utente.hotelId, prenotazioneId, input);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRimuoviServizio(prenotazioneId: number, servizioAggiuntoId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await rimuoviServizioDaPrenotazione(utente.hotelId, servizioAggiuntoId);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneModificaServizio(prenotazioneId: number, servizioAggiuntoId: number, input: ModificaServizioInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await modificaServizio(utente.hotelId, servizioAggiuntoId, input);
    return await serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

// --- Tassa di soggiorno (per ospite) ---

export async function azioneDatiPosizioneTassa(prenotazioneId: number, ospiteId: number, input: DatiPosizioneInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await impostaDatiPosizione(utente.hotelId, prenotazioneId, ospiteId, input);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneAggiungiDichiarazione(prenotazioneId: number, ospiteId: number, input: DichiarazioneInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await aggiungiDichiarazione(utente.hotelId, prenotazioneId, ospiteId, input);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRimuoviDichiarazione(prenotazioneId: number, dichiarazioneId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await rimuoviDichiarazione(utente.hotelId, prenotazioneId, dichiarazioneId);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneChiudiSoggiorno(prenotazioneId: number, ospiteId: number) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
    await chiudiPosizione(utente.hotelId, utente.id, prenotazioneId, ospiteId);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneRiapriSoggiorno(prenotazioneId: number, ospiteId: number, nota: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.SOGGIORNI_RIAPRI);
    await riapriPosizione(utente.hotelId, utente.id, prenotazioneId, ospiteId, nota);
    return serializza(await trovaPrenotazione(utente.hotelId, prenotazioneId), utente);
  });
}

export async function azioneSospendi(id: number, d: { clienteId: number | null; nota: string }) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => sospendiConto(u.hotelId, id, d, u.nome));
}

export async function azioneTogliSospeso(id: number) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => togliSospeso(u.hotelId, id));
}

export async function azionePrezzoConcordato(segmentoId: number, prezzo: number | null, nota: string) {
  return suPrenotazione(PERMESSI.PREZZI_MODIFICA, (u) => impostaPrezzoConcordato(u.hotelId, segmentoId, prezzo, nota, u.nome));
}

/** Consumo, esborso o abbuono sul conto (l'abbuono richiede anche "Modificare i prezzi"). */
export async function azioneAddebito(id: number, d: AddebitoInput) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
    if (d.tipo === "abbuono" && !puo(utente, PERMESSI.PREZZI_MODIFICA)) throw new Error("Per un abbuono serve il permesso «Modificare i prezzi».");
    await registraAddebito(utente.hotelId, id, d, utente.nome);
    return serializza(await trovaPrenotazione(utente.hotelId, id), utente);
  });
}

export async function azioneStornaAddebito(id: number, addebitoId: number, motivo: string) {
  return conEsito(async () => {
    const utente = await richiediPermesso(PERMESSI.ADDEBITI_REGISTRA);
    await stornaAddebito(utente.hotelId, addebitoId, motivo, utente.nome);
    return serializza(await trovaPrenotazione(utente.hotelId, id), utente);
  });
}

/** Regola del conto diviso (chi paga cosa fra ospite e cliente). */
export async function azioneRegolaConto(id: number, regola: RegolaConto) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => (async () => { await impostaRegolaConto(u.hotelId, id, regola); return trovaPrenotazione(u.hotelId, id); })());
}

/** Sposta una riga del conto su un altro intestatario (null = torna alla regola). */
export async function azioneSpostaRiga(id: number, chiave: string, intestatario: string | null) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => (async () => { await spostaRiga(u.hotelId, id, chiave, intestatario); return trovaPrenotazione(u.hotelId, id); })());
}

/** Le righe da fatturare di un intestatario risultano passate al gestionale. */
export async function azioneSegnaFatturate(id: number, intestatario: string) {
  return suPrenotazione(PERMESSI.PAGAMENTI_REGISTRA, (u) => (async () => { await segnaFatturate(u.hotelId, id, intestatario, u.nome); return trovaPrenotazione(u.hotelId, id); })());
}

/** Mezza pensione: pranzo o cena per questa camera (vale per il foglio del giorno della ristorazione). */
export async function azionePastoPrincipale(prenotazioneId: number, segmentoId: number, valore: "pranzo" | "cena") {
  return suPrenotazione(PERMESSI.PRENOTAZIONI_GESTISCI, async (u) => {
    await impostaPastoPrincipale(u.hotelId, segmentoId, valore);
    return trovaPrenotazione(u.hotelId, prenotazioneId);
  });
}
