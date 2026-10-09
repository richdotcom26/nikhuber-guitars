import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NKS-Formular-Hintergründe (Lacey/CITES) werden zur Laufzeit per fs gelesen (src/lib/pdf/nks-pdf.tsx)
  outputFileTracingIncludes: {
    "/auftraege/**": ["./src/lib/pdf/nks/**/*"],
  },
};

export default nextConfig;
