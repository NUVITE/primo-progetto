import "server-only";
import path from "node:path";

// In produzione i file stanno fuori dalla cartella dell'app, cosi' non
// vengono persi quando si ridistribuisce una nuova versione.
export const PRIVATE_UPLOADS_ROOT = path.resolve(
  process.env.PRIVATE_UPLOADS_DIR ?? path.join(process.cwd(), "private-uploads")
);
