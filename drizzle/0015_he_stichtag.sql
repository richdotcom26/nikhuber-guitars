CREATE TABLE "he_stichtag" (
	"monat" text PRIMARY KEY NOT NULL,
	"stichtag" date NOT NULL,
	"anzahl" integer NOT NULL,
	"umsatzerwartung_eur" numeric(14, 2) NOT NULL,
	"he_wert_eur" numeric(14, 2) NOT NULL,
	"erstellt_am" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "he_stichtag_position" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monat" text NOT NULL,
	"auftrag_id" uuid,
	"auftrag_nummer" text NOT NULL,
	"seriennummer" text,
	"modell" text,
	"kunde" text,
	"status" text NOT NULL,
	"work_prozent" integer,
	"umsatzerwartung_eur" numeric(14, 2),
	"he_wert_eur" numeric(14, 2)
);
--> statement-breakpoint
ALTER TABLE "he_stichtag_position" ADD CONSTRAINT "he_stichtag_position_monat_he_stichtag_monat_fk" FOREIGN KEY ("monat") REFERENCES "public"."he_stichtag"("monat") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "he_stichtag_position_monat_idx" ON "he_stichtag_position" USING btree ("monat");--> statement-breakpoint
-- Stichtagswerte sind unveränderbar: UPDATE/DELETE verbieten
CREATE OR REPLACE FUNCTION he_stichtag_unveraenderbar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'HE-Stichtagswerte sind unveränderbar (%)', TG_TABLE_NAME;
END $$;
--> statement-breakpoint
CREATE TRIGGER he_stichtag_schutz BEFORE UPDATE OR DELETE ON he_stichtag
  FOR EACH ROW EXECUTE FUNCTION he_stichtag_unveraenderbar();
--> statement-breakpoint
CREATE TRIGGER he_stichtag_position_schutz BEFORE UPDATE OR DELETE ON he_stichtag_position
  FOR EACH ROW EXECUTE FUNCTION he_stichtag_unveraenderbar();
