import { Check, CircleDashed, Minus, Sparkles, X } from "lucide-react";

type StatusKey = "expected" | "present" | "late" | "absent" | "excused" | "made_up";

const META: Record<
  StatusKey,
  {
    Icon: typeof Check;
    bgClass: string;
    textClass: string;
    label: string;
  }
> = {
  expected: {
    Icon: CircleDashed,
    bgClass: "bg-line/40 text-muted",
    textClass: "text-muted",
    label: "Expected",
  },
  present: {
    Icon: Check,
    bgClass: "bg-success text-white shadow-emboss",
    textClass: "text-success",
    label: "Present",
  },
  late: {
    Icon: Check,
    bgClass: "bg-warning text-white shadow-emboss",
    textClass: "text-warning",
    label: "Late",
  },
  absent: {
    Icon: X,
    bgClass: "bg-danger text-white shadow-emboss",
    textClass: "text-danger",
    label: "Absent",
  },
  excused: {
    Icon: Minus,
    bgClass: "bg-muted text-white shadow-emboss",
    textClass: "text-muted",
    label: "Excused",
  },
  made_up: {
    Icon: Sparkles,
    bgClass: "bg-primary text-white shadow-emboss",
    textClass: "text-primary-strong",
    label: "Made up",
  },
};

export function StatusIcon({
  status,
  size = 20,
}: {
  status: string;
  size?: number;
}) {
  const meta = META[status as StatusKey] ?? META.expected;
  const { Icon } = meta;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-surface ${meta.bgClass}`}
      style={{ width: size, height: size }}
      aria-label={meta.label}
      title={meta.label}
    >
      <Icon
        className="h-3 w-3"
        strokeWidth={status === "expected" ? 2 : 3}
      />
    </span>
  );
}

export function StatusBadge({
  status,
  size = 22,
}: {
  status: string;
  size?: number;
}) {
  const meta = META[status as StatusKey] ?? META.expected;
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusIcon status={status} size={size} />
      <span className={`text-sm font-medium ${meta.textClass}`}>
        {meta.label}
      </span>
    </span>
  );
}
