/**
 * Collaudo del tracciato Alloggiati Web (168 caratteri, posizioni del manuale ufficiale cap. 12).
 * Non tocca il database né il servizio della Polizia.
 *   npx tsx scripts/collaudo-alloggiati.ts
 */
import { rigaSchedina, type DatiRiga } from "../src/lib/alloggiati";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
// Campo per posizione (da, a inclusi) come nella tabella del manuale.
const campo = (r: string, da: number, a: number) => r.slice(da, a + 1);

const base: DatiRiga = {
  tipoAlloggiato: 17,
  arrivo: new Date("2026-10-01"),
  giorni: 3,
  cognome: "Rossi",
  nome: "Mario",
  sesso: "M",
  dataNascita: new Date("1980-05-17"),
  comuneNascita: "416110001",
  provinciaNascita: "BT",
  statoNascita: "100000100",
  cittadinanza: "100000100",
  documentoTipo: "IDENT",
  documentoNumero: "CA12345AB",
  documentoRilascio: "416110001",
};

const r = rigaSchedina(base);
verifica("Lunghezza 168", r.length === 168, String(r.length));
verifica("Tipo alloggiato (0-1)", campo(r, 0, 1) === "17");
verifica("Data arrivo (2-11)", campo(r, 2, 11) === "01/10/2026");
verifica("Giorni permanenza (12-13)", campo(r, 12, 13) === " 3", campo(r, 12, 13));
verifica("Cognome (14-63)", campo(r, 14, 63) === "Rossi".padEnd(50));
verifica("Nome (64-93)", campo(r, 64, 93) === "Mario".padEnd(30));
verifica("Sesso (94) M=1", campo(r, 94, 94) === "1");
verifica("Data nascita (95-104)", campo(r, 95, 104) === "17/05/1980");
verifica("Comune nascita (105-113)", campo(r, 105, 113) === "416110001");
verifica("Provincia nascita (114-115)", campo(r, 114, 115) === "BT");
verifica("Stato nascita (116-124)", campo(r, 116, 124) === "100000100");
verifica("Cittadinanza (125-133)", campo(r, 125, 133) === "100000100");
verifica("Tipo documento (134-138)", campo(r, 134, 138) === "IDENT");
verifica("Numero documento (139-158)", campo(r, 139, 158) === "CA12345AB".padEnd(20));
verifica("Luogo rilascio (159-167)", campo(r, 159, 167) === "416110001");

const f = rigaSchedina({ ...base, tipoAlloggiato: 19, sesso: "F" });
verifica("Familiare (19): 34 spazi al posto del documento", campo(f, 134, 167) === " ".repeat(34));
verifica("Sesso F=2", campo(f, 94, 94) === "2");

const estero = rigaSchedina({ ...base, tipoAlloggiato: 16, statoNascita: "100000219", comuneNascita: "416110001", provinciaNascita: "BT", cittadinanza: "100000219" });
verifica("Nato all'estero: comune e provincia vuoti", campo(estero, 105, 115) === " ".repeat(11), campo(estero, 105, 115));
verifica("Nato all'estero: stato di nascita", campo(estero, 116, 124) === "100000219");

const lungo = rigaSchedina({ ...base, giorni: 45, cognome: "X".repeat(60) });
verifica("Permanenza oltre 30 giorni = 30", campo(lungo, 12, 13) === "30");
verifica("Cognome oltre 50 caratteri troncato", campo(lungo, 14, 63) === "X".repeat(50) && lungo.length === 168);
verifica("Accenti in UTF-8 contano un carattere", rigaSchedina({ ...base, cognome: "D'Agostino Niccolò" }).length === 168);

console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate");
process.exit(falliti ? 1 : 0);
