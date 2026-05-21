import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin/tenants" className="font-wordmark text-xl text-primary">
              ClassCadence
            </Link>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-strong">
              Super Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>{profile.full_name || profile.email}</span>
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

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
