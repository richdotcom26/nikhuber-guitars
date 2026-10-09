import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NKS-Formular-Hintergründe (Lacey/CITES) werden zur Laufzeit per fs gelesen (src/lib/pdf/nks-pdf.tsx)
  outputFileTracingIncludes: {
    // Belegschrift (Noto Sans, für PDF/A-3 eingebettet) — Belege werden in vielen Routen gerendert
    "/**": ["./src/lib/pdf/fonts/**/*", "./src/lib/pdf/logo-grau.jpg"],
    "/auftraege/**": ["./src/lib/pdf/nks/**/*"],
    "/verleih/**": ["./src/lib/pdf/nks/**/*"],
    "/unterschrift/**": ["./src/lib/pdf/nks/**/*"],
  },
};

export default nextConfig;
