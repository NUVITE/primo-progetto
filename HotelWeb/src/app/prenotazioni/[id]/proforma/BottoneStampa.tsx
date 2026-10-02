"use client";

import { Printer } from "lucide-react";
import { Pulsante } from "@/components/ui";

export function BottoneStampa() {
  return (
    <Pulsante variante="primario" icona={Printer} onClick={() => window.print()}>
      Stampa / PDF
    </Pulsante>
  );
}
