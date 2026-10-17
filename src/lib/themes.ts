// Shared (client + server) theme definitions and default copy for each vibe.

export const VIBES = ["friend", "partner", "crush", "situationship"] as const;
export type Vibe = (typeof VIBES)[number];

export const STICKER_PACKS = ["vibe", "hearts", "sparkles", "snacks", "flowers", "celestial", "critters"] as const;
export type StickerPack = (typeof STICKER_PACKS)[number];

export const BACKGROUNDS = ["hearts", "stars", "bubbles", "none"] as const;
export type BackgroundAnim = (typeof BACKGROUNDS)[number];

export const FONTS = ["rounded", "handwritten", "classic"] as const;
export type FontStyle = (typeof FONTS)[number];

export const MEETING_FORMATS = ["call", "video", "coffee", "walk", "text"] as const;
export type MeetingFormat = (typeof MEETING_FORMATS)[number];

export const MEETING_LABELS: Record<MeetingFormat, { label: string; emoji: string }> = {
  call: { label: "Phone call", emoji: "📞" },
  video: { label: "Video call", emoji: "💻" },
  coffee: { label: "Coffee", emoji: "☕" },
  walk: { label: "In person", emoji: "🚶" },
  text: { label: "Text chat", emoji: "💬" },
};

export const FONT_LABELS: Record<FontStyle, string> = {
  rounded: "Soft & round",
  handwritten: "Handwritten",
  classic: "Storybook",
};

export const FONT_VARS: Record<FontStyle, string> = {
  rounded: "var(--nf-rounded)",
  handwritten: "var(--nf-hand)",
  classic: "var(--nf-classic)",
};

export const STICKERS: Record<Exclude<StickerPack, "vibe">, string[]> = {
  hearts: ["💖", "💗", "💞", "💕"],
  sparkles: ["✨", "🌟", "💫", "⭐"],
  snacks: ["🍞", "🧁", "🍩", "🥐"],
  flowers: ["🌸", "🌷", "🌼", "💐"],
  celestial: ["🌙", "⭐", "🪐", "✨"],
  critters: ["🐻", "🐰", "🐥", "🐱"],
};

export interface VibeTheme {
  label: string;
  emoji: string;
  blurb: string;
  /** CSS background for the full-screen card */
  background: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  font: FontStyle;
  stickers: string[];
  backgroundAnim: BackgroundAnim;
  captions: string[];
  celebration: string;
  needsSpace: string;
  templates: string[];
}

export const THEMES: Record<Vibe, VibeTheme> = {
  friend: {
    label: "Friend",
    emoji: "🍞",
    blurb: "Warm & goofy",
    background: "linear-gradient(160deg, #fff6d8 0%, #ffe3c8 55%, #ffd2b8 100%)",
    surface: "rgba(255, 255, 255, 0.78)",
    text: "#4a2c12",
    muted: "#7a5232",
    accent: "#e8613a",
    font: "rounded",
    stickers: ["✨", "🍞", "📿", "🧃"],
    backgroundAnim: "bubbles",
    captions: [
      "are you sure? 🥺",
      "the button is shy",
      "nice try, bestie",
      "it said 'nope' to you",
      "our friendship bracelet says no",
      "that button is on a snack break",
      "try the other one? 👉",
      "okay this is getting silly",
    ],
    celebration: "Yay! Friendship restored (pending snacks) 🍞",
    needsSpace: "Totally okay. Take all the time you need — I'm here whenever you're ready.",
    templates: [
      "Hey {recipient}, I messed up and I'm really sorry. You matter a lot to me and I didn't treat you like it. I'd love to hear how it felt on your side, no excuses from me. — {sender}",
      "Okay, {recipient}. I owe you an apology, and probably a pastry. What I did wasn't fair to you, and I've been thinking about it. Can I make it right? — {sender}",
      "{recipient}, you're one of my favourite people and I dropped the ball. I'm sorry. I'd really like to talk, listen properly, and fix this together. — {sender}",
    ],
  },
  partner: {
    label: "Partner",
    emoji: "💗",
    blurb: "Sincere & romantic",
    background: "linear-gradient(165deg, #ffeef3 0%, #ffd3df 50%, #ffb9ca 100%)",
    surface: "rgba(255, 255, 255, 0.8)",
    text: "#57132a",
    muted: "#86364f",
    accent: "#d6264f",
    font: "handwritten",
    stickers: ["💕", "🌹", "💌", "💗"],
    backgroundAnim: "hearts",
    captions: [
      "are you sure, love?",
      "the button is shy",
      "my heart says try again",
      "nope, that one's broken (on purpose)",
      "you can't escape this much love",
      "pretty please? 🥹",
      "the yes button misses you",
      "okay okay, I see you",
    ],
    celebration: "Thank you. I love you. Let's talk 💗",
    needsSpace: "I understand, and I respect it. Take the time you need. I'll be here.",
    templates: [
      "{recipient}, I'm so sorry. I hurt you, and that's the last thing I ever want to do. You deserve care and honesty from me, and I want to do better. Can we sit down together? — {sender}",
      "My love, I've been replaying what happened and I know I got it wrong. I'm not looking for a quick fix; I want to really understand how you felt. I'm sorry. — {sender}",
      "{recipient}, you mean the world to me. I let my feelings get in the way of how I treated you, and I'm truly sorry. I'd love some time to listen and make it right. — {sender}",
    ],
  },
  crush: {
    label: "Crush",
    emoji: "😳",
    blurb: "Flirty & light, no pressure",
    background: "linear-gradient(150deg, #6d28d9 0%, #c026d3 50%, #f43f5e 100%)",
    surface: "rgba(30, 6, 48, 0.42)",
    text: "#fff7fb",
    muted: "#fbd5ec",
    accent: "#ffd166",
    font: "rounded",
    stickers: ["😳", "💘", "🔥", "😅"],
    backgroundAnim: "stars",
    captions: [
      "wait, are you sure? 😳",
      "the button is shy (like me)",
      "nice try, cutie",
      "that button has commitment issues",
      "playing hard to get, huh?",
      "the other button is way cuter",
      "bold of you to try again",
      "okay, I respect the persistence",
    ],
    celebration: "Okay wow, I'm smiling way too much right now 😳",
    needsSpace: "No pressure at all. Thanks for reading this — the door's open if you ever want to chat.",
    templates: [
      "Hey {recipient}! So… I was kind of an idiot, and I'm sorry. I'd like a do-over, totally no pressure. — {sender}",
      "{recipient}, quick confession: I made things weird and I feel bad about it. Sorry! Can I buy you a coffee and be normal this time? 😅 — {sender}",
      "Hi {recipient}. I owe you an apology for how I acted. I'd genuinely like to start fresh, but only if you want to. — {sender}",
    ],
  },
  situationship: {
    label: "Situationship",
    emoji: "🌙",
    blurb: "Dreamy & a little nervous",
    background: "linear-gradient(170deg, #1e1b4b 0%, #312e81 45%, #5b4b9e 80%, #a78bfa 100%)",
    surface: "rgba(20, 18, 60, 0.5)",
    text: "#f1edff",
    muted: "#cfc6f5",
    accent: "#c4b5fd",
    font: "classic",
    stickers: ["🌙", "⭐", "✨", "🪐"],
    backgroundAnim: "stars",
    captions: [
      "are you sure? 🌙",
      "the button is shy",
      "the stars say try again",
      "we never defined this button either",
      "it's floating away, like my thoughts",
      "it's complicated (the button)",
      "maybe the other one?",
      "okay, the universe heard you",
    ],
    celebration: "Okay. Deep breath. I'm really glad 🌙",
    needsSpace: "That's completely fair. Take your time — no pressure, no labels, no rush.",
    templates: [
      "{recipient}, we never really defined this, but I know I hurt you, and I'm sorry. Whatever we are, you deserve honesty from me. Could we talk? — {sender}",
      "Hey {recipient}. I've been thinking about us (whatever 'us' is) and I didn't handle things well. I'm sorry. I'd love to talk it through, gently. — {sender}",
      "{recipient}, it's late and I'm overthinking, but this part is clear: I'm sorry for how I acted. You matter to me. Can we talk? — {sender}",
    ],
  },
};

export interface ThemeConfig {
  accent: string;
  stickerPack: StickerPack;
  background: BackgroundAnim;
  font: FontStyle;
  yesText: string;
  noText: string;
  question: string;
  peaceOffering: string;
}

export function defaultThemeConfig(vibe: Vibe): ThemeConfig {
  const t = THEMES[vibe];
  return {
    accent: t.accent,
    stickerPack: "vibe",
    background: t.backgroundAnim,
    font: t.font,
    yesText: "Yes, let's talk",
    noText: "No",
    question: "Can we talk about it?",
    peaceOffering: "",
  };
}

export function stickersFor(vibe: Vibe, pack: StickerPack) {
  return pack === "vibe" ? THEMES[vibe].stickers : STICKERS[pack];
}

export function fillTemplate(template: string, recipient: string, sender: string) {
  return template
    .replaceAll("{recipient}", recipient.trim() || "you")
    .replaceAll("{sender}", sender.trim() || "me");
}

/** Pick dark or light text for good contrast on a given hex background. */
export function readableOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  // Contrast vs white = 1.05/(L+0.05); vs near-black = (L+0.05)/0.06
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0622 ? "#ffffff" : "#1c1206";
}
