"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export type MobileNavLink = { href: string; label: string };

export function MobileNav({
  links,
  rightExtra,
}: {
  links: MobileNavLink[];
  rightExtra?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-surface text-ink transition hover:bg-bg"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-40 border-b border-line bg-surface shadow-card">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-ink transition hover:bg-bg"
              >
                {l.label}
              </Link>
            ))}
            {rightExtra ? (
              <div className="mt-2 border-t border-line pt-3">{rightExtra}</div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
