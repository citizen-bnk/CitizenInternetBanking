/** Thin client for Citizen Bank Core. /api/* is proxied to Core by next.config.ts. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; idem?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idem) headers["Idempotency-Key"] = opts.idem;
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth/")) {
    window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }
  if (!res.ok && typeof window !== 'undefined') {
    if (json?.code === 'KYC_REQUIRED') window.dispatchEvent(new CustomEvent('citizen:kyc-required',{detail:json.kyc}));
    if (json?.code === 'REAUTH_REQUIRED') window.dispatchEvent(new CustomEvent('citizen:reauth-required'));
  }
  if (!res.ok) throw new ApiError(json?.error ?? "Something went wrong. Please try again.", res.status, json?.code);
  return json as T;
}

export const newIdem = () => `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export function guessCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const map: Record<string, string> = {
      "Africa/Maseru": "LS", "Africa/Johannesburg": "ZA", "Africa/Gaborone": "BW", "Africa/Mbabane": "SZ",
      "Africa/Harare": "ZW", "Africa/Maputo": "MZ", "Africa/Windhoek": "NA", "Europe/London": "GB",
    };
    if (map[tz]) return map[tz];
    return (navigator.language.split("-")[1] || "LS").toUpperCase();
  } catch {
    return "LS";
  }
}
