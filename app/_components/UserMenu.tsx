"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOutAction } from "@/app/login/actions";

function initialsFrom(name: string, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "??").toUpperCase();
}

export function UserMenu({
  fullName,
  email,
  subtitle,
}: {
  fullName: string;
  email: string;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const initials = initialsFrom(fullName || "", email || "");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Open user menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white shadow-emboss transition hover:brightness-110"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #2BC98A 0%, #1AA876 60%, #0B6845 100%)",
        }}
      >
        {initials}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-lg border border-line bg-surface shadow-pop">
          <div className="border-b border-line p-3">
            <p className="truncate text-sm font-medium text-ink">
              {fullName || email}
            </p>
            {fullName ? (
              <p className="truncate text-xs text-muted">{email}</p>
            ) : null}
            {subtitle ? (
              <p className="mt-1 truncate text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="p-1.5">
            <div className="rounded-md px-2.5 py-1.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                Your account
              </span>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger transition hover:bg-danger/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
