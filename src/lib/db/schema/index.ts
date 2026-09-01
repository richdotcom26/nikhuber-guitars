/**
 * Drizzle-Schema Nik Huber Guitars — Sammel-Export für drizzle-kit.
 * Entwurf, begleitend zu ../ZIELMODELL.md §3.  Siehe README.md.
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

/*
NOCH ZU ERGÄNZEN (relations.ts), sobald das Schema steht:
  - alle *_by / created_by / updated_by  -> appUser
  - staat.default_zahlungsbedingung_id, kunde.zahlungsbedingung_id -> zahlungsbedingung
  - artikel.lieferant_id -> kunde ;  artikel.holzart_id -> holzart ;  artikel.bild_asset_id -> anhang
  - spec_belegung.angebot_id/auftrag_id -> angebot/auftrag  (onDelete cascade)
  - angebot.erzeugt_aus_auftrag_id -> auftrag
  - rechnung.referenz_rechnung_id -> rechnung (self)
  - beleg.kd_staat_id -> staat ;  beleg.drucktemplate_id -> belegTemplate
  - seriennummer.auftrag_id -> auftrag
  - lagerbewegung.bestellung_id/inventur_id -> bestellung/inventur
  - anhang / asset-Referenzen (cites_dokument_asset_id etc.) -> anhang
*/
