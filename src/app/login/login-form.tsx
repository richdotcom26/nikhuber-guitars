"use client";

import { useState } from "react";
import { loginAction, passwortVergessenAction } from "./actions";

/** Anmeldeformular: sendet per Server Action (funktioniert auch ohne JavaScript im Browser). */
export function LoginForm({ next, emailVorbelegt, fehlerVorbelegt }: { next: string; emailVorbelegt: string; fehlerVorbelegt: boolean }) {
  const [email, setEmail] = useState(emailVorbelegt);
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(fehlerVorbelegt ? "E-Mail oder Passwort falsch." : null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function passwortVergessen() {
    if (!email) { setFehler("Bitte zuerst die E-Mail eintragen."); return; }
    setBusy(true);
    setFehler(null);
    // Versand über die App selbst (Link direkt auf diese Adresse, nicht die Supabase-Site-URL)
    await passwortVergessenAction(email.trim()).catch(() => {});
    setBusy(false);
    setHinweis("Falls ein Konto existiert, wurde ein Link zum Zurücksetzen verschickt.");
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm " +
    "placeholder:text-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-1 " +
    "focus-visible:outline-brand focus-visible:border-brand";

  return (
    <form action={loginAction} className="mt-6 space-y-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="email" name="email" required placeholder="E-Mail" value={email}
        autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="email"
        onChange={(e) => setEmail(e.target.value)}
        className={inputCls}
      />
      <input
        type="password" name="passwort" required placeholder="Passwort" value={passwort}
        autoCapitalize="none" autoCorrect="off" autoComplete="current-password"
        onChange={(e) => setPasswort(e.target.value)}
        className={inputCls}
      />
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      {hinweis && <p className="text-sm text-brand">{hinweis}</p>}
      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg shadow-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        Anmelden
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
