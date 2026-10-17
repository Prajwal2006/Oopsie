import { optOut } from "@/lib/apologies";
import { error, handleError, json, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { SLUG_RE } from "@/lib/tokens";

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    if (!SLUG_RE.test(slug)) return error("not_found", "Not found", 404);
    if (!(await rateLimit("optout", 20, 600))) return tooMany();
    const status = await optOut(slug);
    return json({ status });
  } catch (err) {
    return handleError(err);
  }
}
