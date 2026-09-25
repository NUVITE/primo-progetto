import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const HOTEL_ID = 1;

function isoGiorno(d: Date) {
  return d.toISOString().slice(0, 10);
}

type Stato = "libera" | "occupata" | "in_arrivo" | "in_partenza" | "fuori_servizio";

export async function GET(request: NextRequest) {
  const dalStr = request.nextUrl.searchParams.get("dal");
  const alStr = request.nextUrl.searchParams.get("al");
  if (!dalStr || !alStr) {
    return NextResponse.json({ error: "Parametri 'dal' e 'al' obbligatori (yyyy-mm-dd)." }, { status: 400 });
  }
  const dal = new Date(dalStr);
  const al = new Date(alStr); // esclusivo: primo giorno NON incluso nella vista

  const [camere, tipiCamera, segmenti, indisponibilita] = await Promise.all([
    prisma.camera.findMany({
      where: { hotelId: HOTEL_ID, attivo: true },
      include: { tipoCamera: true },
      orderBy: [{ piano: "asc" }, { codice: "asc" }],
    }),
    prisma.tipoCamera.findMany({ where: { hotelId: HOTEL_ID } }),
    // Tutti i segmenti sovrapposti, comprese le prenotazioni generiche (cameraId nullo):
    // servono per il riepilogo di disponibilita' per tipo, anche se non hanno una riga fisica nel planning.
    prisma.segmentoSoggiorno.findMany({
      where: {
        prenotazione: { hotelId: HOTEL_ID },
        stato: { not: "ANNULLATO" },
        dataInizio: { lt: al },
        dataFine: { gt: dal },
      },
      include: { ospite: true },
    }),
    prisma.cameraIndisponibilita.findMany({
      where: { camera: { hotelId: HOTEL_ID }, dal: { lt: al }, al: { gt: dal } },
    }),
  ]);

  const segmentiPerCamera = new Map<number, typeof segmenti>();
  const segmentiGenericiPerTipo = new Map<number, typeof segmenti>();
  for (const s of segmenti) {
    if (s.cameraId) {
      const lista = segmentiPerCamera.get(s.cameraId) ?? [];
      lista.push(s);
      segmentiPerCamera.set(s.cameraId, lista);
    } else {
      const lista = segmentiGenericiPerTipo.get(s.tipoCameraId) ?? [];
      lista.push(s);
      segmentiGenericiPerTipo.set(s.tipoCameraId, lista);
    }
  }

  const indisponibilitaPerCamera = new Map<number, typeof indisponibilita>();
  for (const i of indisponibilita) {
    const lista = indisponibilitaPerCamera.get(i.cameraId) ?? [];
    lista.push(i);
    indisponibilitaPerCamera.set(i.cameraId, lista);
  }

  const giorni: string[] = [];
  for (let d = new Date(dal); d < al; d.setDate(d.getDate() + 1)) {
    giorni.push(isoGiorno(d));
  }

  const risultatoCamere = camere.map((c) => {
    const miei = segmentiPerCamera.get(c.id) ?? [];
    const manutenzioni = indisponibilitaPerCamera.get(c.id) ?? [];
    const celle: Record<
      string,
      { stato: Stato; label: string | null; segmentoId: number | null; prenotazioneId: number | null }
    > = {};

    for (const giornoIso of giorni) {
      const giorno = new Date(giornoIso);

      const manutenzione = manutenzioni.find((m) => m.dal <= giorno && giorno < m.al);
      if (manutenzione) {
        celle[giornoIso] = { stato: "fuori_servizio", label: manutenzione.motivo, segmentoId: null, prenotazioneId: null };
        continue;
      }

      const attivo = miei.find((s) => s.dataInizio <= giorno && giorno < s.dataFine);
      if (attivo) {
        const inArrivo = isoGiorno(attivo.dataInizio) === giornoIso;
        celle[giornoIso] = {
          stato: inArrivo ? "in_arrivo" : "occupata",
          label: `${attivo.ospite.nome} ${attivo.ospite.cognome}`,
          segmentoId: attivo.id,
          prenotazioneId: attivo.prenotazioneId,
        };
        continue;
      }
      const partito = miei.find((s) => isoGiorno(s.dataFine) === giornoIso);
      if (partito) {
        celle[giornoIso] = {
          stato: "in_partenza",
          label: `${partito.ospite.nome} ${partito.ospite.cognome}`,
          segmentoId: partito.id,
          prenotazioneId: partito.prenotazioneId,
        };
        continue;
      }
      celle[giornoIso] = { stato: "libera", label: null, segmentoId: null, prenotazioneId: null };
    }

    return { id: c.id, codice: c.codice, piano: c.piano, tipoCameraId: c.tipoCameraId, tipoCameraNome: c.tipoCamera.descrizione, celle };
  });

  // Riepilogo disponibilita' per tipo camera e per giorno: quante ne restano libere,
  // conteggiando anche le prenotazioni generiche (senza camera fisica assegnata).
  const riepilogoTipi = tipiCamera.map((t) => {
    const camereDelTipo = camere.filter((c) => c.tipoCameraId === t.id);
    const genericiDelTipo = segmentiGenericiPerTipo.get(t.id) ?? [];

    const perGiorno: Record<string, { liberi: number; totale: number }> = {};
    for (const giornoIso of giorni) {
      const giorno = new Date(giornoIso);
      const inManutenzione = camereDelTipo.filter((c) =>
        (indisponibilitaPerCamera.get(c.id) ?? []).some((m) => m.dal <= giorno && giorno < m.al)
      ).length;
      const assegnateOccupate = camereDelTipo.filter((c) =>
        (segmentiPerCamera.get(c.id) ?? []).some((s) => s.dataInizio <= giorno && giorno < s.dataFine)
      ).length;
      const genericheOccupate = genericiDelTipo.filter((s) => s.dataInizio <= giorno && giorno < s.dataFine).length;

      perGiorno[giornoIso] = {
        totale: camereDelTipo.length,
        liberi: camereDelTipo.length - inManutenzione - assegnateOccupate - genericheOccupate,
      };
    }

    return { id: t.id, descrizione: t.descrizione, perGiorno };
  });

  return NextResponse.json({ giorni, camere: risultatoCamere, tipiCamera: riepilogoTipi });
}
