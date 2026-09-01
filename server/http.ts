import type { VercelRequest, VercelResponse } from "@vercel/node";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const json = (res: VercelResponse, status: number, payload: unknown) => {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(payload);
};

export const options = (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.APP_ORIGIN;
  if (origin && allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  return res.status(204).end();
};

export const applyCors = (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.APP_ORIGIN;
  if (origin && allowedOrigin && origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
};

export const fail = (res: VercelResponse, error: unknown, fallback = "Request failed.") => {
  const status = error instanceof ApiError ? error.status : 500;
  const code = error instanceof ApiError ? error.code : undefined;
  const message = error instanceof Error ? error.message : fallback;
  return json(res, status, { error: message, ...(code ? { code } : {}) });
};

export const readJson = async <T>(req: VercelRequest): Promise<T> => {
  if (req.body && typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      throw new ApiError("Request body must be valid JSON.", 400, "invalid_json");
    }
  }
  throw new ApiError("Request body is required.", 400, "missing_body");
};

export const queryString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export const cleanEmail = (value: unknown) =>
  typeof value === "string"
    ? value
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim()
        .toLowerCase()
    : "";

export const WM_EMAIL_RE = /^[^@\s]+@wm\.edu$/i;

export const requireString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(`${label} is required.`);
  return value.trim();
};
