import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifratura delle credenziali dei servizi esterni (Polizia, ISTAT) salvate nel database.
 * AES-256-GCM con la chiave CHIAVE_CREDENZIALI dell'ambiente (32 byte in base64), mai nel database
 * né nel repository: chi legge un backup del database non legge le password.
 * Formato: "v1:" + base64(iv 12 byte | tag 16 byte | testo cifrato).
 */
function chiave() {
  const k = process.env.CHIAVE_CREDENZIALI;
  if (!k) throw new Error("Chiave di cifratura delle credenziali non configurata sul server (CHIAVE_CREDENZIALI).");
  const b = Buffer.from(k, "base64");
  if (b.length !== 32) throw new Error("CHIAVE_CREDENZIALI deve essere di 32 byte in base64.");
  return b;
}

export function cifra(testo: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chiave(), iv);
  const dati = Buffer.concat([c.update(testo, "utf8"), c.final()]);
  return "v1:" + Buffer.concat([iv, c.getAuthTag(), dati]).toString("base64");
}

export function decifra(valore: string) {
  if (!valore.startsWith("v1:")) throw new Error("Credenziale salvata in un formato non riconosciuto.");
  const b = Buffer.from(valore.slice(3), "base64");
  const d = createDecipheriv("aes-256-gcm", chiave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  try {
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch {
    throw new Error("Credenziale illeggibile: la chiave del server è cambiata. Reinserisci la password nelle Impostazioni.");
  }
}
