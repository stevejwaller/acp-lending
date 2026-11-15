// /check ARV request (15 Nov 2026, Steve).
// The visitor picks loan pricing, ARV, or both on /check. Pricing goes straight to /rates.
// ARV (or both) sends the property address here: Steve gets an alert and pulls the
// subdivision comps in Propelio by hand (no comps API), then sends the ARV estimate.
// The visitor gets a short receipt with no figures. Logged to D1 analyzer_runs as
// kind 'arv_request' (level = 'arv' or 'both') so the nightly tracker sees it.
import { sendMail, EMAIL_RE, firstName, SIGN, STEVE, clip, RUNS_DDL, sameOrigin } from "../_lib/mailer.js";

export async function onRequestPost({ request, env, waitUntil }) {
  const back = q => Response.redirect(new URL("/check?" + q, request.url).toString(), 303);
  if (!sameOrigin(request)) return back("error=send");
  const form = await request.formData();
  const g = k => clip(form.get(k), 200);
  if (g("website")) return back("sent=arv"); // bot trap
  const want = g("want") === "both" ? "both" : "arv";
  const d = { address: g("property_address"), city: g("city"), state: g("state"), zip: g("zip"),
    price: g("purchase_price"), name: g("name"), phone: g("phone"), email: g("email") };
  if (!d.address || !d.city || !d.state || !d.zip || !d.name || !d.phone || !EMAIL_RE.test(d.email)) return back("error=missing&want=" + want);
  const property = `${d.address}, ${d.city}, ${d.state} ${d.zip}`;

  if (env.DB) {
    try {
      await env.DB.prepare(RUNS_DDL).run();
      await env.DB.prepare(
        "INSERT INTO analyzer_runs (kind, level, borrower_name, borrower_email, borrower_phone, property, purchase, status, ip) VALUES ('arv_request', ?, ?, ?, ?, ?, ?, 'New', ?)"
      ).bind(want, d.name, d.email, d.phone, property, d.price, request.headers.get("CF-Connecting-IP") || "").run();
    } catch (e) {}
  }

  const jobs = [
    sendMail(env, {
      to: STEVE,
      subject: `ARV request${want === "both" ? " + pricing" : ""}: ${property}`,
      text: `New ARV request from acp-lending.com/check\n\nWants: ${want === "both" ? "ARV and loan pricing" : "ARV"}\nProperty: ${property}\nPurchase/asking price: ${d.price || "not given"}\n\nName: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\n\nPull the subdivision comps in Propelio and send the ARV estimate.`,
    }),
    sendMail(env, {
      to: d.email,
      subject: "We received your ARV request - ACP Real Estate Lending",
      text: `Hi ${firstName(d.name)},\n\nThanks. ACP Real Estate Lending received your ARV request for ${property}. Steve Waller will send you an ARV estimate from same-subdivision sales, usually the same day.\n\nWant to talk sooner? Call or text 936-522-8951.\n\n${SIGN}`,
    }),
  ];
  const p = Promise.all(jobs);
  if (waitUntil) waitUntil(p); else await p;
  return back("sent=" + want);
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/check", request.url).toString(), 302);
}
