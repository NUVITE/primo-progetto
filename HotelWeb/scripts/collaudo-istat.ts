/**
 * Collaudo dei tracciati ISTAT (Ross1000 e SPOT) su un caso costruito a mano: ospite singolo,
 * famiglia, gruppo straniero, familiare che arriva un giorno dopo, struttura chiusa.
 * Non tocca il database né i servizi delle Regioni.
 *   npx tsx scripts/collaudo-istat.ts
 * Con SPOT_XSD=<cartella con movimentogiornaliero.xsd e datatype-0.6.xsd> valida anche il file
 * SPOT con lo schema ufficiale (serve python con lxml).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { avvioSpot, movimentoRoss1000, movimentoSpot, scadenzaGiorno, type GiornoIstat, type Soggiorno } from "../src/lib/movimentoIstat";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};

const ITALIA = "100000100";
const GERMANIA = "100000216";
const ROMA = "412058091";
const TRANI = "416110009";

function notti(dal: string, al: string, segmento: number) {
  const m = new Map<string, number>();
  for (let d = new Date(`${dal}T00:00:00Z`); d.toISOString().slice(0, 10) < al; d = new Date(d.getTime() + 86_400_000)) m.set(d.toISOString().slice(0, 10), segmento);
  return m;
}

let n = 100;
function ospite(p: Partial<Soggiorno> & { arrivo: string; partenza: string; segmento: number }): Soggiorno {
  n += 1;
  const { segmento, ...resto } = p;
  return {
    idswh: String(n),
    prenotazioneId: 1,
    ospiteId: n,
    nome: `Ospite ${n}`,
    tipo: 16,
    capoOspiteId: null,
    partito: true,
    notti: notti(p.arrivo, p.partenza, segmento),
    sesso: "M",
    dataNascita: new Date("1980-05-17"),
    cittadinanza: ITALIA,
    statoNascita: ITALIA,
    comuneNascita: TRANI,
    residenzaStato: ITALIA,
    residenzaComune: ROMA,
    cognome: "Rossi",
    nomeProprio: "Mario",
    motivo: null,
    mezzoArrivo: null,
    mezzoMovimento: null,
    postoLetto: true,
    ...resto,
  };
}

// Già presente prima del primo giorno (va nell'avvio SPOT).
const gia = ospite({ arrivo: "2026-09-08", partenza: "2026-09-11", segmento: 1, prenotazioneId: 9 });
const singolo = ospite({ arrivo: "2026-09-10", partenza: "2026-09-12", segmento: 2, prenotazioneId: 2, motivo: "BALNEARE", mezzoArrivo: "AUTO" });
const capo = ospite({ arrivo: "2026-09-10", partenza: "2026-09-13", segmento: 3, prenotazioneId: 3, tipo: 17, motivo: "Culturale", mezzoArrivo: "Treno" });
const figlia = ospite({
  arrivo: "2026-09-10",
  partenza: "2026-09-13",
  segmento: 3,
  prenotazioneId: 3,
  tipo: 19,
  capoOspiteId: capo.ospiteId,
  sesso: "F",
  dataNascita: new Date("2015-09-11"),
});
// Arriva un giorno dopo il capo: per SPOT non può stare tra i componenti.
const nonno = ospite({ arrivo: "2026-09-11", partenza: "2026-09-13", segmento: 3, prenotazioneId: 3, tipo: 19, capoOspiteId: capo.ospiteId });
const capogruppo = ospite({
  arrivo: "2026-09-10",
  partenza: "2026-09-12",
  segmento: 4,
  prenotazioneId: 4,
  tipo: 18,
  cittadinanza: GERMANIA,
  residenzaStato: GERMANIA,
  residenzaComune: null,
  statoNascita: GERMANIA,
  comuneNascita: null,
  cognome: "Müller & Söhne <test>",
});
const membro = ospite({
  arrivo: "2026-09-10",
  partenza: "2026-09-12",
  segmento: 5,
  prenotazioneId: 4,
  tipo: 20,
  capoOspiteId: capogruppo.ospiteId,
  cittadinanza: GERMANIA,
  residenzaStato: GERMANIA,
  residenzaComune: null,
  sesso: "F",
});
const tutti = [gia, singolo, capo, figlia, nonno, capogruppo, membro];

function giorno(g: string, extra: Partial<GiornoIstat> = {}): GiornoIstat {
  const stanotte = tutti.filter((s) => s.notti.has(g));
  return {
    giorno: g,
    aperto: true,
    camereDisponibili: 10,
    lettiDisponibili: 22,
    camereOccupate: new Set(stanotte.map((s) => s.notti.get(g))).size,
    presenti: stanotte.length,
    arrivi: tutti.filter((s) => s.arrivo === g),
    partenze: tutti.filter((s) => s.partenza === g),
    incompleti: [],
    avvisi: [],
    ...extra,
  };
}

// ---------------- Ross1000 ----------------
const r10 = movimentoRoss1000(giorno("2026-09-10"), tutti).xml;
verifica("Ross1000: data aaaammgg", r10.includes("<data>20260910</data>"));
verifica("Ross1000: struttura nell'ordine del tracciato", /<struttura><apertura>SI<\/apertura><camereoccupate>5<\/camereoccupate><cameredisponibili>10<\/cameredisponibili><lettidisponibili>22<\/lettidisponibili><\/struttura>/.test(r10), r10.slice(0, 200));
verifica("Ross1000: 5 arrivi il 10", (r10.match(/<arrivo>/g) ?? []).length === 5);
verifica("Ross1000: il capo prima della figlia", r10.indexOf(`<idswh>${capo.idswh}</idswh>`) < r10.indexOf(`<idswh>${figlia.idswh}</idswh>`));
verifica("Ross1000: idcapo della figlia = idswh del capo", r10.includes(`<idswh>${figlia.idswh}</idswh><tipoalloggiato>19</tipoalloggiato><idcapo>${capo.idswh}</idcapo>`));
verifica("Ross1000: idcapo vuoto per il singolo", r10.includes(`<idswh>${singolo.idswh}</idswh><tipoalloggiato>16</tipoalloggiato><idcapo></idcapo>`));
verifica("Ross1000: motivo e mezzo in maiuscolo", r10.includes("<tipoturismo>CULTURALE</tipoturismo><mezzotrasporto>TRENO</mezzotrasporto>"));
verifica("Ross1000: la figlia eredita motivo e mezzo del capo", (r10.match(/<tipoturismo>CULTURALE<\/tipoturismo>/g) ?? []).length === 2);
verifica("Ross1000: valore non della lista = NON SPECIFICATO", r10.includes(`<tipoturismo>NON SPECIFICATO</tipoturismo><mezzotrasporto>NON SPECIFICATO</mezzotrasporto>`));
verifica("Ross1000: residente all'estero, luogo residenza vuoto", r10.includes(`<statoresidenza>${GERMANIA}</statoresidenza><luogoresidenza></luogoresidenza>`));
verifica("Ross1000: nato all'estero, comune di nascita vuoto", r10.includes(`<statonascita>${GERMANIA}</statonascita><comunenascita></comunenascita>`));
verifica("Ross1000: caratteri speciali protetti", r10.includes("Müller &amp; Söhne &lt;test&gt;"));
verifica("Ross1000: data di nascita aaaammgg", r10.includes("<datanascita>20150911</datanascita>"));
const r12 = movimentoRoss1000(giorno("2026-09-12"), tutti).xml;
verifica("Ross1000: partenze con data di arrivo", r12.includes(`<partenza><idswh>${singolo.idswh}</idswh><tipoalloggiato>16</tipoalloggiato><arrivo>20260910</arrivo></partenza>`));
verifica("Ross1000: nessun arrivi vuoto", !r12.includes("<arrivi>"));
const chiuso = movimentoRoss1000(giorno("2026-12-25", { aperto: false, camereDisponibili: 0, lettiDisponibili: 0, camereOccupate: 0 }), tutti).xml;
verifica("Ross1000: chiuso = NO e zeri", chiuso.includes("<apertura>NO</apertura><camereoccupate>0</camereoccupate><cameredisponibili>0</cameredisponibili><lettidisponibili>0</lettidisponibili>"));
const conRettifica = movimentoRoss1000(giorno("2026-09-12"), tutti, [{ idswh: "999", tipo: 16, arrivo: "2026-09-12" }]);
verifica("Ross1000: ospite tolto = rettifica di eliminazione", conRettifica.xml.includes("<rettifiche><eliminazione><idswh>999</idswh><tipoalloggiato>16</tipoalloggiato><arrivo>20260912</arrivo></eliminazione></rettifiche></movimento>"));
verifica("Ross1000: la rettifica non cambia l'impronta del giorno", conRettifica.impronta === movimentoRoss1000(giorno("2026-09-12"), tutti).impronta);
verifica("Ross1000: impronta cambia se cambiano i dati", movimentoRoss1000(giorno("2026-09-12", { camereOccupate: 7 }), tutti).impronta !== conRettifica.impronta);

// ---------------- SPOT ----------------
const s10 = movimentoSpot(giorno("2026-09-10"), tutti).xml;
verifica("SPOT: tipo MP e data ISO", s10.startsWith('<movimento type="MP" data="2026-09-10">'));
verifica("SPOT: la figlia è un componente del capo (17)", new RegExp(`<codiceclientesr>${capo.idswh}</codiceclientesr>.*<tipologiaalloggiato>17</tipologiaalloggiato><eta>46</eta><componenti><componente><codiceclientesr>${figlia.idswh}</codiceclientesr>`).test(s10));
verifica("SPOT: età della figlia al giorno di arrivo (10 anni, compie 11 il giorno dopo)", s10.includes(`<codiceclientesr>${figlia.idswh}</codiceclientesr><sesso>F</sesso><cittadinanza>${ITALIA}</cittadinanza><comuneresidenza>${ROMA}</comuneresidenza><occupazionepostoletto>si</occupazionepostoletto><eta>10</eta>`));
verifica("SPOT: gruppo straniero con paese di residenza", s10.includes(`<paeseresidenza>${GERMANIA}</paeseresidenza>`) && s10.includes("<tipologiaalloggiato>18</tipologiaalloggiato>"));
verifica("SPOT: niente nomi (tracciato anonimo)", !s10.includes("Rossi") && !s10.includes("Müller"));
verifica("SPOT: codici SPOT validi, valori Ross1000 omessi", s10.includes("<mezzotrasportoarrivo>AUTO</mezzotrasportoarrivo><motivazioniviaggio>BALNEARE</motivazioniviaggio>") && !s10.includes("Culturale"));
const s11 = movimentoSpot(giorno("2026-09-11"), tutti).xml;
verifica("SPOT: chi arriva dopo il capo va come ospite singolo", s11.includes(`<codiceclientesr>${nonno.idswh}</codiceclientesr>`) && s11.includes("<tipologiaalloggiato>16</tipologiaalloggiato>"));
verifica("SPOT: partenze solo di singoli e capi", s11.includes(`<partenze><codiceclientesr>${gia.idswh}</codiceclientesr></partenze>`));
const s13 = movimentoSpot(giorno("2026-09-13"), tutti).xml;
verifica("SPOT: al 13 partono il capo e il nonno, non la figlia", s13.includes(`<partenze><codiceclientesr>${capo.idswh}</codiceclientesr><codiceclientesr>${nonno.idswh}</codiceclientesr></partenze>`));
verifica("SPOT: giorno senza movimenti = NM", movimentoSpot(giorno("2026-09-20"), tutti).xml.startsWith('<movimento type="NM"'));
verifica("SPOT: chiuso = EC", movimentoSpot(giorno("2026-12-25", { aperto: false, camereDisponibili: 0, lettiDisponibili: 0, camereOccupate: 0 }), tutti).xml.startsWith('<movimento type="EC"'));
const avvio = avvioSpot("2026-09-09", tutti);
verifica("SPOT: avvio con chi era già presente", avvio === `<movimento type="MP" data="2026-09-09"><arrivi>${avvio.match(/<arrivo>.*<\/arrivo>/)?.[0]}</arrivi></movimento>` && avvio.includes(`<codiceclientesr>${gia.idswh}</codiceclientesr>`) && !avvio.includes(`<codiceclientesr>${singolo.idswh}</codiceclientesr>`));

verifica("Termine Ross1000: fine del mese dopo", scadenzaGiorno("ROSS1000", "2026-10-05") === "2026-11-30" && scadenzaGiorno("ROSS1000", "2026-12-31") === "2027-01-31");
verifica("Termine SPOT: 10 del mese dopo", scadenzaGiorno("SPOT", "2026-10-05") === "2026-11-10" && scadenzaGiorno("SPOT", "2026-12-31") === "2027-01-10");

// Validazione con lo schema ufficiale SPOT (facoltativa).
const xsd = process.env.SPOT_XSD;
if (xsd) {
  const file =
    `<?xml version="1.0" encoding="UTF-8"?>\n<movimenti vendor="HotelWeb">` +
    avvio +
    ["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13"].map((g) => movimentoSpot(giorno(g), tutti).xml).join("") +
    movimentoSpot(giorno("2026-12-25", { aperto: false, camereDisponibili: 0, lettiDisponibili: 0, camereOccupate: 0 }), tutti).xml +
    "</movimenti>\n";
  const dir = mkdtempSync(join(tmpdir(), "spot-"));
  writeFileSync(join(dir, "spot.xml"), file);
  const py = `from lxml import etree\nimport sys\ns=etree.XMLSchema(etree.parse(sys.argv[1]))\nd=etree.parse(sys.argv[2])\nok=s.validate(d)\nprint("valido" if ok else "\\n".join(str(e) for e in s.error_log))`;
  const out = execFileSync("python", ["-c", py, join(xsd, "movimentogiornaliero.xsd"), join(dir, "spot.xml")]).toString().trim();
  verifica("SPOT: file valido per lo schema ufficiale XSD 0.6", out === "valido", out);
}

console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate");
process.exit(falliti ? 1 : 0);
