import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  experimental: {
    serverActions: {
      // Video del telefono: tenere margine sopra la dimensione massima accettata in upload.
      bodySizeLimit: "200mb",
    },
  },
};

export default nextConfig;
