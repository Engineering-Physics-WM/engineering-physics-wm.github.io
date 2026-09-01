import type { VercelRequest, VercelResponse } from "@vercel/node";
import { jwtVerify, SignJWT } from "jose";

import { ApiError, cleanEmail } from "./http.js";

const COOKIE_NAME = "ep_session";
const SESSION_SECONDS = 60 * 60 * 12;

const instructorEmail = () => cleanEmail(process.env.INSTRUCTOR_EMAIL || "rxyan2@wm.edu");

const secretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new ApiError("SESSION_SECRET must be configured with at least 32 characters.", 503);
  }
  return new TextEncoder().encode(secret);
};

const cookieValue = (req: VercelRequest) => {
  const cookies = req.headers.cookie || "";
  const entry = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : "";
};

const isSecure = () => Boolean(process.env.VERCEL || process.env.NODE_ENV === "production");

export const setSessionCookie = (res: VercelResponse, token: string) => {
  const secure = isSecure() ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`
  );
};

export const clearSessionCookie = (res: VercelResponse) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure() ? "; Secure" : ""}`
  );
};

export const createSessionToken = async (email: string) =>
  new SignJWT({ email: cleanEmail(email), role: "instructor" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());

export const getInstructor = async (req: VercelRequest) => {
  const token = cookieValue(req);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const email = cleanEmail(payload.email);
    if (payload.role !== "instructor" || email !== instructorEmail()) return null;
    return { email };
  } catch {
    return null;
  }
};

export const requireInstructor = async (req: VercelRequest) => {
  const instructor = await getInstructor(req);
  if (!instructor) throw new ApiError("Sign in before using the instructor dashboard.", 401);
  return instructor;
};

export const configuredInstructorEmail = instructorEmail;
