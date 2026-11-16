// Approved maturity texts, sent from Steve's iMac (16 Nov 2026, Steve: "send the texts from my Mac with my approval").
//   GET  /texts/approve?b=<batch>&k=<key>  -> review page: every queued text, untick any to strike, one Approve button
//   POST /texts/approve                    -> marks the ticked texts approved, the rest struck
//   GET  /texts/api/pending                -> (Mac sender, Bearer token) claims approved texts that are due
//   POST /texts/api/report                 -> (Mac sender) {id, ok, error}; logs touch_log, emails Steve when a batch finishes
// Safety: re-checks do-not-contact / stop / replied in touch_log at send time, the 2-text cap, a daily cap,
// and only hands texts out 9:00am-7:00pm Central. A claimed text is never handed out twice.
// The morning task writes the rows (D1 text_batches / text_queue); "{link}" in a body becomes acp-lending.com/m/<code>.
import { hashTag } from "../_lib/maturity-code.js";
import { sendMail, STEVE, esc, clip } from "../_lib/mailer.js";

const DAILY_CAP = 30;
const DDL = [
  `CREATE TABLE IF NOT EXISTS text_batches (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_date TEXT NOT NULL, approve_key TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'queued', created_at TEXT NOT NULL DEFAULT (datetime('now')), approved_at TEXT, summary_sent_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS text_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id INTEGER NOT NULL, touch_id INTEGER,
     phone_last10 TEXT NOT NULL, borrower TEXT, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued',
     claimed_at TEXT, sent_at TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  `CREATE TABLE IF NOT EXISTS text_sender (id INTEGER PRIMARY KEY, token_hash TEXT NOT NULL, last_seen TEXT)`,
];
const SEC = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "X-Frame-Options": "DENY" };

async function setup(env) { for (const s of DDL) await env.DB.prepare(s).run(); }
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function json(d, status = 200) { return new Response(JSON.stringify(d), { status, headers: { "Content-Type": "application/json", ...SEC } }); }
function html(body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Approve texts - ACP</title><style>
body{font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:720px;margin:0 auto;padding:16px;color:#1b2a3a;background:#f6f8fb}
h1{font-size:22px;margin:8px 0}.card{background:#fff;border:1px solid #d9e1ea;border-radius:10px;padding:12px;margin:10px 0}
.card label{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.card input{margin-top:4px;width:20px;height:20px;flex:none}
.who{font-weight:600}.msg{white-space:pre-wrap;font-size:15px;margin-top:4px}.muted{color:#5b6b7b;font-size:14px}
.btn{display:block;width:100%;padding:14px;font-size:18px;font-weight:600;color:#fff;background:#0b5cad;border:0;border-radius:10px;margin:16px 0;cursor:pointer}
.ok{background:#e7f6ec;border-color:#9fd3b0}.warn{background:#fff6e5;border-color:#f0c97a}</style></head><body>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } });
}
function centralNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: parseInt(p.hour, 10) % 24 };
}
async function batchFor(env, b, k) {
  const id = parseInt(b, 10);
  if (!id || !k) return null;
  const row = await env.DB.prepare("SELECT * FROM text_batches WHERE id = ?").bind(id).first();
  return row && row.approve_key === String(k) ? row : null;
}
// Why a phone must not be texted now (null = fine).
async function blocked(env, phone, touchId) {
  const bad = await env.DB.prepare("SELECT status FROM touch_log WHERE phone_last10 = ? AND status IN ('do-not-contact','stop','replied') LIMIT 1").bind(phone).first();
  if (bad) return bad.status;
  const n = await env.DB.prepare("SELECT count(*) AS n FROM touch_log WHERE phone_last10 = ? AND status = 'texted' AND id <> ?").bind(phone, touchId || 0).first();
  if (n && n.n >= 2) return "already texted twice";
  return null;
}
async function withLink(body, touchId, phone) {
  if (!body.includes("{link}")) return body;
  if (!touchId) return body.replace(/\s*\{link\}/, "");
  const code = Number(touchId).toString(36) + await hashTag(touchId, phone);
  return body.replace("{link}", `acp-lending.com/m/${code}`);
}

async function approvePage(env, url) {
  const b = await batchFor(env, url.searchParams.get("b"), url.searchParams.get("k"));
  if (!b) return html(`<h1>Link not valid</h1><p class="muted">Use the Approve link in this morning's email.</p>`, 404);
  const rows = (await env.DB.prepare("SELECT * FROM text_queue WHERE batch_id = ? ORDER BY id").bind(b.id).all()).results || [];
  if (b.status !== "queued") {
    const counts = {};
    rows.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
    return html(`<h1>Texts for ${esc(b.batch_date)}</h1><div class="card ok">Already approved. ${Object.entries(counts).map(([s, n]) => `${n} ${esc(s)}`).join(", ")}.</div>`);
  }
  const cards = await Promise.all(rows.map(async r => {
    const why = await blocked(env, r.phone_last10, r.touch_id);
    const text = await withLink(r.body, r.touch_id, r.phone_last10);
    return `<div class="card${why ? " warn" : ""}"><label><input type="checkbox" name="keep" value="${r.id}"${why ? " disabled" : " checked"}>
<span><span class="who">${esc(r.borrower || "")}</span> <span class="muted">${esc(r.phone_last10)}${why ? ` - will not send (${esc(why)})` : ""}</span>
<div class="msg">${esc(text)}</div></span></label></div>`;
  }));
  return html(`<h1>Today's texts - ${esc(b.batch_date)}</h1>
<p class="muted">Untick any you don't want sent. Approved texts go out from your iMac's Messages between 9am and 7pm, about one every 20 seconds.</p>
<form method="post" action="/texts/approve"><input type="hidden" name="b" value="${b.id}"><input type="hidden" name="k" value="${esc(b.approve_key)}">
${cards.join("")}<button class="btn" type="submit">Approve and send</button></form>`);
}

async function approvePost(env, request) {
  const f = await request.formData();
  const b = await batchFor(env, f.get("b"), f.get("k"));
  if (!b) return html(`<h1>Link not valid</h1>`, 404);
  if (b.status !== "queued") return Response.redirect(new URL(`/texts/approve?b=${b.id}&k=${b.approve_key}`, request.url).toString(), 303);
  const keep = new Set(f.getAll("keep").map(x => parseInt(x, 10)));
  const rows = (await env.DB.prepare("SELECT id FROM text_queue WHERE batch_id = ? AND status = 'queued'").bind(b.id).all()).results || [];
  const stmts = rows.map(r => env.DB.prepare("UPDATE text_queue SET status = ? WHERE id = ?").bind(keep.has(r.id) ? "approved" : "struck", r.id));
  stmts.push(env.DB.prepare("UPDATE text_batches SET status = 'approved', approved_at = datetime('now') WHERE id = ?").bind(b.id));
  await env.DB.batch(stmts);
  const n = rows.filter(r => keep.has(r.id)).length;
  return html(`<h1>Approved</h1><div class="card ok">${n} text${n === 1 ? "" : "s"} approved. Your iMac will start sending within 5 minutes (9am-7pm Central only). You'll get an email when they're done.</div>`);
}

async function sender(env, request) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (t.length < 32) return false;
  const row = await env.DB.prepare("SELECT token_hash FROM text_sender WHERE id = 1").first();
  if (!row || row.token_hash !== await sha256(t)) return false;
  await env.DB.prepare("UPDATE text_sender SET last_seen = datetime('now') WHERE id = 1").run();
  return true;
}

async function pending(env) {
  const now = centralNow();
  if (now.hour < 9 || now.hour >= 19) return json({ texts: [], note: "outside sending hours" });
  const sentToday = await env.DB.prepare("SELECT count(*) AS n FROM text_queue WHERE status = 'sent' AND date(sent_at, '-6 hours') = ?").bind(now.date).first();
  let room = DAILY_CAP - (sentToday ? sentToday.n : 0);
  if (room <= 0) return json({ texts: [], note: "daily cap reached" });
  const rows = (await env.DB.prepare(`SELECT q.* FROM text_queue q JOIN text_batches b ON b.id = q.batch_id
     WHERE q.status = 'approved' AND b.status = 'approved' AND b.batch_date >= date('now','-2 day') ORDER BY q.id LIMIT 40`).all()).results || [];
  const out = [];
  for (const r of rows) {
    if (room <= 0) break;
    const why = await blocked(env, r.phone_last10, r.touch_id);
    if (why) { await env.DB.prepare("UPDATE text_queue SET status = 'skipped', error = ? WHERE id = ?").bind(why, r.id).run(); continue; }
    const claim = await env.DB.prepare("UPDATE text_queue SET status = 'sending', claimed_at = datetime('now') WHERE id = ? AND status = 'approved'").bind(r.id).run();
    if (!claim.meta || !claim.meta.changes) continue;
    out.push({ id: r.id, phone: "+1" + r.phone_last10, body: await withLink(r.body, r.touch_id, r.phone_last10) });
    room--;
  }
  return json({ texts: out });
}

async function report(env, request, waitUntil) {
  let d = {};
  try { d = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const id = parseInt(d.id, 10);
  const r = id && await env.DB.prepare("SELECT * FROM text_queue WHERE id = ? AND status = 'sending'").bind(id).first();
  if (!r) return json({ ok: false, error: "not claimed" }, 404);
  if (d.ok) {
    await env.DB.prepare("UPDATE text_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?").bind(id).run();
    if (r.touch_id) await env.DB.prepare("UPDATE touch_log SET status = 'texted' WHERE id = ? AND status IN ('queued','approved')").bind(r.touch_id).run();
  } else {
    await env.DB.prepare("UPDATE text_queue SET status = 'failed', error = ? WHERE id = ?").bind(clip(d.error, 300), id).run();
  }
  const p = maybeSummary(env, r.batch_id);
  if (waitUntil) waitUntil(p); else await p;
  return json({ ok: true });
}

// When nothing in a batch is left approved or sending, email Steve one summary.
async function maybeSummary(env, batchId) {
  const left = await env.DB.prepare("SELECT count(*) AS n FROM text_queue WHERE batch_id = ? AND status IN ('approved','sending')").bind(batchId).first();
  if (left && left.n) return;
  const lock = await env.DB.prepare("UPDATE text_batches SET summary_sent_at = datetime('now') WHERE id = ? AND summary_sent_at IS NULL").bind(batchId).run();
  if (!lock.meta || !lock.meta.changes) return;
  const b = await env.DB.prepare("SELECT batch_date FROM text_batches WHERE id = ?").bind(batchId).first();
  const rows = (await env.DB.prepare("SELECT borrower, phone_last10, status, error FROM text_queue WHERE batch_id = ? ORDER BY id").bind(batchId).all()).results || [];
  const count = s => rows.filter(r => r.status === s).length;
  const lines = rows.filter(r => r.status !== "sent").map(r => `- ${r.borrower || r.phone_last10}: ${r.status}${r.error ? ` (${r.error})` : ""}`);
  await sendMail(env, {
    to: STEVE,
    subject: `Texts sent ${b ? b.batch_date : ""}: ${count("sent")} sent, ${count("failed")} failed`,
    text: `${count("sent")} sent from your iMac, ${count("failed")} failed, ${count("skipped")} skipped, ${count("struck")} unticked by you.${lines.length ? "\n\n" + lines.join("\n") : ""}\n\nAll sent texts are logged in touch_log.`,
  });
}

export async function onRequest({ request, env, params, waitUntil }) {
  if (!env.DB) return json({ ok: false, error: "no db" }, 500);
  await setup(env);
  const url = new URL(request.url);
  const path = (params.path || []).join("/");
  if (path === "approve") {
    if (request.method === "GET") return approvePage(env, url);
    if (request.method === "POST") return approvePost(env, request);
  }
  if (path === "api/pending" && request.method === "GET") {
    if (!await sender(env, request)) return json({ ok: false }, 401);
    return pending(env);
  }
  if (path === "api/report" && request.method === "POST") {
    if (!await sender(env, request)) return json({ ok: false }, 401);
    return report(env, request, waitUntil);
  }
  return new Response("Not found", { status: 404, headers: SEC });
}
