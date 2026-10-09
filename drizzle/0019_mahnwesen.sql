ALTER TYPE "public"."doc_art" ADD VALUE 'MAHNUNG_1';--> statement-breakpoint
ALTER TYPE "public"."doc_art" ADD VALUE 'MAHNUNG_2';--> statement-breakpoint
ALTER TYPE "public"."doc_art" ADD VALUE 'MAHNUNG_3';--> statement-breakpoint
CREATE TABLE "mahnung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rechnung_id" uuid NOT NULL,
	"stufe" integer NOT NULL,
	"gebuehr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"waehrung" text,
	"offener_betrag" numeric(12, 2),
	"mailversand_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_tage_1" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_tage_2" integer DEFAULT 28 NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_tage_3" integer DEFAULT 42 NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_gebuehr_1" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_gebuehr_2" numeric(12, 2) DEFAULT '5' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "mahn_gebuehr_3" numeric(12, 2) DEFAULT '10' NOT NULL;--> statement-breakpoint
ALTER TABLE "mahnung" ADD CONSTRAINT "mahnung_rechnung_id_rechnung_id_fk" FOREIGN KEY ("rechnung_id") REFERENCES "public"."rechnung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mahnung" ADD CONSTRAINT "mahnung_mailversand_id_mailversand_id_fk" FOREIGN KEY ("mailversand_id") REFERENCES "public"."mailversand"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mahnung_rechnung_idx" ON "mahnung" USING btree ("rechnung_id");