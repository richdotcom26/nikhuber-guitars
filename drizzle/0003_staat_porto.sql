ALTER TABLE "staat" ADD COLUMN "porto_gitarre_artikel_id" uuid;--> statement-breakpoint
ALTER TABLE "staat" ADD COLUMN "porto_teile_artikel_id" uuid;--> statement-breakpoint
ALTER TABLE "staat" ADD CONSTRAINT "staat_porto_gitarre_artikel_id_artikel_id_fk" FOREIGN KEY ("porto_gitarre_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staat" ADD CONSTRAINT "staat_porto_teile_artikel_id_artikel_id_fk" FOREIGN KEY ("porto_teile_artikel_id") REFERENCES "public"."artikel"("id") ON DELETE set null ON UPDATE no action;