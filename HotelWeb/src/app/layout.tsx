import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import { getUtenteCorrente } from "@/lib/auth";
import { Cornice } from "./BarraLaterale";
import { COOKIE_BARRA, leggiPreferenzeBarra } from "./menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HotelWeb — gestionale",
  description: "Gestionale alberghiero",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const utente = await getUtenteCorrente();
  const preferenze = leggiPreferenzeBarra((await cookies()).get(COOKIE_BARRA)?.value);

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {utente ? (
          <Cornice
            preferenze={preferenze}
            dati={{
              nomeUtente: utente.nome,
              ruoloNome: utente.ruoloNome,
              superAdmin: utente.superAdmin,
              permessi: utente.permessi,
              hotelId: utente.hotelId,
              hotelNome: utente.hotelNome,
              hotels: utente.hotels,
            }}
          >
            {children}
          </Cornice>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
