import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Hält die Supabase-Session frisch und schützt alle Routen außer /login, /auth/* und /unterschrift/*
 * (öffentliche Unterschrifts-Seite für Verleih-Vereinbarungen — Zugriff nur über geheimen Token).
 * Rollen-/Feingranular-Autorisierung passiert im Service-Layer (lib/domain), nicht hier.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims prüft das JWT lokal (asymmetrische Keys) statt bei jeder Anfrage den Auth-Server zu fragen —
  // viele parallele Anfragen (Prefetch) führten sonst zu Rate-Limits/Session-Verlust.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/unterschrift/")
    || pathname.startsWith("/api/cron/"); // Vercel-Cron, prüft CRON_SECRET selbst

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
