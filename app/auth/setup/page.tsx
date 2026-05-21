import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Logo } from "@/app/_components/Logo";
import { SetupForm } from "./SetupForm";

export const metadata = {
  title: "Set your password — ClassCadence",
};

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?error=missing-session");

  const fullNameFromMeta =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo size={40} />
        </Link>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          <h1 className="text-lg font-semibold text-ink">Welcome to ClassCadence</h1>
          <p className="mt-1 text-sm text-muted">
            You&apos;re invited as a Tenant Admin. Set a password to finish setting up
            your account.
          </p>

          <div className="mt-6">
            <SetupForm email={user.email ?? ""} initialFullName={fullNameFromMeta} />
          </div>
        </div>
      </div>
    </main>
  );
}
