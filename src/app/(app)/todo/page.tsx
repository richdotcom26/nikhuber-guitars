import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { requireUser } from "@/lib/domain/context";
import { getFirmaSetting } from "@/lib/domain/stammdaten";
import {
  listTodos, listVertretungTodos, meineAbwesenheit, todoMitarbeiter, type TodoRichtung,
} from "@/lib/domain/todo";
import { TodoAbwesenheit } from "./todo-abwesenheit";
import { TodoBoard } from "./todo-board";
import { TodoHinweisBox } from "./todo-hinweis-box";

const RICHTUNGEN: { value: TodoRichtung; label: string }[] = [
  { value: "an_mich", label: "Mein Eingang" },
  { value: "von_mir", label: "Gesendet / wartet" },
  { value: "alle", label: "Alle" },
];

function normRows<T extends {
  faelligBis: string | null; inArbeitSeit: string | null; erledigtAm: string | null;
  aktuellBeiAbwesendBis: string | null; updatedAt: string | Date;
}>(rows: T[]) {
  return rows.map((r) => ({
    ...r,
    faelligBis: r.faelligBis ?? null,
    inArbeitSeit: r.inArbeitSeit ?? null,
    erledigtAm: r.erledigtAm ?? null,
    aktuellBeiAbwesendBis: r.aktuellBeiAbwesendBis ?? null,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : r.updatedAt.toISOString(),
  }));
}

export default async function TodoPage({
  searchParams,
}: {
  searchParams: Promise<{ richtung?: string; erledigt?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const richtung: TodoRichtung =
    sp.richtung === "von_mir" || sp.richtung === "alle" ? sp.richtung : "an_mich";
  const mitErledigt = sp.erledigt === "1";
  const q = sp.q?.trim() ?? "";

  const [rows, vertretungRows, mitarbeiter, firma, abwesenheit] = await Promise.all([
    listTodos({ richtung, mitErledigt, q }),
    listVertretungTodos(),
    todoMitarbeiter(),
    getFirmaSetting(),
    meineAbwesenheit(),
  ]);
  const canEditHinweis = user.rolle === "ADMIN" || user.rolle === "BUERO";

  const beiMir = rows.filter((r) => r.aktuellBeiId === user.id && r.status !== "ERLEDIGT").length;
  const offen = rows.filter((r) => r.status !== "ERLEDIGT").length;
  const erledigtNeu = rows.filter(
    (r) => r.status === "ERLEDIGT" && !r.erledigtGesehen && r.absenderId === user.id,
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-navy">ToDo</h1>
        <span className="text-sm text-muted">
          {beiMir} in meinem Eingang{offen !== beiMir ? ` · ${offen} insgesamt offen` : ""}
        </span>
        {erledigtNeu > 0 ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
            ✓ {erledigtNeu} neu erledigt
          </span>
        ) : null}
      </div>

      <TodoHinweisBox
        key={firma.todoHinweisAm ? new Date(firma.todoHinweisAm).toISOString() : "none"}
        hinweis={firma.todoHinweis ?? null}
        stand={firma.todoHinweisAm ? new Date(firma.todoHinweisAm).toISOString() : null}
        canEdit={canEditHinweis}
      />

      {vertretungRows.length > 0 ? (
        <Card className="mb-5 border-amber-300">
          <CardHeader>
            <CardTitle>Vertretung — Aufgaben abwesender Kollegen ({vertretungRows.length})</CardTitle>
          </CardHeader>
          <TodoBoard
            rows={normRows(vertretungRows)}
            mitarbeiter={mitarbeiter}
            currentUserId={user.id}
            modus="vertretung"
          />
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
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
        <div className="ml-auto">
          <TodoAbwesenheit
            key={`${abwesenheit.abwesendBis ?? ""}:${abwesenheit.vertretungId ?? ""}`}
            abwesendBis={abwesenheit.abwesendBis ?? null}
            vertretungId={abwesenheit.vertretungId ?? null}
            vertretungName={abwesenheit.vertretungName ?? null}
            mitarbeiter={mitarbeiter.filter((m) => m.id !== user.id)}
          />
        </div>
      </div>

      <Card>
        <TodoBoard
          rows={normRows(rows)}
          mitarbeiter={mitarbeiter}
          currentUserId={user.id}
        />
      </Card>

      <p className="mt-4 text-xs text-neutral-400">
        Kleiner Aufgaben-Messenger: du siehst nur deine eigenen Aufgaben und die, die du an andere
        gesendet hast. Über „Neue Aufgabe“ einen Empfänger wählen und abschicken. Status direkt in
        der Zeile ändern; ein Klick auf den Aufgabentext (oder „💬 Verlauf“) öffnet Kommentare,
        Rückfragen und den Status-Verlauf.
      </p>
    </div>
  );
}
