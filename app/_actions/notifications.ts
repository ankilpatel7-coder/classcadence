"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

// User actions, scoped in app code to the caller's own rows (replaces the
// old notifications RLS policy on user_id = auth.uid()).

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, user.id),
        isNull(notifications.readAt)
      )
    );

  revalidatePath("/tenant", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUserOrRedirect();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));

  revalidatePath("/tenant", "layout");
}
