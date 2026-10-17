// End-to-end test against a running Oopsie Woopsie server and the real Neon database.
//   npm run build && npm start   (in another terminal)
//   npm run test:e2e             (BASE_URL defaults to http://localhost:3000)
import { createHash } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

const BASE = process.env.BASE_URL || "http://localhost:3000";
const db = new pg.Client({
  connectionString: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL).replace(
    /sslmode=(require|prefer|verify-ca)/,
    "sslmode=verify-full",
  ),
});
await db.connect();

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ->  ${detail}` : ""}`);
  if (!ok) failures++;
}
async function api(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}
const counts = async (id) => {
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM apologies WHERE id = $1)::int AS apologies,
            (SELECT count(*) FROM availability_slots WHERE apology_id = $1)::int AS slots,
            (SELECT count(*) FROM bookings WHERE apology_id = $1)::int AS bookings,
            (SELECT count(*) FROM events WHERE apology_id = $1)::int AS events`,
    [id],
  );
  return rows[0];
};

const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString().slice(0, 10);
const MESSAGE = "E2E secret apology text: I am sorry I ate the last dumpling.";
const payload = {
  vibe: "friend",
  senderName: "Alex",
  recipientName: "Sam",
  message: MESSAGE,
  theme: {
    accent: "#e8613a",
    stickerPack: "vibe",
    background: "bubbles",
    font: "rounded",
    yesText: "Yes, let's talk",
    noText: "No",
    question: "Can we talk about it?",
    peaceOffering: "I'll bring dumplings",
  },
  allowOptOut: true,
  meetingFormat: "coffee",
  meetingDetails: "Our usual cafe",
  timezone: "UTC",
  availability: { days: [{ date: tomorrow, windows: [{ start: "10:00", end: "12:00" }] }], slotMinutes: 30 },
};

console.log(`\n== Oopsie Woopsie E2E against ${BASE} ==\n`);

// 0. Server-side validation
const bad = await api("POST", "/api/apologies", { ...payload, message: "x".repeat(601) });
check("zod rejects a 601-char message", bad.status === 400, `${bad.status} ${bad.json?.message}`);

// 1. Create
const created = await api("POST", "/api/apologies", payload);
check("create apology -> 201", created.status === 201, `slug=${created.json?.slug} slots=${created.json?.slotCount}`);
const { slug, token } = created.json;
const { rows: aRows } = await db.query("SELECT id, manage_token_hash, status FROM apologies WHERE slug = $1", [slug]);
const id = aRows[0]?.id;
check("row stored in Neon", !!id, `id=${id} status=${aRows[0]?.status}`);
check(
  "only a SHA-256 hash of the manage token is stored",
  aRows[0].manage_token_hash === createHash("sha256").update(token).digest("hex") && aRows[0].manage_token_hash !== token,
);

// 2. Public page + link preview
const page = await fetch(`${BASE}/a/${slug}`, { headers: { "User-Agent": "facebookexternalhit/1.1" } });
const html = await page.text();
const ogTitle = /<meta property="og:title" content="([^"]+)"/.exec(html)?.[1];
const metaTags = (html.match(/<meta [^>]*>/g) || []).join("\n");
check("public page -> 200", page.status === 200, `${page.status}`);
check("dynamic og:title", ogTitle === "Oopsie Woopsie! Alex has something to say", ogTitle);
check("meta tags never contain the message", !metaTags.includes("dumpling"));

// 3. Recipient events: open, dodge the No button 6 times, say yes
check("event opened", (await api("POST", `/api/a/${slug}/events`, { type: "opened" })).status === 200);
const dodges = await Promise.all(Array.from({ length: 6 }, () => api("POST", `/api/a/${slug}/events`, { type: "no_dodge" })));
check("6 no_dodge events accepted", dodges.every((r) => r.status === 200));
check("event yes_clicked", (await api("POST", `/api/a/${slug}/events`, { type: "yes_clicked" })).status === 200);
const bogus = await api("POST", `/api/a/${slug}/events`, { type: "booked" });
check("clients cannot forge a 'booked' event", bogus.status === 400, `${bogus.status}`);

// 4. Slots + booking
const slots = await api("GET", `/api/a/${slug}/slots`);
check("open slots listed", slots.json?.slots?.length === 4, `${slots.json?.slots?.length} slots`);
const slotId = slots.json.slots[0].id;
const booking = { slotId, guestName: "Sam", contactMethod: "email", contactValue: "sam@example.com", note: "see you!" };
const first = await api("POST", `/api/a/${slug}/book`, booking);
check("book slot -> 201", first.status === 201, `${first.status} starts=${first.json?.booking?.startsAt}`);
const second = await api("POST", `/api/a/${slug}/book`, { ...booking, guestName: "Sneaky" });
check("second booking of same slot rejected -> 409", second.status === 409, `${second.status} ${second.json?.error}: ${second.json?.message}`);
try {
  await db.query(
    "INSERT INTO bookings (apology_id, slot_id, guest_name) VALUES ($1, $2, 'direct-sql')",
    [id, slotId],
  );
  check("DB constraint blocks duplicate slot booking", false, "insert succeeded?!");
} catch (err) {
  check("DB constraint blocks duplicate slot booking", err.code === "23505", `${err.code} ${err.constraint}`);
}
const slotsAfter = await api("GET", `/api/a/${slug}/slots`);
check("booked slot no longer offered", !slotsAfter.json.slots.some((s) => s.id === slotId), `${slotsAfter.json.slots.length} left`);

// 5. Race: 5 simultaneous bookings for one slot on a fresh apology
const race = (await api("POST", "/api/apologies", { ...payload, senderName: "Racer" })).json;
const raceSlot = (await api("GET", `/api/a/${race.slug}/slots`)).json.slots[1].id;
const results = await Promise.all(
  Array.from({ length: 5 }, (_, i) =>
    api("POST", `/api/a/${race.slug}/book`, { slotId: raceSlot, guestName: `Racer ${i}`, contactMethod: "email", contactValue: `r${i}@example.com` }),
  ),
);
const statuses = results.map((r) => r.status).sort();
check("concurrent bookings: exactly one wins", statuses.filter((s) => s === 201).length === 1 && statuses.filter((s) => s === 409).length === 4, statuses.join(","));

// 6. Manage page
const manage = await api("GET", `/api/manage/${token}`);
const m = manage.json?.apology;
check("manage API -> 200", manage.status === 200);
check("manage shows booking", m?.bookingDetails?.guestName === "Sam" && m?.bookingDetails?.contactValue === "sam@example.com", JSON.stringify({ guest: m?.bookingDetails?.guestName, startsAt: m?.bookingDetails?.startsAt }));
check("status is booked", m?.status === "booked", m?.status);
check("no-dodge stat = 6", m?.noDodges === 6, `${m?.noDodges}`);
check("timeline", m?.timeline?.map((t) => t.type).join(">") === "created>opened>yes_clicked>booked", m?.timeline?.map((t) => t.type).join(" > "));
const managePage = await fetch(`${BASE}/manage/${token}`);
const manageHtml = await managePage.text();
check("manage page HTML renders booking", managePage.status === 200 && manageHtml.includes("sam@example.com"), `${managePage.status}`);
const wrong = await api("GET", `/api/manage/${"x".repeat(43)}`);
check("wrong manage token -> 404", wrong.status === 404);

// 7. Editing availability never silently removes a booked slot
const rm = await api("PATCH", `/api/manage/${token}`, { removeSlotIds: [slotId, slots.json.slots[3].id] });
check("remove: open slot removed, booked slot kept", rm.json?.removed === 1 && rm.json?.keptBooked === 1, JSON.stringify(rm.json));
const add = await api("PATCH", `/api/manage/${token}`, {
  add: { days: [{ date: tomorrow, windows: [{ start: "15:00", end: "16:00" }] }], slotMinutes: 30 },
});
check("add availability", add.json?.added === 2, JSON.stringify(add.json));

// 8. Delete (hard) and verify rows are gone
console.log("   rows before delete:", JSON.stringify(await counts(id)));
const del = await api("DELETE", `/api/manage/${token}`);
check("delete -> 200", del.status === 200, JSON.stringify(del.json));
const after = await counts(id);
console.log("   rows after delete: ", JSON.stringify(after));
check("all rows gone", Object.values(after).every((n) => n === 0));
const gone = await fetch(`${BASE}/a/${slug}`);
const goneHtml = await gone.text();
check("public link now shows not-found", goneHtml.includes("This note has floated away") && !goneHtml.includes("dumpling"), `${gone.status}`);

// cleanup race apology
await db.query("DELETE FROM apologies WHERE slug = $1", [race.slug]);

await db.end();
console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures ? 1 : 0);
