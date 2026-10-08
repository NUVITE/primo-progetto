import { PaginaCapitolo } from "../Capitolo";

export default async function CapitoloPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PaginaCapitolo manuale="operativo" slug={(await params).slug} base="/manuale" />;
}
