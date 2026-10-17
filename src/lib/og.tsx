import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/** Generic, message-free preview card. */
export function ogImage(subtitle = "Say sorry, cutely.") {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #fff6d8 0%, #ffd3df 60%, #ffb9ca 100%)",
          color: "#4a2c12",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="220" height="220" viewBox="0 0 120 120">
          <path d="M60 10c24 0 46 15 47 43 1 27-14 52-47 52S12 82 13 55C14 26 36 10 60 10z" fill="#fff" />
          <path d="M60 14c22 0 42 14 43 40 1 25-13 47-43 47S16 80 17 55C18 28 38 14 60 14z" fill="#ffb59a" />
          <ellipse cx="36" cy="66" rx="8" ry="5" fill="#ff7f8a" opacity="0.6" />
          <ellipse cx="84" cy="66" rx="8" ry="5" fill="#ff7f8a" opacity="0.6" />
          <circle cx="43" cy="56" r="5" fill="#3d2518" />
          <circle cx="77" cy="56" r="5" fill="#3d2518" />
          <path d="M36 47l10-4M84 47l-10-4" stroke="#3d2518" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 71q5-4 10 0t10 0" stroke="#3d2518" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M95 32c3 5 5 8 5 11a5 5 0 0 1-10 0c0-3 2-6 5-11z" fill="#8fd3ff" />
        </svg>
        <div style={{ fontSize: 110, fontWeight: 800, marginTop: 10 }}>Oopsie Woopsie</div>
        <div style={{ fontSize: 44, marginTop: 4 }}>{subtitle}</div>
      </div>
    ),
    ogSize,
  );
}
