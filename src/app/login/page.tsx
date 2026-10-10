import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; email?: string; fehler?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-button text-sm font-bold text-primary-fg">NH</span>
          <div>
            <h1 className="text-base font-semibold text-navy">Nik Huber Guitars</h1>
            <p className="text-xs text-muted">Auftrags- und Fertigungsverwaltung</p>
          </div>
        </div>
        <LoginForm next={sp.next ?? ""} emailVorbelegt={sp.email ?? ""} fehlerVorbelegt={!!sp.fehler} />
      </div>
    </div>
  );
}
