# Deployment — Vercel + Supabase

Die App ist eine Standard-Next-16-App (App Router, `src/`). Datenbank + Auth + File-Storage
laufen bei **Supabase** (Region `eu-central-1`, Projekt-Ref `rpmbwijpdiyforouwykd`), Hosting
bei **Vercel**. Kein eigener Server, nicht auf dem Hostinger-VPS.

## 1. Vercel-Projekt anlegen

1. Auf [vercel.com](https://vercel.com) mit dem gewünschten Account einloggen (GitHub-Login).
2. **Add New → Project** → GitHub-Repo `richdotcom26/nikhuber-guitars` importieren.
3. Framework wird als **Next.js** erkannt. Build-Command / Output-Dir **nicht** ändern
   (Default: `next build`). Node-Version ≥ 20 (per `engines` in `package.json` vorgegeben).
4. **Environment Variables** setzen (siehe Tabelle unten) — für *Production* **und** *Preview*.
5. **Deploy**.

## 2. Environment-Variablen (Vercel → Settings → Environment Variables)

Werte 1:1 aus der lokalen `.env.local` übernehmen. Niemals einchecken.

| Variable | Zweck | Hinweis |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL | `https://rpmbwijpdiyforouwykd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-Auth (öffentlich) | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only (Admin-API, Benutzerverwaltung) | **geheim**, nie an den Client |
| `DATABASE_URL` | Laufzeit-DB (Server Functions) | **Transaction-Pooler**, Port **6543**, `?pgbouncer=true` |
| `DATABASE_URL_DIRECT` | nur Migrations / `drizzle-kit` lokal | Port 5432 — in Vercel optional |
| `NEXT_PUBLIC_APP_URL` | Basis-URL der App | nach dem ersten Deploy auf die echte Vercel-URL setzen |
| `SMTP_HOST` | Postausgang (Mailversand) | `smtp.strato.de` |
| `SMTP_PORT` | | `465` |
| `SMTP_SECURE` | | `true` |
| `SMTP_USER` | | `info@nikhuber-guitars.de` |
| `SMTP_PASS` | | **geheim** |
| `SMTP_FROM` | Absenderzeile | `Nik Huber Guitars <info@nikhuber-guitars.de>` |

Wichtig: `DATABASE_URL` **muss** der Pooler-Port **6543** sein (serverlose Functions öffnen viele
kurze Verbindungen). Der Drizzle-Client setzt bereits `prepare: false`.

## 3. Nach dem ersten Deploy

- `NEXT_PUBLIC_APP_URL` auf die vergebene `https://<projekt>.vercel.app` (bzw. später die
  eigene Domain) setzen und **Redeploy** auslösen.
- **Supabase → Authentication → URL Configuration**: die Vercel-URL als *Site URL* und unter
  *Redirect URLs* (`https://<projekt>.vercel.app/**`) eintragen, sonst schlägt der Login-Redirect fehl.
- Login testen mit `rw@wuelbeck.de` (Passwort ggf. über Supabase → Authentication → Users
  → *Reset password* / *Send magic link* neu setzen).

## 4. Datenbank-Schema

Das Schema ist bereits in der Supabase-Instanz angewandt (Stand: alle Phase-2/3-Bereiche).
Schema-Änderungen laufen weiterhin **lokal** über `drizzle-kit` bzw. direkte `sql.unsafe()`-Aufrufe
gegen `DATABASE_URL_DIRECT` — Vercel führt keine Migrationen aus.

## 5. Bekannte Punkte

- **Import-Skripte** (`scripts/import.ts`) laufen nur lokal (brauchen `ninox-dump/`), nicht auf Vercel.
- **`report/export`** (Excel) ist als Node-Route (`runtime = "nodejs"`) markiert — läuft als Function.
- **Mailversand** braucht die `SMTP_*`-Variablen; ohne sie zeigt die Liste „nicht konfiguriert",
  der Sende-Button meldet einen Fehler.
