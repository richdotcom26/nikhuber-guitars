# Nik Huber Guitars

Web-App als Ablösung der Ninox-Datenbank „1 Nik Huber Guitars".
Next.js 16 · Supabase (Postgres/Auth/Storage, Frankfurt) · Drizzle ORM · Vercel.

## Dokumentation

| Datei | Inhalt |
|---|---|
| [`docs/ZIELMODELL.md`](docs/ZIELMODELL.md) | Architektur, Datenmodell, Entscheidungen E1–E19 |
| [`docs/MIGRATION.md`](docs/MIGRATION.md) | Analyse des Ninox-Bestands, Workflows 7a–7dd |
| [`src/lib/db/schema/README.md`](src/lib/db/schema/README.md) | Drizzle-Schema-Übersicht |

## Setup

```bash
cp .env.example .env.local      # Supabase-Werte eintragen
npm install
npm run db:push                # Schema -> Supabase Postgres
npm run dev
```

Erster Benutzer: in Supabase → Authentication → Add user anlegen, dann in `app_user`
ein Profil mit derselben `id` ergänzen (bis das Onboarding gebaut ist).

## Status

Gerüst + Schema-Entwurf. Fachlogik (Service-Layer `src/lib/domain`), UI-Bereiche und
Ninox-Import folgen — siehe `docs/ZIELMODELL.md` §10.
