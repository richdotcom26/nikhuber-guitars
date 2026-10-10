ALTER TABLE "angebot" ADD COLUMN "archiviert" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "auftrag" ADD COLUMN "archiviert" boolean DEFAULT false NOT NULL;