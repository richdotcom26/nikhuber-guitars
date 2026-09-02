import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { BelegRenderData } from "@/lib/domain/beleg-render";
import { BelegPdf } from "./beleg-pdf";

/** Beleg als PDF-Buffer rendern (Node-Runtime). */
export async function renderBelegPdf(data: BelegRenderData): Promise<Buffer> {
  return renderToBuffer(<BelegPdf data={data} />);
}
