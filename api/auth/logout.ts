import type { VercelRequest, VercelResponse } from "@vercel/node";

import { clearSessionCookie } from "../../server/auth";
import { applyCors, fail, json, options } from "../../server/http";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    clearSessionCookie(res);
    return json(res, 200, { ok: true });
  } catch (error) {
    return fail(res, error, "Sign-out failed.");
  }
}
