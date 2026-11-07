// Outgoing mail for the Edge Functions, over the same Titan mailbox the
// Supabase Auth emails already use (noreply@learnplaychampion.com).
// Configuration comes from function secrets, mirroring the env-getter
// shape of _shared/payments.ts:
//
//   SMTP_HOST  (default smtp.titan.email)
//   SMTP_PORT  (default 465 — implicit TLS; TLS is used exactly when the
//               port is 465, which is the only shape Titan needs here)
//   SMTP_USER  (the mailbox address; also the default From)
//   SMTP_PASS  (the mailbox password)
//   SMTP_FROM  (default: SMTP_USER)
//
// Mail is best-effort by contract: sendEmail NEVER throws. A missing
// secret returns { sent: false, reason: "not-configured" } so callers
// can tell "mail is not set up yet" apart from a delivery failure, and
// any SMTP error returns { sent: false, reason } with the error message.

import { SmtpClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
};

/** Same env-getter shape as PaymentEnv in _shared/payments.ts. */
export type MailEnv = (name: string) => string | undefined;

const defaultEnv: MailEnv = (name) => Deno.env.get(name);

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type SendResult =
  | { sent: true }
  | { sent: false; reason: string };

export async function sendEmail(
  message: OutgoingEmail,
  env: MailEnv = defaultEnv,
): Promise<SendResult> {
  const user = env("SMTP_USER")?.trim() ?? "";
  const pass = env("SMTP_PASS") ?? "";
  if (!user || !pass) return { sent: false, reason: "not-configured" };

  const host = env("SMTP_HOST")?.trim() || "smtp.titan.email";
  const parsedPort = Number(env("SMTP_PORT"));
  const port =
    Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 465;
  const from = env("SMTP_FROM")?.trim() || user;

  const client = new SmtpClient();
  try {
    await client.connect({
      hostname: host,
      port,
      tls: port === 465,
      auth: { username: user, password: pass },
    });
    await client.send({
      from,
      to: message.to,
      subject: message.subject,
      content: message.text,
      html: message.html,
    });
    return { sent: true };
  } catch (failure) {
    return {
      sent: false,
      reason: failure instanceof Error ? failure.message : "smtp-error",
    };
  } finally {
    // A failed close (including after a failed connect) must not turn a
    // recorded result into a throw.
    await client.close().catch(() => undefined);
  }
}
