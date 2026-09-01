import bcrypt from "bcryptjs";
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { configuredInstructorEmail, createSessionToken, setSessionCookie } from "../../server/auth.js";
import { applyCors, ApiError, cleanEmail, fail, json, options, readJson } from "../../server/http.js";

type LoginBody = { email?: string; password?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "POST") return json(res, 405, { error: "POST required." });

  try {
    const body = await readJson<LoginBody>(req);
    const email = cleanEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (email !== configuredInstructorEmail()) {
      throw new ApiError("Use the instructor account for this dashboard.", 401);
    }
    if (!password) throw new ApiError("Enter the dashboard password.");
    const hash = process.env.INSTRUCTOR_PASSWORD_HASH;
    if (!hash) throw new ApiError("Instructor authentication is not configured.", 503);
    if (!(await bcrypt.compare(password, hash))) {
      throw new ApiError("Could not sign in. Check the email and password.", 401);
    }

    setSessionCookie(res, await createSessionToken(email));
    return json(res, 200, {
      user: { email, name: process.env.INSTRUCTOR_NAME || "Ran Yang", role: "instructor" },
    });
  } catch (error) {
    return fail(res, error, "Sign-in failed.");
  }
}
