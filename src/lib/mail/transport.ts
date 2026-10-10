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

/**
 * TESTPHASE – Versandsperre: Mails gehen nur an freigegebene Adressen, alle anderen Empfänger
 * werden abgewiesen (die Mail wird dann gar nicht gesendet). Die Adressen in der Datenbank bleiben
 * unverändert (Ninox-Daten). Freigabe-Liste per MAIL_FREIGABE überschreibbar (Komma-getrennt,
 * „@domain“ = ganze Domain); MAIL_FREIGABE=* hebt die Sperre auf (Echtbetrieb).
 */
const FREIGABE_STANDARD = [
  "@nikhuber-guitars.com", "rainer@wuelbeck.de", "rw@wuelbeck.de", "johannes.spiegelhoff@gmail.com",
];

function freigabe(): string[] | null {
  const env = process.env.MAIL_FREIGABE?.trim();
  if (env === "*") return null;
  return (env ? env.split(",") : FREIGABE_STANDARD).map((x) => x.trim().toLowerCase()).filter(Boolean);
}

export function mailErlaubt(adresse: string): boolean {
  const liste = freigabe();
  if (!liste) return true;
  const a = adresse.trim().toLowerCase().replace(/^.*<(.+)>$/, "$1");
  return liste.some((f) => (f.startsWith("@") ? a.endsWith(f) : a === f));
}

type Empf = string | { address: string } | (string | { address: string })[] | undefined;
function adressen(v: Empf): string[] {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((x) => (typeof x === "string" ? x.split(/[,;]/) : [x.address])).map((x) => x.trim()).filter(Boolean);
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
  // Versandsperre (Testphase) vor jedes sendMail schalten
  const orig = cached.sendMail.bind(cached);
  cached.sendMail = ((opts: Parameters<Transporter["sendMail"]>[0]) => {
    const alle = [...adressen(opts.to as Empf), ...adressen(opts.cc as Empf), ...adressen(opts.bcc as Empf)];
    const gesperrt = alle.filter((a) => !mailErlaubt(a));
    if (gesperrt.length) {
      return Promise.reject(new Error(`Testphase: Versand an ${gesperrt.join(", ")} gesperrt (nur freigegebene Adressen).`));
    }
    return orig(opts);
  }) as Transporter["sendMail"];
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
