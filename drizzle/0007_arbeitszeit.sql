CREATE TABLE "arbeitstag" (
	"tag" date PRIMARY KEY NOT NULL,
	"beginn" timestamp with time zone,
	"ende" timestamp with time zone,
	"minuten" integer DEFAULT 0 NOT NULL,
	"zusatz_minuten" integer DEFAULT 0 NOT NULL,
	"ereignisse" integer DEFAULT 0 NOT NULL,
	"quelle" text,
	"beschreibung" text,
	"beschreibung_manuell" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
