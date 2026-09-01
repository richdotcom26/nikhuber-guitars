# src/lib/db/schema — Drizzle-Schema (Entwurf)

Ziel-DB: **Supabase Postgres** (Region Frankfurt). Definiert mit **Drizzle ORM**.
Begleitend zu [`docs/ZIELMODELL.md`](../../../../docs/ZIELMODELL.md) §3. **Erstentwurf — zum Review, nicht final.**

## So reviewen

Reihenfolge (Abhängigkeiten von oben nach unten):

| Datei | Inhalt | ZIELMODELL |
|---|---|---|
| `_enums.ts` | alle `pgEnum` (Alt-Zahlencodes aus Ninox → sprechende Werte) | §5 |
| `_common.ts` | Audit-Spalten-Helfer, `oneParent`-CHECK-Helfer | §2 |
| `stammdaten.ts` | `firma_setting` (Singleton), `staat`, `zahlungsbedingung`, `zaehler` | §3.1 |
| `adressen.ts` | `kunde`, `ansprechpartner`, `lieferadresse` | §3.2 |
| `artikel.ts` | `artikel`, `artikel_modell`, `betriebsmittel` | §3.3 / §3.10 |
| `specs.ts` | `spec_slot` (Registry-Tabelle), `spec_belegung` | §3.4 |
| `belege.ts` | `angebot`, `auftrag`, `rechnung`, `beleg_position` | §3.5 |
| `fertigung.ts` | `arbeitsschritt_vorrat`, `arbeitsschritt` | §3.6 |
| `compliance.ts` | `holzart`, `holz_volumen` (+ View `holzposition` als SQL-Kommentar) | §3.7 |
| `lager.ts` | `lagerort`, `holz_inventar`, `lagerbestand`, `lagerbewegung`, `bestellung(+position)`, `inventur(+position)` | §3.9 / §3.10 |
| `kommunikation.ts` | `beleg_template`, `mail_template`, `mailversand`, `anhang` | §3.8 |
| `planung.ts` | `modellgruppe`, `modell_kalkulation` | §9 |
| `users.ts` | `app_user` (Profil zu Supabase-Auth-User) | §3.9 |
| `index.ts` | Re-Export für Drizzle-Kit | — |

## Konventionen (§2)

- Domänensprache **deutsch**, `snake_case`, Singular. PK `id uuid default gen_random_uuid()`.
- Technische Felder englisch: `created_at/by`, `updated_at/by`, `deleted_at`.
- Geld `numeric(12,2)`, Prozent `numeric(6,3)`. Enums als `pgEnum`.
- `created_by` / `updated_by` = `uuid`, FK auf `app_user.id` (in `relations` verdrahten, nicht als Spalten-`.references`, um Import-Zyklen zu vermeiden).
- **Soft-Delete** (`deleted_at`) bei Stammdaten (kunde, artikel); Belege nie hart löschen.
- Abgeleitete Ex-Ninox-Formeln: `GENERATED` wo zeilenlokal; sonst Service-Layer (`/lib/domain`) → als `// TODO SERVICE` markiert.

## Offene Punkte im Schema (Stand Entwurf)

- `// TODO` = Detail noch offen (siehe ZIELMODELL §8: Storno/Gutschrift-Ablauf, exakte Positions-Formeln,
  E15 E-Rechnungsformat).
- Enum-Werte final beim Import gegen die echten Ninox-Choice-Listen abgleichen.
- Indizes hier nur die wichtigsten; Feintuning nach echten Query-Mustern.
