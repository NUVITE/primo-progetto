import { redirect } from "next/navigation";

// Il planning vive sulla home: questo percorso resta solo per i vecchi link.
export default function SituazioneCamerePage() {
  redirect("/");
}
