<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nik Huber Guitars — Web-App

Ablösung der Ninox-DB „1 Nik Huber Guitars" (Gitarrenbau: Angebote, Aufträge, Fertigung,
Rechnungen, Holz-/Materialwirtschaft, CITES/Lacey, E-Rechnung).

## Wichtige Dokumente

- **`docs/ZIELMODELL.md`** — Architektur, Datenmodell, Entscheidungen (E1–E19). Zuerst lesen.
- **`docs/MIGRATION.md`** — Analyse des Ninox-Bestands, Workflow-für-Workflow (Abschnitte 7a–7dd).
- **`src/lib/db/schema/`** — Drizzle-Schema (Entwurf), `README.md` erklärt die Dateien.

## Stack

- Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4
- **Supabase** (Postgres Frankfurt) — Auth + Storage; Datenzugriff über **Drizzle** (`src/lib/db`)
- Frontend-Deploy: **Vercel** (Functions `fra1`)
- PDF/E-Rechnung (ZUGFeRD): Vercel Function, `docs/MIGRATION.md` 7dd

## Konventionen

- Domänensprache **deutsch** (`auftrag`, `angebot`, `artikel` …), technische Felder englisch (`created_at`).
- Datenzugriff **nur serverseitig** (Route Handler / Server Actions / `src/lib/domain`).
  Autorisierung im Service-Layer, nicht in der Middleware. RLS optional als Sicherheitsnetz.
- Ex-Ninox-Trigger/Generatoren → `src/lib/domain/*` (nicht als DB-Trigger).
- Spec-Slots: eine Definition (`src/lib/db/schema/specs.ts` → `SPEC_SLOTS`), gespiegelt in `src/lib/specs`.

## Setup

1. `cp .env.example .env.local`, Supabase-Werte eintragen.
2. `npm install`
3. `npm run db:push` — Schema nach Supabase.
4. `npm run dev`

## Befehle

- `npm run dev` / `build` / `lint` / `typecheck`
- `npm run db:generate` · `db:migrate` · `db:push` · `db:studio`

> Auf diesem Windows-Rechner in Terminalbefehlen `npm.cmd` / `npx.cmd` verwenden
> (PowerShell blockiert die `.ps1`-Shims per Gruppenrichtlinie).
