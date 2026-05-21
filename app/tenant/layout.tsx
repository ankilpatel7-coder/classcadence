import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getCurrentUserOrRedirect } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "@/app/_components/Logo";
import { MobileNav } from "@/app/_components/MobileNav";

const BASE_NAV_LINKS = [
  { href: "/tenant", label: "Home" },
  { href: "/tenant/today", label: "Today" },
  { href: "/tenant/households", label: "Households" },
  { href: "/tenant/locations", label: "Locations" },
];

const ADMIN_NAV_LINKS = [
  { href: "/tenant/staff", label: "Staff" },
  { href: "/tenant/settings", label: "Settings" },
];

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

  const navLinks =
    user.role === "tenant_admin"
      ? [...BASE_NAV_LINKS, ...ADMIN_NAV_LINKS]
      : BASE_NAV_LINKS;

  return (
    <div className="min-h-screen bg-bg">
      <header className="relative border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-3 md:gap-6">
            <Link href="/tenant" className="shrink-0">
              <Logo />
            </Link>
            <span className="hidden truncate text-sm text-muted md:inline">
              {tenant?.name ?? "Your center"}
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} />
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden truncate text-sm text-muted md:inline">
              {user.fullName || user.email}
            </span>
            <form action={signOutAction} className="hidden md:block">
              <button
                type="submit"
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink transition hover:bg-bg"
              >
                Sign out
              </button>
            </form>

            <MobileNav
              links={navLinks}
              rightExtra={
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    Signed in as {user.fullName || user.email}
                  </p>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink transition hover:bg-bg"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              }
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</main>
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
