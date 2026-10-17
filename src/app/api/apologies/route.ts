import { createApology } from "@/lib/apologies";
import { handleError, json, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { createApologySchema } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    if (!(await rateLimit("create", 10, 3600))) return tooMany();
    const body = await parseBody(req, createApologySchema);
    if (!body.ok) return body.response;
    const { slug, token, slotCount } = await createApology(body.data);
    return json({ slug, token, slotCount }, 201);
  } catch (err) {
    return handleError(err);
  }
}
