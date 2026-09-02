import {
  numeric, pgTable, text, uuid,
} from "drizzle-orm/pg-core";
import { auditCols } from "./_common";
import { artikelgruppeEnum } from "./_enums";
import { artikel } from "./artikel";

/**
 * §3.7 Compliance / Holz.
 * `holzart`      = botanische Holz-Stammdaten (ex NKS Holzarten TF).
 * `holz_volumen` = Volumen je Artikel × Artikelgruppe (ex NKS Parts Volumen SF, UI "NKS Gewichte").
 *
 * `holzposition` ist eine VIEW (User bestätigt: reine Ableitung, 7d) — hier als SQL-Kommentar,
 * kommt in die Drizzle-Migration als `CREATE VIEW`.
 */

export const holzart = pgTable("holzart", {
  id: uuid("id").primaryKey().defaultRandom(),
  holz: text("holz").notNull(),
  holzartGrob: text("holzart_grob"),   // grobe Bezeichnung (z. B. "Rosewood" für alle Rosewood-*) — Filter/Unterart-Abhängigkeit
  botanischerName: text("botanischer_name"),
  herkunft: text("herkunft"),
  holzdichte: numeric("holzdichte", { precision: 8, scale: 3 }),
  species: text("species"),
  genus: text("genus"),
  info: text("info"),
  ...auditCols,
});

export const holzVolumen = pgTable("holz_volumen", {
  id: uuid("id").primaryKey().defaultRandom(),
  artikelId: uuid("artikel_id").notNull().references(() => artikel.id, { onDelete: "cascade" }),
  artikelgruppe: artikelgruppeEnum("artikelgruppe"),
  volumenM3: numeric("volumen_m3", { precision: 12, scale: 7 }),
  ...auditCols,
});

/*
CREATE VIEW holzposition AS
SELECT sb.auftrag_id,
       sb.slot_key,
       a.id            AS artikel_id,
       a.name_lang,
       ha.holz,
       ha.botanischer_name,
       ha.herkunft,
       hv.volumen_m3,
       a.gewicht_kg,
       a.vk_eur_net,
       (ha.botanischer_name ILIKE 'Dalbergia nigra%') AS braz_rosewood,
       a.geschuetztes_holz_cites
FROM   spec_belegung sb
JOIN   artikel a   ON a.id  = sb.artikel_id
JOIN   holzart ha  ON ha.id = a.holzart_id
LEFT   JOIN holz_volumen hv ON hv.artikel_id = a.id AND hv.artikelgruppe = a.artikelgruppe
WHERE  sb.auftrag_id IS NOT NULL
  AND  sb.slot_key = ANY (ARRAY['body','top','back_top','neck','fretboard','headstock',
                                'tuner_buttons','trussrod_cover','switch_tip','pu_rings',
                                'poti_knobs','backplate'])
  AND  a.holzart_id IS NOT NULL;

-- auftrag.cites_artikelanzahl / gesamtgewicht_holz_kg / gesamtgewicht_brazrw_kg
-- = Aggregate dieser View, per Service beim Speichern des Auftrags gesetzt (7d).
*/
