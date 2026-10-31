// Same-origin map tiles for the Deal Executive Summary location map (Exhibit A).
// Added 31 Oct 2026. New file only. The site CSP allows images from 'self' only,
// so OpenStreetMap tiles are passed through here.  GET /analyze-deal/tile/{z}/{x}/{y}
export async function onRequestGet({ params }) {
  const p = Array.isArray(params.path) ? params.path : [];
  if (p.length !== 3 || !p.every(s => /^\d+$/.test(s)) || Number(p[0]) > 19) return new Response("Bad tile", { status: 400 });
  const r = await fetch("https://tile.openstreetmap.org/" + p.join("/") + ".png", { headers: { "User-Agent": "ACP-Lending-Report/1.0 (acp-lending.com; steve@acp-lending.com)" }, cf: { cacheTtl: 604800, cacheEverything: true } });
  if (!r.ok) return new Response("Tile unavailable", { status: 404 });
  return new Response(r.body, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=604800" } });
}
