"use server";

import { auftragPickerListe } from "@/lib/domain/holz";

export interface AuftragHit {
  id: string;
  nummer: string;
  kd: string | null;
}

export async function auftragSearchAction(q: string): Promise<AuftragHit[]> {
  if (!q.trim()) return [];
  const rows = await auftragPickerListe(q, 15);
  return rows.map((r) => ({
    id: r.id,
    nummer: r.nummer,
    kd: r.kdFirma || r.kdNachname || null,
  }));
}
