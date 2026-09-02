import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/domain/context";
import { listTodos, todoMitarbeiter } from "@/lib/domain/todo";
import { TodoBoard } from "./todo-board";

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ fuer?: string; vonMir?: string; erledigt?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const vonMir = sp.vonMir === "1";
  const mitErledigt = sp.erledigt === "1";
  const q = sp.q?.trim() ?? "";
  // Standard-Board: meine Aufgaben (Empfänger = ich), sofern nicht anders gewählt
  const fuer = vonMir ? undefined : (sp.fuer ?? user.id);

  const [rows, mitarbeiter] = await Promise.all([
    listTodos({ fuer, vonMir, mitErledigt, q }),
    todoMitarbeiter(),
  ]);

  const offen = rows.filter((r) => r.status !== "ERLEDIGT").length;

  return (
    <div>
      <PageHeader
        title="ToDo"
        description={`${offen} offen${mitErledigt ? ` · ${rows.length - offen} erledigt` : ""}`}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-1">
          <span className="text-neutral-500">Board von</span>
          <Select name="fuer" defaultValue={vonMir ? "" : (sp.fuer ?? user.id)} className="h-8 w-44" disabled={vonMir}>
            <option value="">alle</option>
            {mitarbeiter.map((m) => (
              <option key={m.id} value={m.id}>{m.id === user.id ? `${m.name} (ich)` : m.name}</option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" name="vonMir" value="1" defaultChecked={vonMir} />
          <span>von mir erstellt</span>
        </label>
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
        Aufgaben zwischen Mitarbeitern. Absender = wer die Aufgabe erstellt, Empfänger = wessen Board
        sie erscheint. Status direkt in der Zeile ändern.
      </p>
    </div>
  );
}
