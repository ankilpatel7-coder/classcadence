import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/app/_components/Logo";

export const metadata = {
  title: "Admin — ClassCadence",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/login");

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-3 md:gap-6">
            <Link href="/admin/tenants" className="shrink-0">
              <Logo />
            </Link>
            <span className="hidden rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-strong sm:inline">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted md:gap-4">
            <span className="hidden truncate sm:inline">
              {profile.full_name || profile.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink transition hover:bg-bg"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  );
}
