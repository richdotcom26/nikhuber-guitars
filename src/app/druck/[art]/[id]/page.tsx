import { notFound, redirect } from "next/navigation";
import { BelegDokument } from "@/components/beleg-dokument";
import { type BelegArt, renderBelegData } from "@/lib/domain/beleg-render";
import { isDomainError } from "@/lib/domain/errors";
import { PrintButton } from "./print-button";

const ARTEN: BelegArt[] = ["angebot", "auftrag", "rechnung"];

export default async function DruckPage({
  params,
}: {
  params: Promise<{ art: string; id: string }>;
}) {
  const { art, id } = await params;
  if (!ARTEN.includes(art as BelegArt)) notFound();

  let data;
  try {
    data = await renderBelegData(art as BelegArt, id);
  } catch (e) {
    if (isDomainError(e)) {
      if (e.code === "UNAUTHENTICATED") redirect("/login");
      if (e.code === "NOT_FOUND") notFound();
    }
    throw e;
  }

  return (
    <div style={{ padding: "24px 16px", background: "#f5f5f5", minHeight: "100vh" }}>
      <div className="no-print" style={{ maxWidth: "186mm", margin: "0 auto 16px", display: "flex", gap: 8, alignItems: "center" }}>
        <PrintButton />
        <a
          href={`/druck/${art}/${id}/pdf`}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13, padding: "6px 14px", borderRadius: 6,
            border: "1px solid #d4d4d4", background: "#fff", color: "#111",
          }}
        >
          PDF herunterladen
        </a>
        <a
          href={art === "auftrag" ? `/auftraege/${id}` : `/${art}e/${id}`}
          style={{ fontSize: 13, color: "#2563eb", alignSelf: "center" }}
        >
          ← zurück zum Beleg
        </a>
      </div>
      <div style={{ background: "#fff", padding: "18mm 16mm", maxWidth: "210mm", margin: "0 auto", boxShadow: "0 1px 6px rgba(0,0,0,.15)" }}>
        <BelegDokument data={data} />
      </div>
    </div>
  );
}
