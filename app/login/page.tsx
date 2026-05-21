import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { postLoginPathForRole, type AppRole } from "@/lib/auth/post-login-redirect";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — ClassCadence",
};

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const target = postLoginPathForRole(profile?.role as AppRole);
    if (target !== "/") redirect(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center font-wordmark text-2xl text-primary"
        >
          ClassCadence
        </Link>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Use your ClassCadence credentials.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
