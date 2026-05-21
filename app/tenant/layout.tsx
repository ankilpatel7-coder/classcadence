import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";

export const metadata = {
  title: "ClassCadence",
};

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrRedirect();

  if (user.role === "super_admin") redirect("/admin/tenants");
  if (
    user.role !== "tenant_admin" &&
    user.role !== "location_admin" &&
    user.role !== "front_desk"
  ) {
    // Profile not yet linked to a tenant — bounce to login.
    redirect("/login");
  }
  if (!user.tenantId) {
    // Signed in, has a tenant role, but no tenant attached. Shouldn't happen,
    // but if it does we send them back to sign-in rather than show a broken UI.
    redirect("/login?error=no-tenant");
  }

  // Read the tenant name. Service client avoids any RLS edge cases on first load.
  const service = createSupabaseServiceClient();
  const { data: tenant } = await service
    .from("tenants")
    .select("name, status")
    .eq("id", user.tenantId)
    .maybeSingle();

  // Suspended tenants are blocked here (BA FR-TM-03).
  if (tenant?.status === "suspended") {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
    redirect("/login?error=tenant-suspended");
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/tenant" className="font-wordmark text-xl text-primary">
              ClassCadence
            </Link>
            <span className="hidden text-sm text-muted md:inline">
              {tenant?.name ?? "Your center"}
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink href="/tenant" label="Home" />
            <NavLink href="/tenant/today" label="Today" />
            <NavLink href="/tenant/households" label="Households" />
            <NavLink href="/tenant/locations" label="Locations" />
            <NavLink href="/tenant/settings" label="Settings" />
          </nav>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="hidden md:inline">{user.fullName || user.email}</span>
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

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-bg"
    >
      {label}
    </Link>
  );
}
