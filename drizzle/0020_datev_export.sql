ALTER TABLE "firma_setting" ADD COLUMN "datev_berater_nr" text;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_mandant_nr" text;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_sachkontenlaenge" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_wj_beginn_monat" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_debitor" text DEFAULT '10000' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_konto_inland" text DEFAULT '8400' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_konto_eu" text DEFAULT '8125' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_konto_drittland" text DEFAULT '8120' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_konto_anzahlung" text DEFAULT '1718' NOT NULL;--> statement-breakpoint
ALTER TABLE "firma_setting" ADD COLUMN "datev_empfaenger" text DEFAULT 'c.rothe@sattler-sommer.de, johannes@nikhuber-guitars.com' NOT NULL;