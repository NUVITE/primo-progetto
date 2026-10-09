import { datiOggetti } from "./actions";
import { OggettiSmarriti } from "./OggettiSmarriti";

export default async function OggettiSmarritiPage() {
  return <OggettiSmarriti iniziale={await datiOggetti()} />;
}
