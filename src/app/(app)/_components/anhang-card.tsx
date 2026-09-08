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
}: {
  traeger: AnhangTraeger;
  id: string;
  revalidate: string;
  title?: string;
  /** Screenshot per Strg+V hochladen (z. B. bei Tickets). */
  paste?: boolean;
}) {
  const rows = await listAnhaenge(traeger, id);
  const items = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      previewUrl: r.mime?.startsWith("image/")
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
      rows={items}
    />
  );
}
