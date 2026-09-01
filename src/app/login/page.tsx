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
  const [busy, setBusy] = useState(false);

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

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="email" required placeholder="E-Mail" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
      />
      <input
        type="password" required placeholder="Passwort" value={passwort}
        onChange={(e) => setPasswort(e.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
      />
      {fehler && <p className="text-sm text-red-600">{fehler}</p>}
      <button
        type="submit" disabled={busy}
        className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {busy ? "…" : "Anmelden"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-lg font-semibold">Nik Huber Guitars</h1>
      <p className="mt-1 text-sm text-neutral-500">Anmelden</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
