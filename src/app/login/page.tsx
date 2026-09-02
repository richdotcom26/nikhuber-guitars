"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function passwortVergessen() {
    if (!email) { setFehler("Bitte zuerst die E-Mail eintragen."); return; }
    setBusy(true);
    setFehler(null);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    setBusy(false);
    if (error) setFehler(error.message);
    else setHinweis("Falls ein Konto existiert, wurde ein Link zum Zurücksetzen verschickt.");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFehler(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
    setBusy(false);
    if (error) {
      setFehler(error.message);
      return;
    }
    router.replace(params.get("next") || "/todo");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink shadow-sm " +
    "placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-1 " +
    "focus-visible:outline-brand focus-visible:border-brand";

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="email" required placeholder="E-Mail" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      <input
        type="password" required placeholder="Passwort" value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        className={inputCls}
      />
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      {hinweis && <p className="text-sm text-brand-bright">{hinweis}</p>}
      <button
        type="submit" disabled={busy}
        className="w-full rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
      >
        {busy ? "…" : "Anmelden"}
      </button>
      <button
        type="button" onClick={passwortVergessen} disabled={busy}
        className="w-full text-xs text-muted hover:text-brand hover:underline disabled:opacity-50"
      >
        Passwort vergessen?
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-brand text-sm font-bold text-white">NH</span>
          <div>
            <h1 className="text-base font-semibold text-navy">Nik Huber Guitars</h1>
            <p className="text-xs text-muted">Auftrags- und Fertigungsverwaltung</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
