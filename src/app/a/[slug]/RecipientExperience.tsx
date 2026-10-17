"use client";

import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ApologyCard, ThemeShell, themeStyle } from "@/components/ApologyCard";
import { Mascot } from "@/components/Mascot";
import type { PublicApology, PublicSlot } from "@/lib/apologies";
import { buildIcs, downloadIcs } from "@/lib/ics";
import { MEETING_LABELS, THEMES } from "@/lib/themes";
import { browserTimeZone, formatDateTime, formatTime, groupByDay, zoneLabel } from "@/lib/time";
import { useClientValue } from "@/lib/use-client-value";
import { contactRequired } from "@/lib/validation";

type Stage = "card" | "celebrate" | "pick" | "details" | "done" | "space";

interface Confirmed {
  startsAt: string;
  endsAt: string;
}

function sendEvent(slug: string, type: "opened" | "no_dodge" | "yes_clicked") {
  fetch(`/api/a/${slug}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
    keepalive: true,
  }).catch(() => {});
}

export function RecipientExperience({ apology }: { apology: PublicApology }) {
  const reduceMotion = useReducedMotion();
  const t = THEMES[apology.vibe];
  const s = themeStyle(apology.vibe, apology.theme);
  const [stage, setStage] = useState<Stage>(
    apology.status === "needs_space" ? "space" : apology.booking ? "done" : "card",
  );
  const [confirmed, setConfirmed] = useState<Confirmed | null>(apology.booking);
  const [slots, setSlots] = useState<PublicSlot[] | null>(null);
  const [picked, setPicked] = useState<PublicSlot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tz = useClientValue(browserTimeZone, "UTC");

  useEffect(() => {
    const key = `oopsie:opened:${apology.slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    sendEvent(apology.slug, "opened");
  }, [apology.slug]);

  const loadSlots = useCallback(async () => {
    const res = await fetch(`/api/a/${apology.slug}/slots`, { cache: "no-store" });
    if (!res.ok) {
      setSlots([]);
      return;
    }
    const data = (await res.json()) as { slots: PublicSlot[] };
    setSlots(data.slots);
  }, [apology.slug]);

  const onYes = () => {
    sendEvent(apology.slug, "yes_clicked");
    setStage("celebrate");
    if (!reduceMotion) {
      const colors = [s.accent, "#ffffff", "#ffd166", "#ff8fab"];
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.65 }, colors, disableForReducedMotion: true });
      setTimeout(
        () => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 }, colors, disableForReducedMotion: true }),
        350,
      );
    }
    loadSlots();
  };

  const onOptOut = async () => {
    setStage("space");
    await fetch(`/api/a/${apology.slug}/opt-out`, { method: "POST" }).catch(() => {});
  };

  return (
    <AnimatePresence mode="wait">
      {stage === "card" && (
        <motion.div key="card" exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}>
          <ApologyCard
            data={apology}
            mode="live"
            onYes={onYes}
            onDodge={() => sendEvent(apology.slug, "no_dodge")}
            onOptOut={onOptOut}
          />
        </motion.div>
      )}

      {stage !== "card" && (
        <motion.div key="after" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
          <ThemeShell vibe={apology.vibe} theme={apology.theme} showAttribution>
            <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6">
              {stage === "celebrate" && (
                <Panel surface={s.surface}>
                  <div className="flex justify-center">
                    <Mascot size={110} mood="happy" />
                  </div>
                  <h1 className="mt-3 text-center text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
                    {t.celebration}
                  </h1>
                  <p className="mt-2 text-center" style={{ color: s.muted }}>
                    {apology.senderName} shared a few times that work this week. Pick whichever suits you.
                  </p>
                  <button type="button" className="mt-5 w-full" onClick={() => setStage("pick")} style={accentBtn(s)}>
                    Pick a time
                  </button>
                </Panel>
              )}

              {stage === "pick" && (
                <SlotPicker
                  slots={slots}
                  tz={tz}
                  creatorTz={apology.creatorTimezone}
                  notice={notice}
                  surface={s.surface}
                  muted={s.muted}
                  accent={s.accent}
                  format={apology.meetingFormat}
                  onPick={(slot) => {
                    setPicked(slot);
                    setNotice(null);
                    setStage("details");
                  }}
                />
              )}

              {stage === "details" && picked && (
                <DetailsForm
                  apology={apology}
                  slot={picked}
                  tz={tz}
                  s={s}
                  onBack={() => setStage("pick")}
                  onTaken={async (message) => {
                    setNotice(message);
                    setPicked(null);
                    await loadSlots();
                    setStage("pick");
                  }}
                  onDone={(c) => {
                    setConfirmed(c);
                    setStage("done");
                    if (!reduceMotion) confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, disableForReducedMotion: true });
                  }}
                />
              )}

              {stage === "done" && confirmed && (
                <Panel surface={s.surface}>
                  <div className="flex justify-center">
                    <Mascot size={110} mood="happy" />
                  </div>
                  <h1 className="mt-3 text-center text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
                    It&apos;s a date to talk!
                  </h1>
                  <p className="mt-3 text-center text-lg font-bold">{formatDateTime(confirmed.startsAt, tz)}</p>
                  <p className="text-center text-sm" style={{ color: s.muted }}>
                    {MEETING_LABELS[apology.meetingFormat].emoji} {MEETING_LABELS[apology.meetingFormat].label}
                    {apology.meetingDetails ? ` · ${apology.meetingDetails}` : ""}
                  </p>
                  <p className="mt-1 text-center text-xs" style={{ color: s.muted }}>
                    That&apos;s {formatTime(confirmed.startsAt, apology.creatorTimezone)} for {apology.senderName} (
                    {zoneLabel(apology.creatorTimezone)})
                  </p>
                  <button
                    type="button"
                    className="mt-5 w-full"
                    style={accentBtn(s)}
                    onClick={() =>
                      downloadIcs(
                        "oopsie-chat.ics",
                        buildIcs({
                          uid: `${apology.slug}-${confirmed.startsAt}`,
                          startsAt: confirmed.startsAt,
                          endsAt: confirmed.endsAt,
                          title: `Chat with ${apology.senderName} 💌`,
                          description: `${MEETING_LABELS[apology.meetingFormat].label}, booked with Oopsie Woopsie.`,
                          location: apology.meetingDetails ?? undefined,
                        }),
                      )
                    }
                  >
                    <span aria-hidden>📅</span> Add to calendar
                  </button>
                  <p className="mt-4 text-center text-sm" style={{ color: s.muted }}>
                    {apology.senderName} will see that you picked this time. Thank you for giving it a chance.
                  </p>
                </Panel>
              )}

              {stage === "space" && (
                <Panel surface={s.surface}>
                  <div className="flex justify-center">
                    <Mascot size={110} mood="calm" />
                  </div>
                  <h1 className="mt-3 text-center text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
                    That&apos;s okay
                  </h1>
                  <p className="mt-3 text-center leading-relaxed">{t.needsSpace}</p>
                  <p className="mt-4 text-center text-sm" style={{ color: s.muted }}>
                    We&apos;ve let {apology.senderName} know you need some space. You won&apos;t be asked again.
                  </p>
                </Panel>
              )}
            </main>
          </ThemeShell>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function accentBtn(s: { accent: string; accentInk: string }) {
  return {
    background: s.accent,
    color: s.accentInk,
    minHeight: 56,
    borderRadius: 999,
    fontWeight: 600,
    fontSize: "1.1rem",
    fontFamily: "var(--nf-display)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
  } as const;
}

function Panel({ surface, children }: { surface: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] p-5 shadow-lg backdrop-blur-sm" style={{ background: surface }}>
      {children}
    </section>
  );
}

function SlotPicker({
  slots,
  tz,
  creatorTz,
  notice,
  surface,
  muted,
  accent,
  format,
  onPick,
}: {
  slots: PublicSlot[] | null;
  tz: string;
  creatorTz: string;
  notice: string | null;
  surface: string;
  muted: string;
  accent: string;
  format: PublicApology["meetingFormat"];
  onPick: (slot: PublicSlot) => void;
}) {
  const groups = useMemo(() => (slots ? groupByDay(slots, tz) : []), [slots, tz]);
  return (
    <Panel surface={surface}>
      <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
        When works for you?
      </h1>
      <p className="mt-1 text-sm" style={{ color: muted }}>
        {MEETING_LABELS[format].emoji} {MEETING_LABELS[format].label} · times shown in your timezone ({zoneLabel(tz)})
        {creatorTz !== tz ? `. They're in ${zoneLabel(creatorTz)}.` : "."}
      </p>
      {notice && (
        <p role="alert" className="mt-3 rounded-2xl bg-[#fff4b8] px-3 py-2 text-sm font-bold text-[#5b4300]">
          {notice}
        </p>
      )}
      {slots === null ? (
        <p role="status" className="mt-6 text-center font-bold">
          Finding times…
        </p>
      ) : groups.length === 0 ? (
        <p className="mt-6 text-center">
          Oh no, no open times are left right now. Maybe send them a message to find a new one? 💌
        </p>
      ) : (
        <div className="mt-4 max-h-[55dvh] space-y-5 overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.key} role="group" aria-labelledby={`day-${g.key}`}>
              <h2 id={`day-${g.key}`} className="mb-2 text-sm font-bold tracking-wide uppercase" style={{ color: muted }}>
                {g.label}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {g.items.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onPick(slot)}
                    className="min-h-[52px] rounded-2xl border-2 text-base font-bold transition hover:scale-[1.02]"
                    style={{ borderColor: accent, background: "rgba(255,255,255,0.9)", color: "#2a1a10" }}
                    aria-label={`${formatDateTime(slot.startsAt, tz)}`}
                  >
                    {formatTime(slot.startsAt, tz)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DetailsForm({
  apology,
  slot,
  tz,
  s,
  onBack,
  onTaken,
  onDone,
}: {
  apology: PublicApology;
  slot: PublicSlot;
  tz: string;
  s: ReturnType<typeof themeStyle>;
  onBack: () => void;
  onTaken: (message: string) => void;
  onDone: (c: Confirmed) => void;
}) {
  const needsContact = contactRequired(apology.meetingFormat, apology.meetingDetails);
  const [name, setName] = useState(apology.recipientName);
  const [method, setMethod] = useState<"phone" | "email" | "handle">(apology.meetingFormat === "video" ? "email" : "phone");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/a/${apology.slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: slot.id,
          guestName: name,
          contactMethod: value.trim() ? method : undefined,
          contactValue: value.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) return onDone({ startsAt: data.booking.startsAt, endsAt: data.booking.endsAt });
      if (data.error === "slot_taken") return onTaken(data.message);
      setErr(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setErr("Couldn't reach Oopsie Woopsie. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputType = method === "email" ? "email" : method === "phone" ? "tel" : "text";
  const fieldStyle = { background: "rgba(255,255,255,0.9)", color: "#2a1a10" };

  return (
    <Panel surface={s.surface}>
      <button type="button" onClick={onBack} className="text-sm font-bold underline underline-offset-4" style={{ color: s.muted }}>
        ← Pick a different time
      </button>
      <h1 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
        Almost there!
      </h1>
      <p className="mt-1 font-bold">{formatDateTime(slot.startsAt, tz)}</p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="guest-name" className="mb-1 block text-sm font-bold">
            Your name
          </label>
          <input id="guest-name" className="field" style={fieldStyle} value={name} maxLength={40} required onChange={(e) => setName(e.target.value)} />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-bold">
            How can they reach you? {needsContact ? "" : <span style={{ color: s.muted }}>(optional)</span>}
          </legend>
          <div role="radiogroup" aria-label="Contact method" className="mb-2 flex gap-2">
            {(["phone", "email", "handle"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                className="chip flex-1 !px-2 text-sm whitespace-nowrap"
                style={{ color: method === m ? "#8a2a1f" : "#2a1a10" }}
              >
                {m === "phone" ? "Phone" : m === "email" ? "Email" : "@handle"}
              </button>
            ))}
          </div>
          <input
            aria-label={method === "handle" ? "Your handle" : method === "email" ? "Your email" : "Your phone number"}
            className="field"
            style={fieldStyle}
            type={inputType}
            inputMode={method === "phone" ? "tel" : method === "email" ? "email" : "text"}
            autoComplete={method === "phone" ? "tel" : method === "email" ? "email" : "off"}
            value={value}
            maxLength={120}
            required={needsContact}
            placeholder={method === "handle" ? "@yourname" : method === "email" ? "you@example.com" : "+1 555 123 4567"}
            onChange={(e) => setValue(e.target.value)}
          />
        </fieldset>

        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-bold">
            A little note <span style={{ color: s.muted }}>(optional)</span>
          </label>
          <textarea
            id="note"
            className="field min-h-[88px]"
            style={fieldStyle}
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything you'd like them to know"
          />
        </div>

        {err && (
          <p role="alert" className="rounded-2xl bg-[#ffe1e1] px-3 py-2 text-sm font-bold text-[#7a1010]">
            {err}
          </p>
        )}

        <button type="submit" disabled={busy} className="w-full disabled:opacity-60" style={accentBtn(s)}>
          {busy ? "Saving…" : "Confirm this time"}
        </button>
      </form>
    </Panel>
  );
}
