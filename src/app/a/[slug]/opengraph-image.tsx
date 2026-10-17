import { ogImage, ogSize } from "@/lib/og";

// Deliberately generic: link previews never reveal the apology itself.
export const alt = "Someone made you a little apology on Oopsie Woopsie";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage("Someone has something to say 💌");
}
