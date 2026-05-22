"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  // The home route ("/tenant", "/admin/tenants") only matches exactly so it
  // doesn't light up for every sub-route.
  if (href === "/tenant" || href === "/admin/tenants") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  items,
  className = "",
}: {
  items: NavItem[];
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <nav
      className={`inline-flex items-center gap-1 rounded-full border border-line bg-surface/80 p-1 shadow-card backdrop-blur-sm ${className}`}
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-primary text-white shadow-emboss"
                : "text-muted hover:bg-bg hover:text-ink"
            }`}
            style={
              active
                ? {
                    backgroundImage:
                      "linear-gradient(180deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
                  }
                : undefined
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
