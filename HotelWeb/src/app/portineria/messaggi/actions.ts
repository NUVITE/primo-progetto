"use server";

import { richiediPermesso, type UtenteSessione } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { prisma } from "@/lib/prisma";
import { consegnaMessaggio, elencoMessaggi, eliminaMessaggio, ospitiPerMessaggi, registraMessaggio } from "@/lib/messaggi";
import type { MessaggioInput, ModoConsegna } from "@/lib/messaggiRegole";

const permesso = () => richiediPermesso(PERMESSI.PORTINERIA);

async function carica(u: UtenteSessione) {
  const [elenco, ospiti, posta] = await Promise.all([
    elencoMessaggi(u.hotelId),
    ospitiPerMessaggi(u.hotelId),
    prisma.configurazioneEmail.findUnique({ where: { hotelId: u.hotelId }, select: { id: true } }),
  ]);
  return { ...elenco, ospiti, emailConfigurata: !!posta };
}

export async function datiMessaggi() {
  return carica(await permesso());
}

export async function azioneRegistraMessaggio(d: MessaggioInput) {
  return conEsito(async () => {
    const u = await permesso();
    await registraMessaggio(u.hotelId, d, u.nome);
    return carica(u);
  });
}

export async function azioneConsegnaMessaggio(id: number, modo: ModoConsegna, nota: string) {
  return conEsito(async () => {
    const u = await permesso();
    await consegnaMessaggio(u.hotelId, id, modo, nota, u.nome);
    return carica(u);
  });
}

export async function azioneEliminaMessaggio(id: number) {
  return conEsito(async () => {
    const u = await permesso();
    await eliminaMessaggio(u.hotelId, id);
    return carica(u);
  });
}
