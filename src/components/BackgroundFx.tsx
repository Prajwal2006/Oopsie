import type { CSSProperties } from "react";
import type { BackgroundAnim } from "@/lib/themes";

// Deterministic pseudo-random so server and client render the same layout.
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const HEART = "M12 21s-7.5-4.6-9.6-9.2C.9 8.6 3 5 6.5 5c2 0 3.6 1.1 4.5 2.6C11.9 6.1 13.5 5 15.5 5 19 5 21.1 8.6 19.6 11.8 17.5 16.4 12 21 12 21z";

export function BackgroundFx({ kind, color, count = 14 }: { kind: BackgroundAnim; color: string; count?: number }) {
  if (kind === "none") return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = `${Math.round(rand(i, 1) * 100)}%`;
        const size = 10 + Math.round(rand(i, 2) * 22);
        const vars = {
          "--dur": `${9 + rand(i, 3) * 10}s`,
          "--delay": `${-rand(i, 4) * 18}s`,
          "--drift": `${Math.round((rand(i, 5) - 0.5) * 120)}px`,
          "--spin": `${Math.round((rand(i, 6) - 0.5) * 90)}deg`,
        } as CSSProperties;

        if (kind === "stars") {
          const top = `${Math.round(rand(i, 7) * 100)}%`;
          return (
            <svg
              key={i}
              className="twinkle-item absolute"
              style={{ ...vars, left, top, width: size * 0.8, height: size * 0.8, "--dur": `${2 + rand(i, 3) * 3}s` } as CSSProperties}
              viewBox="0 0 24 24"
            >
              <path d="M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z" fill={color} opacity={0.7} />
            </svg>
          );
        }
        if (kind === "bubbles") {
          return (
            <span
              key={i}
              className="float-item absolute bottom-[-40px] rounded-full"
              style={{
                ...vars,
                left,
                width: size * 1.4,
                height: size * 1.4,
                border: `2px solid ${color}`,
                background: "rgba(255,255,255,0.35)",
                opacity: 0.6,
              }}
            />
          );
        }
        return (
          <svg key={i} className="float-item absolute bottom-[-40px]" style={{ ...vars, left, width: size, height: size }} viewBox="0 0 24 24">
            <path d={HEART} fill={color} opacity={0.55} />
          </svg>
        );
      })}
    </div>
  );
}
