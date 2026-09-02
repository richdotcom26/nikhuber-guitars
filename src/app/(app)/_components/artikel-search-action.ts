"use server";

import { positionArtikelSuche } from "@/lib/domain/belege";

export interface ArtikelHit {
  id: string;
  name: string;
  artikelNr: string | null;
  vkEur: string | null;
}

export async function searchArtikelAction(q: string): Promise<ArtikelHit[]> {
  const rows = await positionArtikelSuche(q, 25);
  return rows.map((r) => ({ id: r.id, name: r.name, artikelNr: r.artikelNr, vkEur: r.vkEur }));
}
