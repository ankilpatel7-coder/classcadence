"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type SideNavItem = { href: string; label: string; icon: LucideIcon };

function isActive(pathname: string, href: string): boolean {
  if (href === "/tenant" || href === "/admin/tenants") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ items }: { items: SideNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5" aria-label="Primary">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "text-white shadow-emboss"
                : "text-muted hover:bg-bg hover:text-ink"
            }`}
            style={
              active
                ? {
                    backgroundImage:
                      "linear-gradient(135deg, #2BC98A 0%, var(--color-primary) 60%, var(--color-primary-strong) 100%)",
                  }
                : undefined
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
