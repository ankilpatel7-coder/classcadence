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
import { UserMenu } from "@/app/_components/UserMenu";
import { NavLinks } from "@/app/_components/NavLinks";

const BASE_NAV_LINKS = [
  { href: "/tenant", label: "Home" },
  { href: "/tenant/today", label: "Today" },
  { href: "/tenant/schedule", label: "Schedule" },
  { href: "/tenant/students", label: "Students" },
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

  // Read the tenant name + branding. Service client avoids any RLS edge cases on first load.
  const service = createSupabaseServiceClient();
  const [{ data: tenant }, { data: branding }] = await Promise.all([
    service.from("tenants").select("name, status").eq("id", user.tenantId).maybeSingle(),
    service
      .from("branding_assets")
      .select("primary_color_hex")
      .eq("tenant_id", user.tenantId)
      .maybeSingle(),
  ]);

  const brandColor = branding?.primary_color_hex ?? "#1AA876";

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
    <div
      className="min-h-screen"
      style={{ "--color-primary": brandColor } as React.CSSProperties}
    >
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/85 backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.7)_inset,0_10px_30px_-18px_rgba(15,23,42,0.18)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-3">
          {/* Left: logo + tenant chip */}
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/tenant" className="shrink-0">
              <Logo />
            </Link>
            {tenant?.name ? (
              <span
                className="hidden max-w-[200px] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-emboss md:inline-block"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
                }}
                title={tenant.name}
              >
                {tenant.name}
              </span>
            ) : null}
          </div>

          {/* Center: nav pills */}
          <div className="hidden md:block">
            <NavLinks items={navLinks} />
          </div>

          {/* Right: user avatar + mobile menu */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block">
              <UserMenu
                fullName={user.fullName || ""}
                email={user.email}
                subtitle={tenant?.name ?? undefined}
              />
            </div>

            <MobileNav
              links={navLinks}
              rightExtra={
                <div className="space-y-2">
                  <p className="text-xs text-muted">
                    Signed in as {user.fullName || user.email}
                  </p>
                  {tenant?.name ? (
                    <p className="text-xs text-muted">{tenant.name}</p>
                  ) : null}
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
