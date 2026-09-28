import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getUtenteCorrente } from "@/lib/auth";
import { NavBar } from "./NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hotel Meridiana — gestionale",
  description: "Gestionale alberghiero",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const utente = await getUtenteCorrente();

  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {utente && <NavBar utente={utente} />}
        {children}
      </body>
    </html>
  );
}
