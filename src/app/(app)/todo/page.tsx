import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/domain/context";
import { listTodos, todoMitarbeiter, type TodoRichtung } from "@/lib/domain/todo";
import { TodoBoard } from "./todo-board";

const RICHTUNGEN: { value: TodoRichtung; label: string }[] = [
  { value: "alle", label: "Alle meine" },
  { value: "an_mich", label: "An mich" },
  { value: "von_mir", label: "Von mir gesendet" },
];

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ richtung?: string; erledigt?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const richtung: TodoRichtung =
    sp.richtung === "an_mich" || sp.richtung === "von_mir" ? sp.richtung : "alle";
  const mitErledigt = sp.erledigt === "1";
  const q = sp.q?.trim() ?? "";

  const [rows, mitarbeiter] = await Promise.all([
    listTodos({ richtung, mitErledigt, q }),
    todoMitarbeiter(),
  ]);

  const anMich = rows.filter((r) => r.empfaengerId === user.id && r.status !== "ERLEDIGT").length;
  const offen = rows.filter((r) => r.status !== "ERLEDIGT").length;

  return (
    <div>
      <PageHeader
        title="ToDo"
        description={`${anMich} für mich offen${offen !== anMich ? ` · ${offen} insgesamt offen` : ""}`}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Select name="richtung" defaultValue={richtung} className="h-8 w-44">
          {RICHTUNGEN.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </Select>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="erledigt" value="1" defaultChecked={mitErledigt} />
          <span>erledigte einblenden</span>
        </label>
        <Input name="q" defaultValue={q} placeholder="Aufgabe suchen" className="h-8 w-56" />
        <Button size="sm" variant="outline" type="submit">Anwenden</Button>
      </form>

      <Card>
        <TodoBoard
          rows={rows.map((r) => ({
            ...r,
            faelligBis: r.faelligBis ?? null,
            inArbeitSeit: r.inArbeitSeit ?? null,
            erledigtAm: r.erledigtAm ?? null,
            updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : r.updatedAt.toISOString(),
          }))}
          mitarbeiter={mitarbeiter}
          currentUserId={user.id}
        />
      </Card>

      <p className="mt-4 text-xs text-neutral-400">
        Kleiner Aufgaben-Messenger: du siehst nur deine eigenen Aufgaben und die, die du an andere
        gesendet hast. Über „Neue Aufgabe“ einen Empfänger wählen und abschicken. Status direkt in
        der Zeile ändern.
      </p>
    </div>
  );
}
