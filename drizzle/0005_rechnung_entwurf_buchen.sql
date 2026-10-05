-- Rechnung: Entwurf ohne Nummer → Buchen (Nummer, Datum, Sperre, E-Rechnung) — handgeprüft.
-- Hinweis: drizzle-kit wollte rechnung_belegart neu anlegen (Cast scheitert an Bestandswert 'GUTSCHRIFT');
-- stattdessen Wert umbenennen.
ALTER TYPE "public"."rechnung_status" ADD VALUE IF NOT EXISTS 'ENTWURF';--> statement-breakpoint
ALTER TYPE "public"."rechnung_status" ADD VALUE IF NOT EXISTS 'GEBUCHT';--> statement-breakpoint
ALTER TYPE "public"."rechnung_status" ADD VALUE IF NOT EXISTS 'STORNIERT';--> statement-breakpoint
ALTER TYPE "public"."rechnung_belegart" RENAME VALUE 'GUTSCHRIFT' TO 'RECHNUNGSKORREKTUR';--> statement-breakpoint
ALTER TABLE "rechnung" ALTER COLUMN "nummer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rechnung" ALTER COLUMN "status" SET DEFAULT 'ENTWURF';--> statement-breakpoint
ALTER TABLE "beleg_position" ADD COLUMN "mwst_satz" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "beleg_position" ADD COLUMN "quell_position_id" uuid;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "zahlungsbedingung_text" text;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "mwst_satz" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "beleg_position" ADD CONSTRAINT "beleg_position_quell_position_id_beleg_position_id_fk" FOREIGN KEY ("quell_position_id") REFERENCES "public"."beleg_position"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "beleg_position_quell_idx" ON "beleg_position" USING btree ("quell_position_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rechnung_nummer_gebucht_uq" ON "rechnung" USING btree ("nummer") WHERE "rechnung"."festgeschrieben_am" is not null;
