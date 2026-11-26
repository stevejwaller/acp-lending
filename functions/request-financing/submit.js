// Request for Information submit (30 Oct 2026).
// Steve: the submission details are emailed to him only, never to the client.
// 4 Nov 2026 (Steve): the borrower now also gets a short receipt (no figures, no analysis)
// sent through the acp-mailer worker.
// The forms worker emails a copy to whatever is in client_email, so this function
// forwards the submission with client_email blank (the client's email rides in the
// phone line of Steve's alert), then restores the email and phone on the saved D1 row.
import { sendMail, EMAIL_RE, firstName, SIGN } from "../_lib/mailer.js";

const WORKER = "https://acp-lending-forms.owner-1ab.workers.dev/request-for-information";

export async function onRequestPost({ request, env, waitUntil }) {
  const form = await request.formData();
  const email = (form.get("client_email") || "").toString().trim();
  const phone = (form.get("client_phone") || "").toString().trim();
  const name = (form.get("client_full_name") || "").toString();

  // 26 Nov 2026 (Steve): optional "Referred by" field for the Referral Partner Program.
  // The forms worker has no column for it, so it rides at the top of the project summary
  // (it shows in Steve's alert and on the saved D1 row) and is logged to D1 partner_referrals.
  const referredBy = (form.get("referred_by") || "").toString().replace(/[\r\n]+/g, " ").trim().slice(0, 120);

  const out = new FormData();
  for (const [k, v] of form.entries()) {
    if (k === "client_email") continue;
    if (k === "client_phone") continue;
    if (k === "referred_by") continue;
    if (k === "project_summary" && referredBy) { out.append(k, `REFERRED BY: ${referredBy}\n\n${v}`); continue; }
    out.append(k, v);
  }
  out.append("client_email", "");
  out.append("client_phone", email ? `${phone} | ${email}` : phone);

  let res;
  try {
    res = await fetch(WORKER, { method: "POST", body: out });
  } catch (e) {
    return Response.redirect(new URL("/request-financing?error=send", request.url).toString(), 303);
  }
  if (!res.ok) {
    return Response.redirect(new URL("/request-financing?error=verify", request.url).toString(), 303);
  }

  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT id FROM rfi_submissions WHERE client_full_name = ? AND client_email = '' ORDER BY id DESC LIMIT 1"
      ).bind(name).first();
      if (row && row.id) {
        await env.DB.prepare("UPDATE rfi_submissions SET client_email = ?, client_phone = ? WHERE id = ?")
          .bind(email, phone, row.id).run();
      }
      if (referredBy) {
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS partner_referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT, referred_by TEXT, rfi_id INTEGER,
          borrower_name TEXT, borrower_email TEXT, property TEXT, status TEXT NOT NULL DEFAULT 'New',
          created_at TEXT NOT NULL DEFAULT (datetime('now')))`).run();
        await env.DB.prepare("INSERT INTO partner_referrals (referred_by, rfi_id, borrower_name, borrower_email, property) VALUES (?, ?, ?, ?, ?)")
          .bind(referredBy, row && row.id ? row.id : null, name, email, (form.get("property_address") || "").toString().slice(0, 200)).run();
      }
    } catch (e) {}
  }

  if (EMAIL_RE.test(email)) {
    const p = sendMail(env, {
      to: email,
      subject: "We received your financing request - ACP Real Estate Lending",
      text: `Hi ${firstName(name)},\n\nThanks for reaching out. ACP Real Estate Lending received your request for information, and Steve Waller will review it and follow up with you by phone.\n\nWant to talk sooner? Call or text 936-522-8951.\n\n${SIGN}`,
    });
    if (waitUntil) waitUntil(p); else await p;
  }

  const html = await res.text();
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=UTF-8" } });
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/request-financing", request.url).toString(), 302);
}
