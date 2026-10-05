import { anhangUrl, listAnhaenge } from "@/lib/domain/anhang";
import type { AnhangTraeger } from "@/lib/anhang-shared";
import { AnhangPanel } from "./anhang-panel";

/** Server-Komponente: lädt die Anhänge und rendert das Panel. */
export async function AnhangCard({
  traeger,
  id,
  revalidate,
  title,
  paste,
  rechnungFlag,
}: {
  traeger: AnhangTraeger;
  id: string;
  revalidate: string;
  title?: string;
  /** Screenshot per Strg+V hochladen (z. B. bei Tickets). */
  paste?: boolean;
  /** Häkchen „Mit Rechnung senden" bei Fotos (Auftrag). */
  rechnungFlag?: boolean;
}) {
  const rows = await listAnhaenge(traeger, id);
  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      previewUrl: r.mime?.startsWith("image/") || r.mime === "application/pdf"
        ? await anhangUrl(r.id, false).catch(() => null)
        : null,
    })),
  );
  return (
    <AnhangPanel
      traeger={traeger}
      id={id}
      revalidate={revalidate}
      title={title}
      paste={paste}
      rechnungFlag={rechnungFlag}
      rows={items}
    />
  );
}
