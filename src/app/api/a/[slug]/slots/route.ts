import { getOpenSlots } from "@/lib/apologies";
import { error, handleError, json } from "@/lib/api";
import { SLUG_RE } from "@/lib/tokens";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    if (!SLUG_RE.test(slug)) return error("not_found", "Not found", 404);
    const slots = await getOpenSlots(slug);
    return slots ? json({ slots }) : error("not_found", "Not found", 404);
  } catch (err) {
    return handleError(err);
  }
}
