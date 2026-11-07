// POST /qv — records one open of a saved quote link (deal-calculator?q=<ref>).
// Added 6 Nov 2026 at Steve's request so the morning outreach email can report
// which quotes sent to prospects were actually opened.
// Creates its own table on first use so no change is needed in Cloudflare.
const REF = /^[a-z0-9]{10}$/;
const BOT = /bot|crawl|spider|preview|facebookexternalhit|slurp|headless/i;

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json().catch(() => ({}));
    const ref = String(body.ref || '').toLowerCase();
    if (!REF.test(ref)) return new Response(null, { status: 204 });
    const ua = (request.headers.get('user-agent') || '').slice(0, 300);
    if (BOT.test(ua)) return new Response(null, { status: 204 });
    const cf = request.cf || {};
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS quote_views (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         quote_ref TEXT NOT NULL,
         viewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
         city TEXT, region TEXT, user_agent TEXT, referrer TEXT)`
    ).run();
    await env.DB.prepare(
      'INSERT INTO quote_views (quote_ref, city, region, user_agent, referrer) VALUES (?1, ?2, ?3, ?4, ?5)'
    ).bind(ref, cf.city || '', cf.region || '', ua, String(body.referrer || '').slice(0, 300)).run();
  } catch (e) {
    // Tracking must never break the calculator page.
  }
  return new Response(null, { status: 204 });
}

export function onRequest() {
  return new Response('Method not allowed', { status: 405 });
}
