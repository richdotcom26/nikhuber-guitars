import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

interface ZaehlerRow {
  art: "ANGEBOT" | "AUFTRAG" | "RECHNUNG";
  jahr: number;
  stand: number;
}

const PREFIX: Record<ZaehlerRow["art"], string> = {
  ANGEBOT: "AN",
  AUFTRAG: "A",
  RECHNUNG: "RG",
};
const LABEL: Record<ZaehlerRow["art"], string> = {
  ANGEBOT: "Angebote",
  AUFTRAG: "Aufträge",
  RECHNUNG: "Rechnungen",
};

export function ZaehlerPanel({ rows }: { rows: ZaehlerRow[] }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Belegnummernkreise</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-neutral-500">
          Laufende Zählerstände je Belegart und Jahr. Die nächste vergebene Nummer ist{" "}
          <span className="font-medium">Stand + 1</span>. Nur zur Anzeige — die Vergabe erfolgt
          automatisch beim Erzeugen eines Belegs.
        </p>
        <Table>
          <THead>
            <TR>
              <TH>Belegart</TH>
              <TH className="w-20">Jahr</TH>
              <TH className="w-24 text-right">Stand</TH>
              <TH className="w-48">Nächste Nummer</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={`${r.art}-${r.jahr}`}>
                <TD>{LABEL[r.art]}</TD>
                <TD>{r.jahr}</TD>
                <TD className="text-right font-mono">{r.stand}</TD>
                <TD className="font-mono text-neutral-600">
                  {PREFIX[r.art]}-{r.jahr}-{String(r.stand + 1).padStart(4, "0")}
                </TD>
              </TR>
            ))}
            {rows.length === 0 ? (
              <TR><TD colSpan={4} className="py-4 text-center text-neutral-400">
                Noch keine Nummern vergeben.
              </TD></TR>
            ) : null}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
