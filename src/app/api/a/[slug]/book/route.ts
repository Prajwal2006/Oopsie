import { bookSlot } from "@/lib/apologies";
import { error, handleError, json, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { SLUG_RE } from "@/lib/tokens";
import { bookingSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    if (!SLUG_RE.test(slug)) return error("not_found", "Not found", 404);
    if (!(await rateLimit("book", 10, 600))) return tooMany();
    const body = await parseBody(req, bookingSchema);
    if (!body.ok) return body.response;
    const booking = await bookSlot(slug, body.data);
    return json({ booking }, 201);
  } catch (err) {
    return handleError(err);
  }
}
