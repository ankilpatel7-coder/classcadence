"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/client";

const SignupSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name.").max(120),
  email: z.string().trim().email("Please enter a valid email."),
  organization: z
    .string()
    .trim()
    .min(2, "Please enter the name of your learning center.")
    .max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type SignupState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  success: boolean;
};

const initial: SignupState = { error: null, fieldErrors: {}, success: false };

export async function submitSignupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    organization: formData.get("organization"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ...initial, fieldErrors };
  }

  // Look up every super_admin so additional super admins (if any) all get
  // notified. Owner connection bypasses RLS.
  let superAdminEmails: string[] = [];
  try {
    const data = await db
      .select({ email: userProfiles.email })
      .from(userProfiles)
      .where(eq(userProfiles.role, "super_admin"));
    superAdminEmails = data
      .map((r) => (r.email as string | null) ?? "")
      .filter((e) => e.includes("@"));
  } catch (err) {
    console.error("[signup] super-admin lookup failed:", err);
  }

  // If we couldn't find anyone (e.g. no SERVICE_ROLE key set), fall back
  // to a configured contact address so the lead doesn't get dropped.
  if (superAdminEmails.length === 0) {
    const fallback = process.env.SIGNUP_NOTIFICATION_EMAIL;
    if (fallback) superAdminEmails = [fallback];
  }

  const lines = [
    `Name: ${parsed.data.full_name}`,
    `Email: ${parsed.data.email}`,
    `Organization: ${parsed.data.organization}`,
    parsed.data.phone ? `Phone: ${parsed.data.phone}` : null,
    parsed.data.message ? `\nMessage:\n${parsed.data.message}` : null,
  ].filter(Boolean) as string[];

  const text = [
    "Someone just signed up via tryclasscadence.com.",
    "",
    ...lines,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.55;color:#1F2937;max-width:560px;margin:0 auto;padding:24px;">
  <p style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.15em;color:#6B7280;font-weight:600;">New signup interest</p>
  <h2 style="margin:0 0 16px;font-size:20px;color:#0B6845;">Someone wants to try ClassCadence.</h2>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;width:120px;">Name</td><td style="padding:6px 0;font-weight:600;">${esc(parsed.data.full_name)}</td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Email</td><td style="padding:6px 0;"><a href="mailto:${esc(parsed.data.email)}" style="color:#1AA876;">${esc(parsed.data.email)}</a></td></tr>
    <tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Organization</td><td style="padding:6px 0;">${esc(parsed.data.organization)}</td></tr>
    ${
      parsed.data.phone
        ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;">Phone</td><td style="padding:6px 0;">${esc(parsed.data.phone)}</td></tr>`
        : ""
    }
  </table>
  ${
    parsed.data.message
      ? `<div style="border-left:3px solid #1AA876;background:#FBFAF7;padding:12px 16px;border-radius:6px;margin:12px 0;"><p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#6B7280;font-weight:600;">Message</p><p style="margin:0;white-space:pre-wrap;">${esc(parsed.data.message)}</p></div>`
      : ""
  }
  <p style="margin:24px 0 0;color:#6B7280;font-size:12px;">Sent from the ClassCadence signup form.</p>
</body></html>`;

  if (superAdminEmails.length > 0) {
    await sendEmail({
      to: superAdminEmails,
      subject: `[ClassCadence] New signup from ${parsed.data.full_name} · ${parsed.data.organization}`,
      text,
      html,
      replyTo: parsed.data.email,
    });
  } else {
    console.warn(
      "[signup] no super-admin emails found; skipping notification. Set SIGNUP_NOTIFICATION_EMAIL env to override."
    );
  }

  // Friendly confirmation to the signer too. Best-effort — failure here
  // doesn't change the user-visible success state.
  await sendEmail({
    to: parsed.data.email,
    subject: "Thanks for your interest in ClassCadence",
    text: [
      `Hi ${parsed.data.full_name.split(" ")[0]},`,
      "",
      `Thanks for signing up — we received your details and will reach out shortly to get ${parsed.data.organization} set up.`,
      "",
      "If you need anything in the meantime, just reply to this email.",
      "",
      "— The ClassCadence team",
    ].join("\n"),
  }).catch((err) =>
    console.error("[signup] confirmation email failed:", err)
  );

  return { error: null, fieldErrors: {}, success: true };
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
