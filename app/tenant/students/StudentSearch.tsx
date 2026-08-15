"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

// Search box for the students list. The page is a server component and does the
// filtering in SQL, so the URL (`?q=`) is the single source of truth — this just
// keeps it in sync, debounced so we don't refetch on every keystroke.
export function StudentSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set("q", next.trim());
    else params.delete("q");
    // A new search invalidates the current page number.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname));
  }

  useEffect(() => {
    // Already in sync (including right after our own replace landed).
    if (value.trim() === initialQuery) return;
    const id = setTimeout(() => push(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialQuery]);

  return (
    <div className="relative">
      <Search
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition ${
          isPending ? "animate-pulse text-primary" : "text-muted"
        }`}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name, parent, email, or phone…"
        aria-label="Search students"
        className="w-full rounded-md border border-line bg-surface py-2 pl-9 pr-9 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            push("");
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:bg-bg hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
