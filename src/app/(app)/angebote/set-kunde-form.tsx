"use client";

import { KundeWechselButton, type KundeMerkmale } from "../_components/kunde-wechsel-button";
import { setKundeAction } from "./actions";

export function SetKundeButton({
  angebotId, kundeId, neu, alt, positionen,
}: { angebotId: string; kundeId: string; neu: KundeMerkmale; alt: KundeMerkmale | null; positionen: number }) {
  return (
    <KundeWechselButton action={setKundeAction} belegId={angebotId} kundeId={kundeId} neu={neu} alt={alt} positionen={positionen} />
  );
}
