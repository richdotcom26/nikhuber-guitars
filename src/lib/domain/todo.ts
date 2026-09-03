import "server-only";
import { aliasedTable, and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUser, auftrag, todo, todoKommentar } from "@/lib/db/schema";
import { TODO_PRIO_VALUES, TODO_STATUS_VALUES } from "@/lib/todo-shared";
import { requireUser } from "./context";
import { DomainError } from "./errors";

export {
  TODO_PRIO, TODO_PRIO_LABEL, TODO_STATUS, TODO_STATUS_LABEL, TODO_STATUS_TONE,
} from "@/lib/todo-shared";

const empf = aliasedTable(appUser, "empf");
const abs = aliasedTable(appUser, "abs");
const bei = aliasedTable(appUser, "bei");
const autor = aliasedTable(appUser, "autor");

/* -------------------------------------------------------------------- helpers */

const uuidOrNull = z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable());
const dateOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
);

/* --------------------------------------------------------------------- liste */

export type TodoRichtung = "alle" | "an_mich" | "von_mir";

export interface TodoListeParams {
  /**
   * „an_mich" = liegt gerade in meinem Eingang (aktuell_bei = ich) ·
   * „von_mir" = von mir gesendet / weitergegeben, wartet auf die andere Seite ·
   * „alle" = jede Aufgabe, an der ich beteiligt bin.
   */
  richtung?: TodoRichtung;
  /** Erledigte einblenden. */
  mitErledigt?: boolean;
  q?: string;
}

export async function listTodos(params: TodoListeParams = {}) {
  const user = await requireUser();

  // Beteiligt = Absender oder Empfänger. Jeder sieht nur Aufgaben, an denen er beteiligt ist.
  const beteiligt = or(eq(todo.empfaengerId, user.id), eq(todo.absenderId, user.id))!;
  const filters = [
    params.richtung === "an_mich"
      ? and(beteiligt, eq(todo.aktuellBeiId, user.id))!
      : params.richtung === "von_mir"
        ? and(beteiligt, sql`${todo.aktuellBeiId} is distinct from ${user.id}`)!
        : beteiligt,
  ];
  if (!params.mitErledigt) filters.push(ne(todo.status, "ERLEDIGT"));
  if (params.q?.trim()) {
    filters.push(ilike(todo.aufgabe, `%${params.q.trim()}%`));
  }

  return db
    .select({
      id: todo.id,
      aufgabe: todo.aufgabe,
      prio: todo.prio,
      status: todo.status,
      faelligBis: todo.faelligBis,
      inArbeitSeit: todo.inArbeitSeit,
      erledigtAm: todo.erledigtAm,
      erinnerung: todo.erinnerung,
      updatedAt: todo.updatedAt,
      empfaengerId: todo.empfaengerId,
      absenderId: todo.absenderId,
      aktuellBeiId: todo.aktuellBeiId,
      empfaengerName: empf.name,
      absenderName: abs.name,
      aktuellBeiName: bei.name,
      auftragId: todo.auftragId,
      auftragNummer: auftrag.nummer,
      kommentarAnzahl: sql<number>`(
        select count(*)::int from ${todoKommentar} k where k.todo_id = ${todo.id} and k.text is not null
      )`,
    })
    .from(todo)
    .leftJoin(empf, eq(empf.id, todo.empfaengerId))
    .leftJoin(abs, eq(abs.id, todo.absenderId))
    .leftJoin(bei, eq(bei.id, todo.aktuellBeiId))
    .leftJoin(auftrag, eq(auftrag.id, todo.auftragId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      // dringend zuerst, dann jüngste Änderung
      sql`case when ${todo.prio} = 'DRINGEND' then 0 else 1 end`,
      desc(todo.updatedAt),
    );
}

/* -------------------------------------------------------------------- verlauf */

export async function todoVerlauf(id: string) {
  const user = await requireUser();
  await ladeBeteiligt(id, user.id);
  return db
    .select({
      id: todoKommentar.id,
      text: todoKommentar.text,
      statusNachher: todoKommentar.statusNachher,
      weitergabeAnId: todoKommentar.weitergabeAnId,
      autorId: todoKommentar.autorId,
      autorName: autor.name,
      weitergabeAnName: bei.name,
      createdAt: todoKommentar.createdAt,
    })
    .from(todoKommentar)
    .leftJoin(autor, eq(autor.id, todoKommentar.autorId))
    .leftJoin(bei, eq(bei.id, todoKommentar.weitergabeAnId))
    .where(eq(todoKommentar.todoId, id))
    .orderBy(asc(todoKommentar.createdAt));
}

/** Kennzahlen fürs Board / die Navigation. */
export async function todoKennzahlen(userId: string) {
  const [k] = await db
    .select({
      offenFuerMich: sql<number>`count(*) filter (where ${todo.empfaengerId} = ${userId} and ${todo.status} <> 'ERLEDIGT')::int`,
      dringendFuerMich: sql<number>`count(*) filter (where ${todo.empfaengerId} = ${userId} and ${todo.status} <> 'ERLEDIGT' and ${todo.prio} = 'DRINGEND')::int`,
    })
    .from(todo);
  return k;
}

/** app_user mit kann_todo (Empfänger-Auswahl). */
export async function todoMitarbeiter() {
  await requireUser();
  return db
    .select({ id: appUser.id, name: appUser.name })
    .from(appUser)
    .where(and(eq(appUser.kannTodo, true), eq(appUser.aktiv, true)))
    .orderBy(asc(sql`lower(${appUser.name})`));
}

export async function getTodo(id: string) {
  const row = await db.query.todo.findFirst({ where: eq(todo.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Aufgabe nicht gefunden.");
  return row;
}

/** Aufgabe laden und sicherstellen, dass der Benutzer beteiligt ist (Absender oder Empfänger). */
async function ladeBeteiligt(id: string, userId: string, nurAbsender = false) {
  const row = await db.query.todo.findFirst({ where: eq(todo.id, id) });
  if (!row) throw new DomainError("NOT_FOUND", "Aufgabe nicht gefunden.");
  const beteiligt = nurAbsender
    ? row.absenderId === userId
    : row.absenderId === userId || row.empfaengerId === userId;
  if (!beteiligt) throw new DomainError("FORBIDDEN", "Keine Berechtigung für diese Aufgabe.");
  return row;
}

/* ------------------------------------------------------------------- schema */

export const todoSchema = z.object({
  aufgabe: z.string().trim().min(1, "Pflichtfeld"),
  empfaengerId: uuidOrNull,
  prio: z.enum(TODO_PRIO_VALUES),
  faelligBis: dateOrNull,
  auftragId: uuidOrNull,
});
export type TodoInput = z.infer<typeof todoSchema>;

/* ------------------------------------------------------------------ mutationen */

export async function createTodo(input: TodoInput): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .insert(todo)
    .values({
      aufgabe: input.aufgabe,
      empfaengerId: input.empfaengerId,
      absenderId: user.id,
      // liegt zunächst im Eingang des Empfängers (oder bei mir, wenn Notiz an mich)
      aktuellBeiId: input.empfaengerId ?? user.id,
      prio: input.prio,
      status: "BESTELLUNG",
      faelligBis: input.faelligBis,
      auftragId: input.auftragId,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: todo.id });
  return row.id;
}

/* --------------------------------------------------------- Kommentar / Antwort */

/** Der jeweils andere Beteiligte (Absender ↔ Empfänger). */
function gegenueber(row: { absenderId: string | null; empfaengerId: string | null }, userId: string) {
  if (row.absenderId === userId) return row.empfaengerId;
  if (row.empfaengerId === userId) return row.absenderId;
  return null;
}

/**
 * Kommentar/Rückfrage an eine Aufgabe hängen. `antworten=true` = „Antworten": der Ball
 * geht an die andere Seite (aus meinem Eingang wird ein gesendetes Element).
 */
export async function addTodoKommentar(
  id: string,
  opts: { text: string; antworten?: boolean },
) {
  const user = await requireUser();
  const row = await ladeBeteiligt(id, user.id);
  const text = opts.text.trim();
  if (!text) throw new DomainError("VALIDATION", "Kein Text.");

  const anId = opts.antworten ? gegenueber(row, user.id) : null;
  await db.transaction(async (tx) => {
    await tx.insert(todoKommentar).values({
      todoId: id,
      autorId: user.id,
      text,
      weitergabeAnId: anId,
      createdBy: user.id,
      updatedBy: user.id,
    });
    await tx.update(todo).set({
      ...(anId ? { aktuellBeiId: anId } : {}),
      updatedAt: new Date(),
      updatedBy: user.id,
    }).where(eq(todo.id, id));
  });
}

export async function updateTodo(id: string, input: TodoInput) {
  const user = await requireUser();
  const row = await ladeBeteiligt(id, user.id);
  // Empfänger gewechselt -> Ball wandert mit
  const aktuellBei = input.empfaengerId && input.empfaengerId !== row.empfaengerId
    ? { aktuellBeiId: input.empfaengerId }
    : {};
  const res = await db
    .update(todo)
    .set({
      aufgabe: input.aufgabe,
      empfaengerId: input.empfaengerId,
      ...aktuellBei,
      prio: input.prio,
      faelligBis: input.faelligBis,
      auftragId: input.auftragId,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(todo.id, id))
    .returning({ id: todo.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Aufgabe nicht gefunden.");
}

export async function setTodoStatus(id: string, status: string) {
  const user = await requireUser();
  await ladeBeteiligt(id, user.id);
  if (!(TODO_STATUS_VALUES as readonly string[]).includes(status)) {
    throw new DomainError("VALIDATION", "Ungültiger Status.");
  }
  const heute = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> = {
    status: status as (typeof TODO_STATUS_VALUES)[number],
    updatedAt: new Date(),
    updatedBy: user.id,
  };
  if (status === "ERLEDIGT") patch.erledigtAm = heute;
  else patch.erledigtAm = null;
  if (status === "IN_ARBEIT") {
    patch.inArbeitSeit = sql`coalesce(${todo.inArbeitSeit}, ${heute})`;
  }
  await db.transaction(async (tx) => {
    const res = await tx.update(todo).set(patch).where(eq(todo.id, id)).returning({ id: todo.id });
    if (res.length === 0) throw new DomainError("NOT_FOUND", "Aufgabe nicht gefunden.");
    await tx.insert(todoKommentar).values({
      todoId: id,
      autorId: user.id,
      statusNachher: status as (typeof TODO_STATUS_VALUES)[number],
      createdBy: user.id,
      updatedBy: user.id,
    });
  });
}

export async function deleteTodo(id: string) {
  const user = await requireUser();
  // Löschen darf der Absender (oder ein Admin).
  if (user.rolle !== "ADMIN") await ladeBeteiligt(id, user.id, true);
  await db.delete(todo).where(eq(todo.id, id));
}

/* ----------------------------------------------------------------- Auftrag-Picker */

export async function todoAuftragPicker(q: string, limit = 12) {
  await requireUser();
  const like = `%${q.trim()}%`;
  return db
    .select({ id: auftrag.id, nummer: auftrag.nummer, kdFirma: auftrag.kdFirma, kdNachname: auftrag.kdNachname })
    .from(auftrag)
    .where(q.trim()
      ? or(ilike(auftrag.nummer, like), ilike(auftrag.kdFirma, like), ilike(auftrag.kdNachname, like))
      : undefined)
    .orderBy(desc(auftrag.createdAt))
    .limit(limit);
}
