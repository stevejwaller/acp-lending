// GET /analyze-deal/r/<token> (added 4 Nov 2026): the borrower's link to a paid report
// Steve sent from /deals. Only reports already sent are served; the token is 48 random hex chars.
import { publicHtml } from "../../_lib/mailer.js";

export async function onRequestGet({ params, env }) {
  const tok = String(params.token || "");
  const nf = () => new Response("Report not found. Call or text 936-522-8951.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!/^[0-9a-f]{48}$/.test(tok) || !env.DB) return nf();
  let row = null;
  try {
    row = await env.DB.prepare("SELECT report_html FROM analyzer_runs WHERE token = ? AND kind = 'report' AND status = 'Report sent'").bind(tok).first();
  } catch (e) {}
  if (!row) return nf();
  return new Response(publicHtml(row.report_html), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
    },
  });
}
