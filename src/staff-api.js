// What the staff pages share: calls to /staff/api (Kira's API, proxied by the Caddyfile), escaping, dates. Every
// string from the API is text a person wrote: it goes into the page only through escape() or textContent.
import { escape } from "./markdown.js";

export { escape };
let csrf = "";
export const setCsrf = (token) => (csrf = token || "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// GET or POST /staff/api/<path>; the CSRF token on writes. Throws ApiError with the API's message.
export async function api(method, path, body) {
  let res;
  try {
    res = await fetch(`/staff/api/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(method === "POST" && csrf ? { "X-Staff-Csrf": csrf } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "The dashboards can't be reached right now. Try again in a minute.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const closed = res.status === 404 || res.status === 502 || res.status === 503 && !data.error;
    throw new ApiError(res.status, data.error && !(res.status === 404 && data.error === "not found") ? data.error : closed ? "The dashboards are closed right now." : `Error ${res.status}.`);
  }
  return data;
}

const pad = (n) => String(n).padStart(2, "0");
// "30 Oct 14:05" in the reader's time; with the year when it isn't this one.
export function when(value) {
  if (!value) return "";
  const d = new Date(value);
  const month = d.toLocaleString("en", { month: "short" });
  return `${d.getDate()} ${month}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ""} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// "in 5 h", "3 d ago".
export function relative(value, now = Date.now()) {
  const ms = new Date(value).getTime() - now;
  const abs = Math.abs(ms);
  const text = abs < 3_600_000 ? `${Math.max(1, Math.round(abs / 60_000))} min` : abs < 172_800_000 ? `${Math.round(abs / 3_600_000)} h` : `${Math.round(abs / 86_400_000)} d`;
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

// A link people typed: only https on github.com or playhorizon.dev, "#123" (horizon's issue or pull request) or a path
// in horizon's repository become links; anything else is shown as text.
export function linkHtml(link) {
  const s = String(link || "");
  if (!s) return "";
  if (/^#\d+$/.test(s)) return `<a href="https://github.com/horizon-rust/horizon/issues/${s.slice(1)}">${escape(s)}</a>`;
  if (/^https:\/\/(github\.com|playhorizon\.dev)\//.test(s)) return `<a href="${escape(s)}" rel="noreferrer">${escape(s.replace(/^https:\/\//, ""))}</a>`;
  if (/^[A-Za-z0-9_.\/-]+$/.test(s) && !s.includes("..")) return `<a href="https://github.com/horizon-rust/horizon/blob/main/${escape(s)}">${escape(s)}</a>`;
  return escape(s);
}

// Text with line breaks kept, escaped.
export const paragraphs = (text) => escape(String(text || "")).replace(/\n/g, "<br>");

// Moves the .tab-pill of a .tabs group under its selected tab.
export function placePill(tabs) {
  const pill = tabs.querySelector(".tab-pill");
  const on = tabs.querySelector('[aria-selected="true"], [aria-current="page"]');
  if (!pill || !on) return;
  pill.style.width = `${on.offsetWidth}px`;
  pill.style.height = `${on.offsetHeight}px`;
  pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
}
