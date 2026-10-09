ALTER TYPE "public"."anhang_art" ADD VALUE 'VERLEIH';--> statement-breakpoint
ALTER TYPE "public"."doc_art" ADD VALUE 'VERLEIH_VEREINBARUNG';--> statement-breakpoint
ALTER TYPE "public"."doc_art" ADD VALUE 'VERLEIH_ERINNERUNG';--> statement-breakpoint
CREATE TABLE "verleih" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auftrag_id" uuid NOT NULL,
	"kunde_id" uuid NOT NULL,
	"versendet_am" date,
	"verfuegbar_bis" date,
	"zurueck_am" date,
	"zweck" text,
	"zubehoer" text,
	"wert" numeric(12, 2),
	"bemerkung" text,
	"vereinbarung_anhang_id" uuid,
	"unterschrift_token" text,
	"unterschrift_angefordert_am" timestamp with time zone,
	"unterschrieben_am" timestamp with time zone,
	"unterschrieben_name" text,
	"unterschrift_ip" text,
	"unterschrieben_anhang_id" uuid,
	"letzte_erinnerung_am" timestamp with time zone,
	"erinnerungen" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	CONSTRAINT "verleih_unterschrift_token_unique" UNIQUE("unterschrift_token")
);
--> statement-breakpoint
ALTER TABLE "verleih" ADD CONSTRAINT "verleih_auftrag_id_auftrag_id_fk" FOREIGN KEY ("auftrag_id") REFERENCES "public"."auftrag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verleih" ADD CONSTRAINT "verleih_kunde_id_kunde_id_fk" FOREIGN KEY ("kunde_id") REFERENCES "public"."kunde"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verleih_auftrag_idx" ON "verleih" USING btree ("auftrag_id");--> statement-breakpoint
CREATE INDEX "verleih_kunde_idx" ON "verleih" USING btree ("kunde_id");