ALTER TABLE "angebot" ADD COLUMN "versandkosten" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "angebot" ADD COLUMN "versand_bezeichnung" text;--> statement-breakpoint
ALTER TABLE "angebot" ADD COLUMN "versand_artikel_id" uuid;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "versandkosten" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "versand_bezeichnung" text;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "versand_artikel_id" uuid;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "versandkosten" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "versand_bezeichnung" text;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "versand_artikel_id" uuid;--> statement-breakpoint
ALTER TABLE "angebot" ADD CONSTRAINT "angebot_versand_artikel_id_artikel_id_fk" FOREIGN KEY ("versand_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_versand_artikel_id_artikel_id_fk" FOREIGN KEY ("versand_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung" ADD CONSTRAINT "rechnung_versand_artikel_id_artikel_id_fk" FOREIGN KEY ("versand_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE no action ON UPDATE no action;