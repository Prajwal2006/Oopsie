// Timezone helpers (no dependencies; built on Intl). Shared client + server.

export interface DayAvailability {
  date: string; // YYYY-MM-DD in the creator's timezone
  windows: { start: string; end: string }[]; // HH:MM, 24h
}

export interface SlotRange {
  startsAt: string; // ISO UTC
  endsAt: string;
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const out: Record<string, number> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(instant: number, timeZone: string) {
  const p = partsInZone(new Date(instant), timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(instant / 1000) * 1000;
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - zoneOffset(guess, timeZone);
  // Second pass corrects for DST transitions between guess and result.
  ts = guess - zoneOffset(ts, timeZone);
  return new Date(ts);
}

/** YYYY-MM-DD for the given instant in `timeZone`. */
export function dateKeyInZone(date: Date, timeZone: string) {
  const p = partsInZone(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The next `count` calendar days (starting today) in `timeZone`, as YYYY-MM-DD. */
export function nextDays(timeZone: string, count = 7, from = new Date()) {
  const today = dateKeyInZone(from, timeZone);
  const [y, m, d] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return dt.toISOString().slice(0, 10);
  });
}

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export const MAX_SLOTS = 150;

/**
 * Expand day windows into bookable slots. Windows may not cross midnight;
 * slots in the past are dropped; overlapping windows are de-duplicated.
 */
export function generateSlots(
  days: DayAvailability[],
  slotMinutes: number,
  timeZone: string,
  now = new Date(),
): SlotRange[] {
  const seen = new Set<string>();
  const slots: SlotRange[] = [];
  for (const day of days) {
    for (const w of day.windows) {
      const startMin = minutesOf(w.start);
      const endMin = minutesOf(w.end);
      for (let t = startMin; t + slotMinutes <= endMin; t += slotMinutes) {
        const hh = String(Math.floor(t / 60)).padStart(2, "0");
        const mm = String(t % 60).padStart(2, "0");
        const start = zonedToUtc(day.date, `${hh}:${mm}`, timeZone);
        if (start.getTime() <= now.getTime()) continue;
        const iso = start.toISOString();
        if (seen.has(iso)) continue;
        seen.add(iso);
        slots.push({ startsAt: iso, endsAt: new Date(start.getTime() + slotMinutes * 60_000).toISOString() });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function formatDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, weekday: "long", month: "short", day: "numeric" }).format(
    new Date(iso),
  );
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function zoneLabel(timeZone: string) {
  return timeZone.replaceAll("_", " ");
}

export function groupByDay<T extends { startsAt: string }>(slots: T[], timeZone: string) {
  const groups = new Map<string, T[]>();
  for (const s of slots) {
    const key = dateKeyInZone(new Date(s.startsAt), timeZone);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, label: formatDay(items[0].startsAt, timeZone), items }));
}
