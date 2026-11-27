// POST /ask/numbers - "Send me my numbers" form under the loan-size calculator on /ask
// (25 Nov 2026, Steve). Recomputes the estimate from the inputs (loan = the lower of
// 100% of purchase + repairs and 80% of ARV; 27 Nov 2026), emails it to Steve as a lead (reply-to set
// to the visitor) and logs it to D1 ask_calc. Same pattern as functions/ask/submit.js.
import { sendMail, EMAIL_RE, STEVE, clip, sameOrigin } from "../_lib/mailer.js";

const DDL = `CREATE TABLE IF NOT EXISTS ask_calc (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT, email TEXT, phone TEXT, city TEXT,
  purchase INTEGER, repairs INTEGER, arv INTEGER, loan INTEGER, cash INTEGER,
  status TEXT NOT NULL DEFAULT 'New', ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

const money = n => "$" + Math.round(n).toLocaleString("en-US");
const amt = v => { const n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isFinite(n) && n > 0 ? Math.round(n) : 0; };

export async function onRequestPost({ request, env }) {
  const back = q => Response.redirect(new URL("/ask?numbers=" + q + "#calc-box", request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error");
  const form = await request.formData();
  const g = (k, n) => clip(form.get(k), n || 200);
  if (g("website")) return back("sent"); // bot trap
  const d = { name: g("name", 120), email: g("email"), phone: g("phone", 40), city: g("city", 80),
    P: amt(form.get("purchase")), R: amt(form.get("repairs")), A: amt(form.get("arv")) };
  if (!d.name || !EMAIL_RE.test(d.email) || !d.city || !d.P || !d.A) return back("missing");

  const cost = d.P + d.R, byCost = Math.round(1.0 * cost), byArv = Math.round(0.8 * d.A);
  const L = Math.min(byCost, byArv), cash = Math.max(0, cost - L);
  const sets = byArv < byCost ? "80% of ARV" : "100% of cost";

  if (env.DB) {
    try {
      await env.DB.prepare(DDL).run();
      await env.DB.prepare("INSERT INTO ask_calc (name, email, phone, city, purchase, repairs, arv, loan, cash, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(d.name, d.email, d.phone, d.city, d.P, d.R, d.A, L, cash, request.headers.get("CF-Connecting-IP") || "").run();
    } catch (e) {}
  }

  const res = await sendMail(env, {
    to: STEVE,
    replyTo: d.email,
    subject: `Loan calculator lead: ${d.name} (${d.city}) ${money(L)} estimate`,
    text: `New loan calculator lead from acp-lending.com/ask\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone || "not given"}\nProperty city: ${d.city}\n\nPurchase price: ${money(d.P)}\nRepair budget: ${money(d.R)}\nARV: ${money(d.A)}\n\n100% of cost: ${money(byCost)}\n80% of ARV: ${money(byArv)}\nEstimated loan: ${money(L)} (set by ${sets})\nTheir cash for purchase and repairs: ${money(cash)}${L < 50000 ? "\nBelow the $50,000 minimum loan." : ""}\n\nReply to this email to answer them directly.`,
  });
  if (!res || res.ok === false) return back("error");
  return back("sent");
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/ask#calc-box", request.url).toString(), 302);
}
