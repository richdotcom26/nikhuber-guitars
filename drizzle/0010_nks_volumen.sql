ALTER TABLE "holz_volumen" DROP CONSTRAINT "holz_volumen_artikel_id_artikel_id_fk";
--> statement-breakpoint
ALTER TABLE "artikel" ADD COLUMN "holz_volumen_id" uuid;--> statement-breakpoint
ALTER TABLE "holz_volumen" DROP COLUMN "artikel_id";