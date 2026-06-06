"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

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
  align = "bottom",
}: {
  fullName: string;
  email: string;
  subtitle?: string;
  /** Where the dropdown opens relative to the avatar. "top" for sidebar bottoms. */
  align?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

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
        <div
          className={`absolute z-50 w-64 rounded-lg border border-line bg-surface shadow-pop ${
            align === "top"
              ? "bottom-full left-0 mb-2 origin-bottom-left"
              : "right-0 mt-2 origin-top-right"
          }`}
        >
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
            <Link
              href="/account/password"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-ink transition hover:bg-bg"
            >
              <KeyRound className="h-4 w-4 text-muted" />
              Change password
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger transition hover:bg-danger/5"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
