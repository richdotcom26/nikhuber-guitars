import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * SMTP-Postausgang (Strato). Konfiguration über Umgebungsvariablen:
 *   SMTP_HOST · SMTP_PORT · SMTP_SECURE · SMTP_USER · SMTP_PASS · SMTP_FROM
 * `.env.local` ist gitignored — Werte niemals einchecken.
 */

export interface MailKonfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
}

export function mailKonfig(): MailKonfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  // 465 = implizites SSL/TLS, 587 = STARTTLS. SMTP_SECURE überschreibt bei Bedarf.
  const secure = process.env.SMTP_SECURE != null
    ? process.env.SMTP_SECURE === "true"
    : port === 465;
  return { host, port, secure, user, from: process.env.SMTP_FROM || user };
}

let cached: Transporter | null = null;

export function getTransport(): Transporter {
  if (cached) return cached;
  const cfg = mailKonfig();
  if (!cfg) throw new Error("SMTP nicht konfiguriert (SMTP_HOST/SMTP_USER/SMTP_PASS fehlen).");
  cached = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: process.env.SMTP_PASS! },
  });
  return cached;
}

/** SMTP-Verbindung + Login prüfen (ohne eine Mail zu senden). */
export async function pruefeSmtp(): Promise<{ ok: boolean; info: string }> {
  const cfg = mailKonfig();
  if (!cfg) return { ok: false, info: "SMTP nicht konfiguriert." };
  try {
    await getTransport().verify();
    return { ok: true, info: `${cfg.host}:${cfg.port} (${cfg.secure ? "SSL/TLS" : "STARTTLS"}) als ${cfg.user}` };
  } catch (e) {
    return { ok: false, info: e instanceof Error ? e.message : String(e) };
  }
}
