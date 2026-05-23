"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

// User actions — both pass auth.uid() through RLS, so they're safe to
// expose. The RLS policy on notifications already restricts to own rows.

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUserOrRedirect();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  const supabase = createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/tenant", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUserOrRedirect();
  const supabase = createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  revalidatePath("/tenant", "layout");
}
