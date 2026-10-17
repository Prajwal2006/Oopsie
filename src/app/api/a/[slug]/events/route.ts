import { recordPublicEvent } from "@/lib/apologies";
import { error, handleError, json, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { SLUG_RE } from "@/lib/tokens";
import { publicEventSchema } from "@/lib/validation";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    if (!SLUG_RE.test(slug)) return error("not_found", "Not found", 404);
    if (!(await rateLimit("events", 240, 600))) return tooMany();
    const body = await parseBody(req, publicEventSchema);
    if (!body.ok) return body.response;
    const found = await recordPublicEvent(slug, body.data.type);
    return found ? json({ ok: true }) : error("not_found", "Not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
