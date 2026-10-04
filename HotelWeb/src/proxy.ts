import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_SESSIONE = "hotelweb_sessione";

function chiaveSegreta() {
  const segreto = process.env.AUTH_SECRET;
  if (!segreto) throw new Error("AUTH_SECRET non impostata nel .env.");
  return new TextEncoder().encode(segreto);
}

async function sessioneValida(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESSIONE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, chiaveSegreta());
    return true;
  } catch {
    return false;
  }
}

// Verifica solo che ci sia una sessione firmata valida (login effettuato). Il controllo del
// ruolo per le pagine riservate (es. gestione camere/utenti) resta nella pagina stessa
// (richiediRuolo in src/lib/auth.ts), perché qui non conviene interrogare il database a ogni
// richiesta solo per leggere il ruolo.
export async function proxy(request: NextRequest) {
  if (await sessioneValida(request)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const url = new URL("/login", request.url);
  url.searchParams.set("da", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Tutto tranne /login, la pagina pubblica del room service (/rs/<codice del soggiorno>), gli asset
    // statici e le richieste interne di Next.js.
    "/((?!login|rs/|_next/static|_next/image|favicon.ico).*)",
  ],
};
