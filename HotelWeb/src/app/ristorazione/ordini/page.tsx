import { datiOrdini } from "./actions";
import { OrdiniRoomService } from "./OrdiniRoomService";

export default async function OrdiniPage() {
  return <OrdiniRoomService iniziale={await datiOrdini()} />;
}
