/**
 * Sicurezza degli accessi: regole pure (password, blocco dopo troppi tentativi, destinazione dopo il
 * login, password temporanea). Usabili anche dalle pagine.
 */

export const LUNGHEZZA_MINIMA = 10;
const LUNGHEZZA_MASSIMA = 200;

/** Errori consentiti per la stessa email prima del blocco, e per lo stesso indirizzo di rete. */
// Per indirizzo la soglia è alta: in un laboratorio di scuola tanti studenti escono dallo stesso
// indirizzo e un blocco per indirizzo li fermerebbe tutti; serve solo contro i tentativi a raffica.
export const LIMITE_EMAIL = 5;
export const LIMITE_IP = 30;
export const FINESTRA_MINUTI = 15;

// Password troppo comuni (anche con numeri in fondo: "password2024", "qwerty1").
const COMUNI = new Set([
  "password", "passw0rd", "qwerty", "qwertyuiop", "asdfghjkl", "azerty", "abc", "abcd", "abcdef", "abcdefghij",
  "123456", "1234567890", "0123456789", "987654321", "111111", "000000", "iloveyou", "admin", "administrator",
  "amministratore", "welcome", "benvenuto", "ciao", "ciaociao", "letmein", "hotel", "hotelweb", "albergo",
  "reception", "segreto", "cambiami", "changeme", "juventus", "napoli", "milan", "inter", "roma", "forzanapoli",
]);

/** Motivo per cui la password non va bene, o null se va bene. */
export function problemaPassword(password: string, utente: { email: string; nome?: string }): string | null {
  if (password.length < LUNGHEZZA_MINIMA) return `La password deve avere almeno ${LUNGHEZZA_MINIMA} caratteri.`;
  if (password.length > LUNGHEZZA_MASSIMA) return "La password è troppo lunga.";
  const p = password.toLowerCase();
  if (new Set(p).size <= 2) return "La password ripete sempre gli stessi caratteri: scegline una più varia.";
  const senzaNumeriFinali = p.replace(/[0-9!.?_-]+$/, "");
  if (COMUNI.has(p) || COMUNI.has(senzaNumeriFinali) || /^(0123456789|1234567890|abcdefghij|qwertyuiop)/.test(p))
    return "La password è troppo comune: è tra le prime che si provano.";
  const nomeEmail = utente.email.toLowerCase().split("@")[0];
  if (nomeEmail.length >= 4 && p.includes(nomeEmail)) return "La password non deve contenere il tuo indirizzo email.";
  const parti = (utente.nome ?? "").toLowerCase().split(/\s+/).filter((x) => x.length >= 4);
  if (parti.some((x) => p.includes(x))) return "La password non deve contenere il tuo nome.";
  return null;
}

/**
 * Blocco dopo troppi errori: con `limite` errori negli ultimi FINESTRA_MINUTI si è bloccati fino a
 * quando il più vecchio di quegli errori esce dalla finestra.
 */
export function statoBlocco(errori: Date[], ora: Date, limite: number) {
  const inizio = ora.getTime() - FINESTRA_MINUTI * 60_000;
  const recenti = errori.map((d) => d.getTime()).filter((t) => t > inizio).sort((a, b) => b - a);
  if (recenti.length < limite) return { bloccato: false as const, restanti: limite - recenti.length };
  const sblocco = recenti[limite - 1] + FINESTRA_MINUTI * 60_000;
  return { bloccato: true as const, minuti: Math.max(1, Math.ceil((sblocco - ora.getTime()) / 60_000)) };
}

/** Dopo il login si va solo a pagine interne: mai a un sito esterno ("//sito", "https://", "/\\"). */
export function destinazioneSicura(d: string | null | undefined) {
  if (!d || !d.startsWith("/") || d.startsWith("//") || d.startsWith("/\\") || /[\r\n]/.test(d)) return "/";
  return d;
}

// Senza caratteri che si confondono (0/O, 1/l/I): si detta a voce o si copia da un foglio.
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Password temporanea leggibile (12 caratteri in tre gruppi), da cambiare al primo accesso. */
export function passwordTemporanea(casuali: Uint8Array) {
  if (casuali.length < 12) throw new Error("Servono 12 byte casuali.");
  const c = [...casuali.slice(0, 12)].map((b) => ALFABETO[b % ALFABETO.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}
