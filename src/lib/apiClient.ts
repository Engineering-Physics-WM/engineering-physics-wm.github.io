const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

// The Vercel deployment serves the frontend and API from the same origin. During local Vite
// development, the API can be pointed at `vercel dev` with VITE_API_BASE_URL.
const isBackendConfigured = Boolean(import.meta.env.VITE_API_BASE_URL || !import.meta.env.DEV);

export class ApiClientError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export const apiFetch = async <T = unknown>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : `Request failed (${response.status}).`;
    const code =
      typeof payload === "object" && payload && "code" in payload
        ? String(payload.code)
        : undefined;
    throw new ApiClientError(message, response.status, code);
  }
  return payload as T;
};

export type SessionUser = { email: string; name: string; role: "instructor" };

export const getSession = () => apiFetch<{ user: SessionUser | null }>("/api/auth/session");
export const signIn = (email: string, password: string) =>
  apiFetch<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
export const signOut = () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });

export { isBackendConfigured };
