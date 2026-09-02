import { listAnhaenge } from "@/lib/domain/anhang";
import type { AnhangTraeger } from "@/lib/anhang-shared";
import { AnhangPanel } from "./anhang-panel";

/** Server-Komponente: lädt die Anhänge und rendert das Panel. */
export async function AnhangCard({
  traeger,
  id,
  revalidate,
  title,
}: {
  traeger: AnhangTraeger;
  id: string;
  revalidate: string;
  title?: string;
}) {
  const rows = await listAnhaenge(traeger, id);
  return (
    <AnhangPanel
      traeger={traeger}
      id={id}
      revalidate={revalidate}
      title={title}
      rows={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
    />
  );
}
