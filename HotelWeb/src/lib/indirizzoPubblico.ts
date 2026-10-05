import { headers } from "next/headers";

/** Indirizzo pubblico dell'app (per i link nelle email e nei QR), ricavato dalla richiesta in corso. */
export async function indirizzoPubblico() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocollo = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${protocollo}://${host}`;
}
