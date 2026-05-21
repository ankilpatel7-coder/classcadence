"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginState = { error: string | null };

export async function signInAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  const supabase = createSupabaseServerClient();
  const { data: signIn, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !signIn.user) {
    return { error: "Sign-in failed. Check your email and password." };
  }

  // Filter by id explicitly — super_admin RLS lets the caller read every profile,
  // so .single() would error with PGRST116 if any other profile rows exist.
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", signIn.user.id)
    .single();

  redirect(profile?.role === "super_admin" ? "/admin/tenants" : "/");
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
