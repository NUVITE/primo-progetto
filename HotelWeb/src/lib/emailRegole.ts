/**
 * Modelli delle email agli ospiti e segnaposto: dati e funzioni pure, usabili anche dalle pagine.
 * I testi di partenza sono qui; l'hotel può modificarli (ModelloEmail) e tornare a questi.
 */

export const LINGUE = { it: "Italiano", en: "English" } as const;
export type Lingua = keyof typeof LINGUE;

export const MODELLI = {
  conferma: "Conferma della prenotazione",
  acconto: "Richiesta di acconto",
  promemoria: "Promemoria prima dell'arrivo",
  ringraziamento: "Ringraziamento dopo la partenza",
  preventivo: "Preventivo",
  libera: "Email libera",
} as const;
export type ChiaveModello = keyof typeof MODELLI;

/** Segnaposto disponibili, con una spiegazione per la pagina dei modelli. */
export const SEGNAPOSTO = {
  nome: "Nome di chi ha prenotato",
  cognome: "Cognome di chi ha prenotato",
  numero_prenotazione: "Numero della prenotazione",
  arrivo: "Data di arrivo",
  partenza: "Data di partenza",
  notti: "Numero di notti",
  camere: "Camere prenotate (tipi)",
  persone: "Persone",
  trattamento: "Trattamento",
  totale: "Totale del soggiorno",
  pagato: "Già pagato",
  da_pagare: "Ancora da pagare",
  acconto: "Acconto richiesto",
  acconto_entro: "Scadenza dell'acconto",
  iban: "IBAN dell'hotel",
  causale: "Causale del bonifico",
  checkin_dalle: "Orario di check-in",
  checkout_entro: "Orario di check-out",
  hotel: "Nome dell'hotel",
  telefono_hotel: "Telefono dell'hotel",
  email_hotel: "Email dell'hotel",
  indirizzo_hotel: "Indirizzo dell'hotel",
  link_preventivo: "Link al preventivo (solo per il preventivo)",
  valido_fino: "Scadenza del preventivo",
} as const;
export type Segnaposto = keyof typeof SEGNAPOSTO;

type Testo = { oggetto: string; corpo: string };

export const MODELLI_PREDEFINITI: Record<ChiaveModello, Record<Lingua, Testo>> = {
  conferma: {
    it: {
      oggetto: "Conferma della prenotazione n. {{numero_prenotazione}} - {{hotel}}",
      corpo: `Gentile {{nome}} {{cognome}},

la ringraziamo per aver scelto {{hotel}}. Le confermiamo la prenotazione:

- arrivo: {{arrivo}} (check-in dalle {{checkin_dalle}})
- partenza: {{partenza}} (check-out entro le {{checkout_entro}})
- notti: {{notti}}
- camere: {{camere}}
- persone: {{persone}}
- trattamento: {{trattamento}}
- totale: {{totale}}

Per qualsiasi necessità siamo a disposizione al {{telefono_hotel}}.

Cordiali saluti,
{{hotel}}
{{indirizzo_hotel}}`,
    },
    en: {
      oggetto: "Booking confirmation no. {{numero_prenotazione}} - {{hotel}}",
      corpo: `Dear {{nome}} {{cognome}},

thank you for choosing {{hotel}}. We are pleased to confirm your booking:

- arrival: {{arrivo}} (check-in from {{checkin_dalle}})
- departure: {{partenza}} (check-out by {{checkout_entro}})
- nights: {{notti}}
- rooms: {{camere}}
- guests: {{persone}}
- board: {{trattamento}}
- total: {{totale}}

Should you need anything, please call us at {{telefono_hotel}}.

Kind regards,
{{hotel}}
{{indirizzo_hotel}}`,
    },
  },
  acconto: {
    it: {
      oggetto: "Acconto per la prenotazione n. {{numero_prenotazione}} - {{hotel}}",
      corpo: `Gentile {{nome}} {{cognome}},

per confermare la prenotazione dal {{arrivo}} al {{partenza}} le chiediamo un acconto di {{acconto}} entro il {{acconto_entro}} con bonifico bancario:

IBAN: {{iban}}
Intestato a: {{hotel}}
Causale: {{causale}}

Appena riceviamo il pagamento le invieremo la conferma.

Cordiali saluti,
{{hotel}}`,
    },
    en: {
      oggetto: "Deposit for booking no. {{numero_prenotazione}} - {{hotel}}",
      corpo: `Dear {{nome}} {{cognome}},

to confirm your stay from {{arrivo}} to {{partenza}} we kindly ask for a deposit of {{acconto}} by {{acconto_entro}} by bank transfer:

IBAN: {{iban}}
Beneficiary: {{hotel}}
Reference: {{causale}}

We will send you a confirmation as soon as we receive the payment.

Kind regards,
{{hotel}}`,
    },
  },
  promemoria: {
    it: {
      oggetto: "Ci vediamo presto! - {{hotel}}",
      corpo: `Gentile {{nome}} {{cognome}},

la aspettiamo il {{arrivo}}: la camera sarà pronta dalle {{checkin_dalle}}.
Se prevede di arrivare tardi o le serve qualcosa (parcheggio, culla, esigenze alimentari) ci risponda pure a questa email o ci chiami al {{telefono_hotel}}.

Buon viaggio,
{{hotel}}
{{indirizzo_hotel}}`,
    },
    en: {
      oggetto: "See you soon! - {{hotel}}",
      corpo: `Dear {{nome}} {{cognome}},

we look forward to welcoming you on {{arrivo}}: your room will be ready from {{checkin_dalle}}.
If you expect to arrive late or need anything (parking, cot, dietary requirements), simply reply to this email or call us at {{telefono_hotel}}.

Have a good trip,
{{hotel}}
{{indirizzo_hotel}}`,
    },
  },
  ringraziamento: {
    it: {
      oggetto: "Grazie per il soggiorno - {{hotel}}",
      corpo: `Gentile {{nome}} {{cognome}},

grazie per aver soggiornato da noi. Speriamo di rivederla presto!

Cordiali saluti,
{{hotel}}`,
    },
    en: {
      oggetto: "Thank you for your stay - {{hotel}}",
      corpo: `Dear {{nome}} {{cognome}},

thank you for staying with us. We hope to welcome you again soon!

Kind regards,
{{hotel}}`,
    },
  },
  preventivo: {
    it: {
      oggetto: "Il suo preventivo - {{hotel}}",
      corpo: `Gentile {{nome}} {{cognome}},

grazie per averci contattato. Abbiamo preparato le nostre proposte per il soggiorno dal {{arrivo}} al {{partenza}} ({{notti}} notti, {{persone}} persone).

Le trova qui, con prezzi e condizioni:
{{link_preventivo}}

Se una proposta le va bene può accettarla direttamente dalla pagina: le terremo la camera e le invieremo le indicazioni per l'acconto. Il preventivo è valido fino al {{valido_fino}}.

Cordiali saluti,
{{hotel}}
{{telefono_hotel}}`,
    },
    en: {
      oggetto: "Your quotation - {{hotel}}",
      corpo: `Dear {{nome}} {{cognome}},

thank you for contacting us. We have prepared our offers for your stay from {{arrivo}} to {{partenza}} ({{notti}} nights, {{persone}} guests).

You can find them here, with prices and conditions:
{{link_preventivo}}

If you like one of them you can accept it directly on the page: we will hold the room and send you the deposit details. The quotation is valid until {{valido_fino}}.

Kind regards,
{{hotel}}
{{telefono_hotel}}`,
    },
  },
  libera: {
    it: { oggetto: "{{hotel}} - prenotazione n. {{numero_prenotazione}}", corpo: "Gentile {{nome}} {{cognome}},\n\n\n\nCordiali saluti,\n{{hotel}}" },
    en: { oggetto: "{{hotel}} - booking no. {{numero_prenotazione}}", corpo: "Dear {{nome}} {{cognome}},\n\n\n\nKind regards,\n{{hotel}}" },
  },
};

const SEGNA = /\{\{\s*([a-z_]+)\s*\}\}/g;

/** Sostituisce i segnaposto; quelli sconosciuti o senza valore restano visibili e si segnalano. */
export function compila(testo: string, valori: Partial<Record<Segnaposto, string>>) {
  const mancanti = new Set<string>();
  const risultato = testo.replace(SEGNA, (intero, nome: string) => {
    const v = valori[nome as Segnaposto];
    if (v === undefined || v === "") {
      mancanti.add(nome);
      return intero;
    }
    return v;
  });
  return { testo: risultato, mancanti: [...mancanti] };
}

/** Lingua proposta per un ospite: la sua, altrimenti italiano per gli italiani e inglese per gli altri. */
export function linguaPerOspite(lingua: string | null, cittadinanzaCodice: string | null, codiceItalia: string): Lingua {
  if (lingua && lingua in LINGUE) return lingua as Lingua;
  return !cittadinanzaCodice || cittadinanzaCodice === codiceItalia ? "it" : "en";
}

export const EMAIL_VALIDA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
