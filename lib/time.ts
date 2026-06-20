// Convert a local date+time in an IANA timezone to a UTC Date instant.
// date: "YYYY-MM-DD", time: "HH:MM"  (24-hour).
export function localToUtc(date: string, time: string, tz: string): Date {
  const guessUtc = new Date(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(guessUtc);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const tzAsUtcMs = Date.UTC(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")) === 24 ? 0 : Number(get("hour")),
    Number(get("minute")),
    Number(get("second"))
  );
  const offsetMs = tzAsUtcMs - guessUtc.getTime();
  return new Date(guessUtc.getTime() - offsetMs);
}

const WEEKDAY_ORDER: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// All dates in the given timezone, between `from` (inclusive) and `until`
// (exclusive), that fall on the given weekday. Returns YYYY-MM-DD strings
// in that timezone.
export function datesForWeekdayInRange(
  weekday: keyof typeof WEEKDAY_ORDER,
  from: Date,
  until: Date,
  tz: string
): string[] {
  const targetDow = WEEKDAY_ORDER[weekday];
  const out: string[] = [];
  // Walk one day at a time. Days in JS map cleanly because we compute weekday
  // and YYYY-MM-DD via Intl.
  for (
    let cursor = new Date(from.getTime());
    cursor.getTime() < until.getTime();
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(cursor);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const weekdayShort = get("weekday").toLowerCase().slice(0, 3); // "mon"
    if (WEEKDAY_ORDER[weekdayShort] !== targetDow) continue;
    out.push(`${get("year")}-${get("month")}-${get("day")}`);
  }
  return out;
}

// Today's YYYY-MM-DD in a given timezone.
export function todayInTimezone(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Format a UTC instant as 12-hour "h:MM AM/PM" in a given timezone.
export function formatTimeInTimezone(utc: string | Date, tz: string): string {
  const d = typeof utc === "string" ? new Date(utc) : utc;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

// Convert a 24-hour "HH:MM" string to 12-hour "h:MM AM/PM".
export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.slice(0, 5).split(":");
  const h = Number(hStr);
  const m = mStr ?? "00";
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}
