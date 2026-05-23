"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { sendDayOfReminders } from "@/lib/notifications/reminders";

// Dashboard "Send today's reminders" button. Calls the same shared
// helper the daily cron uses, scoped to the current tenant so an admin
// can't accidentally fire reminders for another tenant's parents.

function canSendReminders(role: string | null | undefined) {
  return role === "tenant_admin" || role === "super_admin";
}

export async function sendTodayRemindersAction(): Promise<void> {
  const user = await getCurrentUserOrRedirect();
  if (!canSendReminders(user.role) || !user.tenantId) {
    redirect("/tenant?error=forbidden");
  }

  const result = await sendDayOfReminders({
    windowHours: 18,
    tenantId: user.tenantId!,
  });

  revalidatePath("/tenant");
  redirect(
    `/tenant?reminders_sent=${result.sent}&reminders_skipped=${result.skipped}`
  );
}
