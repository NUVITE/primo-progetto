/**
 * Codici a tempo per la verifica in due passaggi (TOTP, RFC 6238 su HOTP RFC 4226): HMAC-SHA1,
 * 6 cifre, passi di 30 secondi, gli stessi di Google Authenticator, Microsoft Authenticator, Aegis e
 * FreeOTP. Scritto con node:crypto, senza librerie esterne.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const PASSO_SECONDI = 30;
export const CIFRE = 6;

export function base32(dati: Uint8Array) {
  let bit = 0;
  let valore = 0;
  let out = "";
  for (const b of dati) {
    valore = (valore << 8) | b;
    bit += 8;
    while (bit >= 5) {
      out += BASE32[(valore >>> (bit - 5)) & 31];
      bit -= 5;
    }
  }
  if (bit > 0) out += BASE32[(valore << (5 - bit)) & 31];
  return out;
}

export function daBase32(testo: string) {
  const pulito = testo.toUpperCase().replace(/[\s=-]/g, "");
  let bit = 0;
  let valore = 0;
  const out: number[] = [];
  for (const c of pulito) {
    const i = BASE32.indexOf(c);
    if (i < 0) throw new Error("Segreto non valido.");
    valore = (valore << 5) | i;
    bit += 5;
    if (bit >= 8) {
      out.push((valore >>> (bit - 8)) & 255);
      bit -= 8;
    }
  }
  return Buffer.from(out);
}

/** Nuovo segreto: 20 byte casuali (160 bit, come raccomanda la RFC 4226), in base32. */
export const nuovoSegreto = () => base32(randomBytes(20));

/** Codice HOTP per un contatore. */
export function hotp(segreto: string, contatore: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(contatore));
  const h = createHmac("sha1", daBase32(segreto)).update(buf).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** CIFRE).padStart(CIFRE, "0");
}

export const passoDi = (ms: number) => Math.floor(ms / 1000 / PASSO_SECONDI);

/**
 * Verifica un codice accettando il passo attuale e quelli vicini (±1: orologio del telefono un po'
 * avanti o indietro). Restituisce il passo trovato, o null; un passo non superiore all'ultimo usato
 * non vale (lo stesso codice non si usa due volte).
 */
export function verificaCodice(segreto: string, codice: string, ora: number, ultimoPasso: number | null) {
  const c = codice.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const adesso = passoDi(ora);
  for (const p of [adesso, adesso - 1, adesso + 1]) {
    if (ultimoPasso !== null && p <= ultimoPasso) continue;
    const atteso = Buffer.from(hotp(segreto, p));
    if (timingSafeEqual(atteso, Buffer.from(c))) return p;
  }
  return null;
}

/** Indirizzo da mettere nel codice QR per l'app sul telefono. */
export function uriApp(segreto: string, email: string, emittente = "HotelWeb") {
  const etichetta = encodeURIComponent(`${emittente}:${email}`);
  return `otpauth://totp/${etichetta}?secret=${segreto}&issuer=${encodeURIComponent(emittente)}&algorithm=SHA1&digits=${CIFRE}&period=${PASSO_SECONDI}`;
}

// ---- Codici di riserva: 10 codici di 10 caratteri, si salvano solo le impronte ----

const ALFABETO_RISERVA = "abcdefghjkmnpqrstuvwxyz23456789";
export const QUANTI_CODICI_RISERVA = 10;

/** Forma unica per confrontare: minuscolo, senza spazi e trattini. */
export const normalizzaRiserva = (c: string) => c.toLowerCase().replace(/[\s-]/g, "");
export const improntaRiserva = (c: string) => createHash("sha256").update(normalizzaRiserva(c)).digest("hex");

export function nuoviCodiciRiserva() {
  return Array.from({ length: QUANTI_CODICI_RISERVA }, () => {
    const c = [...randomBytes(10)].map((b) => ALFABETO_RISERVA[b % ALFABETO_RISERVA.length]).join("");
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
}
