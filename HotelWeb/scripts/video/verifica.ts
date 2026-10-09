/**
 * Video "Verifica in due passaggi": attivazione dal profilo e accesso successivo con il codice.
 * Utente dimostrativo temporaneo (Reception, Hotel Meridiana), creato e cancellato dallo script; il
 * codice dell'app si calcola qui dal segreto mostrato a video, come farebbe il telefono.
 *   npx tsx scripts/video/verifica.ts
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { hotp } from "../../src/lib/totp";
import { Regista } from "./regista";
import { cancellaUtenteDemo, conPulizia, sessione, utenteDemo } from "./scena";

const EMAIL = "elena.ricevimento@hotelmeridiana.test";
const passo = () => Math.floor(Date.now() / 30000);

conPulizia(
  async () => {
    const hotel = await prisma.hotel.findFirstOrThrow({ where: { nome: "Hotel Meridiana" } });
    await cancellaUtenteDemo(EMAIL);
    const { password } = await utenteDemo(hotel.id, EMAIL, "Elena Ricevimento", "Reception");

    const r = await Regista.apri("verifica", await sessione(EMAIL, hotel.id));
    await r.riscalda("/profilo", "/login", "/login/verifica");
    await r.vai("/", "a[href='/profilo']");
    await r.cartello("Verifica in due passaggi", "Dopo la password, un codice di 6 cifre dall'app sul telefono: chi scopre la password, senza il telefono, non entra.", "HotelWeb · video dimostrativo");
    await r.clic("a[href='/profilo']", "Si attiva dal proprio profilo: clic sul proprio nome, in basso nel menu.");
    await r.aspetta("button:has-text('Mostra il codice QR')");
    await r.fumetto("Serve un'app di autenticazione gratuita: Google o Microsoft Authenticator, o un'altra.", "button:has-text('Mostra il codice QR')");
    await r.clic("button:has-text('Mostra il codice QR')");
    await r.aspetta("svg");
    await r.fumetto("Con l'app si inquadra il codice QR: da quel momento l'app mostra un codice nuovo ogni 30 secondi.", "div[class*='w-[200px]']");

    const segreto = (await r.pagina.locator("span.font-mono.font-semibold").first().textContent())!.trim();
    const usato = passo();
    await r.scrivi("input[autocomplete='one-time-code']", hotp(segreto, usato), "Si scrive il codice che compare nell'app…");
    await r.clic("button:has-text('Attiva')", "…e si attiva.");
    await r.aspetta("text=Codici di riserva");
    await r.fumetto("I codici di riserva servono se il telefono non c'è: si salvano subito, non si rivedono più.", "text=Codici di riserva");
    await r.clic("button:has-text('Li ho salvati')");
    await r.aspetta("text=Verifica in due passaggi attivata");
    await r.fumetto("Fatto: la verifica è attiva.", "text=Verifica in due passaggi attivata");

    await r.esci();
    await r.vai("/login", "input[name=email]");
    await r.fumetto("Il giorno dopo, al nuovo accesso: email e password, come sempre…");
    await r.scrivi("input[name=email]", EMAIL);
    await r.scrivi("input[name=password]", password);
    await r.clic("button[type=submit]");
    await r.aspetta("input[name=codice]");
    await r.fumetto("…poi il codice dell'app.", "input[name=codice]");
    // Lo stesso codice non vale due volte: si aspetta quello successivo.
    while (passo() === usato) await r.attendi(1000);
    await r.scrivi("input[name=codice]", hotp(segreto, passo()));
    await r.fumetto("Sul proprio computer si può evitare il codice per 30 giorni; mai su un computer usato da altri.", "label:has-text('Ricorda questo dispositivo')");
    await r.clic("button[type=submit]");
    await r.pagina.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
    await r.attendi(1500);
    await r.cartello(
      "Verifica attiva",
      "È obbligatoria per il fornitore e per chi gestisce utenti o impostazioni. Telefono perso: chi gestisce gli utenti la azzera dalla pagina Utenti.",
      "Il resto è nel Manuale, capitolo Utenti e sicurezza",
    );
    console.log("Video salvato in", await r.chiudi());
  },
  () => cancellaUtenteDemo(EMAIL),
);
