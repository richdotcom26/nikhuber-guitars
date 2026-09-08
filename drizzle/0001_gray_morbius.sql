-- Ticketsystem (Bugs / Wünsche / Fragen zur Web-App)
-- Hinweis: db:generate hatte zusätzlich Alt-Änderungen (todo_kommentar, artikel.aktuell,
-- *.farbe, app_user.abwesenheit …) mitgeneriert, die längst in der Supabase-DB stehen —
-- diese wurden hier entfernt. `npm run db:push` gleicht ohnehin gegen den DB-Ist-Stand ab.

CREATE TYPE "public"."ticket_prio" AS ENUM('NIEDRIG', 'MITTEL', 'HOCH');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('NEU', 'IN_ARBEIT', 'RUECKFRAGE', 'ERLEDIGT', 'ABGELEHNT');--> statement-breakpoint
CREATE TYPE "public"."ticket_typ" AS ENUM('BUG', 'WUNSCH', 'FRAGE', 'SONSTIGES');--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"typ" "ticket_typ" DEFAULT 'BUG' NOT NULL,
	"titel" text NOT NULL,
	"beschreibung" text,
	"status" "ticket_status" DEFAULT 'NEU' NOT NULL,
	"prioritaet" "ticket_prio" DEFAULT 'MITTEL' NOT NULL,
	"erstellt_von_id" uuid,
	"zugewiesen_an_id" uuid,
	"aufwand_minuten" integer,
	"erledigt_am" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "ticket_kommentar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"autor_id" uuid,
	"text" text NOT NULL,
	"ist_rueckfrage" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_erstellt_von_id_app_user_id_fk" FOREIGN KEY ("erstellt_von_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_zugewiesen_an_id_app_user_id_fk" FOREIGN KEY ("zugewiesen_an_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_kommentar" ADD CONSTRAINT "ticket_kommentar_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_kommentar" ADD CONSTRAINT "ticket_kommentar_autor_id_app_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;
