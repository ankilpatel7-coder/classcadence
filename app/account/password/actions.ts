"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";

const Schema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long."),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords don't match.",
    path: ["confirm_password"],
  });

export type PasswordState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  success: boolean;
};

export async function changePasswordAction(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await getCurrentUserOrRedirect();

  const parsed = Schema.safeParse({
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
    confirm_password: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (typeof k === "string" && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { error: null, fieldErrors, success: false };
  }

  if (parsed.data.current_password === parsed.data.new_password) {
    return {
      error: null,
      fieldErrors: {
        new_password: "New password must be different from your current one.",
      },
      success: false,
    };
  }

  const supabase = createSupabaseServerClient();

  // Verify the current password by attempting a fresh sign-in. Supabase
  // doesn't expose a "verify password" primitive, but signInWithPassword
  // either succeeds (and refreshes the session — harmless) or returns an
  // error we can surface as a field-level message.
  const verify = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verify.error) {
    return {
      error: null,
      fieldErrors: { current_password: "Current password is incorrect." },
      success: false,
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (updateError) {
    return { error: updateError.message, fieldErrors: {}, success: false };
  }

  return { error: null, fieldErrors: {}, success: true };
}
