import { datiRendiconto } from "./actions";
import { RendicontoTassa } from "./RendicontoTassa";

export default async function RendicontoTassaPage() {
  return <RendicontoTassa iniziale={await datiRendiconto()} />;
}
