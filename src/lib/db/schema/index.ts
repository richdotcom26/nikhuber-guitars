/**
 * Drizzle-Schema Nik Huber Guitars — Sammel-Export für drizzle-kit + db.query.
 * Begleitend zu docs/ZIELMODELL.md §3.  Siehe README.md.
 */
export * from "./_enums";
export * from "./stammdaten";
export * from "./adressen";
export * from "./artikel";
export * from "./specs";
export * from "./belege";
export * from "./fertigung";
export * from "./compliance";
export * from "./lager";
export * from "./kommunikation";
export * from "./planung";
export * from "./users";
export * from "./relations";

/*
FK-Referenzen, die (noch) NICHT als DB-Constraint verdrahtet sind — nur in relations.ts:
  - alle created_by / updated_by  -> app_user   (bewusst weggelassen; bei Bedarf manuell joinen)
  - artikel.holzart_id -> holzart               (Import-Zyklus artikel<->compliance; FK folgt via raw SQL)
  - beleg.drucktemplate_id -> beleg_template    (Import-Zyklus; FK folgt)
  - *_asset_id (cites/lacey/zertifikat/lieferschein/erechnung/bild/qr) -> anhang  (Zyklus; FK folgt)
*/
