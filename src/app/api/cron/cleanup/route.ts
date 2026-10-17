import { cleanupExpired } from "@/lib/apologies";
import { error, handleError, json } from "@/lib/api";

// Called daily by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return error("unauthorized", "Unauthorized", 401);
  }
  try {
    return json(await cleanupExpired());
  } catch (err) {
    return handleError(err);
  }
}
