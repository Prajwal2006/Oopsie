import "server-only";
import type { PoolClient } from "pg";
import { query, withTransaction } from "./db";
import { newManageToken, newSlug, sha256 } from "./tokens";
import { generateSlots, MAX_SLOTS, type DayAvailability } from "./time";
import { contactRequired, type BookingInput, type CreateApologyInput } from "./validation";
import type { MeetingFormat, ThemeConfig, Vibe } from "./themes";

export type ApologyStatus = "created" | "opened" | "yes" | "booked" | "needs_space";

export interface PublicApology {
  slug: string;
  vibe: Vibe;
  senderName: string;
  recipientName: string;
  message: string;
  theme: ThemeConfig;
  allowOptOut: boolean;
  meetingFormat: MeetingFormat;
  meetingDetails: string | null;
  creatorTimezone: string;
  status: ApologyStatus;
  booking: { startsAt: string; endsAt: string } | null;
}

export interface PublicSlot {
  id: string;
  startsAt: string;
  endsAt: string;
}

export interface ManageView extends PublicApology {
  createdAt: string;
  expiresAt: string;
  noDodges: number;
  timeline: { type: string; at: string }[];
  slots: (PublicSlot & { booked: boolean })[];
  bookingDetails: {
    guestName: string;
    contactMethod: string | null;
    contactValue: string | null;
    note: string | null;
    startsAt: string;
    endsAt: string;
    createdAt: string;
  } | null;
}

interface ApologyRow {
  id: string;
  slug: string;
  vibe: Vibe;
  sender_name: string;
  recipient_name: string;
  message: string;
  theme_config: ThemeConfig;
  allow_opt_out: boolean;
  meeting_format: MeetingFormat;
  meeting_details: string | null;
  creator_timezone: string;
  status: ApologyStatus;
  created_at: Date;
  expires_at: Date;
  booking_starts_at: Date | null;
  booking_ends_at: Date | null;
}

const SELECT_APOLOGY = `
  SELECT a.*, s.starts_at AS booking_starts_at, s.ends_at AS booking_ends_at
  FROM apologies a
  LEFT JOIN bookings b ON b.apology_id = a.id
  LEFT JOIN availability_slots s ON s.id = b.slot_id`;

function toPublic(row: ApologyRow): PublicApology {
  return {
    slug: row.slug,
    vibe: row.vibe,
    senderName: row.sender_name,
    recipientName: row.recipient_name,
    message: row.message,
    theme: row.theme_config,
    allowOptOut: row.allow_opt_out,
    meetingFormat: row.meeting_format,
    meetingDetails: row.meeting_details,
    creatorTimezone: row.creator_timezone,
    status: row.status,
    booking: row.booking_starts_at
      ? { startsAt: row.booking_starts_at.toISOString(), endsAt: row.booking_ends_at!.toISOString() }
      : null,
  };
}

/** Expired apologies are hidden and their data deleted on access. */
async function dropIfExpired(row: ApologyRow | undefined) {
  if (!row) return undefined;
  if (row.expires_at.getTime() <= Date.now()) {
    await query("DELETE FROM apologies WHERE id = $1", [row.id]);
    return undefined;
  }
  return row;
}

/** Slots must start in the future and within roughly a week. */
function slotsForWeek(days: DayAvailability[], slotMinutes: number, timeZone: string) {
  const horizon = Date.now() + 8 * 24 * 3600_000;
  return generateSlots(days, slotMinutes, timeZone).filter((s) => new Date(s.startsAt).getTime() < horizon);
}

async function insertSlots(client: PoolClient, apologyId: string, slots: { startsAt: string; endsAt: string }[]) {
  if (slots.length === 0) return 0;
  const res = await client.query(
    `INSERT INTO availability_slots (apology_id, starts_at, ends_at)
     SELECT $1, s, e FROM unnest($2::timestamptz[], $3::timestamptz[]) AS t(s, e)
     ON CONFLICT (apology_id, starts_at) DO NOTHING`,
    [apologyId, slots.map((s) => s.startsAt), slots.map((s) => s.endsAt)],
  );
  return res.rowCount ?? 0;
}

export class UserFacingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function createApology(input: CreateApologyInput) {
  const slots = slotsForWeek(input.availability.days, input.availability.slotMinutes, input.timezone);
  if (slots.length === 0) {
    throw new UserFacingError("no_slots", "Add at least one time window in the future.");
  }
  if (slots.length > MAX_SLOTS) {
    throw new UserFacingError("too_many_slots", `That's a lot of times! Please keep it under ${MAX_SLOTS} slots.`);
  }
  const slug = newSlug();
  const token = newManageToken();

  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO apologies (slug, manage_token_hash, vibe, sender_name, recipient_name, message,
         theme_config, creator_timezone, meeting_format, meeting_details, allow_opt_out)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        slug,
        sha256(token),
        input.vibe,
        input.senderName,
        input.recipientName,
        input.message,
        JSON.stringify(input.theme),
        input.timezone,
        input.meetingFormat,
        input.meetingDetails || null,
        input.allowOptOut,
      ],
    );
    await insertSlots(client, rows[0].id, slots);
  });

  return { slug, token, slotCount: slots.length };
}

export async function getPublicApology(slug: string): Promise<PublicApology | null> {
  const rows = await query<ApologyRow>(`${SELECT_APOLOGY} WHERE a.slug = $1`, [slug]);
  const row = await dropIfExpired(rows[0]);
  return row ? toPublic(row) : null;
}

export async function getOpenSlots(slug: string): Promise<PublicSlot[] | null> {
  const apology = await query<{ id: string; expires_at: Date }>(
    "SELECT id, expires_at FROM apologies WHERE slug = $1",
    [slug],
  );
  if (!apology[0] || apology[0].expires_at.getTime() <= Date.now()) return null;
  const rows = await query<{ id: string; starts_at: Date; ends_at: Date }>(
    `SELECT s.id, s.starts_at, s.ends_at
     FROM availability_slots s
     WHERE s.apology_id = $1 AND s.starts_at > now()
       AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id)
     ORDER BY s.starts_at`,
    [apology[0].id],
  );
  return rows.map((r) => ({ id: r.id, startsAt: r.starts_at.toISOString(), endsAt: r.ends_at.toISOString() }));
}

const MAX_DODGE_EVENTS = 500;

/** Records a recipient-side event and advances the status where it makes sense. */
export async function recordPublicEvent(slug: string, type: "opened" | "no_dodge" | "yes_clicked") {
  const statusUpdate =
    type === "opened"
      ? `UPDATE apologies SET status = 'opened' WHERE id = (SELECT id FROM target) AND status = 'created'`
      : type === "yes_clicked"
        ? `UPDATE apologies SET status = 'yes' WHERE id = (SELECT id FROM target) AND status IN ('created', 'opened')`
        : null;

  const rows = await query<{ id: string }>(
    `WITH target AS (
       SELECT id FROM apologies WHERE slug = $1 AND expires_at > now()
     ),
     ins AS (
       INSERT INTO events (apology_id, type)
       SELECT id, $2 FROM target
       WHERE $2 <> 'no_dodge'
          OR (SELECT count(*) FROM events e WHERE e.apology_id = target.id AND e.type = 'no_dodge') < ${MAX_DODGE_EVENTS}
       RETURNING apology_id
     )${statusUpdate ? `, upd AS (${statusUpdate} RETURNING id)` : ""}
     SELECT id FROM target`,
    [slug, type],
  );
  return rows.length > 0;
}

export async function optOut(slug: string) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; status: ApologyStatus; allow_opt_out: boolean }>(
      "SELECT id, status, allow_opt_out FROM apologies WHERE slug = $1 AND expires_at > now() FOR UPDATE",
      [slug],
    );
    const a = rows[0];
    if (!a) throw new UserFacingError("not_found", "This apology link has expired or was removed.", 404);
    if (!a.allow_opt_out) throw new UserFacingError("not_allowed", "Not available for this link.", 403);
    if (a.status === "booked" || a.status === "needs_space") return a.status;
    await client.query("UPDATE apologies SET status = 'needs_space' WHERE id = $1", [a.id]);
    await client.query("INSERT INTO events (apology_id, type) VALUES ($1, 'opted_out')", [a.id]);
    return "needs_space" as const;
  });
}

export async function bookSlot(slug: string, input: BookingInput) {
  return withTransaction(async (client) => {
    // Lock the apology row so concurrent bookings for it are serialised.
    const { rows } = await client.query<{
      id: string;
      status: ApologyStatus;
      meeting_format: MeetingFormat;
      meeting_details: string | null;
      sender_name: string;
    }>(
      `SELECT id, status, meeting_format, meeting_details, sender_name
       FROM apologies WHERE slug = $1 AND expires_at > now() FOR UPDATE`,
      [slug],
    );
    const a = rows[0];
    if (!a) throw new UserFacingError("not_found", "This apology link has expired or was removed.", 404);
    if (a.status === "needs_space") throw new UserFacingError("closed", "This link is resting for now.", 409);

    const existing = await client.query<{ slot_id: string }>("SELECT slot_id FROM bookings WHERE apology_id = $1", [a.id]);
    if (existing.rows[0]) {
      if (existing.rows[0].slot_id === input.slotId) {
        throw new UserFacingError("slot_taken", "Oops, that time was just taken. Here are the others!", 409);
      }
      throw new UserFacingError("already_booked", "A time has already been picked for this one.", 409);
    }

    if (contactRequired(a.meeting_format, a.meeting_details) && !(input.contactMethod && input.contactValue)) {
      throw new UserFacingError("contact_required", "Please leave a way to reach you for this kind of chat.");
    }

    const slot = await client.query<{ starts_at: Date; ends_at: Date }>(
      "SELECT starts_at, ends_at FROM availability_slots WHERE id = $1 AND apology_id = $2 AND starts_at > now()",
      [input.slotId, a.id],
    );
    if (!slot.rows[0]) {
      throw new UserFacingError("slot_taken", "Oops, that time isn't available anymore. Here are the others!", 409);
    }

    // The UNIQUE(slot_id) constraint is the final guard against double booking.
    const inserted = await client.query(
      `INSERT INTO bookings (apology_id, slot_id, guest_name, contact_method, contact_value, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING RETURNING id`,
      [
        a.id,
        input.slotId,
        input.guestName,
        input.contactValue ? (input.contactMethod ?? null) : null,
        input.contactValue || null,
        input.note || null,
      ],
    );
    if (inserted.rowCount === 0) {
      throw new UserFacingError("slot_taken", "Oops, that time was just taken. Here are the others!", 409);
    }
    await client.query("UPDATE apologies SET status = 'booked' WHERE id = $1", [a.id]);
    await client.query("INSERT INTO events (apology_id, type) VALUES ($1, 'booked')", [a.id]);

    return {
      startsAt: slot.rows[0].starts_at.toISOString(),
      endsAt: slot.rows[0].ends_at.toISOString(),
      senderName: a.sender_name,
      meetingFormat: a.meeting_format,
      meetingDetails: a.meeting_details,
    };
  });
}

async function apologyByToken(token: string) {
  const rows = await query<ApologyRow>(`${SELECT_APOLOGY} WHERE a.manage_token_hash = $1`, [sha256(token)]);
  return dropIfExpired(rows[0]);
}

export async function getManageView(token: string): Promise<ManageView | null> {
  const row = await apologyByToken(token);
  if (!row) return null;

  const [slots, events, booking] = await Promise.all([
    query<{ id: string; starts_at: Date; ends_at: Date; booked: boolean }>(
      `SELECT s.id, s.starts_at, s.ends_at, (b.id IS NOT NULL) AS booked
       FROM availability_slots s LEFT JOIN bookings b ON b.slot_id = s.id
       WHERE s.apology_id = $1 ORDER BY s.starts_at`,
      [row.id],
    ),
    query<{ type: string; first_at: Date; n: number }>(
      `SELECT type, min(created_at) AS first_at, count(*)::int AS n
       FROM events WHERE apology_id = $1 GROUP BY type`,
      [row.id],
    ),
    query<{
      guest_name: string;
      contact_method: string | null;
      contact_value: string | null;
      note: string | null;
      created_at: Date;
      starts_at: Date;
      ends_at: Date;
    }>(
      `SELECT b.guest_name, b.contact_method, b.contact_value, b.note, b.created_at, s.starts_at, s.ends_at
       FROM bookings b JOIN availability_slots s ON s.id = b.slot_id WHERE b.apology_id = $1`,
      [row.id],
    ),
  ]);

  const order = ["opened", "yes_clicked", "booked", "opted_out"];
  const timeline = [
    { type: "created", at: row.created_at.toISOString() },
    ...events
      .filter((e) => order.includes(e.type))
      .sort((x, y) => x.first_at.getTime() - y.first_at.getTime())
      .map((e) => ({ type: e.type, at: e.first_at.toISOString() })),
  ];
  const b = booking[0];

  return {
    ...toPublic(row),
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    noDodges: events.find((e) => e.type === "no_dodge")?.n ?? 0,
    timeline,
    slots: slots.map((s) => ({
      id: s.id,
      startsAt: s.starts_at.toISOString(),
      endsAt: s.ends_at.toISOString(),
      booked: s.booked,
    })),
    bookingDetails: b
      ? {
          guestName: b.guest_name,
          contactMethod: b.contact_method,
          contactValue: b.contact_value,
          note: b.note,
          startsAt: b.starts_at.toISOString(),
          endsAt: b.ends_at.toISOString(),
          createdAt: b.created_at.toISOString(),
        }
      : null,
  };
}

export async function editAvailability(
  token: string,
  change: { add?: { days: DayAvailability[]; slotMinutes: 15 | 30 | 60 }; removeSlotIds?: string[] },
) {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string; creator_timezone: string }>(
      "SELECT id, creator_timezone FROM apologies WHERE manage_token_hash = $1 AND expires_at > now() FOR UPDATE",
      [sha256(token)],
    );
    const a = rows[0];
    if (!a) throw new UserFacingError("not_found", "This manage link has expired or was removed.", 404);

    let removed = 0;
    let keptBooked = 0;
    if (change.removeSlotIds?.length) {
      // Booked slots are never removed; report them back instead.
      const del = await client.query(
        `DELETE FROM availability_slots s
         WHERE s.apology_id = $1 AND s.id = ANY($2::uuid[])
           AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.slot_id = s.id)`,
        [a.id, change.removeSlotIds],
      );
      removed = del.rowCount ?? 0;
      const booked = await client.query(
        `SELECT 1 FROM bookings WHERE apology_id = $1 AND slot_id = ANY($2::uuid[])`,
        [a.id, change.removeSlotIds],
      );
      keptBooked = booked.rowCount ?? 0;
    }

    let added = 0;
    if (change.add) {
      const slots = slotsForWeek(change.add.days, change.add.slotMinutes, a.creator_timezone);
      const count = await client.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM availability_slots WHERE apology_id = $1",
        [a.id],
      );
      if (count.rows[0].n + slots.length > MAX_SLOTS) {
        throw new UserFacingError("too_many_slots", `Please keep it under ${MAX_SLOTS} slots in total.`);
      }
      added = await insertSlots(client, a.id, slots);
    }
    return { added, removed, keptBooked };
  });
}

export async function deleteApology(token: string) {
  const rows = await query<{ id: string }>("DELETE FROM apologies WHERE manage_token_hash = $1 RETURNING id", [
    sha256(token),
  ]);
  return rows.length > 0;
}

export async function cleanupExpired() {
  const apologies = await query<{ id: string }>("DELETE FROM apologies WHERE expires_at <= now() RETURNING id");
  await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
  return { deletedApologies: apologies.length };
}
