import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { codiceCartoncino } from "@/lib/roomService";
import { ComandiCartoncino } from "./NuovoCodice";

/**
 * Cartoncino da consegnare al check-in: QR con il link del room service di questo soggiorno.
 * Il link vale solo mentre gli ospiti sono in casa; l'indirizzo non si stampa in chiaro.
 */
export default async function CartoncinoPage({ params }: { params: Promise<{ segmentoId: string }> }) {
  const utente = await richiediPermesso(PERMESSI.ROOM_SERVICE);
  const segmentoId = Number((await params).segmentoId);
  if (!Number.isInteger(segmentoId)) notFound();
  const r = await codiceCartoncino(utente.hotelId, segmentoId).catch(() => null);
  if (!r) notFound();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocollo = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const link = `${protocollo}://${host}/rs/${r.codice}`;
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 220 });
  const s = r.segmento;

  return (
    <div className="mx-auto w-full max-w-md bg-white p-6 text-stone-900 print:p-0">
      <ComandiCartoncino segmentoId={segmentoId} />
      <div className="rounded-xl border-2 border-dashed border-stone-300 p-6 text-center print:border-stone-400">
        <p className="text-xs uppercase tracking-widest text-stone-500">{s.prenotazione.hotel.nome}</p>
        <h1 className="mt-1 text-2xl font-bold">Room service</h1>
        {s.camera && <p className="text-lg">Camera {s.camera.codice}</p>}
        {/* SVG generato dalla libreria qrcode a partire dal nostro link: nessun contenuto esterno. */}
        <div className="mx-auto my-4 w-56" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="font-semibold">Inquadra il codice con la fotocamera del telefono</p>
        <p className="text-sm text-stone-600">Scegli dal menu e ordina: te lo portiamo in camera. Si paga con il conto della camera.</p>
        <p className="mt-3 text-xs text-stone-500">Il codice vale solo per il tuo soggiorno.</p>
      </div>
    </div>
  );
}
