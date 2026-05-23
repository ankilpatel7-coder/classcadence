import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendEmail, type SendEmailArgs } from "@/lib/email/client";
import type { NotificationType } from "./types";

// Core write path for domain events. Fans out a single event into:
//   1) one notifications row per recipient user (so each gets their own
//      read state) — written via service role since the inserting user
//      isn't necessarily the recipient.
//   2) zero-or-one email per external recipient (parent or admin who
//      isn't a user_profile).
//
// Failures are swallowed and logged — a notification miss should never
// roll back the underlying domain action (e.g. an enrollment write).

export type InAppRecipient = {
  user_id: string;
};

export type EmailRecipient = {
  email: string;
  name?: string;
  replyTo?: string;
};

export type CreateNotificationArgs = {
  tenantId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  inApp?: InAppRecipient[];
  email?: {
    to: EmailRecipient[];
    subject: string;
    text: string;
    html?: string;
  };
};

export type CreateNotificationResult = {
  inAppWritten: number;
  emailResults: Array<{ to: string; status: "sent" | "skipped" | "error"; detail?: string }>;
};

export async function createNotification(
  args: CreateNotificationArgs
): Promise<CreateNotificationResult> {
  const result: CreateNotificationResult = {
    inAppWritten: 0,
    emailResults: [],
  };

  // 1. In-app rows. Use service role so the writer (could be staff or a
  // background job) can write rows belonging to other users.
  const inAppRecipients = args.inApp ?? [];
  if (inAppRecipients.length > 0) {
    try {
      const service = createSupabaseServiceClient();
      const rows = inAppRecipients.map((r) => ({
        tenant_id: args.tenantId,
        user_id: r.user_id,
        type: args.type,
        payload: args.payload,
      }));
      const { error, data } = await service
        .from("notifications")
        .insert(rows)
        .select("id");
      if (error) {
        console.error("[notifications] insert failed:", error.message);
      } else {
        result.inAppWritten = data?.length ?? 0;
      }
    } catch (err) {
      // Service-role client may throw if SUPABASE_SERVICE_ROLE_KEY is
      // missing in this environment. We still want the email to fly.
      console.error(
        "[notifications] in-app skipped:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // 2. Email fan-out. Each recipient gets their own send so any single
  // bad address doesn't poison the others.
  if (args.email && args.email.to.length > 0) {
    const { subject, text, html } = args.email;
    for (const recipient of args.email.to) {
      const sendArgs: SendEmailArgs = {
        to: recipient.email,
        subject,
        text,
        html,
        replyTo: recipient.replyTo,
      };
      const res = await sendEmail(sendArgs);
      if ("ok" in res && res.ok) {
        result.emailResults.push({ to: recipient.email, status: "sent" });
      } else if ("skipped" in res) {
        result.emailResults.push({
          to: recipient.email,
          status: "skipped",
          detail: res.reason,
        });
      } else {
        result.emailResults.push({
          to: recipient.email,
          status: "error",
          detail: "error" in res ? res.error : "unknown",
        });
      }
    }
  }

  return result;
}

// Helper: find every tenant_admin's user_id for a tenant. Used as the
// default in-app recipient list for tenant-scoped events.
export async function tenantAdminUserIds(tenantId: string): Promise<string[]> {
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service
      .from("user_profiles")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("role", "tenant_admin");
    return (data ?? []).map((r) => r.id as string);
  } catch {
    return [];
  }
}
