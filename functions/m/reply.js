// POST /m/reply — a borrower's answer from the maturity-text link (16 Nov 2026, Steve).
// Logs to D1 maturity_replies, marks the touch_log row replied (or do-not-contact), and emails Steve.
import { lookup, REPLIES_DDL } from "../_lib/maturity-code.js";
import { sendMail, STEVE, clip, sameOrigin } from "../_lib/mailer.js";

const LABELS = {
  extension: "Extend the current loan",
  rental_refi: "Refinance into a long-term rental loan (DSCR)",
  selling: "Selling it, may need a short bridge",
  new_deal: "This one's handled, has another property to finance",
  call_me: "Just call me",
  not_interested: "All set, no follow-up",
};

export async function onRequestPost({ request, env, waitUntil }) {
  const form = await request.formData();
  const code = clip(form.get("code"), 20).toLowerCase();
  const back = q => Response.redirect(new URL(`/m/${encodeURIComponent(code)}?${q}`, request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error=send");
  if (clip(form.get("website"), 50)) return back("sent=1");
  const choice = clip(form.get("choice"), 30);
  if (!LABELS[choice]) return back("error=pick");
  const row = await lookup(env, code).catch(() => null);
  if (!row) return back("error=code");
  const best = clip(form.get("best_time"), 100), note = clip(form.get("note"), 500);

  try {
    await env.DB.prepare(REPLIES_DDL).run();
    await env.DB.prepare("INSERT INTO maturity_replies (touch_id, code, borrower, phone_last10, property_address, choice, best_time, note, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(row.id, code, row.borrower, row.phone_last10, row.property_address, choice, best, note, request.headers.get("CF-Connecting-IP") || "").run();
    const stamp = new Date().toISOString().slice(0, 10);
    const status = choice === "not_interested" ? "do-not-contact" : "replied";
    await env.DB.prepare("UPDATE touch_log SET status = ?, notes = COALESCE(notes,'') || ? WHERE id = ?")
      .bind(status, ` | Link reply ${stamp}: ${LABELS[choice]}`, row.id).run();
  } catch (e) {}

  const p = sendMail(env, {
    to: STEVE,
    subject: `Maturity reply: ${row.borrower} - ${LABELS[choice]}`,
    text: `${row.borrower} answered the link in your maturity text.\n\nAnswer: ${LABELS[choice]}\nBest time: ${best || "not given"}\nNote: ${note || "none"}\n\nProperty: ${row.property_address || "?"}\nLender: ${row.lender || "?"}\nMaturity: ${row.maturity_date || "?"}\nPhone: ${row.phone_last10}\nTouch: ${row.touch || "?"} (touch_log id ${row.id})\n\n${choice === "not_interested" ? "Marked do-not-contact in touch_log." : "Marked replied in touch_log. No more texts will be queued to this borrower."}`,
  });
  if (waitUntil) waitUntil(p); else await p;
  return back(choice === "not_interested" ? "sent=no" : "sent=1");
}
export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/", request.url).toString(), 302);
}
