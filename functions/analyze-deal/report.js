// ACP Deal Executive Summary — report for the /analyze-deal page.
// Added 31 Oct 2026. New file only; no v61 base file is changed.
// Styled after the 31 Oct 2026 Woodglen Drive memo Steve approved: Times New Roman 12pt,
// left-bordered narrative box, metric strip, street view, plain ruled sections, exhibits.
// POST /analyze-deal/report  (JSON body from js/analyze-deal.js) -> HTML report
// Bindings: env.ACP_COMPS (service binding to the acp-comps worker, via wrangler.toml).

function esc(s) { if (s === null || s === undefined) return ""; return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function money(n) { if (n === null || n === undefined || isNaN(n)) return "—"; const r = Math.round(n); return (r < 0 ? "−$" : "$") + Math.abs(r).toLocaleString("en-US"); }
function psf(n) { return (n && !isNaN(n)) ? "$" + Number(n).toFixed(2) : "—"; }
function num(v) { const n = parseFloat(String(v || "").replace(/[$,\s]/g, "")); return isNaN(n) ? 0 : n; }
function fdate(d) { if (!d) return "—"; const t = new Date(d); return isNaN(t) ? "—" : t.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/Chicago" }); }
function median(a) { const s = a.filter(x => x > 0).sort((x, y) => x - y); if (!s.length) return 0; const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function jerr(msg, status) { return new Response(JSON.stringify({ success: false, error: msg }), { status: status || 400, headers: { "Content-Type": "application/json" } }); }

const ASSUMED_RATE = 0.11; // used only for the reserves line

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch (e) { return jerr("Invalid request"); }
  for (const k of ["propertyAddress", "city", "state", "zip", "purchasePrice"]) if (!b[k]) return jerr("Missing required field: " + k);

  const purchase = num(b.purchasePrice), repairs = num(b.repairBudget), userArv = num(b.arvEstimate), liquidity = num(b.borrowerLiquidity);

  let cr = null, compsError = null;
  try {
    if (!env.ACP_COMPS) throw new Error("comps service not connected");
    const r = await env.ACP_COMPS.fetch("https://acp-comps.internal/api/v1/comps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: b.propertyAddress, city: b.city, state: b.state, zip: b.zip }) });
    cr = await r.json();
    if (!cr.success) compsError = cr.error || "comps query failed";
  } catch (e) { compsError = e.message; }

  const ok = cr && cr.success;
  const subj = (ok && cr.subject) || {};
  const pl = (cr && cr._debug && cr._debug.propertyLookup && !cr._debug.propertyLookup._error) ? cr._debug.propertyLookup : null;
  const rec = (pl && pl._raw) || {};
  const comps = (ok && Array.isArray(cr.comps)) ? cr.comps : [];
  const st = (ok && cr.statistics) || {};
  const sqft = num(subj.sqft);

  // ARV: entered estimate if given, otherwise average $/SF of the comps x subject SF.
  let arv = userArv, arvBasis = "the estimate entered with the request";
  if (!arv && sqft && st.avgPricePerSqft) { arv = st.avgPricePerSqft * sqft; arvBasis = comps.length + " closed sales" + (subj.subdivision ? " in " + subj.subdivision : "") + " (average " + psf(st.avgPricePerSqft) + "/SF applied to " + sqft.toLocaleString("en-US") + " SF)"; }
  else if (!arv && st.medianPrice) { arv = st.medianPrice; arvBasis = "the median of " + comps.length + " closed sales"; }
  arv = Math.round(arv);
  const arvPsf = (arv && sqft) ? arv / sqft : 0;
  const medPsf = median(comps.map(c => num(c.pricePerSqft)));

  // Financing: ARV x advance rate, less repairs, less purchase = cash due. Advance is cut to need (no surplus).
  function tier(rate) {
    const full = Math.round(arv * rate);
    const maxPurchase = full - repairs;
    const need = purchase + repairs;
    const loan = Math.min(full, need);
    const cash = Math.max(0, need - loan);
    return { rate, full, loan, maxPurchase, cash, cut: full > need };
  }
  const t70 = tier(0.70), t75 = tier(0.75);
  const offer = Math.max(0, t70.maxPurchase), ceiling = Math.max(0, t75.maxPurchase);
  const reserves6 = Math.round(t70.loan * ASSUMED_RATE / 12 * 6), reserveRehab = Math.round(repairs / 3);

  const full = esc(b.propertyAddress) + ", " + esc(b.city) + ", " + esc(b.state) + " " + esc(b.zip);
  const today = new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Chicago" });
  const origin = new URL(request.url).origin;
  const lat = pl && pl.latitude, lon = pl && pl.longitude;
  const loc = (lat && lon) ? lat + "," + lon : b.propertyAddress + ", " + b.city + ", " + b.state + " " + b.zip;
  const sv = origin + "/deal-analyzer/property-image?loc=" + encodeURIComponent(loc);
  const avm = num(pl && pl.estimatedValue) || num(rec.estimatedValue);

  // Narrative
  const n = [];
  if (arv) {
    n.push("<strong>Recommended offer: " + money(offer) + "; walk-away ceiling " + money(ceiling) + ".</strong>");
    n.push("ARV of " + money(arv) + (arvPsf ? " (" + psf(arvPsf) + "/SF on " + sqft.toLocaleString("en-US") + " SF)" : "") + " rests on " + arvBasis + ".");
    n.push("At 70% of ARV the loan supports a purchase up to " + money(t70.maxPurchase) + " after " + money(repairs) + " in repairs; at 75% it supports " + money(t75.maxPurchase) + ".");
    if (purchase > ceiling) n.push("The " + money(purchase) + " purchase price is " + money(purchase - ceiling) + " above the ceiling, so the deal does not clear as priced.");
    else if (purchase > offer) n.push("The " + money(purchase) + " purchase price sits between the offer and the ceiling.");
    else n.push("The " + money(purchase) + " purchase price is at or below the recommended offer.");
    n.push("Estimated cash due at closing is " + money(t70.cash) + " at 70% and " + money(t75.cash) + " at 75%, plus closing costs.");
    if (avm) n.push("The as-is AVM is " + money(avm) + ".");
  } else {
    n.push("An ARV could not be set from the comps returned for this address. Enter an ARV estimate and run the report again.");
  }

  const L = [];
  L.push('<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(b.propertyAddress) + " — Deal Executive Summary</title>");
  L.push("<style>");
  L.push("body{margin:0;background:#fff;color:#000;font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.35}");
  L.push(".page{max-width:7.5in;margin:0 auto;padding:.5in .4in}");
  L.push("h1{font-size:18pt;margin:0 0 2px}.sub{font-size:10.5pt;margin:0 0 12px}");
  L.push(".nar{border-left:4px solid #000;padding:6px 10px;margin:0 0 12px}");
  L.push("table{border-collapse:collapse;width:100%;font-size:11pt}th,td{border:1px solid #000;padding:3px 6px;text-align:left;vertical-align:top}th{font-weight:bold}");
  L.push(".strip td{width:16.66%;font-size:10pt}.strip b{display:block;font-size:12pt}");
  L.push(".photo{text-align:center;margin:12px 0 4px}.photo img{max-width:5.2in;width:100%}.cap{font-style:italic;font-size:10pt;margin:0 0 10px}");
  L.push("h2{font-size:13pt;margin:16px 0 6px;padding-bottom:2px;border-bottom:1px solid #000;break-after:avoid;page-break-after:avoid}");
  L.push("p{margin:0 0 8px}.num{text-align:right}.foot{font-size:9.5pt;margin-top:14px;border-top:1px solid #000;padding-top:4px}");
  L.push(".ex{break-before:page;page-break-before:always}table,.nar,.photo,.map{break-inside:avoid;page-break-inside:avoid}");
  L.push(".map{position:relative;width:768px;max-width:100%;height:512px;overflow:hidden;margin:6px auto;border:1px solid #000}.map img{position:absolute;width:256px;height:256px}.pin{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#c00;border:2px solid #fff;box-shadow:0 0 0 1px #000}");
  L.push(".bar{text-align:right;margin-bottom:8px}.bar button{font:inherit;font-size:10.5pt;padding:4px 10px}@media print{.bar{display:none}.page{padding:0}}");
  L.push("</style></head><body><div class='page'>");
  L.push("<div class='bar'><button onclick='window.print()'>Save as PDF</button></div>");
  L.push("<h1>" + full + "</h1><p class='sub'>Deal Executive Summary · ACP Real Estate Lending · " + today + "</p>");
  L.push("<div class='nar'>" + n.join(" ") + "</div>");
  L.push("<table class='strip'><tr>" +
    "<td>ARV<b>" + money(arv) + "</b></td>" +
    "<td>ARV $/SF<b>" + psf(arvPsf) + "</b></td>" +
    "<td>Purchase price<b>" + money(purchase) + "</b></td>" +
    "<td>Repairs<b>" + money(repairs) + "</b></td>" +
    "<td>Comps<b>" + comps.length + "</b></td>" +
    "<td>AVM (as-is)<b>" + money(avm) + "</b></td></tr></table>");
  L.push("<div class='photo'><img src='" + esc(sv) + "' alt='Street view' onerror=\"this.parentNode.style.display='none'\"></div><p class='cap'>Street view, " + esc(b.propertyAddress) + " (Google).</p>");

  // Property
  const pp = [];
  const bits = [];
  if (sqft) bits.push(sqft.toLocaleString("en-US") + " SF");
  if (subj.beds != null) bits.push(subj.beds + " bedrooms");
  if (subj.baths != null) bits.push(subj.baths + " baths");
  if (subj.yearBuilt) bits.push("built " + subj.yearBuilt);
  pp.push("Single-family" + (subj.subdivision ? " in " + esc(subj.subdivision) : "") + (bits.length ? ": " + esc(bits.join(", ")) + "." : "."));
  const own = rec.owner1Name || rec.ownerNames;
  if (own) pp.push("Owner of record: " + esc(own) + (rec.occupancyType ? " (" + esc(rec.occupancyType) + ")" : "") + (rec.ownershipMonths != null ? ", held " + esc(rec.ownershipMonths) + " months" : "") + ".");
  const tx = [];
  if (rec.marketValue) tx.push("market value " + money(rec.marketValue));
  if (rec.taxAmount) tx.push("tax " + money(rec.taxAmount) + (rec.taxYear ? " (" + esc(rec.taxYear) + ")" : ""));
  if (rec.taxDelinquency) tx.push("taxes show as delinquent");
  if (rec.openLoanCount != null) tx.push(rec.openLoanCount + " open loans");
  if (tx.length) pp.push("Tax and value record: " + tx.join("; ") + ".");
  pp.push("Flood zone: " + (rec.withinFloodZone ? esc(rec.floodZoneDescription || "in a flood zone") : (pl ? "not in a flood zone per the record" : "not available")) + ". Full property record is Exhibit B; location map is Exhibit A.");
  L.push("<h2>Property</h2><p>" + pp.join(" ") + "</p>");

  // ARV
  L.push("<h2>ARV derivation</h2>");
  if (comps.length) {
    L.push("<p>" + comps.length + " closed sales" + (subj.subdivision ? " in " + esc(subj.subdivision) : "") + " make up the comp set (Exhibit C). They average " + psf(st.avgPricePerSqft) + "/SF with a median of " + psf(medPsf) + "/SF; the median sale was " + money(st.medianPrice) + " and the average " + money(st.avgPrice) + ". " + (userArv ? "The ARV used is the " + money(userArv) + " entered with the request." : "Applied to the subject's " + sqft.toLocaleString("en-US") + " SF, that gives " + money(arv) + ".") + "</p>");
  } else {
    L.push("<p>No closed comparables were returned" + (compsError ? " (" + esc(compsError) + ")" : "") + ". " + (userArv ? "The ARV used is the " + money(userArv) + " entered with the request." : "") + "</p>");
  }

  // Financing
  L.push("<h2>Financing</h2>");
  L.push("<table><tr><th></th><th class='num'>70% of ARV</th><th class='num'>75% of ARV</th></tr>");
  L.push("<tr><td>ARV</td><td class='num'>" + money(arv) + "</td><td class='num'>" + money(arv) + "</td></tr>");
  L.push("<tr><td>Maximum loan (ARV × advance rate)</td><td class='num'>" + money(t70.full) + "</td><td class='num'>" + money(t75.full) + "</td></tr>");
  L.push("<tr><td>Less repairs</td><td class='num'>" + money(-repairs) + "</td><td class='num'>" + money(-repairs) + "</td></tr>");
  L.push("<tr><td>Supported purchase price</td><td class='num'>" + money(t70.maxPurchase) + "</td><td class='num'>" + money(t75.maxPurchase) + "</td></tr>");
  L.push("<tr><td>Purchase price</td><td class='num'>" + money(purchase) + "</td><td class='num'>" + money(purchase) + "</td></tr>");
  L.push("<tr><td>Loan written" + ((t70.cut || t75.cut) ? " (cut to need, no surplus)" : "") + "</td><td class='num'>" + money(t70.loan) + "</td><td class='num'>" + money(t75.loan) + "</td></tr>");
  L.push("<tr><td><b>Cash due at closing</b> (before closing costs)</td><td class='num'><b>" + money(t70.cash) + "</b></td><td class='num'><b>" + money(t75.cash) + "</b></td></tr></table>");
  L.push("<p style='margin-top:8px'>On top of the down payment and closing costs, most lenders typically want to see liquidity of about " + money(reserves6 + reserveRehab) + ": six months of payments (" + money(reserves6) + ", interest-only at an assumed " + (ASSUMED_RATE * 100) + "% on the 70% loan) plus one-third of the renovation budget (" + money(reserveRehab) + ")." + (liquidity ? " Liquidity stated: " + money(liquidity) + "." : "") + " ACP has over 90 programs to tailor the loan, and cash required may come down once ACP reviews the property.</p>");

  L.push("<p class='foot'>Not an appraisal and not a commitment to lend. Business-purpose financing only. ACP Real Estate Lending · steve@acp-lending.com · 936-522-8951 · acp-lending.com</p>");

  // Exhibit A — map (OpenStreetMap tiles via same-origin proxy)
  if (lat && lon) {
    const z = 16, la = Number(lat), lo = Number(lon);
    const xf = (lo + 180) / 360 * Math.pow(2, z);
    const yf = (1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z);
    const x0 = Math.floor(xf - 1.5), y0 = Math.floor(yf - 1);
    let tiles = "";
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles += "<img src='" + origin + "/analyze-deal/tile/" + z + "/" + (x0 + dx) + "/" + (y0 + dy) + "' style='left:" + dx * 256 + "px;top:" + dy * 256 + "px' alt=''>";
    const px = (xf - x0) * 256, py = (yf - y0) * 256;
    L.push("<div class='ex'><h2>Exhibit A — Location map</h2><div class='map'>" + tiles + "<span class='pin' style='left:" + px.toFixed(0) + "px;top:" + py.toFixed(0) + "px'></span></div><p class='cap'>Subject pinned at " + esc(b.propertyAddress) + ". Map © OpenStreetMap contributors.</p></div>");
  }

  // Exhibit B — property record
  L.push("<div class='ex'><h2>Exhibit B — Property record</h2>");
  if (pl) {
    const kv = [["Owner", own || "—"], ["Occupancy", rec.occupancyType || "—"], ["Months owned", rec.ownershipMonths != null ? rec.ownershipMonths : "—"], ["Last sale", fdate(rec.lastSaleDate)], ["Prior sale", fdate(rec.priorSaleDate)], ["Subdivision", subj.subdivision || "—"], ["Building SF", sqft ? sqft.toLocaleString("en-US") : "—"], ["Beds / baths", (subj.beds != null ? subj.beds : "—") + " / " + (subj.baths != null ? subj.baths : "—")], ["Year built", subj.yearBuilt || "—"], ["Assessed value", money(num(rec.assessedValue) || null)], ["Market value", money(num(rec.marketValue) || null)], ["Tax", rec.taxAmount ? money(rec.taxAmount) + (rec.taxYear ? " (" + rec.taxYear + ")" : "") : "—"], ["Tax delinquent", rec.taxDelinquency ? "Yes" : "No"], ["Flood zone", rec.withinFloodZone ? (rec.floodZoneDescription || "Yes") : "Not in flood zone"], ["AVM (as-is)", money(avm || null)], ["Open loans / liens", (rec.openLoanCount != null ? rec.openLoanCount : "—") + " / " + (rec.lienCount != null ? rec.lienCount : "—")]];
    L.push("<table>");
    for (let i = 0; i < kv.length; i += 2) L.push("<tr><th style='width:20%'>" + esc(kv[i][0]) + "</th><td style='width:30%'>" + esc(kv[i][1]) + "</td>" + (kv[i + 1] ? "<th style='width:20%'>" + esc(kv[i + 1][0]) + "</th><td style='width:30%'>" + esc(kv[i + 1][1]) + "</td>" : "<td></td><td></td>") + "</tr>");
    L.push("</table>");
    if (Array.isArray(rec.transactions) && rec.transactions.length) {
      L.push("<p style='margin-top:8px'><b>Transactions</b></p><table><tr><th>Date</th><th>Buyer</th><th>Seller</th><th>Deed</th></tr>");
      for (const t of rec.transactions) { if (!t || typeof t !== "object") continue; L.push("<tr><td>" + fdate(t.saleDate) + "</td><td>" + esc(t.buyerNames || "—") + "</td><td>" + esc(t.sellerNames || "—") + "</td><td>" + esc(t.documentType || "—") + "</td></tr>"); }
      L.push("</table>");
    }
  } else {
    L.push("<p>No property record was returned for this address.</p>");
  }
  L.push("</div>");

  // Exhibit C — comps
  if (comps.length) {
    const cs = comps.slice().sort((a, c) => num(a.pricePerSqft) - num(c.pricePerSqft));
    L.push("<div class='ex'><h2>Exhibit C — Closed comparables</h2><table><tr><th>#</th><th>Address</th><th class='num'>SF</th><th class='num'>Price</th><th class='num'>$/SF</th><th>Bd/Ba</th><th>Subdivision</th><th>Closed</th></tr>");
    cs.forEach((c, i) => L.push("<tr><td>" + (i + 1) + "</td><td>" + esc(c.address || "—") + "</td><td class='num'>" + (c.sqft ? Number(c.sqft).toLocaleString("en-US") : "—") + "</td><td class='num'>" + money(num(c.salePrice) || null) + "</td><td class='num'>" + psf(num(c.pricePerSqft)) + "</td><td>" + esc(c.beds != null ? c.beds : "—") + "/" + esc(c.baths != null ? c.baths : "—") + "</td><td>" + esc(c.subdivision || "—") + "</td><td>" + fdate(c.saleDatetime) + "</td></tr>"));
    L.push("</table><p class='cap' style='margin-top:4px'>Count " + comps.length + " · average " + psf(st.avgPricePerSqft) + "/SF · median " + psf(medPsf) + "/SF.</p></div>");
  }

  L.push("</div></body></html>");
  return new Response(L.join(""), { headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
