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
import { SideNav, type SideNavItem } from "@/app/_components/SideNav";
import {
  NotificationBell,
  type NotificationRow,
} from "@/app/_components/NotificationBell";

const BASE_NAV: SideNavItem[] = [
  { href: "/tenant", label: "Home", icon: "home" },
  { href: "/tenant/today", label: "Today", icon: "today" },
  { href: "/tenant/schedule", label: "Schedule", icon: "schedule" },
  { href: "/tenant/students", label: "Students", icon: "students" },
  { href: "/tenant/makeups", label: "Make-ups", icon: "makeups" },
  { href: "/tenant/locations", label: "Locations", icon: "locations" },
];

const ADMIN_NAV: SideNavItem[] = [
  { href: "/tenant/staff", label: "Staff", icon: "staff" },
  { href: "/tenant/settings", label: "Settings", icon: "settings" },
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
    redirect("/login");
  }
  if (!user.tenantId) {
    redirect("/login?error=no-tenant");
  }

  const service = createSupabaseServiceClient();
  const supabase = createSupabaseServerClient();
  const [
    { data: tenant },
    { data: branding },
    { data: notificationRowsRaw },
  ] = await Promise.all([
    service.from("tenants").select("name, status").eq("id", user.tenantId).maybeSingle(),
    service
      .from("branding_assets")
      .select("primary_color_hex")
      .eq("tenant_id", user.tenantId)
      .maybeSingle(),
    // RLS scopes to auth.uid() automatically — safe via user client.
    supabase
      .from("notifications")
      .select("id, type, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const notifications = (notificationRowsRaw ?? []) as NotificationRow[];

  const brandColor = branding?.primary_color_hex ?? "#1AA876";

  if (tenant?.status === "suspended") {
    await supabase.auth.signOut();
    redirect("/login?error=tenant-suspended");
  }

  const navItems =
    user.role === "tenant_admin" ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV;

  return (
    <div
      className="min-h-screen md:grid md:grid-cols-[240px_1fr]"
      style={{ "--color-primary": brandColor } as React.CSSProperties}
    >
      {/* Mobile top bar (hidden md+) */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line/70 bg-surface/85 px-4 py-3 backdrop-blur-md md:hidden">
        <Link href="/tenant" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell items={notifications} />
          <UserMenu
            fullName={user.fullName || ""}
            email={user.email}
            subtitle={tenant?.name ?? undefined}
          />
          <MobileNav
            links={navItems.map((n) => ({ href: n.href, label: n.label }))}
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

      {/* Sidebar (md+) */}
      <aside className="hidden md:flex md:h-screen md:sticky md:top-0 md:flex-col md:border-r md:border-line/70 md:bg-surface/85 md:backdrop-blur-md md:shadow-[1px_0_0_rgba(255,255,255,0.7)_inset,8px_0_24px_-16px_rgba(15,23,42,0.10)]">
        <div className="flex items-center justify-between gap-2 border-b border-line/70 px-4 py-4">
          <Link href="/tenant" className="shrink-0">
            <Logo />
          </Link>
          <NotificationBell items={notifications} />
        </div>
        {tenant?.name ? (
          <div className="px-4 pt-3">
            <span
              className="inline-block max-w-full truncate rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white shadow-emboss"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
              }}
              title={tenant.name}
            >
              {tenant.name}
            </span>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-3">
          <SideNav items={navItems} />
        </div>
        <div className="border-t border-line/70 p-3">
          <UserMenu
            fullName={user.fullName || ""}
            email={user.email}
            subtitle={tenant?.name ?? undefined}
            align="top"
          />
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
