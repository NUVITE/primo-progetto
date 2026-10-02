"use server";

import { richiediSuperAdmin } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { aggiornaTabellePolizia, statoTabellePolizia } from "@/lib/tabellePolizia";

export async function azioneAggiornaTabelle() {
  return conEsito(async () => {
    await richiediSuperAdmin();
    const importate = await aggiornaTabellePolizia();
    return { importate, stato: await statoTabellePolizia() };
  });
}
