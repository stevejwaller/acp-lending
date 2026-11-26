// ACP Lending - POST /commercial-bridge/submit. Added 26 Nov 2026.
// Commercial bridge request from /commercial-bridge-loans: emails Steve (reply-to = borrower)
// and logs to D1 commercial_bridge_requests. The borrower gets no email.
import { sendMail, EMAIL_RE, STEVE, clip, sameOrigin } from "../_lib/mailer.js";

const DDL = `CREATE TABLE IF NOT EXISTS commercial_bridge_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, phone TEXT,
  property_type TEXT, state TEXT, city TEXT, purpose TEXT, value TEXT, amount TEXT,
  notes TEXT, status TEXT NOT NULL DEFAULT 'New', ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')))`;

export async function onRequestPost({ request, env }) {
  const back = q => Response.redirect(new URL("/commercial-bridge-loans?" + q + "#cb-box", request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error=send");
  const form = await request.formData();
  const g = (k, n) => clip(form.get(k), n || 200);
  if (g("website")) return back("sent=1"); // bot trap
  const d = {
    name: g("name", 120), email: g("email"), phone: g("phone", 40),
    property_type: g("property_type", 60), state: g("state", 40), city: g("city", 120),
    purpose: g("purpose", 80), value: g("value", 40), amount: g("amount", 40),
    notes: String(form.get("notes") || "").trim().slice(0, 2000),
  };
  if (!d.name || !EMAIL_RE.test(d.email) || !d.phone || !d.property_type || !d.state ||
      !d.purpose || !d.value || !d.amount) return back("error=missing");
  const ip = request.headers.get("CF-Connecting-IP") || "";

  if (env.DB) {
    try {
      await env.DB.prepare(DDL).run();
      await env.DB.prepare(
        "INSERT INTO commercial_bridge_requests (name,email,phone,property_type,state,city,purpose,value,amount,notes,ip) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(d.name, d.email, d.phone, d.property_type, d.state, d.city, d.purpose, d.value, d.amount, d.notes, ip).run();
    } catch (e) { /* logging must never block the email */ }
  }

  const res = await sendMail(env, {
    to: STEVE, replyTo: d.email,
    subject: `Commercial bridge request: ${d.property_type}, ${d.city ? d.city + ", " : ""}${d.state}, ${d.amount}`,
    text: [
      "New commercial bridge request from acp-lending.com/commercial-bridge-loans",
      "",
      `Name: ${d.name}`, `Email: ${d.email}`, `Phone: ${d.phone}`,
      `Property type: ${d.property_type}`, `Location: ${d.city ? d.city + ", " : ""}${d.state}`,
      `Purpose: ${d.purpose}`, `Price or value: ${d.value}`, `Loan requested: ${d.amount}`,
      "", "Occupancy, income and exit plan:", d.notes || "(none given)",
      "", "Reply to this email to reach the borrower.",
    ].join("\n"),
  });
  if (!res || res.ok === false) return back("error=send");
  return back("sent=1");
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/commercial-bridge-loans", request.url).toString(), 302);
}
