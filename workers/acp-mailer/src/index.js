// acp-mailer — one job: send an email that the Pages functions hand it.
// Called as env.MAILER.fetch("https://mailer/send", {method:"POST", body: JSON})
// Body: { to, subject, text, html?, replyTo?, attachments? }
const FROM = { email: "reports@mail.acp-lending.com", name: "ACP Real Estate Lending" };
const REPLY_TO = "owner@acp-lending.com";
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

function json(o, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
    let m;
    try { m = await request.json(); } catch (e) { return json({ ok: false, error: "Bad JSON" }, 400); }
    const to = (Array.isArray(m.to) ? m.to : [m.to]).map(x => String(x || "").trim()).filter(Boolean);
    if (!to.length || to.length > 3 || !to.every(x => EMAIL_RE.test(x))) return json({ ok: false, error: "Bad recipient" }, 400);
    const subject = String(m.subject || "").slice(0, 200);
    if (!subject || !(m.text || m.html)) return json({ ok: false, error: "Missing subject or body" }, 400);
    const msg = { from: FROM, to, subject, replyTo: m.replyTo && EMAIL_RE.test(m.replyTo) ? m.replyTo : REPLY_TO };
    if (m.text) msg.text = String(m.text);
    if (m.html) msg.html = String(m.html);
    if (Array.isArray(m.attachments) && m.attachments.length) msg.attachments = m.attachments.slice(0, 3);
    try {
      const r = await env.EMAIL.send(msg);
      return json({ ok: true, id: r && r.messageId });
    } catch (e) {
      return json({ ok: false, error: String(e && e.message || e), code: e && e.code }, 502);
    }
  },
};
