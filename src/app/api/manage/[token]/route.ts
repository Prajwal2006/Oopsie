import { deleteApology, editAvailability, getManageView } from "@/lib/apologies";
import { error, handleError, json, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { TOKEN_RE } from "@/lib/tokens";
import { editAvailabilitySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ token: string }> };

async function tokenFrom(ctx: Ctx) {
  const { token } = await ctx.params;
  return TOKEN_RE.test(token) ? token : null;
}

const notFound = () => error("not_found", "This manage link has expired or was removed.", 404);

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const token = await tokenFrom(ctx);
    if (!token) return notFound();
    if (!(await rateLimit("manage", 120, 600))) return tooMany();
    const view = await getManageView(token);
    return view ? json({ apology: view }) : notFound();
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const token = await tokenFrom(ctx);
    if (!token) return notFound();
    if (!(await rateLimit("manage", 120, 600))) return tooMany();
    const body = await parseBody(req, editAvailabilitySchema);
    if (!body.ok) return body.response;
    const result = await editAvailability(token, body.data);
    return json(result);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const token = await tokenFrom(ctx);
    if (!token) return notFound();
    if (!(await rateLimit("manage", 120, 600))) return tooMany();
    return (await deleteApology(token)) ? json({ deleted: true }) : notFound();
  } catch (err) {
    return handleError(err);
  }
}
