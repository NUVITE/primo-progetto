"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sbusta } from "@/lib/esito";
import { Pulsante } from "@/components/ui";
import { BottoneStampa } from "@/app/prenotazioni/[id]/proforma/BottoneStampa";
import { azioneNuovoCodice } from "./actions";

export function ComandiCartoncino({ segmentoId }: { segmentoId: number }) {
  const router = useRouter();
  const [conferma, setConferma] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
      {errore && <span className="text-sm font-semibold text-red-800">{errore}</span>}
      {conferma ? (
        <>
          <span className="text-sm">Il QR stampato prima smetterà di funzionare. Procedo?</span>
          <Pulsante
            variante="pericolo"
            dimensione="piccolo"
            onClick={async () => {
              try {
                await sbusta(azioneNuovoCodice(segmentoId));
                setConferma(false);
                router.refresh();
              } catch (e) {
                setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
              }
            }}
          >
            Sì, nuovo codice
          </Pulsante>
          <Pulsante dimensione="piccolo" onClick={() => setConferma(false)}>
            No
          </Pulsante>
        </>
      ) : (
        <Pulsante dimensione="piccolo" icona={RefreshCw} onClick={() => setConferma(true)}>
          Nuovo codice (cartoncino perso)
        </Pulsante>
      )}
      <BottoneStampa />
    </div>
  );
}
