// GET /m/<code> — the reply page linked from maturity texts. Logs the open, then serves maturity-reply.html.
import { lookup, REPLIES_DDL } from "../_lib/maturity-code.js";
export async function onRequestGet({ request, env, params, waitUntil }) {
  const log = (async () => {
    try {
      const row = await lookup(env, params.code);
      if (!row) return;
      await env.DB.prepare(REPLIES_DDL).run();
      await env.DB.prepare("INSERT INTO maturity_replies (touch_id, code, borrower, phone_last10, property_address, choice, ip) VALUES (?, ?, ?, ?, ?, 'opened', ?)")
        .bind(row.id, params.code, row.borrower, row.phone_last10, row.property_address, request.headers.get("CF-Connecting-IP") || "").run();
    } catch (e) {}
  })();
  if (waitUntil) waitUntil(log); else await log;
  const page = await env.ASSETS.fetch(new URL("/maturity-reply", request.url));
  return new Response(page.body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}
