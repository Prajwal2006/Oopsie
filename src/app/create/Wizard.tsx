"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ApologyCard, themeStyle } from "@/components/ApologyCard";
import { AvailabilityEditor, windowsToDays, type Windows } from "@/components/AvailabilityEditor";
import { CopyField } from "@/components/CopyField";
import { Mascot, Wordmark } from "@/components/Mascot";
import {
  BACKGROUNDS,
  defaultThemeConfig,
  FONT_LABELS,
  FONT_VARS,
  FONTS,
  fillTemplate,
  MEETING_FORMATS,
  MEETING_LABELS,
  STICKER_PACKS,
  stickersFor,
  THEMES,
  VIBES,
  type MeetingFormat,
  type ThemeConfig,
  type Vibe,
} from "@/lib/themes";
import { browserTimeZone, generateSlots, MAX_SLOTS, zoneLabel } from "@/lib/time";
import { getCanShare, getOrigin, supportedTimeZones, useClientValue } from "@/lib/use-client-value";

const NO_ZONES: string[] = [];

const STEPS = ["Who", "Names", "Message", "Style", "Times", "Review"] as const;
const MAX_MESSAGE = 600;

const BG_LABELS = { hearts: "💗 Floating hearts", stars: "⭐ Stars", bubbles: "🫧 Bubbles", none: "None" } as const;
const PACK_LABELS: Record<(typeof STICKER_PACKS)[number], string> = {
  vibe: "Match the vibe",
  hearts: "Hearts",
  sparkles: "Sparkles",
  snacks: "Snacks",
  flowers: "Flowers",
  celestial: "Moon & stars",
  critters: "Critters",
};
const ACCENT_SWATCHES = ["#e8613a", "#d6264f", "#ffd166", "#c4b5fd", "#2a9d8f", "#3a86ff", "#ff8fab", "#6d28d9"];

interface Draft {
  vibe: Vibe | null;
  recipientName: string;
  senderName: string;
  message: string;
  theme: ThemeConfig;
  allowOptOut: boolean;
  meetingFormat: MeetingFormat;
  meetingDetails: string;
  timezone: string | null; // null = use the browser's timezone
  windows: Windows;
  slotMinutes: 15 | 30 | 60;
}

const initialDraft: Draft = {
  vibe: null,
  recipientName: "",
  senderName: "",
  message: "",
  theme: defaultThemeConfig("friend"),
  allowOptOut: true,
  meetingFormat: "call",
  meetingDetails: "",
  timezone: null,
  windows: {},
  slotMinutes: 30,
};

export function Wizard() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [d, setD] = useState<Draft>(initialDraft);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; token: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const browserTz = useClientValue(browserTimeZone, "UTC");
  const timeZones = useClientValue(supportedTimeZones, NO_ZONES);
  const timezone = d.timezone ?? browserTz;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setTheme = <K extends keyof ThemeConfig>(k: K, v: ThemeConfig[K]) => setD((x) => ({ ...x, theme: { ...x.theme, [k]: v } }));

  const days = useMemo(() => windowsToDays(d.windows), [d.windows]);
  const slotCount = useMemo(() => {
    if (step < 4) return 0;
    try {
      return generateSlots(days, d.slotMinutes, timezone).length;
    } catch {
      return 0;
    }
  }, [days, d.slotMinutes, timezone, step]);

  const canNext = [
    !!d.vibe,
    d.recipientName.trim().length > 0 && d.senderName.trim().length > 0,
    d.message.trim().length > 0 && d.message.length <= MAX_MESSAGE,
    d.theme.yesText.trim() && d.theme.noText.trim() && d.theme.question.trim(),
    slotCount > 0 && slotCount <= MAX_SLOTS,
    true,
  ][step];

  const go = (delta: number) => {
    setDir(delta);
    setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + delta)));
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const chooseVibe = (v: Vibe) => {
    setD((x) => (x.vibe === v ? x : { ...x, vibe: v, theme: defaultThemeConfig(v) }));
    setTemplateIdx(0);
  };

  const starter = () => {
    if (!d.vibe) return;
    const list = THEMES[d.vibe].templates;
    set("message", fillTemplate(list[templateIdx % list.length], d.recipientName, d.senderName));
    setTemplateIdx((i) => i + 1);
  };

  const publish = async () => {
    if (!d.vibe) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/apologies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibe: d.vibe,
          senderName: d.senderName,
          recipientName: d.recipientName,
          message: d.message,
          theme: d.theme,
          allowOptOut: d.allowOptOut,
          meetingFormat: d.meetingFormat,
          meetingDetails: d.meetingDetails,
          timezone,
          availability: { days, slotMinutes: d.slotMinutes },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Couldn't publish. Please try again.");
      setResult({ slug: data.slug, token: data.token });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(false);
    }
  };

  if (result) return <Published result={result} recipient={d.recipientName} />;

  const variants = {
    enter: (direction: number) => (reduceMotion ? { opacity: 0 } : { x: direction * 60, opacity: 0, rotate: direction * 1.5 }),
    center: { x: 0, opacity: 1, rotate: 0 },
    exit: (direction: number) => (reduceMotion ? { opacity: 0 } : { x: direction * -60, opacity: 0, rotate: direction * -1.5 }),
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#ffe0d3_0%,#fff7f1_60%)]">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-[calc(1rem+var(--safe-top))]">
        <Link href="/" aria-label="Oopsie Woopsie home" className="rounded-lg">
          <Wordmark small />
        </Link>
        <p className="text-sm font-bold text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
      </header>
      <div className="mx-auto mt-3 w-full max-w-md px-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-[#f6dccf]"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
        >
          <div className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-md flex-1 overflow-x-hidden px-4 pt-6 pb-36">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.01 : 0.28, ease: "easeOut" }}
          >
            {step === 0 && (
              <Step title="Who is this for?" hint="This sets the theme and the starter copy. You can tweak everything later." mascot>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Relationship vibe">
                  {VIBES.map((v) => {
                    const t = THEMES[v];
                    const selected = d.vibe === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => chooseVibe(v)}
                        className={`flex min-h-[132px] flex-col items-start justify-between rounded-3xl p-4 text-left shadow-sm transition ${selected ? "ring-4 ring-brand ring-offset-2" : ""}`}
                        style={{ background: t.background, color: t.text }}
                      >
                        <span className="text-3xl" aria-hidden>
                          {t.emoji}
                        </span>
                        <span>
                          <span className="block text-lg font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
                            {v === "crush" ? "Crush" : t.label}
                          </span>
                          <span className="block text-xs font-bold opacity-85">
                            {v === "crush" ? "Someone I'm trying to win over" : t.blurb}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Step>
            )}

            {step === 1 && (
              <Step title="Who's who?" hint="Nicknames are perfect.">
                <TextField id="recipient" label="Their name (or nickname)" value={d.recipientName} max={40} onChange={(v) => set("recipientName", v)} placeholder="e.g. Sam, Bestie, Bean" autoFocus />
                <TextField id="sender" label="Your name" value={d.senderName} max={40} onChange={(v) => set("senderName", v)} placeholder="How they know you" />
              </Step>
            )}

            {step === 2 && d.vibe && (
              <Step title="Say what you mean" hint="Own it, keep it kind, and skip the 'but'. Short is great.">
                <div>
                  <div className="mb-1 flex items-end justify-between">
                    <label htmlFor="message" className="text-sm font-bold">
                      Your apology
                    </label>
                    <span className={`text-xs font-bold ${d.message.length > MAX_MESSAGE ? "text-[#a3271b]" : "text-muted"}`} aria-live="polite">
                      {d.message.length}/{MAX_MESSAGE}
                    </span>
                  </div>
                  <textarea
                    id="message"
                    className="field min-h-[180px] leading-relaxed"
                    value={d.message}
                    maxLength={MAX_MESSAGE}
                    onChange={(e) => set("message", e.target.value)}
                    placeholder={`Hey ${d.recipientName || "you"}, I'm sorry…`}
                  />
                  <button type="button" onClick={starter} className="btn-ghost mt-2">
                    <span aria-hidden>✨</span> {d.message ? "Try another starter" : "Give me a starter"}
                  </button>
                </div>
                <MiniPreview draft={d} />
              </Step>
            )}

            {step === 3 && d.vibe && (
              <Step title="Make it yours" hint="Little touches go a long way.">
                <Group label="Accent color">
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Accent ${c}`}
                        aria-pressed={d.theme.accent.toLowerCase() === c}
                        onClick={() => setTheme("accent", c)}
                        className={`h-11 w-11 rounded-full border-4 ${d.theme.accent.toLowerCase() === c ? "border-foreground" : "border-white"} shadow`}
                        style={{ background: c }}
                      />
                    ))}
                    <label className="flex h-11 items-center gap-2 rounded-full border-2 border-line bg-card px-3 text-sm font-bold">
                      Custom
                      <input type="color" value={d.theme.accent} onChange={(e) => setTheme("accent", e.target.value)} className="h-7 w-9 cursor-pointer bg-transparent" />
                    </label>
                  </div>
                </Group>

                <Group label="Stickers">
                  <ChipRow
                    options={STICKER_PACKS.map((p) => ({ value: p, label: `${stickersFor(d.vibe!, p).slice(0, 2).join("")} ${PACK_LABELS[p]}` }))}
                    value={d.theme.stickerPack}
                    onChange={(v) => setTheme("stickerPack", v)}
                  />
                </Group>

                <Group label="Background animation">
                  <ChipRow options={BACKGROUNDS.map((b) => ({ value: b, label: BG_LABELS[b] }))} value={d.theme.background} onChange={(v) => setTheme("background", v)} />
                </Group>

                <Group label="Font">
                  <ChipRow
                    options={FONTS.map((f) => ({ value: f, label: FONT_LABELS[f], style: { fontFamily: FONT_VARS[f], fontSize: f === "handwritten" ? "1.2rem" : undefined } }))}
                    value={d.theme.font}
                    onChange={(v) => setTheme("font", v)}
                  />
                </Group>

                <TextField id="question" label="The big question" value={d.theme.question} max={80} onChange={(v) => setTheme("question", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <TextField id="yes" label="Yes button" value={d.theme.yesText} max={40} onChange={(v) => setTheme("yesText", v)} />
                  <TextField id="no" label="No button" value={d.theme.noText} max={24} onChange={(v) => setTheme("noText", v)} />
                </div>
                <TextField
                  id="peace"
                  label="Peace offering (optional)"
                  value={d.theme.peaceOffering}
                  max={120}
                  onChange={(v) => setTheme("peaceOffering", v)}
                  placeholder="I'll bring your favorite coffee ☕"
                />

                <div className="flex items-start justify-between gap-3 rounded-2xl border-2 border-line bg-card p-3">
                  <div>
                    <p id="optout-label" className="font-bold">
                      Let them step away kindly
                    </p>
                    <p id="optout-desc" className="text-sm text-muted">
                      After a few tries at “No”, a quiet “I need some time” link appears. We recommend keeping this on.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={d.allowOptOut}
                    aria-labelledby="optout-label"
                    aria-describedby="optout-desc"
                    onClick={() => set("allowOptOut", !d.allowOptOut)}
                    className={`relative h-8 w-14 shrink-0 rounded-full transition ${d.allowOptOut ? "bg-brand" : "bg-[#d9c4b8]"}`}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${d.allowOptOut ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              </Step>
            )}

            {step === 4 && (
              <Step title="When can you talk?" hint="Pick times this week. They'll see them in their own timezone.">
                <Group label="How do you want to meet?">
                  <ChipRow
                    options={MEETING_FORMATS.map((f) => ({ value: f, label: `${MEETING_LABELS[f].emoji} ${MEETING_LABELS[f].label}` }))}
                    value={d.meetingFormat}
                    onChange={(v) => set("meetingFormat", v)}
                  />
                </Group>
                <TextField
                  id="details"
                  label={
                    d.meetingFormat === "video"
                      ? "Meeting link (optional)"
                      : d.meetingFormat === "coffee" || d.meetingFormat === "walk"
                        ? "Where? (optional)"
                        : "Anything they should know? (optional)"
                  }
                  value={d.meetingDetails}
                  max={200}
                  onChange={(v) => set("meetingDetails", v)}
                  placeholder={d.meetingFormat === "video" ? "https://meet…" : d.meetingFormat === "coffee" ? "Our usual café" : ""}
                />

                <div>
                  <label htmlFor="tz" className="mb-1 block text-sm font-bold">
                    Your timezone
                  </label>
                  <select id="tz" className="field" value={timezone} onChange={(e) => set("timezone", e.target.value)}>
                    {(timeZones.includes(timezone) ? timeZones : [timezone, ...timeZones]).map((z) => (
                      <option key={z} value={z}>
                        {zoneLabel(z)}
                      </option>
                    ))}
                  </select>
                </div>

                <AvailabilityEditor timezone={timezone} value={d.windows} onChange={(w) => set("windows", w)} />

                <Group label="Slot length">
                  <ChipRow
                    options={[15, 30, 60].map((m) => ({ value: m as 15 | 30 | 60, label: m === 60 ? "1 hour" : `${m} min` }))}
                    value={d.slotMinutes}
                    onChange={(v) => set("slotMinutes", v)}
                  />
                </Group>

                <p className="rounded-2xl bg-[#ffe9e5] px-3 py-2 text-sm font-bold text-[#8a2a1f]" aria-live="polite">
                  {slotCount === 0
                    ? "Add a day and a time window to create bookable slots."
                    : slotCount > MAX_SLOTS
                      ? `That's ${slotCount} slots. Please keep it under ${MAX_SLOTS}.`
                      : `${slotCount} bookable slot${slotCount === 1 ? "" : "s"} 🎉`}
                </p>
              </Step>
            )}

            {step === 5 && d.vibe && (
              <Step title="Here's what they'll see" hint="Go on, try to press “No” 😉">
                <ApologyCard
                  key={previewKey}
                  mode="preview"
                  data={{
                    vibe: d.vibe,
                    senderName: d.senderName,
                    recipientName: d.recipientName,
                    message: d.message,
                    theme: d.theme,
                    allowOptOut: d.allowOptOut,
                  }}
                />
                <button type="button" className="btn-ghost w-full" onClick={() => setPreviewKey((k) => k + 1)}>
                  ↺ Replay preview
                </button>
                <ul className="space-y-1 rounded-2xl border-2 border-line bg-card p-3 text-sm">
                  <li>
                    <b>Meeting:</b> {MEETING_LABELS[d.meetingFormat].emoji} {MEETING_LABELS[d.meetingFormat].label}
                    {d.meetingDetails ? ` · ${d.meetingDetails}` : ""}
                  </li>
                  <li>
                    <b>Times:</b> {slotCount} slots ({d.slotMinutes} min) in {zoneLabel(timezone)}
                  </li>
                  <li>
                    <b>“I need some time” option:</b> {d.allowOptOut ? "on" : "off"}
                  </li>
                </ul>
                {error && (
                  <p role="alert" className="rounded-2xl bg-[#ffe1e1] px-3 py-2 text-sm font-bold text-[#7a1010]">
                    {error}
                  </p>
                )}
              </Step>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav
        aria-label="Wizard navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-[#fff7f1]/95 px-4 pt-3 pb-[calc(0.75rem+var(--safe-bottom))] backdrop-blur"
      >
        <div className="mx-auto flex max-w-md gap-3">
          {step > 0 && (
            <button type="button" className="btn-ghost min-h-[52px]" onClick={() => go(-1)}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn-primary flex-1" disabled={!canNext} onClick={() => go(1)}>
              Next
            </button>
          ) : (
            <button type="button" className="btn-primary flex-1" disabled={publishing} onClick={publish}>
              {publishing ? "Publishing…" : "Publish my Oopsie Woopsie 💌"}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

function Step({ title, hint, mascot, children }: { title: string; hint?: string; mascot?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby="step-title" className="space-y-5">
      <div className="flex items-center gap-3">
        {mascot && <Mascot size={64} decorative />}
        <div>
          <h1 id="step-title" className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--nf-display)" }}>
            {title}
          </h1>
          {hint && <p className="mt-1 text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      {children}
    </fieldset>
  );
}

function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; style?: CSSProperties }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className="chip text-sm" style={o.style}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  max,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        className="field"
        value={value}
        maxLength={max}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function MiniPreview({ draft }: { draft: Draft }) {
  if (!draft.vibe) return null;
  const s = themeStyle(draft.vibe, draft.theme);
  return (
    <div aria-label="Live preview" role="region" className="rounded-3xl p-4 shadow-sm" style={{ background: s.background, color: s.text }}>
      <p className="mb-2 text-xs font-bold tracking-widest uppercase opacity-80">Live preview</p>
      <div className="rounded-2xl p-4" style={{ background: s.surface }}>
        <p className="font-bold" style={{ fontFamily: "var(--nf-display)" }}>
          Dear {draft.recipientName || "you"},
        </p>
        <p className="mt-2 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: s.font, fontSize: `${s.fontScale}rem` }}>
          {draft.message || "Your words will show up here…"}
        </p>
      </div>
    </div>
  );
}

function Published({ result, recipient }: { result: { slug: string; token: string }; recipient: string }) {
  const origin = useClientValue(getOrigin, "");
  const canShare = useClientValue(getCanShare, false);
  const shareUrl = `${origin}/a/${result.slug}`;
  const manageUrl = `${origin}/manage/${result.token}`;

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,#ffe0d3_0%,#fff7f1_60%)]">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[calc(2rem+var(--safe-top))] pb-10">
        <div className="flex justify-center">
          <Mascot size={120} mood="happy" />
        </div>
        <h1 className="mt-3 text-center text-3xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
          Your Oopsie Woopsie is ready!
        </h1>
        <p className="mt-1 text-center text-muted">Send the share link to {recipient || "them"}. Fingers crossed 🤞</p>

        <div className="mt-6 space-y-4 rounded-3xl border-2 border-line bg-card p-4">
          <CopyField id="share-link" label="Share link (send this one)" value={shareUrl} />
          {canShare && (
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => navigator.share({ title: "Oopsie Woopsie 💌", text: "I made you something", url: shareUrl }).catch(() => {})}
            >
              Share… <span aria-hidden>📤</span>
            </button>
          )}
        </div>

        <div role="note" className="mt-6 rounded-3xl border-2 border-[#f0b429] bg-[#fff6d6] p-4">
          <p className="font-bold text-[#6b4a00]">
            <span aria-hidden>⚠️ </span>Save your private manage link now
          </p>
          <p className="mt-1 text-sm text-[#6b4a00]">
            It&apos;s the only way to see their answer, edit times, or delete this Oopsie Woopsie. We can&apos;t recover it, and
            you shouldn&apos;t share it with anyone.
          </p>
          <div className="mt-3">
            <CopyField id="manage-link" label="Private manage link" value={manageUrl} />
          </div>
          <a href={manageUrl} className="mt-3 inline-block text-sm font-bold text-[#6b4a00] underline underline-offset-4">
            Open manage page →
          </a>
        </div>
      </main>
    </div>
  );
}
