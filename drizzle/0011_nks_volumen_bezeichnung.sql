ALTER TABLE "holz_volumen" ADD COLUMN "bezeichnung" text NOT NULL;--> statement-breakpoint
ALTER TABLE "artikel" ADD CONSTRAINT "artikel_holz_volumen_id_holz_volumen_id_fk" FOREIGN KEY ("holz_volumen_id") REFERENCES "public"."holz_volumen"("id") ON DELETE set null ON UPDATE no action;
