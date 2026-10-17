// "Oops", the Oopsie mascot: a soft peach blob with a sheepish face.

type Mood = "sheepish" | "happy" | "calm";

export function Mascot({
  size = 120,
  mood = "sheepish",
  className = "",
  title = "Oops, the Oopsie mascot",
  decorative = false,
  still = false,
}: {
  size?: number;
  mood?: Mood;
  className?: string;
  title?: string;
  decorative?: boolean;
  still?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`${still ? "" : "wobble"} ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      {/* sticker outline */}
      <path
        d="M60 10c24 0 46 15 47 43 1 27-14 52-47 52S12 82 13 55C14 26 36 10 60 10z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="10"
        strokeLinejoin="round"
      />
      {/* body */}
      <path d="M60 14c22 0 42 14 43 40 1 25-13 47-43 47S16 80 17 55C18 28 38 14 60 14z" fill="#ffb59a" />
      <path d="M33 34c6-10 18-15 28-15" stroke="#ffd8c8" strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <ellipse cx="36" cy="66" rx="8" ry="5" fill="#ff7f8a" opacity="0.6" />
      <ellipse cx="84" cy="66" rx="8" ry="5" fill="#ff7f8a" opacity="0.6" />
      {mood === "happy" ? (
        <>
          <path d="M37 54q6-7 12 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M71 54q6-7 12 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M50 68q10 10 20 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="#ff8f8f" />
        </>
      ) : mood === "calm" ? (
        <>
          <path d="M37 57q6 4 12 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M71 57q6 4 12 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M53 70q7 4 14 0" stroke="#3d2518" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          {/* worried brows + glancing eyes */}
          <path d="M36 47l10-4" stroke="#3d2518" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M84 47l-10-4" stroke="#3d2518" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="43" cy="56" r="5" fill="#3d2518" />
          <circle cx="77" cy="56" r="5" fill="#3d2518" />
          <circle cx="44.5" cy="54.5" r="1.6" fill="#fff" />
          <circle cx="78.5" cy="54.5" r="1.6" fill="#fff" />
          {/* wobbly sheepish smile */}
          <path d="M50 71q5-4 10 0t10 0" stroke="#3d2518" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          {/* sweat drop */}
          <path className="sweat" d="M95 32c3 5 5 8 5 11a5 5 0 0 1-10 0c0-3 2-6 5-11z" fill="#8fd3ff" stroke="#fff" strokeWidth="2" />
        </>
      )}
      {/* little hand scratching head */}
      <ellipse cx="22" cy="40" rx="8" ry="7" fill="#ffa384" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

export function Wordmark({ className = "", small = false }: { className?: string; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold tracking-tight ${className}`}
      style={{ fontFamily: "var(--nf-display)", fontSize: small ? "0.95rem" : "1.35rem" }}
    >
      <Mascot size={small ? 20 : 30} decorative still />
      Oopsie
    </span>
  );
}
