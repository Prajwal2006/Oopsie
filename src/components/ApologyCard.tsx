"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { BackgroundFx } from "./BackgroundFx";
import { DodgeButton } from "./DodgeButton";
import { Wordmark } from "./Mascot";
import { FONT_VARS, readableOn, stickersFor, THEMES, type ThemeConfig, type Vibe } from "@/lib/themes";

export interface CardData {
  vibe: Vibe;
  senderName: string;
  recipientName: string;
  message: string;
  theme: ThemeConfig;
  allowOptOut: boolean;
}

export const OPT_OUT_AFTER = 8;

export function themeStyle(vibe: Vibe, theme: ThemeConfig) {
  const t = THEMES[vibe];
  return {
    background: t.background,
    text: t.text,
    muted: t.muted,
    surface: t.surface,
    accent: theme.accent,
    accentInk: readableOn(theme.accent),
    font: FONT_VARS[theme.font],
    fontScale: theme.font === "handwritten" ? 1.3 : 1,
  };
}

/** Full-screen themed backdrop shared by every recipient-facing screen. */
export function ThemeShell({
  vibe,
  theme,
  children,
  preview = false,
  shellRef,
}: {
  vibe: Vibe;
  theme: ThemeConfig;
  children: ReactNode;
  preview?: boolean;
  shellRef?: Ref<HTMLDivElement>;
}) {
  const s = themeStyle(vibe, theme);
  return (
    <div
      ref={shellRef}
      className={`relative isolate flex flex-col overflow-hidden ${preview ? "h-[620px] rounded-[2rem] border-4 border-white shadow-xl" : "min-h-dvh"}`}
      style={{ background: s.background, color: s.text } as CSSProperties}
    >
      <BackgroundFx kind={theme.background} color={vibe === "situationship" || vibe === "crush" ? "#ffffff" : s.accent} />
      <div
        className={`relative z-10 flex flex-1 flex-col px-4 ${preview ? "pt-4 pb-4" : "pt-[calc(0.75rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]"}`}
      >
        <div className="flex justify-center opacity-70">
          <Wordmark small />
        </div>
        {children}
      </div>
    </div>
  );
}

function splitLines(message: string) {
  return message
    .split(/\n+|(?<=[.!?…])\s+(?=\S)/u)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function ApologyCard({
  data,
  mode,
  onYes,
  onDodge,
  onOptOut,
}: {
  data: CardData;
  mode: "live" | "preview";
  onYes?: () => void;
  onDodge?: (count: number) => void;
  onOptOut?: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { vibe, theme } = data;
  const t = THEMES[vibe];
  const s = themeStyle(vibe, theme);
  const stickers = stickersFor(vibe, theme.stickerPack);
  const lines = useMemo(() => splitLines(data.message), [data.message]);
  // Progress is tied to the lines it was counted for, so a new message restarts at 0.
  const [reveal, setReveal] = useState({ lines, n: 0 });
  const shown = reduceMotion ? lines.length : reveal.lines === lines ? reveal.n : 0;
  const setShown = (n: number) => setReveal({ lines, n });
  const [dodges, setDodges] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const revealed = shown >= lines.length;

  // Gentle line-by-line reveal.
  useEffect(() => {
    if (reduceMotion) return;
    const setShown = (n: number) => setReveal({ lines, n });
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= lines.length) clearInterval(id);
    }, 900);
    return () => clearInterval(id);
  }, [lines, reduceMotion]);

  const dodgeCount = useRef(0);
  const handleDodge = () => {
    dodgeCount.current += 1;
    setDodges(dodgeCount.current);
    onDodge?.(dodgeCount.current);
  };

  const caption = dodges > 0 ? t.captions[(dodges - 1) % t.captions.length] : null;
  const noScale = Math.max(0.55, 1 - dodges * 0.06);
  const yesScale = Math.min(1.5, 1 + dodges * 0.06);

  return (
    <ThemeShell vibe={vibe} theme={theme} preview={mode === "preview"} shellRef={shellRef}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-4">
        <div aria-hidden className="mb-2 flex justify-center gap-3 text-3xl">
          {stickers.map((st, i) => (
            <motion.span
              key={st + i}
              initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: i % 2 ? 8 : -8 }}
              transition={{ delay: 0.2 + i * 0.12, type: "spring", stiffness: 300, damping: 14 }}
            >
              {st}
            </motion.span>
          ))}
        </div>

        <article
          className="rounded-[1.75rem] p-5 shadow-lg backdrop-blur-sm"
          style={{ background: s.surface }}
          aria-labelledby="apology-heading"
        >
          <h1 id="apology-heading" className="text-sm font-bold tracking-wide uppercase" style={{ color: s.muted }}>
            {data.senderName || "Someone"} has something to say
          </h1>
          <p className="mt-1 text-lg font-bold" style={{ fontFamily: "var(--nf-display)" }}>
            Dear {data.recipientName || "you"},
          </p>

          {/* Full text for assistive tech; the animated copy is decorative. */}
          <p className="sr-only">{data.message}</p>
          <div
            aria-hidden
            className="mt-3 space-y-2 leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: s.font, fontSize: `${1.08 * s.fontScale}rem` }}
            onClick={() => setShown(lines.length)}
          >
            {lines.map((line, i) => (
              <motion.p
                key={`${i}-${line}`}
                initial={false}
                animate={{ opacity: i < shown ? 1 : 0, y: i < shown || reduceMotion ? 0 : 8 }}
                transition={{ duration: reduceMotion ? 0 : 0.7 }}
              >
                {line}
              </motion.p>
            ))}
          </div>
          {!revealed && (
            <button
              type="button"
              className="mt-3 text-sm font-bold underline underline-offset-4"
              style={{ color: s.muted }}
              onClick={() => setShown(lines.length)}
            >
              Show it all
            </button>
          )}

          {!!theme.peaceOffering && revealed && (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, rotate: -4, scale: 0.9 }}
              animate={{ opacity: 1, rotate: -2, scale: 1 }}
              className="mt-4 inline-block rounded-xl bg-[#fff4b8] px-3 py-2 text-sm font-bold text-[#5b4300] shadow"
            >
              <span aria-hidden>🎁 </span>
              {theme.peaceOffering}
            </motion.p>
          )}
        </article>

        <AnimatePresence>
          {revealed && (
            <motion.section
              aria-labelledby="question"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.3 }}
              className="mt-6 text-center"
            >
              <h2 id="question" className="text-2xl font-semibold" style={{ fontFamily: "var(--nf-display)" }}>
                {theme.question}
              </h2>
              <p aria-live="polite" className="mt-1 h-6 text-sm font-bold" style={{ color: s.muted }}>
                {caption}
              </p>
              <div className="mt-4 flex min-h-[64px] flex-wrap items-center justify-center gap-4">
                <motion.button
                  type="button"
                  onClick={onYes}
                  animate={{ scale: yesScale }}
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 18 }}
                  className="min-h-[56px] rounded-full px-7 text-lg font-semibold shadow-lg"
                  style={{ background: s.accent, color: s.accentInk, fontFamily: "var(--nf-display)" }}
                >
                  {theme.yesText}
                </motion.button>
                <DodgeButton
                  label={theme.noText}
                  scale={noScale}
                  onDodge={handleDodge}
                  container={mode === "preview" ? shellRef : undefined}
                  className="min-h-[48px] rounded-full border-2 px-6 font-bold"
                  style={{
                    borderColor: s.text,
                    color: s.text,
                    background: "rgba(255,255,255,0.15)",
                    fontFamily: "var(--nf-display)",
                  }}
                />
              </div>

              {data.allowOptOut && dodges >= OPT_OUT_AFTER && (
                <motion.div initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
                  <button
                    type="button"
                    onClick={onOptOut}
                    className="text-sm underline underline-offset-4 opacity-80"
                    style={{ color: s.text }}
                  >
                    I need some time.
                  </button>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </ThemeShell>
  );
}
