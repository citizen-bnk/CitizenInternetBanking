export function money(v: string | number | null | undefined, opts: { sign?: boolean; compact?: boolean } = {}) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!isFinite(n)) return "—";
  const body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n < 0 ? "-" : opts.sign && n > 0 ? "+" : "";
  return `${sign}M${opts.compact ? "" : " "}${body}`;
}

export function localEquiv(amount: number, locale?: { localCurrency: string; rate: number | null }) {
  if (!locale?.rate) return null;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: locale.localCurrency, maximumFractionDigits: 2 }).format(amount * locale.rate);
  } catch {
    return null;
  }
}

export function parseAmount(v: string | number): number {
  const s = String(v ?? "");
  if (/-/.test(s)) return NaN;
  const n = parseFloat(s.replace(/[^\d.]/g, ""));
  return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

export function fmtDateTime(d: string | Date) {
  const dt = new Date(d);
  const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const t = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (dt.toDateString() === now.toDateString()) return `Today, ${t}`;
  if (dt.toDateString() === y.toDateString()) return `Yesterday, ${t}`;
  return `${dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: dt.getFullYear() === now.getFullYear() ? undefined : "numeric" })}, ${t}`;
}
export const fmtDay = (d: string | Date) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
export const initials = (s: string) => s.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
export const shortName = (n: string) => n.replace(/ Account$/i, "");
export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
export const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function fuzzy<T>(list: T[], value: string | undefined, key: (x: T) => string): T | undefined {
  const v = norm(value ?? "");
  if (!v) return undefined;
  return list.find((x) => norm(key(x)) === v) ?? list.find((x) => norm(key(x)).startsWith(v)) ?? list.find((x) => norm(key(x)).includes(v) || v.includes(norm(key(x))));
}
