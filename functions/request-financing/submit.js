// Request for Information submit (30 Oct 2026).
// Steve: submissions are emailed to him only, never to the client.
// The forms worker emails a copy to whatever is in client_email, so this function
// forwards the submission with client_email blank (the client's email rides in the
// phone line of Steve's alert), then restores the email and phone on the saved D1 row.
const WORKER = "https://acp-lending-forms.owner-1ab.workers.dev/request-for-information";

export async function onRequestPost({ request, env }) {
  const form = await request.formData();
  const email = (form.get("client_email") || "").toString().trim();
  const phone = (form.get("client_phone") || "").toString().trim();
  const name = (form.get("client_full_name") || "").toString();

  const out = new FormData();
  for (const [k, v] of form.entries()) {
    if (k === "client_email") continue;
    if (k === "client_phone") continue;
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
    } catch (e) {}
  }

  const html = await res.text();
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=UTF-8" } });
}

export async function onRequestGet({ request }) {
  return Response.redirect(new URL("/request-financing", request.url).toString(), 302);
}
