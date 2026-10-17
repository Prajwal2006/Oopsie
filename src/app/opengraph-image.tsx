import { ogImage, ogSize } from "@/lib/og";

export const alt = "Oopsie Woopsie: say sorry, cutely";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return ogImage();
}
