// POST /ask/submit - "Ask a Lender" question form on /ask (25 Nov 2026, Steve).
// Emails the question to Steve (reply-to set to the visitor, so he can answer by
// replying) and logs it to D1 ask_questions. No email goes to the visitor; the page
// shows a thank-you message. Same pattern as functions/check/submit.js.
import { sendMail, EMAIL_RE, STEVE, clip, sameOrigin } from "../_lib/mailer.js";

const DDL = `CREATE TABLE IF NOT EXISTS ask_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, email TEXT, phone TEXT, state TEXT, loan_type TEXT, question TEXT,
  status TEXT NOT NULL DEFAULT 'New', ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export async function onRequestPost({ request, env, waitUntil }) {
  const back = q => Response.redirect(new URL("/ask?" + q + "#ask-box", request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error=send");
  const form = await request.formData();
  const g = (k, n) => clip(form.get(k), n || 200);
  if (g("website")) return back("sent=1"); // bot trap
  const d = { name: g("name", 120), email: g("email"), phone: g("phone", 40), state: g("state", 40),
    loan: g("loan_type", 60), question: String(form.get("question") || "").trim().slice(0, 2000) };
  if (!d.name || !EMAIL_RE.test(d.email) || !d.state || !d.loan || !d.question) return back("error=missing");

  if (env.DB) {
    try {
      await env.DB.prepare(DDL).run();
      await env.DB.prepare("INSERT INTO ask_questions (name, email, phone, state, loan_type, question, ip) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(d.name, d.email, d.phone, d.state, d.loan, d.question, request.headers.get("CF-Connecting-IP") || "").run();
    } catch (e) {}
  }

  const res = await sendMail(env, {
    to: STEVE,
    replyTo: d.email,
    subject: `Ask a Lender: ${d.loan} question from ${d.name} (${d.state})`,
    text: `New question from acp-lending.com/ask\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || "not given"}\nProperty state: ${d.state}\nLoan type: ${d.loan}\n\nQuestion:\n${d.question}\n\nReply to this email to answer them directly.`,
  });
  if (!res || res.ok === false) return back("error=send");
  return back("sent=1");
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/ask", request.url).toString(), 302);
}
