"use client";

import { formatDay, nextDays, zonedToUtc } from "@/lib/time";

export type Windows = Record<string, { start: string; end: string }[]>;

const DEFAULT_WINDOW = { start: "18:00", end: "20:00" };

/** Pick days from the next 7, with one or more time windows per day. */
export function AvailabilityEditor({
  timezone,
  value,
  onChange,
  excludePast = true,
}: {
  timezone: string;
  value: Windows;
  onChange: (next: Windows) => void;
  excludePast?: boolean;
}) {
  const days = nextDays(timezone, 7);

  const toggleDay = (d: string) => {
    const next = { ...value };
    if (next[d]) delete next[d];
    else next[d] = [{ ...DEFAULT_WINDOW }];
    onChange(next);
  };
  const setWindow = (d: string, i: number, patch: Partial<{ start: string; end: string }>) =>
    onChange({ ...value, [d]: value[d].map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  const addWindow = (d: string) => onChange({ ...value, [d]: [...value[d], { start: "12:00", end: "13:00" }] });
  const removeWindow = (d: string, i: number) => {
    const list = value[d].filter((_, j) => j !== i);
    const next = { ...value };
    if (list.length) next[d] = list;
    else delete next[d];
    onChange(next);
  };

  // Label days with a noon-anchored instant so the weekday is right in the creator's zone.
  const label = (d: string) => formatDay(zonedToUtc(d, "12:00", timezone).toISOString(), timezone);

  return (
    <div>
      <p className="mb-2 text-sm font-bold">Which days work?</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Days this week">
        {days.map((d, i) => (
          <button key={d} type="button" aria-pressed={!!value[d]} onClick={() => toggleDay(d)} className="chip text-sm">
            {i === 0 ? "Today" : i === 1 ? "Tomorrow" : label(d).split(",")[0]}
            <span className="ml-1 font-normal opacity-70">{d.slice(8)}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {days
          .filter((d) => value[d])
          .map((d) => (
            <div key={d} className="rounded-2xl border-2 border-line bg-card p-3">
              <p className="mb-2 font-bold">{label(d)}</p>
              {value[d].map((w, i) => {
                const invalid = w.start >= w.end;
                const past = excludePast && zonedToUtc(d, w.end, timezone).getTime() <= Date.now();
                return (
                  <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`${d}-${i}-s`}>
                      From
                    </label>
                    <input
                      id={`${d}-${i}-s`}
                      type="time"
                      className="field w-[7.5rem] min-w-0 flex-1"
                      value={w.start}
                      onChange={(e) => setWindow(d, i, { start: e.target.value })}
                    />
                    <span aria-hidden>→</span>
                    <label className="sr-only" htmlFor={`${d}-${i}-e`}>
                      To
                    </label>
                    <input
                      id={`${d}-${i}-e`}
                      type="time"
                      className="field w-[7.5rem] min-w-0 flex-1"
                      value={w.end}
                      onChange={(e) => setWindow(d, i, { end: e.target.value })}
                    />
                    <button
                      type="button"
                      className="h-11 w-11 shrink-0 rounded-full border-2 border-line bg-card text-lg"
                      onClick={() => removeWindow(d, i)}
                      aria-label={`Remove window ${w.start} to ${w.end}`}
                    >
                      ×
                    </button>
                    {invalid && <p className="w-full text-sm font-bold text-[#a3271b]">End time should be after the start.</p>}
                    {!invalid && past && <p className="w-full text-sm font-bold text-[#a3271b]">This window has already passed.</p>}
                  </div>
                );
              })}
              <button type="button" className="text-sm font-bold text-[#a3271b] underline underline-offset-4" onClick={() => addWindow(d)}>
                + Add another time window
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

export function windowsToDays(value: Windows) {
  return Object.entries(value)
    .filter(([, w]) => w.length)
    .map(([date, windows]) => ({ date, windows: windows.filter((w) => w.start < w.end) }))
    .filter((d) => d.windows.length);
}
