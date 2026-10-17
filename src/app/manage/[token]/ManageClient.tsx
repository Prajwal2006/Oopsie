"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvailabilityEditor, windowsToDays, type Windows } from "@/components/AvailabilityEditor";
import { CopyField } from "@/components/CopyField";
import { Footer } from "@/components/Footer";
import { Mascot, Wordmark } from "@/components/Mascot";
import type { ManageView } from "@/lib/apologies";
import { getOrigin, useClientValue } from "@/lib/use-client-value";
import { MEETING_LABELS, THEMES } from "@/lib/themes";
import { formatDateTime, formatTime, groupByDay, zoneLabel } from "@/lib/time";

const TIMELINE: Record<string, { emoji: string; label: string }> = {
  created: { emoji: "✍️", label: "Link created" },
  opened: { emoji: "👀", label: "They opened it" },
  yes_clicked: { emoji: "💖", label: "They said yes" },
  booked: { emoji: "📅", label: "Time booked" },
  opted_out: { emoji: "🌙", label: "They need some space" },
};

export function ManageClient({ token, initial }: { token: string; initial: ManageView }) {
  const [view, setView] = useState(initial);
  const origin = useClientValue(getOrigin, "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Windows>({});
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(guessSlotLength(initial));
  const [deleted, setDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tz = view.creatorTimezone;


  const refresh = async () => {
    const res = await fetch(`/api/manage/${token}`, { cache: "no-store" });
    if (res.ok) setView((await res.json()).apology);
  };

  const patch = async (body: object) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const parts = [];
      if (data.added) parts.push(`added ${data.added} slot${data.added === 1 ? "" : "s"}`);
      if (data.removed) parts.push(`removed ${data.removed}`);
      if (data.keptBooked) parts.push(`kept ${data.keptBooked} booked slot (booked times can't be removed)`);
      setMsg(parts.length ? `Done: ${parts.join(", ")}.` : "Nothing changed.");
      setSelected(new Set());
      setAdding({});
      await refresh();
    } catch (e) {
      setMsg((e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const destroy = async () => {
    setBusy(true);
    const res = await fetch(`/api/manage/${token}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) setDeleted(true);
    else setMsg("Couldn't delete. Please try again.");
  };

  const groups = useMemo(() => groupByDay(view.slots, tz), [view.slots, tz]);
  const addDays = windowsToDays(adding);

  if (deleted) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <Mascot size={110} mood="calm" />
        <h1 className="mt-3 text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
          All gone
        </h1>
        <p className="mt-1 text-muted">This Oopsie and all its data have been permanently deleted.</p>
        <Link href="/" className="btn-primary mt-6">
          Back to Oopsie
        </Link>
      </main>
    );
  }

  const theme = THEMES[view.vibe];
  const statusLine =
    view.status === "booked"
      ? "They booked a time to talk! 🎉"
      : view.status === "needs_space"
        ? "They asked for some space. Give it time 💛"
        : view.status === "yes"
          ? "They said yes and are picking a time…"
          : view.status === "opened"
            ? "They've opened it."
            : "Not opened yet. Patience 🌱";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[calc(1rem+var(--safe-top))]">
        <Link href="/" aria-label="Oopsie home" className="rounded-lg">
          <Wordmark small />
        </Link>
        <span className="text-xs font-bold text-muted">Private · don&apos;t share</span>
      </header>

      <main className="mx-auto w-full max-w-md space-y-5 px-4 pt-6">
        <div className="flex items-center gap-3">
          <Mascot size={72} mood={view.status === "booked" ? "happy" : view.status === "needs_space" ? "calm" : "sheepish"} />
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
              Your Oopsie for {view.recipientName}
            </h1>
            <p className="text-muted">
              {theme.emoji} {theme.label} · {statusLine}
            </p>
          </div>
        </div>

        <section aria-labelledby="timeline" className="rounded-3xl border-2 border-line bg-card p-4">
          <h2 id="timeline" className="mb-3 font-bold">
            Timeline
          </h2>
          <ol className="relative space-y-3 border-l-2 border-line pl-5">
            {view.timeline.map((e) => (
              <li key={e.type} className="relative">
                <span aria-hidden className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-[#ffe9e5] text-sm">
                  {TIMELINE[e.type]?.emoji}
                </span>
                <p className="font-bold">{TIMELINE[e.type]?.label ?? e.type}</p>
                <p className="text-sm text-muted">{formatDateTime(e.at, tz)}</p>
                {e.type === "booked" && view.bookingDetails && (
                  <div className="mt-2 rounded-2xl bg-[#effaf3] p-3 text-sm text-[#14532d]">
                    <p className="font-bold">
                      {formatDateTime(view.bookingDetails.startsAt, tz)} with {view.bookingDetails.guestName}
                    </p>
                    <p>
                      {MEETING_LABELS[view.meetingFormat].emoji} {MEETING_LABELS[view.meetingFormat].label}
                      {view.meetingDetails ? ` · ${view.meetingDetails}` : ""}
                    </p>
                    {view.bookingDetails.contactValue && (
                      <p>
                        Reach them by {view.bookingDetails.contactMethod}: <b>{view.bookingDetails.contactValue}</b>
                      </p>
                    )}
                    {view.bookingDetails.note && <p className="mt-1 italic">“{view.bookingDetails.note}”</p>}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="stat" className="flex items-center gap-4 rounded-3xl border-2 border-line bg-card p-4">
          <p className="text-4xl font-semibold text-brand" style={{ fontFamily: "var(--nf-display)" }} aria-hidden>
            {view.noDodges}
          </p>
          <div>
            <h2 id="stat" className="font-bold">
              <span className="sr-only">{view.noDodges} </span>
              Tries at the “No” button
            </h2>
            <p className="text-sm text-muted">
              {view.noDodges === 0 ? "Not a single one. 🥹" : view.noDodges > 8 ? "They really tried. The button held strong." : "The button was very shy."}
            </p>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border-2 border-line bg-card p-4">
          <CopyField id="share" label="Share link" value={origin ? `${origin}/a/${view.slug}` : ""} />
          <p className="text-xs text-muted">Expires {formatDateTime(view.expiresAt, tz)}. After that, everything is deleted.</p>
        </section>

        <section aria-labelledby="avail" className="space-y-4 rounded-3xl border-2 border-line bg-card p-4">
          <div>
            <h2 id="avail" className="font-bold">
              Availability
            </h2>
            <p className="text-sm text-muted">Times in {zoneLabel(tz)}. Select open times to remove them.</p>
          </div>
          {groups.length === 0 && <p className="text-sm">No slots yet.</p>}
          {groups.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-sm font-bold tracking-wide text-muted uppercase">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((slot) =>
                  slot.booked ? (
                    <span key={slot.id} className="chip inline-flex items-center border-[#86efac] bg-[#effaf3] text-sm text-[#14532d]">
                      🔒 {formatTime(slot.startsAt, tz)} booked
                    </span>
                  ) : (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={selected.has(slot.id)}
                      onClick={() =>
                        setSelected((cur) => {
                          const next = new Set(cur);
                          if (next.has(slot.id)) next.delete(slot.id);
                          else next.add(slot.id);
                          return next;
                        })
                      }
                      className={`chip text-sm ${new Date(slot.startsAt).getTime() < Date.now() ? "opacity-50" : ""}`}
                      aria-label={`${formatDateTime(slot.startsAt, tz)}${selected.has(slot.id) ? ", selected for removal" : ""}`}
                    >
                      {selected.has(slot.id) ? "✕ " : ""}
                      {formatTime(slot.startsAt, tz)}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
          {selected.size > 0 && (
            <button type="button" className="btn-ghost w-full" disabled={busy} onClick={() => patch({ removeSlotIds: [...selected] })}>
              Remove {selected.size} selected time{selected.size === 1 ? "" : "s"}
            </button>
          )}

          <details className="rounded-2xl border-2 border-dashed border-line p-3">
            <summary className="cursor-pointer font-bold">+ Add more times</summary>
            <div className="mt-3 space-y-3">
              <AvailabilityEditor timezone={tz} value={adding} onChange={setAdding} />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Slot length">
                {([15, 30, 60] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={slotMinutes === m} onClick={() => setSlotMinutes(m)} className="chip text-sm">
                    {m === 60 ? "1 hour" : `${m} min`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn-primary w-full"
                disabled={busy || addDays.length === 0}
                onClick={() => patch({ add: { days: addDays, slotMinutes } })}
              >
                Add times
              </button>
            </div>
          </details>
          {msg && (
            <p role="status" className="rounded-2xl bg-[#ffe9e5] px-3 py-2 text-sm font-bold text-[#8a2a1f]">
              {msg}
            </p>
          )}
        </section>

        <section aria-labelledby="danger" className="rounded-3xl border-2 border-[#f5c2c2] bg-[#fff5f5] p-4">
          <h2 id="danger" className="font-bold text-[#7a1010]">
            Delete this Oopsie
          </h2>
          <p className="text-sm text-[#7a1010]">Permanently removes the message, times, booking and stats. This can&apos;t be undone.</p>
          {confirmDelete ? (
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
              <button
                type="button"
                className="flex-1 rounded-full bg-[#b91c1c] px-4 font-bold text-white"
                disabled={busy}
                onClick={destroy}
              >
                Yes, delete forever
              </button>
            </div>
          ) : (
            <button type="button" className="btn-ghost mt-3" onClick={() => setConfirmDelete(true)}>
              Delete…
            </button>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function guessSlotLength(v: ManageView): 15 | 30 | 60 {
  const s = v.slots[0];
  if (!s) return 30;
  const mins = (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) / 60000;
  return mins === 15 || mins === 60 ? mins : 30;
}
