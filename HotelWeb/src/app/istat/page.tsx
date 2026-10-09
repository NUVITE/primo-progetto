import { datiIstat } from "./actions";
import { MovimentoIstat } from "./MovimentoIstat";

export default async function IstatPage() {
  return <MovimentoIstat iniziale={await datiIstat()} />;
}
