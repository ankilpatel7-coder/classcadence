// Circular avatar with student initials. Color is deterministically derived
// from the student's name so the same person always shows up in the same hue.
// No external requests — we render initials directly.

const PALETTE: [string, string][] = [
  ["#1AA876", "#0B6845"], // emerald (brand)
  ["#1E3A8A", "#172554"], // indigo
  ["#F97316", "#9A3412"], // recess orange
  ["#A855F7", "#6B21A8"], // purple
  ["#EF4444", "#7F1D1D"], // coral
  ["#0EA5E9", "#075985"], // sky
  ["#EAB308", "#854D0E"], // amber
  ["#14B8A6", "#0F766E"], // teal
  ["#EC4899", "#9D174D"], // pink
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function StudentAvatar({
  name,
  size = 28,
  className = "",
  ringClassName = "ring-2 ring-surface",
}: {
  name: string;
  size?: number;
  className?: string;
  ringClassName?: string;
}) {
  const idx = hash(name) % PALETTE.length;
  const [from, to] = PALETTE[idx];
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white shadow-emboss ${ringClassName} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
        backgroundImage: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  names,
  max = 4,
  size = 24,
}: {
  names: string[];
  max?: number;
  size?: number;
}) {
  if (names.length === 0) return null;
  const visible = names.slice(0, max);
  const overflow = Math.max(names.length - max, 0);
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((name, i) => (
        <StudentAvatar key={`${i}-${name}`} name={name} size={size} />
      ))}
      {overflow > 0 ? (
        <span
          className="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-bg font-semibold text-muted ring-2 ring-surface shadow-emboss"
          style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.4),
          }}
          aria-label={`${overflow} more`}
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
