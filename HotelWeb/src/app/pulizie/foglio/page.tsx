import { datiFoglioPiani } from "./actions";
import { FoglioPiani } from "./FoglioPiani";

export default async function FoglioPianiPage() {
  return <FoglioPiani iniziale={await datiFoglioPiani()} />;
}
