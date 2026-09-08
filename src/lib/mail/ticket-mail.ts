import "server-only";
import { getTransport, mailKonfig } from "./transport";
import { TICKET_TYP_LABEL, type TicketTyp } from "@/lib/ticket-shared";

interface TicketRef {
  id: string;
  titel: string;
  typ: string;
}

function ticketUrl(id: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return base ? `${base}/tickets/${id}` : `/tickets/${id}`;
}

function typLabel(typ: string): string {
  return TICKET_TYP_LABEL[typ as TicketTyp] ?? typ;
}

/**
 * Mail senden — bewusst „best effort": ist SMTP nicht konfiguriert oder schlägt
 * der Versand fehl, wird nur geloggt. Die auslösende Ticket-Aktion soll dadurch
 * nie fehlschlagen.
 */
async function sendeSicher(opts: { to: string; subject: string; text: string }) {
  const cfg = mailKonfig();
  if (!cfg) {
    console.warn("[ticket-mail] SMTP nicht konfiguriert — Mail nicht gesendet:", opts.subject);
    return;
  }
  try {
    await getTransport().sendMail({
      from: cfg.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
  } catch (e) {
    console.error("[ticket-mail] Versand fehlgeschlagen:", e instanceof Error ? e.message : e);
  }
}

export async function sendeTicketErledigt(t: TicketRef, empfaenger: string, name: string) {
  await sendeSicher({
    to: empfaenger,
    subject: `Ticket erledigt: ${t.titel}`,
    text:
      `${name ? `Hallo ${name},\n\n` : ""}` +
      `dein Ticket wurde als erledigt markiert.\n\n` +
      `Typ:    ${typLabel(t.typ)}\n` +
      `Titel:  ${t.titel}\n\n` +
      `Ticket ansehen: ${ticketUrl(t.id)}\n`,
  });
}

export async function sendeTicketRueckfrage(
  t: TicketRef,
  frage: string,
  empfaenger: string,
  name: string,
) {
  await sendeSicher({
    to: empfaenger,
    subject: `Rückfrage zum Ticket: ${t.titel}`,
    text:
      `${name ? `Hallo ${name},\n\n` : ""}` +
      `zu folgendem Ticket besteht eine Rückfrage:\n\n` +
      `Typ:    ${typLabel(t.typ)}\n` +
      `Titel:  ${t.titel}\n\n` +
      `Rückfrage:\n${frage}\n\n` +
      `Antworten im Ticket: ${ticketUrl(t.id)}\n`,
  });
}
