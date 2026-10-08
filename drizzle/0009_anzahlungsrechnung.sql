ALTER TYPE "public"."rechnung_belegart" ADD VALUE 'ANZAHLUNGSRECHNUNG';--> statement-breakpoint
CREATE TABLE "rechnung_anzahlung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rechnung_id" uuid NOT NULL,
	"anzahlung_rechnung_id" uuid NOT NULL,
	"netto" numeric(12, 2) NOT NULL,
	"mwst" numeric(12, 2) NOT NULL,
	"brutto" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "rechnung_anzahlung" ADD CONSTRAINT "rechnung_anzahlung_rechnung_id_rechnung_id_fk" FOREIGN KEY ("rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rechnung_anzahlung" ADD CONSTRAINT "rechnung_anzahlung_anzahlung_rechnung_id_rechnung_id_fk" FOREIGN KEY ("anzahlung_rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rechnung_anzahlung_rechnung_idx" ON "rechnung_anzahlung" USING btree ("rechnung_id");--> statement-breakpoint
CREATE INDEX "rechnung_anzahlung_az_idx" ON "rechnung_anzahlung" USING btree ("anzahlung_rechnung_id");