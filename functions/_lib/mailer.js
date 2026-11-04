// Shared helpers for site email (added 4 Nov 2026).
// Mail goes through the acp-mailer worker (Cloudflare Email Service) via the MAILER
// service binding in wrangler.toml. Sender reports@mail.acp-lending.com, replies to owner@acp-lending.com.
export const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
export const STEVE = "steve@acp-lending.com";
export const SIGN = "ACP Real Estate Lending | Steve Waller | 936-522-8951 | owner@acp-lending.com | acp-lending.com";

export async function sendMail(env, msg) {
  if (!env || !env.MAILER) return { ok: false, error: "mailer not bound" };
  try {
    const r = await env.MAILER.fetch("https://acp-mailer/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(msg),
    });
    return await r.json();
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function clip(s, n) { return String(s == null ? "" : s).replace(/[\r\n]+/g, " ").trim().slice(0, n); }
export function firstName(name) { const f = clip(name, 60).split(/\s+/)[0] || ""; return f ? f.charAt(0).toUpperCase() + f.slice(1) : "there"; }

// UTF-8 safe base64 for attachments.
export function b64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function sameOrigin(request) {
  const o = request.headers.get("Origin");
  if (!o) return true;
  try { const h = new URL(o).hostname; return h === "acp-lending.com" || h === "www.acp-lending.com" || h.endsWith(".acplending.pages.dev") || h === "acplending.pages.dev"; }
  catch (e) { return false; }
}

// Table for Deal Analyzer runs: free summaries borrowers ran, and paid reports Steve saved.
export const RUNS_DDL = `CREATE TABLE IF NOT EXISTS analyzer_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,            -- 'summary' (borrower ran the free summary) or 'report' (owner saved a paid report)
  level TEXT,                    -- 'deal' ($49.99) or 'full' ($149.99) for reports
  borrower_name TEXT, borrower_email TEXT, borrower_phone TEXT,
  property TEXT, purchase TEXT, repairs TEXT, arv TEXT, liquidity TEXT,
  rows_json TEXT, report_html TEXT, token TEXT,
  status TEXT NOT NULL DEFAULT 'New', email_status TEXT, sent_at TEXT,
  ip TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

// The borrower's copy of a paid report drops the owner-only "Email Analysis" button from the report bar.
export function publicHtml(html) {
  return String(html || "").replace(/<button type="button" id="acpMail"[^>]*>Email Analysis<\/button>/, "");
}
