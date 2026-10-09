import { NextResponse } from "next/server";
import { istMonatsletzter, schreibeHeStichtag } from "@/lib/domain/he-stichtag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel-Cron (vercel.json, täglich abends): am letzten Tag des Monats den Stand HE festschreiben.
 * Ist CRON_SECRET gesetzt, muss der Aufruf ihn als Bearer-Token mitsenden (macht Vercel automatisch).
 * Der Aufruf ist idempotent — ein bestehender Stichtag wird nie verändert.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!istMonatsletzter()) return NextResponse.json({ ok: true, skipped: "nicht Monatsletzter" });
  try {
    return NextResponse.json({ ok: true, ...(await schreibeHeStichtag()) });
  } catch (e) {
    console.error("[cron/he-stichtag]", e);
    return NextResponse.json({ error: "fehlgeschlagen" }, { status: 500 });
  }
}
