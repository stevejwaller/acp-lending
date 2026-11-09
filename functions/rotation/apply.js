// GET /rotation/apply — writes the committed stamps in functions/_lib/rotation-log.js
// into D1 fb_group_rotation. Idempotent; only committed data is ever written.
import { ROTATION_LOG } from "../_lib/rotation-log.js";

const HDR = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

export async function onRequestGet({ env }) {
  const results = [];
  for (const e of ROTATION_LOG) {
    const r = await env.DB.prepare(
      `UPDATE fb_group_rotation
         SET last_posted = ?1, times_posted = times_posted + 1, last_campaign = ?2,
             notes = CASE WHEN notes IS NULL OR notes = '' THEN ?3 ELSE notes || ' | ' || ?3 END
       WHERE id = ?4 AND slug = ?5 AND identity = ?6
         AND (last_posted IS NULL OR last_posted < ?1)`
    ).bind(e.date, e.campaign, e.note, e.id, e.slug, e.identity).run();
    results.push({ id: e.id, date: e.date, updated: r.meta?.changes || 0 });
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: HDR });
}
