// ACP Deal Executive Summary — subdivision comps with a widening date range.
// Added 3 Nov 2026 (Steve): at least 20 closed sales from the subject's own subdivision;
// go back farther in time rather than leave the subdivision. The ARV is the number the
// comps justify (median $/SF x subject SF), not an entered estimate.
// POST /analyze-deal/comps  {address, city, state, zip} -> JSON
// Bindings: env.PROPERTYREACH_API_KEY (Pages secret, already used by /prospects).

const WINDOWS = [12, 18]; // months: 12, widened to 18 if fewer than MIN comps, never farther (Steve, 3 Nov 2026)
const MIN = 20;

function j(o, s) { return new Response(JSON.stringify(o), { status: s || 200, headers: { "Content-Type": "application/json" } }); }
function n(v) { if (v === undefined || v === null || v === "") return null; const x = Number(v); return isNaN(x) ? null : x; }
function pick(o, keys) {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  for (const g of ["lastSale", "last_sale", "sale", "saleInfo", "lastSold", "sold"]) {
    const s = o[g]; if (s && typeof s === "object") for (const k of keys) if (s[k] !== undefined && s[k] !== null && s[k] !== "") return s[k];
  }
  return undefined;
}
function findArr(d) {
  if (Array.isArray(d)) return d;
  const c = ["comparables", "results", "data", "properties", "comps", "items", "listings"];
  for (const k of c) if (Array.isArray(d[k])) return d[k];
  for (const k of ["meta", "property", "response", "body", "result", "data", "results"]) {
    const s = d[k]; if (s && typeof s === "object") { if (Array.isArray(s)) return s; for (const k2 of c) if (Array.isArray(s[k2])) return s[k2]; }
  }
  return [];
}
function findRec(d) {
  const like = o => o && typeof o === "object" && !Array.isArray(o) && (o.streetAddress || o.address || o.bedrooms !== undefined || o.yearBuilt !== undefined || o.subdivision !== undefined);
  if (like(d)) return d;
  for (const k of ["property", "result", "results", "data", "record", "subject", "propertyDetail", "details"]) {
    const v = d[k]; if (v && typeof v === "object") { if (Array.isArray(v)) { if (v.length && like(v[0])) return v[0]; } else if (like(v)) return v; }
  }
  return null;
}
function base(s) { return String(s || "").replace(/\s+(sec|section|sec\.)\s*\d+.*$/i, "").replace(/\s+(ph|phase)\s*\d+.*$/i, "").replace(/\s+r\/p.*$/i, "").trim().toLowerCase(); }
function med(a) { const s = a.filter(x => x > 0).sort((x, y) => x - y); if (!s.length) return 0; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function mapComp(p) {
  const sp = n(pick(p, ["sale_price", "salePrice", "lastSalePrice", "last_sale_price", "soldPrice", "sold_price", "closePrice", "lastSaleAmount", "saleAmount", "soldAmount", "closedPrice", "mlsSoldPrice", "price"]));
  const sq = n(pick(p, ["living_square_feet", "squareFeet", "square_feet", "livingArea", "gla", "grossLivingArea", "livingSquareFeet", "squareFootage"]));
  return {
    address: pick(p, ["full_address", "address", "streetAddress", "propertyAddress", "formattedAddress", "street_address"]) || null,
    salePrice: sp, saleDate: pick(p, ["sale_date", "saleDate", "lastSaleDate", "last_sale_date", "soldDate", "closeDate", "closedDate", "mlsSoldDate", "date"]) || null,
    beds: pick(p, ["bedrooms", "beds", "bedroomCount"]) ?? null, baths: pick(p, ["bathrooms", "baths", "bathroomCount"]) ?? null,
    sqft: sq, yearBuilt: pick(p, ["yearBuilt", "year_built"]) ?? null,
    subdivision: pick(p, ["subdivision", "subdivisionName", "subdivision_name", "developmentName", "community", "neighborhood"]) || null,
    ppsf: sp && sq ? sp / sq : n(pick(p, ["price_per_sqft", "pricePerSqft", "pricePerSquareFoot"]))
  };
}

export async function onRequestPost({ request, env }) {
  let b; try { b = await request.json(); } catch (e) { return j({ success: false, error: "Invalid request" }, 400); }
  if (!b.address || !b.city || !b.state) return j({ success: false, error: "Missing address" }, 400);
  const key = env.PROPERTYREACH_API_KEY;
  if (!key) return j({ success: false, error: "comps key not configured" }, 500);
  const target = { streetAddress: b.address, city: b.city, state: b.state }; if (b.zip) target.zip = b.zip;
  const qs = new URLSearchParams(target);
  // 1) Subject record first: its subdivision, size and PropertyReach id drive the comp filter.
  const pr = await fetch("https://api.propertyreach.com/v1/property?" + qs, { headers: { "x-api-key": key } }).then(r => r.ok ? r.json() : null).catch(() => null);
  const rec0 = pr ? findRec(pr) : null;
  const sub0 = rec0 ? pick(rec0, ["subdivision", "subdivisionName", "subdivision_name", "developmentName", "community", "neighborhood"]) : null;
  const sf0 = rec0 ? n(pick(rec0, ["livingSquareFeet", "livingArea", "living_square_feet", "gla", "buildingSquareFeet", "squareFeet"])) : null;
  const pid = rec0 ? n(pick(rec0, ["propertyId", "id", "property_id"])) : null;
  const tgt = pid ? Object.assign({ propertyId: pid }, target) : target;
  // 2) Comparables WITH a filter (3 Nov 2026). Without one PropertyReach returns its defaults:
  // 0.5-mile radius, no subdivision, no date range -> 0-6 sales. Ask for the subject's own
  // subdivision, MLS + public-record sales (Texas public records carry no prices), 18 months back,
  // +/-20% square feet, residential only. A second, subdivision-free pull over a wider radius is
  // post-filtered to the same subdivision in case the name filter is stricter than the record.
  const since = new Date(); since.setMonth(since.getMonth() - WINDOWS[WINDOWS.length - 1]);
  const fBase = { comparableSource: "Both", lastSaleDateMin: since.toISOString().slice(0, 10), propertyClassCode: ["R"] };
  if (sf0) { fBase.squareFeetMin = Math.round(sf0 * 0.8); fBase.squareFeetMax = Math.round(sf0 * 1.2); }
  const call = f => fetch("https://api.propertyreach.com/v1/comparables", { method: "POST", headers: { "x-api-key": key, "Content-Type": "application/json" }, body: JSON.stringify({ target: tgt, filter: f }) }).then(r => r.ok ? r.json() : null).catch(() => null);
  const reqs = [call(Object.assign({}, fBase, { distanceFromSubject: 5 }))];
  if (sub0) reqs.unshift(call(Object.assign({}, fBase, { subdivision: [sub0], distanceFromSubject: 10 })));
  const outs = await Promise.all(reqs);
  const raw = [].concat.apply([], outs.map(o => o ? findArr(o) : []));
  const sample = raw.length ? Object.keys(raw[0]).slice(0, 40) : null;
  const cr = { comparables: raw };
  const rec = pr ? findRec(pr) : null;
  const all = cr ? findArr(cr).map(mapComp) : [];
  if (!all.length) return j({ success: false, error: "No comparables returned", subdivision: sub0 || null });
  let sub = rec ? pick(rec, ["subdivision", "subdivisionName", "subdivision_name", "developmentName", "community", "neighborhood"]) : null;
  if (!sub) { const c = {}; all.forEach(x => { if (x.subdivision) c[x.subdivision] = (c[x.subdivision] || 0) + 1; }); sub = Object.keys(c).sort((a, z) => c[z] - c[a])[0] || null; }
  const sf = rec ? n(pick(rec, ["livingSquareFeet", "livingArea", "living_square_feet", "gla", "buildingSquareFeet", "squareFeet"])) : null;
  const lo = sf ? Math.round(sf * 0.8) : 0, hi = sf ? Math.round(sf * 1.2) : 0;
  const subB = base(sub);
  const seen = {};
  const pool = all.filter(c => {
    if (!c.salePrice || c.salePrice < 50000 || !c.saleDate || isNaN(new Date(c.saleDate))) return false;
    if (c.ppsf && c.ppsf < 50) return false;
    if (subB && c.subdivision && base(c.subdivision) !== subB) return false;
    if (sf && c.sqft && (c.sqft < lo || c.sqft > hi)) return false;
    const k = String(c.address || "").toLowerCase().replace(/[^a-z0-9]/g, "") + "|" + String(c.saleDate).slice(0, 10);
    if (seen[k]) return false; seen[k] = 1; return true;
  });
  let months = WINDOWS[0], comps = [];
  for (const w of WINDOWS) {
    const cut = new Date(); cut.setMonth(cut.getMonth() - w);
    comps = pool.filter(c => new Date(c.saleDate) >= cut);
    months = w;
    if (comps.length >= MIN) break;
  }
  comps.sort((a, z) => new Date(z.saleDate) - new Date(a.saleDate));
  // When 20 are not found, report the window the found sales actually cover, not the widest tried.
  if (comps.length < MIN && comps.length) {
    const oldest = new Date(comps[comps.length - 1].saleDate);
    for (const w of WINDOWS) { const cut = new Date(); cut.setMonth(cut.getMonth() - w); if (oldest >= cut) { months = w; break; } }
  }
  const mps = med(comps.map(c => c.ppsf));
  const arv = sf && mps ? Math.round(mps * sf / 1000) * 1000 : Math.round(med(comps.map(c => c.salePrice)) / 1000) * 1000;
  return j({
    success: true, subdivision: sub ? String(sub).replace(/\s+(sec|section)\s*\d+.*$/i, "") : null, subjectSqft: sf, sqftRange: sf ? lo + "-" + hi : "any",
    months, count: comps.length, met: comps.length >= MIN, rawCount: all.length,
    medianPpsf: Math.round(mps * 100) / 100, medianPrice: med(comps.map(c => c.salePrice)), arv,
    method: sf && mps ? "median $/SF x subject SF" : "median sale price", sampleKeys: sample, comps
  });
}
