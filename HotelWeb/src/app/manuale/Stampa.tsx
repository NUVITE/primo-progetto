"use client";

import { Printer } from "lucide-react";
import { Pulsante } from "@/components/ui";

export function Stampa() {
  return (
    <Pulsante dimensione="piccolo" icona={Printer} onClick={() => window.print()}>
      Stampa
    </Pulsante>
  );
}
