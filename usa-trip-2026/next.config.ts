import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  experimental: {
    serverActions: {
      // Video del telefono: tenere margine sopra la dimensione massima accettata in upload.
      bodySizeLimit: "200mb",
    },
    // Limite SEPARATO applicato da proxy.ts (autenticazione) su ogni
    // richiesta che passa di li' (/foto incluso): di default e' 10MB e
    // tronca in silenzio il corpo, a prescindere da serverActions.bodySizeLimit
    // sopra. Senza questo, un video di poche decine di MB arrivava troncato
    // al server action, dando "Unexpected end of form" invece di essere
    // accettato. Va allineato allo stesso valore.
    proxyClientMaxBodySize: "200mb",
  },
};

export default nextConfig;
