import Link from "next/link";
import { redirect } from "next/navigation";
import { postLoginPathForRole } from "@/lib/auth/post-login-redirect";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Logo } from "@/app/_components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in — ClassCadence",
};

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    const target = postLoginPathForRole(user.role);
    if (target !== "/") redirect(target);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo size={40} />
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
