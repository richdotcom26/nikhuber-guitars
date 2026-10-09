"use client";

import { KundeWechselButton, type KundeMerkmale } from "../_components/kunde-wechsel-button";
import { setKundeAction } from "./actions";

export function SetKundeButton({
  auftragId, kundeId, neu, alt, positionen,
}: { auftragId: string; kundeId: string; neu: KundeMerkmale; alt: KundeMerkmale | null; positionen: number }) {
  return (
    <KundeWechselButton action={setKundeAction} belegId={auftragId} kundeId={kundeId} neu={neu} alt={alt} positionen={positionen} />
  );
}
