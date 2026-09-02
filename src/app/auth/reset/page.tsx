"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Landeseite für Passwort-Reset-Links (Recovery). Der Supabase-Browser-Client liest
 * den Token beim Laden aus dem URL-Hash und stellt eine kurzlebige Session her;
 * danach kann `updateUser({ password })` das neue Passwort setzen.
 */
export default function ResetPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"pruefe" | "bereit" | "fertig" | "fehler">("pruefe");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setPhase("bereit");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPhase("bereit");
      else {
        // kurz warten – detectSessionInUrl verarbeitet den Hash asynchron
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d }) => {
            setPhase(d.session ? "bereit" : "fehler");
            if (!d.session) setMeldung("Link ungültig oder abgelaufen. Bitte neuen Link anfordern.");
          });
        }, 1200);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) { setMeldung("Mindestens 8 Zeichen."); return; }
    if (pw1 !== pw2) { setMeldung("Die Passwörter stimmen nicht überein."); return; }
    setBusy(true);
    setMeldung(null);
    const { error } = await createClient().auth.updateUser({ password: pw1 });
    setBusy(false);
    if (error) { setMeldung(error.message); return; }
    setPhase("fertig");
    setTimeout(() => router.replace("/login"), 1500);
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-lg font-semibold">Nik Huber Guitars</h1>
      <p className="mt-1 text-sm text-neutral-500">Passwort setzen</p>

      {phase === "pruefe" && <p className="mt-6 text-sm text-neutral-500">Link wird geprüft …</p>}

      {phase === "fehler" && (
        <p className="mt-6 text-sm text-red-600">{meldung}</p>
      )}

      {phase === "fertig" && (
        <p className="mt-6 text-sm text-green-700">Passwort gespeichert. Weiter zur Anmeldung …</p>
      )}

      {phase === "bereit" && (
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="password" required placeholder="Neues Passwort" value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <input
            type="password" required placeholder="Wiederholen" value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          {meldung && <p className="text-sm text-red-600">{meldung}</p>}
          <button
            type="submit" disabled={busy}
            className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "…" : "Passwort speichern"}
          </button>
        </form>
      )}
    </div>
  );
}
