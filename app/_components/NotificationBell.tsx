"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Sparkles } from "lucide-react";
import { markAllNotificationsReadAction } from "@/app/_actions/notifications";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

// Renders the bell + dropdown panel. The server fetches the initial
// rows; once the panel is open we just render that list. No live
// polling for v1 — page navigation re-fetches.
export function NotificationBell({
  items,
}: {
  items: NotificationRow[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread > 0
            ? `Notifications (${unread} unread)`
            : "Notifications"
        }
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg/60 text-ink/80 ring-1 ring-inset ring-line/70 transition hover:-translate-y-px hover:bg-bg hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white shadow-emboss ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-xl border border-line bg-surface shadow-lift md:left-0 md:right-auto">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition hover:text-ink"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-muted/60" />
              <p className="mt-2 text-xs text-muted">
                Nothing yet. New enrollments and alerts will show up here.
              </p>
            </div>
          ) : (
            <ul className="max-h-[360px] overflow-y-auto divide-y divide-line/60">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={n.read_at ? "bg-surface" : "bg-primary-soft/20"}
                >
                  <NotificationItem n={n} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({ n }: { n: NotificationRow }) {
  const { title, sub, href } = renderNotification(n);
  const inner = (
    <div className="flex items-start gap-2.5 px-3 py-2.5">
      <span
        aria-hidden
        className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
          n.read_at ? "bg-line" : "bg-primary"
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-ink">{title}</p>
        {sub ? (
          <p className="mt-0.5 text-[11px] text-muted">{sub}</p>
        ) : null}
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
          {formatRelative(n.created_at)}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:bg-bg/60">
        {inner}
      </Link>
    );
  }
  return inner;
}

function renderNotification(n: NotificationRow): {
  title: string;
  sub?: string;
  href?: string;
} {
  const p = n.payload ?? {};
  const studentName = String(p.student_name ?? "");
  const classroom = String(p.classroom_name ?? "");
  const weekday = String(p.weekday ?? "");
  const start = String(p.start_time ?? "");
  const studentId = typeof p.student_id === "string" ? p.student_id : null;
  const href = studentId ? `/tenant/students/${studentId}/edit` : undefined;

  switch (n.type) {
    case "enrollment_confirmed":
      return {
        title: `${studentName} enrolled in ${classroom}`,
        sub: weekday && start ? `${cap(weekday)} ${start}` : undefined,
        href,
      };
    case "student_absent":
      return {
        title: `${studentName} marked absent`,
        sub: classroom ? `${classroom} · ${String(p.time ?? "")}` : undefined,
        href,
      };
    case "class_reminder":
      return {
        title: `${p.session_count} sessions today`,
        sub: `${p.student_count} students expected`,
        href: "/tenant/today",
      };
    default:
      return { title: n.type };
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}
