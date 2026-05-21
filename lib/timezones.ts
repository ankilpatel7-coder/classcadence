// IANA timezone list grouped by region for FR-LM-02.
// Uses Intl.supportedValuesOf on Node 20+ when available; falls back to a curated
// list that covers all US zones + common international markets.
const FALLBACK_ZONES = [
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Detroit",
  "America/Indiana/Indianapolis",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

function allZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      return FALLBACK_ZONES;
    }
  }
  return FALLBACK_ZONES;
}

export type TimezoneGroup = { region: string; zones: string[] };

export function getTimezoneGroups(): TimezoneGroup[] {
  const groups = new Map<string, string[]>();
  for (const zone of allZones()) {
    const region = zone.includes("/") ? zone.split("/")[0] : "Other";
    const list = groups.get(region) ?? [];
    list.push(zone);
    groups.set(region, list);
  }
  // Sort regions with America first (most US-centric users), then alphabetical.
  const sortedRegions = Array.from(groups.keys()).sort((a, b) => {
    if (a === "America") return -1;
    if (b === "America") return 1;
    return a.localeCompare(b);
  });
  return sortedRegions.map((region) => ({
    region,
    zones: (groups.get(region) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}
