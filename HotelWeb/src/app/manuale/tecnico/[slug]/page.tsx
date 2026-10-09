import { richiediSuperAdmin } from "@/lib/auth";
import { PaginaCapitolo } from "../../Capitolo";

export default async function CapitoloTecnicoPage({ params }: { params: Promise<{ slug: string }> }) {
  await richiediSuperAdmin();
  return <PaginaCapitolo manuale="tecnico" slug={(await params).slug} base="/manuale/tecnico" />;
}
