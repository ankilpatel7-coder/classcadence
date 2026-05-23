import { Resend } from "resend";

// Centralized transactional email sender. The whole app calls
// `sendEmail({ to, subject, text, html })` and this module decides
// whether to actually send.
//
// Skips silently (returns { skipped: true }) when RESEND_API_KEY or
// RESEND_FROM_EMAIL is missing — so callers can wire notification
// triggers now and they just start working once Resend domain
// verification lands. No code change needed at the call site.
//
// Why this lives separately from app/admin/tenants/actions.ts's
// inline Resend call: that one is special-cased for tenant invites.
// This is the one every other feature uses.

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  // Optional reply-to. Useful for parent emails where the parent might
  // want to reply to the actual tenant admin, not the noreply sender.
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string }
  | { skipped: true; reason: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromName = process.env.RESEND_FROM_NAME || "ClassCadence";

  if (!key) return { skipped: true, reason: "RESEND_API_KEY not set" };
  if (!fromEmail) return { skipped: true, reason: "RESEND_FROM_EMAIL not set" };

  const recipients = Array.isArray(args.to) ? args.to : [args.to];
  const validRecipients = recipients.filter(
    (r) => typeof r === "string" && r.includes("@")
  );
  if (validRecipients.length === 0) {
    return { skipped: true, reason: "no valid recipients" };
  }

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: validRecipients,
      subject: args.subject,
      text: args.text,
      html: args.html,
      replyTo: args.replyTo,
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id ?? "unknown" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown send error";
    return { ok: false, error: message };
  }
}
