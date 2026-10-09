ALTER TYPE "public"."auftrag_status" ADD VALUE 'BESTAETIGT' BEFORE 'WERKSTATT';--> statement-breakpoint
CREATE TABLE "auftrag_ereignis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auftrag_id" uuid NOT NULL,
	"art" text NOT NULL,
	"von" text,
	"nach" text,
	"text" text,
	"zeit" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_token" text;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_angefordert_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_unterschrieben_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_unterschrieben_name" text;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_unterschrift_ip" text;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_anhang_id" uuid;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "ab_unterschrieben_anhang_id" uuid;--> statement-breakpoint
ALTER TABLE "auftrag_ereignis" ADD CONSTRAINT "auftrag_ereignis_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auftrag_ereignis_auftrag_idx" ON "auftrag_ereignis" USING btree ("auftrag_id","zeit");--> statement-breakpoint
ALTER TABLE "auftrag" ADD CONSTRAINT "auftrag_ab_token_unique" UNIQUE("ab_token");