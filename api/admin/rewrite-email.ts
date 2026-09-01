import type { VercelRequest, VercelResponse } from "@vercel/node";

import { requireInstructor } from "../../server/auth.js";
import { applyCors, fail, json, options, readJson } from "../../server/http.js";
import { rewriteEmail } from "../../server/rewrite.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    await requireInstructor(req);
    const body = await readJson<Record<string, unknown>>(req);
    return json(res, 200, await rewriteEmail(body));
  } catch (error) {
    return fail(res, error, "AI rewrite failed.");
  }
}
