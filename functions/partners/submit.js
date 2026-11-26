// POST /partners/submit - Referral Partner Program sign-up on /partners (26 Nov 2026, Steve).
// Emails the sign-up to Steve (reply-to set to the partner) and logs it to D1
// partner_signups. No email goes to the partner; the page shows a thank-you message.
// Same pattern as functions/ask/submit.js.
import { sendMail, EMAIL_RE, STEVE, clip, sameOrigin } from "../_lib/mailer.js";

const DDL = `CREATE TABLE IF NOT EXISTS partner_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, email TEXT, phone TEXT, company TEXT, role TEXT, market TEXT, deal TEXT,
  status TEXT NOT NULL DEFAULT 'New', ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export async function onRequestPost({ request, env }) {
  const back = q => Response.redirect(new URL("/partners?" + q + "#partner-box", request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error=send");
  const form = await request.formData();
  const g = (k, n) => clip(form.get(k), n || 200);
  if (g("website")) return back("sent=1"); // bot trap
  const d = { name: g("name", 120), email: g("email"), phone: g("phone", 40), company: g("company_name", 120),
    role: g("role", 60), market: g("market", 120), deal: String(form.get("deal") || "").trim().slice(0, 2000) };
  if (!d.name || !EMAIL_RE.test(d.email) || !d.phone || !d.role || !d.market) return back("error=missing");

  if (env.DB) {
    try {
      await env.DB.prepare(DDL).run();
      await env.DB.prepare("INSERT INTO partner_signups (name, email, phone, company, role, market, deal, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(d.name, d.email, d.phone, d.company, d.role, d.market, d.deal, request.headers.get("CF-Connecting-IP") || "").run();
    } catch (e) {}
  }

  const res = await sendMail(env, {
    to: STEVE,
    replyTo: d.email,
    subject: `New referral partner: ${d.name} (${d.role}, ${d.market})`,
    text: `New referral partner sign-up from acp-lending.com/partners\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\nCompany: ${d.company || "not given"}\nWhat they do: ${d.role}\nMarkets: ${d.market}\n\nInvestor ready now:\n${d.deal || "none given"}\n\nNext: send the referral agreement. Reply to this email to reach them directly.`,
  });
  if (!res || res.ok === false) return back("error=send");
  return back("sent=1");
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/partners", request.url).toString(), 302);
}
