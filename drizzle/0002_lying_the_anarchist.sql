ALTER TABLE "anhang" ADD COLUMN "ticket_id" uuid;--> statement-breakpoint
ALTER TABLE "anhang" ADD CONSTRAINT "anhang_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anhang_ticket_idx" ON "anhang" USING btree ("ticket_id");