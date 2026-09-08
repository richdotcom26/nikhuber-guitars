import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUser, ticket, ticketKommentar } from "@/lib/db/schema";
import { sendeTicketErledigt, sendeTicketRueckfrage } from "@/lib/mail/ticket-mail";
import {
  TICKET_PRIO_VALUES, TICKET_STATUS_VALUES, TICKET_TYP_VALUES, type TicketStatus,
} from "@/lib/ticket-shared";
import { assertRolle, requireUser } from "./context";
import { DomainError } from "./errors";

const erstellt = alias(appUser, "erstellt");
const zugewiesen = alias(appUser, "zugewiesen");

/* -------------------------------------------------------------------- helpers */

const nullableText = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable(),
);
const uuidOrNull = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.uuid().nullable(),
);
const intOrNull = z.preprocess(
  (v) => (v == null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.coerce.number().int().min(0).nullable(),
);

/* --------------------------------------------------------------------- lesen */

export interface TicketListRow {
  id: string;
  typ: string;
  titel: string;
  status: string;
  prioritaet: string;
  aufwandMinuten: number | null;
  erstelltVonName: string | null;
  zugewiesenAnName: string | null;
  kommentare: number;
  createdAt: Date;
}

export async function listTickets(params: {
  q?: string; typ?: string; status?: string; mir?: boolean; page?: number;
} = {}) {
  const user = await requireUser();
  const pageSize = 50;
  const page = Math.max(params.page ?? 1, 1);

  const filters = [];
  if (params.typ && (TICKET_TYP_VALUES as readonly string[]).includes(params.typ)) {
    filters.push(eq(ticket.typ, params.typ as (typeof TICKET_TYP_VALUES)[number]));
  }
  if (params.status && (TICKET_STATUS_VALUES as readonly string[]).includes(params.status)) {
    filters.push(eq(ticket.status, params.status as TicketStatus));
  }
  if (params.mir) filters.push(eq(ticket.zugewiesenAnId, user.id));
  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    filters.push(or(ilike(ticket.titel, like), ilike(ticket.beschreibung, like))!);
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: ticket.id,
      typ: ticket.typ,
      titel: ticket.titel,
      status: ticket.status,
      prioritaet: ticket.prioritaet,
      aufwandMinuten: ticket.aufwandMinuten,
      erstelltVonName: erstellt.name,
      zugewiesenAnName: zugewiesen.name,
      createdAt: ticket.createdAt,
      kommentare: sql<number>`(select count(*)::int from ticket_kommentar k where k.ticket_id = ${ticket.id})`,
    })
    .from(ticket)
    .leftJoin(erstellt, eq(erstellt.id, ticket.erstelltVonId))
    .leftJoin(zugewiesen, eq(zugewiesen.id, ticket.zugewiesenAnId))
    .where(where)
    .orderBy(
      // offene zuerst, dann neueste
      sql`case when ${ticket.status} in ('ERLEDIGT','ABGELEHNT') then 1 else 0 end`,
      desc(ticket.createdAt),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [agg] = await db.select({ c: sql<number>`count(*)::int` }).from(ticket).where(where);

  return {
    rows: rows as TicketListRow[],
    total: agg.c,
    offen: (await db
      .select({ c: sql<number>`count(*)::int` })
      .from(ticket)
      .where(sql`${ticket.status} not in ('ERLEDIGT','ABGELEHNT')`))[0].c,
    page,
    pageCount: Math.max(Math.ceil(agg.c / pageSize), 1),
  };
}

export async function getTicket(id: string) {
  await requireUser();
  const [row] = await db
    .select({
      id: ticket.id,
      typ: ticket.typ,
      titel: ticket.titel,
      beschreibung: ticket.beschreibung,
      status: ticket.status,
      prioritaet: ticket.prioritaet,
      aufwandMinuten: ticket.aufwandMinuten,
      erledigtAm: ticket.erledigtAm,
      erstelltVonId: ticket.erstelltVonId,
      zugewiesenAnId: ticket.zugewiesenAnId,
      erstelltVonName: erstellt.name,
      zugewiesenAnName: zugewiesen.name,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    })
    .from(ticket)
    .leftJoin(erstellt, eq(erstellt.id, ticket.erstelltVonId))
    .leftJoin(zugewiesen, eq(zugewiesen.id, ticket.zugewiesenAnId))
    .where(eq(ticket.id, id));
  if (!row) throw new DomainError("NOT_FOUND", "Ticket nicht gefunden.");

  const kommentare = await db
    .select({
      id: ticketKommentar.id,
      text: ticketKommentar.text,
      istRueckfrage: ticketKommentar.istRueckfrage,
      createdAt: ticketKommentar.createdAt,
      autorName: appUser.name,
    })
    .from(ticketKommentar)
    .leftJoin(appUser, eq(appUser.id, ticketKommentar.autorId))
    .where(eq(ticketKommentar.ticketId, id))
    .orderBy(asc(ticketKommentar.createdAt));

  return { ...row, kommentare };
}

/** Aktive Benutzer für das „Bearbeiter"-Dropdown. */
export async function aktiveBenutzer() {
  await requireUser();
  return db
    .select({ id: appUser.id, name: appUser.name })
    .from(appUser)
    .where(eq(appUser.aktiv, true))
    .orderBy(asc(sql`lower(${appUser.name})`));
}

/* ------------------------------------------------------------------- schema */

export const ticketSchema = z.object({
  typ: z.enum(TICKET_TYP_VALUES),
  titel: z.string().trim().min(1, "Pflichtfeld"),
  beschreibung: nullableText,
  prioritaet: z.enum(TICKET_PRIO_VALUES),
  zugewiesenAnId: uuidOrNull,
  aufwandMinuten: intOrNull,
});
export type TicketInput = z.infer<typeof ticketSchema>;

/* ------------------------------------------------------------------ mutationen */

export async function createTicket(input: TicketInput): Promise<string> {
  const user = await requireUser();
  const [row] = await db
    .insert(ticket)
    .values({
      typ: input.typ,
      titel: input.titel,
      beschreibung: input.beschreibung,
      prioritaet: input.prioritaet,
      zugewiesenAnId: input.zugewiesenAnId,
      aufwandMinuten: input.aufwandMinuten,
      erstelltVonId: user.id,
      createdBy: user.id,
      updatedBy: user.id,
    })
    .returning({ id: ticket.id });
  return row.id;
}

export async function updateTicket(id: string, input: TicketInput) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  const res = await db
    .update(ticket)
    .set({
      typ: input.typ,
      titel: input.titel,
      beschreibung: input.beschreibung,
      prioritaet: input.prioritaet,
      zugewiesenAnId: input.zugewiesenAnId,
      aufwandMinuten: input.aufwandMinuten,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(ticket.id, id))
    .returning({ id: ticket.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Ticket nicht gefunden.");
}

async function ticketMitMails(id: string) {
  const [t] = await db
    .select({
      id: ticket.id, titel: ticket.titel, typ: ticket.typ, status: ticket.status,
      erstelltVonId: ticket.erstelltVonId, zugewiesenAnId: ticket.zugewiesenAnId,
      erstellerMail: erstellt.email, erstellerName: erstellt.name,
      bearbeiterMail: zugewiesen.email, bearbeiterName: zugewiesen.name,
    })
    .from(ticket)
    .leftJoin(erstellt, eq(erstellt.id, ticket.erstelltVonId))
    .leftJoin(zugewiesen, eq(zugewiesen.id, ticket.zugewiesenAnId))
    .where(eq(ticket.id, id));
  return t ?? null;
}

export async function setTicketStatus(id: string, statusRaw: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN", "BUERO");
  if (!(TICKET_STATUS_VALUES as readonly string[]).includes(statusRaw)) {
    throw new DomainError("VALIDATION", "Ungültiger Status.");
  }
  const status = statusRaw as TicketStatus;
  const res = await db
    .update(ticket)
    .set({
      status,
      erledigtAm: status === "ERLEDIGT" ? new Date() : null,
      updatedAt: new Date(),
      updatedBy: user.id,
    })
    .where(eq(ticket.id, id))
    .returning({ id: ticket.id });
  if (res.length === 0) throw new DomainError("NOT_FOUND", "Ticket nicht gefunden.");

  if (status === "ERLEDIGT") {
    const t = await ticketMitMails(id);
    if (t?.erstellerMail) {
      await sendeTicketErledigt(
        { id, titel: t.titel, typ: t.typ },
        t.erstellerMail,
        t.erstellerName ?? "",
      );
    }
  }
}

export async function addKommentar(id: string, text: string, istRueckfrage: boolean) {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) throw new DomainError("VALIDATION", "Kein Text.");

  await db.insert(ticketKommentar).values({
    ticketId: id,
    autorId: user.id,
    text: trimmed,
    istRueckfrage,
  });

  if (istRueckfrage) {
    await db
      .update(ticket)
      .set({ status: "RUECKFRAGE", updatedAt: new Date(), updatedBy: user.id })
      .where(and(eq(ticket.id, id), sql`${ticket.status} <> 'ERLEDIGT'`));

    const t = await ticketMitMails(id);
    if (t) {
      // an die jeweils andere Seite: fragt der Ersteller -> an Bearbeiter, sonst -> an Ersteller
      const anBearbeiter = t.erstelltVonId === user.id;
      const mail = anBearbeiter ? t.bearbeiterMail : t.erstellerMail;
      const name = (anBearbeiter ? t.bearbeiterName : t.erstellerName) ?? "";
      if (mail) {
        await sendeTicketRueckfrage(
          { id, titel: t.titel, typ: t.typ },
          trimmed,
          mail,
          name,
        );
      }
    }
  }
}

export async function deleteTicket(id: string) {
  const user = await requireUser();
  assertRolle(user, "ADMIN");
  await db.delete(ticket).where(eq(ticket.id, id));
}
