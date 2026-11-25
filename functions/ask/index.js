// GET /ask - "Ask a Lender" page (25 Nov 2026, Steve).
// Serves ask.html with the Q&A list and its FAQPage JSON-LD filled in from
// /data/ask-qa.json, so search engines and AI crawlers see the answers in the HTML.
// To add a Q&A, edit data/ask-qa.json only. If anything fails, the plain page is
// returned and js/ask.js renders the list in the browser instead.
import { esc } from "../_lib/mailer.js";

export async function onRequestGet({ request, env }) {
  const page = await env.ASSETS.fetch(new URL("/ask", request.url));
  if (!page.ok) return page;
  let html = await page.text();
  try {
    const r = await env.ASSETS.fetch(new URL("/data/ask-qa.json", request.url));
    const data = r.ok ? await r.json() : null;
    const items = (data && Array.isArray(data.items) ? data.items : []).filter(it => it && it.q && it.a);
    if (items.length) {
      const list = items.map(it =>
        `<div class="faq-item">\n<h3>${esc(it.q)}</h3>\n` +
        String(it.a).split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join("\n") + `\n</div>`
      ).join("\n");
      const ld = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "url": "https://acp-lending.com/ask",
        "mainEntity": items.map(it => ({
          "@type": "Question",
          "name": String(it.q),
          "acceptedAnswer": { "@type": "Answer", "text": String(it.a).replace(/\s*\n\s*\n\s*/g, " ") },
        })),
      };
      const ldTag = `<script type="application/ld+json">\n${JSON.stringify(ld, null, 1).replace(/</g, "\\u003c")}\n</script>`;
      html = html.replace("<!--ASK-QA-->", list).replace("<!--ASK-JSONLD-->", ldTag);
    }
  } catch (e) {}
  const headers = new Headers(page.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(html, { status: 200, headers });
}
