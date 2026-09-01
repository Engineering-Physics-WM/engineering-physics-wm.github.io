import type { VercelRequest, VercelResponse } from "@vercel/node";

import { configuredInstructorEmail, getInstructor } from "../../server/auth.js";
import { applyCors, fail, json, options } from "../../server/http.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return options(req, res);
  if (req.method !== "GET") return json(res, 405, { error: "GET required." });

  try {
    const instructor = await getInstructor(req);
    return json(res, 200, {
      user: instructor
        ? {
            email: configuredInstructorEmail(),
            name: process.env.INSTRUCTOR_NAME || "Ran Yang",
            role: "instructor",
          }
        : null,
    });
  } catch (error) {
    return fail(res, error, "Could not load the session.");
  }
}
