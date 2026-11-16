// Short reply codes for maturity texts (16 Nov 2026, Steve).
// code = touch_log id in base 36 + first 4 base-36 chars of SHA-256("<id>:<phone_last10>").
// The page shows nothing personal; the hash just keeps codes from being guessed.
export async function hashTag(id, phone) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${id}:${phone}`));
  let n = 0n;
  for (const b of new Uint8Array(buf).slice(0, 8)) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(4, "0").slice(0, 4);
}
export async function lookup(env, code) {
  code = String(code || "").toLowerCase();
  if (!/^[0-9a-z]{5,12}$/.test(code) || !env.DB) return null;
  const id = parseInt(code.slice(0, -4), 36);
  if (!Number.isFinite(id)) return null;
  const row = await env.DB.prepare("SELECT * FROM touch_log WHERE id = ?").bind(id).first();
  if (!row || !row.phone_last10) return null;
  return (await hashTag(id, row.phone_last10)) === code.slice(-4) ? row : null;
}
export const REPLIES_DDL = `CREATE TABLE IF NOT EXISTS maturity_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  touch_id INTEGER, code TEXT, borrower TEXT, phone_last10 TEXT, property_address TEXT,
  choice TEXT, best_time TEXT, note TEXT, ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;
