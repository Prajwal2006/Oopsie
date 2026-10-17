import { z } from "zod";
import { BACKGROUNDS, FONTS, MEETING_FORMATS, STICKER_PACKS, VIBES } from "./themes";
import { isValidTimeZone } from "./time";

// Strip control characters (keep newlines/tabs), normalise whitespace at the ends.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").trim();

const text = (max: number, min = 0) =>
  z
    .string()
    .transform(clean)
    .pipe(z.string().min(min).max(max));

const singleLine = (max: number, min = 0) =>
  z
    .string()
    .transform((s) => clean(s).replace(/\s+/g, " "))
    .pipe(z.string().min(min).max(max));

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const timeZoneSchema = z.string().max(64).refine(isValidTimeZone, "Unknown timezone");

export const themeConfigSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  stickerPack: z.enum(STICKER_PACKS),
  background: z.enum(BACKGROUNDS),
  font: z.enum(FONTS),
  yesText: singleLine(40, 1),
  noText: singleLine(24, 1),
  question: singleLine(80, 1),
  peaceOffering: singleLine(120),
});

export const availabilitySchema = z.object({
  days: z
    .array(
      z.object({
        date: dateKey,
        windows: z
          .array(z.object({ start: time, end: time }).refine((w) => w.start < w.end, "Window must end after it starts"))
          .min(1)
          .max(6),
      }),
    )
    .min(1)
    .max(8),
  slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
});

export const createApologySchema = z.object({
  vibe: z.enum(VIBES),
  senderName: singleLine(40, 1),
  recipientName: singleLine(40, 1),
  message: text(600, 1),
  theme: themeConfigSchema,
  allowOptOut: z.boolean(),
  meetingFormat: z.enum(MEETING_FORMATS),
  meetingDetails: singleLine(200),
  timezone: timeZoneSchema,
  availability: availabilitySchema,
});
export type CreateApologyInput = z.infer<typeof createApologySchema>;

export const CONTACT_METHODS = ["phone", "email", "handle"] as const;

export const bookingSchema = z.object({
  slotId: z.uuid(),
  guestName: singleLine(40, 1),
  contactMethod: z.enum(CONTACT_METHODS).optional(),
  contactValue: singleLine(120).optional(),
  note: text(280).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const publicEventSchema = z.object({
  type: z.enum(["opened", "no_dodge", "yes_clicked"]),
});

export const editAvailabilitySchema = z.object({
  add: availabilitySchema.optional(),
  removeSlotIds: z.array(z.uuid()).max(200).optional(),
});

/** Whether the recipient must leave a way to reach them, given the meeting format. */
export function contactRequired(format: string, meetingDetails: string | null | undefined) {
  if (format === "call" || format === "text") return true;
  if (format === "video") return !meetingDetails;
  return false;
}

export function firstIssue(err: z.ZodError) {
  const i = err.issues[0];
  return i ? `${i.path.join(".") || "input"}: ${i.message}` : "Invalid input";
}
