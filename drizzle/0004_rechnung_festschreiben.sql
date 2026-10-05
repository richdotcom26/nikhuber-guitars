ALTER TABLE "rechnung" ADD COLUMN "festgeschrieben_am" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "rechnung" ADD COLUMN "festgeschrieben_von" uuid;--> statement-breakpoint
ALTER TABLE "anhang" ADD COLUMN "mit_rechnung" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_template" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "mail_template" ADD COLUMN "ist_standard" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mailversand" ADD COLUMN "anhang_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL;