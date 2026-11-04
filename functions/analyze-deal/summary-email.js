// POST /analyze-deal/summary-email (added 4 Nov 2026).
// When a borrower runs the Deal Executive Summary Analyzer, the free Basic Deal Summary
// (the same rows shown on screen) is emailed to them with the $49.99 / $149.99 options,
// and Steve gets an alert. The run is logged to D1 table analyzer_runs.
// Abuse limits: same-origin only, 3 emails per address and 15 per IP per day.
import { sendMail, EMAIL_RE, STEVE, SIGN, esc, clip, firstName, sameOrigin, RUNS_DDL } from "../_lib/mailer.js";

const PAY = [
  "PayPal: owner@acp-lending.com",
  "Zelle: 936-522-8951",
  "Card: call or text 936-522-8951 for a secure Chase payment link",
];

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOrigin(request)) return json({ ok: false }, 403);
  let b;
  try { b = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }

  const email = clip(b.email, 120).toLowerCase();
  const name = clip(b.name, 80);
  const phone = clip(b.phone, 40);
  const property = clip(b.property, 200);
  const rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 8)
    .map(r => [clip(r && r[0], 40), clip(r && r[1], 160)]).filter(r => r[0] && r[1]);
  if (!property || !rows.length) return json({ ok: false, error: "Missing summary" }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  let allowed = EMAIL_RE.test(email), id = null;
  if (env.DB) {
    try {
      await env.DB.prepare(RUNS_DDL).run();
      if (allowed) {
        const c = await env.DB.prepare(
          `SELECT SUM(borrower_email = ?1) AS byEmail, SUM(ip = ?2) AS byIp FROM analyzer_runs
           WHERE kind = 'summary' AND email_status = 'sent' AND created_at > datetime('now','-1 day')`
        ).bind(email, ip).first();
        if (c && ((c.byEmail || 0) >= 3 || (c.byIp || 0) >= 15)) allowed = false;
      }
      const ins = await env.DB.prepare(
        `INSERT INTO analyzer_runs (kind, borrower_name, borrower_email, borrower_phone, property, purchase, repairs, arv, liquidity, rows_json, email_status, ip)
         VALUES ('summary', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(name, email, phone, property, clip(b.purchase, 20), clip(b.repairs, 20), clip(b.arv, 20), clip(b.liquidity, 20),
        JSON.stringify(rows), allowed ? "sent" : (EMAIL_RE.test(email) ? "limited" : "no email"), ip).run();
      id = ins.meta && ins.meta.last_row_id;
    } catch (e) {}
  }

  const facts = rows.map(r => `${r[0]}: ${r[1]}`).join("\n");
  if (allowed) {
    const text = `Hi ${firstName(name)},

Here is your Basic Deal Summary from ACP Real Estate Lending. It is only a summary of ACP's full report.

${facts}

The full report is what helps you negotiate the purchase, confirm your repair estimate, and capture the higher profit:

$49.99 Deal Report: financing options, full cash to close, and a liquidity check.
$149.99 Full Package: everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP's recommended offer and walk-away price, and a phone walkthrough.

Pay by:
${PAY.join("\n")}
Include the property address and the report you want with your payment. Reports are generally delivered within 30 to 60 minutes, 9 a.m. to 5 p.m. Central.
Full credit: the report fee is credited back in full at closing if your loan closes with ACP.
Photos required: interior and exterior photos of the property must be provided, either your own or from the listing site or a prior MLS listing.

I'd rather walk you through it by phone. Reply with your best number, or call or text me at 936-522-8951.

Steve Waller
${SIGN}`;
    const html = `<div style="font:15px/1.5 Arial,sans-serif;color:#10233d;max-width:600px">
<p>Hi ${esc(firstName(name))},</p>
<p>Here is your Basic Deal Summary from ACP Real Estate Lending. It is only a summary of ACP's full report.</p>
<table style="border-collapse:collapse;width:100%;margin:8px 0 16px">${rows.map(r =>
  `<tr><th style="text-align:left;padding:7px 10px;border-bottom:1px solid #e6e8eb;width:38%">${esc(r[0])}</th><td style="padding:7px 10px;border-bottom:1px solid #e6e8eb">${esc(r[1])}</td></tr>`).join("")}</table>
<p>The full report is what helps you <b>negotiate the purchase, confirm your repair estimate, and capture the higher profit</b>:</p>
<p><b>$49.99 Deal Report</b>: financing options, full cash to close, and a liquidity check.<br>
<b>$149.99 Full Package</b>: everything in the Deal Report plus comparable sales, street view, map, full property record, repair review, ACP's recommended offer and walk-away price, and a phone walkthrough.</p>
<p><b>Pay by:</b><br>${PAY.map(esc).join("<br>")}</p>
<p style="font-size:13px">Include the property address and the report you want with your payment. Reports are generally delivered within 30 to 60 minutes, 9 a.m. to 5 p.m. Central.<br>
<b>Full credit:</b> the report fee is credited back in full at closing if your loan closes with ACP.<br>
<b>Photos required:</b> interior and exterior photos of the property must be provided, either your own or from the listing site or a prior MLS listing.</p>
<p>I'd rather walk you through it by phone. Reply with your best number, or call or text me at <a href="tel:+19365228951">936-522-8951</a>.</p>
<p>Steve Waller<br><span style="font-size:13px;color:#5a6472">${esc(SIGN)}</span></p></div>`;
    const r1 = await sendMail(env, { to: email, subject: `Your Basic Deal Summary - ${property}`, text, html });
    if (!(r1 && r1.ok)) {
      allowed = false;
      if (env.DB && id) { try { await env.DB.prepare("UPDATE analyzer_runs SET email_status = ? WHERE id = ?").bind("failed: " + clip(r1 && r1.error, 120), id).run(); } catch (e) {} }
    }
  }
  const alert = sendMail(env, {
    to: STEVE,
    replyTo: EMAIL_RE.test(email) ? email : undefined,
    subject: `Deal Analyzer run - ${property}`,
    text: `New Deal Executive Summary Analyzer run${id ? " (#" + id + ")" : ""}.

Borrower: ${name || "-"}
Email: ${email || "-"}${allowed ? " (summary emailed)" : EMAIL_RE.test(email) ? " (summary NOT emailed - limit reached or send failed)" : ""}
Phone: ${phone || "-"}
Property: ${property}
Purchase: ${clip(b.purchase, 20) || "-"} | Repairs: ${clip(b.repairs, 20) || "-"} | ARV entered: ${clip(b.arv, 20) || "-"} | Liquidity: ${clip(b.liquidity, 20) || "-"}

${facts}`,
  });
  if (waitUntil) waitUntil(alert); else await alert;
  return json({ ok: true, emailed: allowed, to: allowed ? email : "" });
}
