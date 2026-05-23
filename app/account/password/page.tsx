import Link from "next/link";
import { ChevronLeft, KeyRound } from "lucide-react";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { Logo } from "@/app/_components/Logo";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Change password — ClassCadence" };
export const dynamic = "force-dynamic";

function homeForRole(role: string | null | undefined): string {
  if (role === "super_admin") return "/admin/tenants";
  return "/tenant";
}

export default async function ChangePasswordPage() {
  const user = await getCurrentUserOrRedirect();
  const home = homeForRole(user.role);

  return (
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-xl px-4 py-10 md:py-14">
        <Link
          href={home}
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-6 flex items-center gap-2">
          <Logo size={28} showWordmark={false} />
          <h1 className="text-2xl font-semibold text-ink">Change password</h1>
        </div>
        <p className="mt-1 text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{user.email}</span>
        </p>

        <section className="mt-6 panel p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-strong">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Update your password</h2>
              <p className="text-xs text-muted">
                You&apos;ll stay signed in on this device.
              </p>
            </div>
          </div>
          <PasswordForm />
        </section>
      </div>
    </main>
  );
}
