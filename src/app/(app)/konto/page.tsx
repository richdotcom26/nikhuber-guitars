import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/form";
import { requireUser } from "@/lib/domain/context";
import { ChangePasswordForm } from "./change-password-form";
import { logoutAction } from "./actions";

const ROLLE_LABEL: Record<string, string> = { ADMIN: "Admin", BUERO: "Büro", WERKSTATT: "Werkstatt" };

export default async function KontoPage() {
  const user = await requireUser();

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title="Mein Konto"
        actions={
          <form action={logoutAction}>
            <SubmitButton variant="outline" pendingText="…">Abmelden</SubmitButton>
          </form>
        }
      />

      <Card>
        <CardHeader><CardTitle>Angemeldet als</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name}</span>
            <Badge tone="neutral">{ROLLE_LABEL[user.rolle] ?? user.rolle}</Badge>
            {!user.aktiv ? <Badge tone="amber">deaktiviert</Badge> : null}
          </div>
          <div className="text-muted">{user.email}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Passwort ändern</CardTitle></CardHeader>
        <CardContent>
          <ChangePasswordForm />
          <p className="mt-3 text-xs text-muted">
            Passwort komplett vergessen? Auf der Anmeldeseite über die Funktion
            {" "}<span className="italic">Passwort vergessen</span>{" "}einen Link per E-Mail anfordern.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
