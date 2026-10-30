// ACP Deals — private deal database at acp-lending.com/deals
// Added 30 Oct 2026. New file only; no v61 base file is changed.
//   /deals          -> page (login screen until signed in; same password as /prospects)
//   /deals/app.js   -> page script (behind the same gate)
//   /deals/api/...  -> JSON (login, logout, list)
// Reads D1 tables rfi_submissions and preapproval_submissions (env.DB via wrangler.toml).

const PASS_HASH = "b029eed3f2094d8bdc6d1ae9b9c6fa2d4a840084fdcc649533c9bc5a34882bc3"; // same as /prospects
const COOKIE = "acp_dl";

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function getCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}
async function authed(req) {
  const t = getCookie(req, COOKIE);
  if (!t || t.length !== 64) return false;
  return (await sha256(t)) === PASS_HASH;
}
const SEC = {
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...SEC, ...extra } });
}

export async function onRequest(context) {
  const { request: req, env, params } = context;
  const path = (params.path || []).join("/");

  if (path === "" || path === "index.html") {
    return new Response(await authed(req) ? pageHtml() : loginHtml(), { headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } });
  }
  if (path === "login.js") return new Response(LOGIN_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...SEC } });
  if (path === "api/login" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch (e) {}
    const tok = await sha256("acp-prospects:" + String(b.password || ""));
    if ((await sha256(tok)) !== PASS_HASH) return json({ ok: false, error: "Wrong password" }, 401);
    return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=${tok}; Path=/deals; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 60}` });
  }
  if (path === "api/logout") return json({ ok: true }, 200, { "Set-Cookie": `${COOKIE}=; Path=/deals; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });

  if (!(await authed(req))) return json({ ok: false, error: "Sign in" }, 401);

  if (path === "app.js") return new Response(APP_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...SEC } });
  if (path === "api/list") {
    const rfi = await env.DB.prepare(
      `SELECT 'Request for Information' AS source, id, created_at, client_full_name AS borrower, client_email AS email, client_phone AS phone,
        legal_entity_name AS entity, property_address AS property, property_type, products_of_interest AS product,
        currently_own_property AS owned, financing_amount AS financing, purchase_price AS purchase, estimated_repairs AS repairs,
        estimated_arv AS arv, estimated_credit_score AS credit, estimated_liquidity AS liquidity, target_closing_date AS closing,
        exit_strategy AS exit_strategy, project_summary AS summary, signature_name AS signature
       FROM rfi_submissions ORDER BY id`).all();
    const pre = await env.DB.prepare(
      `SELECT 'Pre-Approval' AS source, id, created_at, borrower_full_name AS borrower, borrower_email AS email, borrower_phone AS phone,
        letter_entity AS entity, property_address AS property, '' AS property_type, financing_program AS product,
        '' AS owned, letter_amount AS financing, purchase_price AS purchase, rehab_budget AS repairs,
        estimated_arv AS arv, credit_score_range AS credit, liquidity, closing_timeframe AS closing,
        '' AS exit_strategy, additional_notes AS summary, '' AS signature
       FROM preapproval_submissions ORDER BY id`).all();
    return json({ ok: true, rows: [...(rfi.results || []), ...(pre.results || [])] });
  }
  return json({ ok: false, error: "Not found" }, 404);
}

const HEAD = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>ACP Deals | ACP Lending</title>
<link rel="stylesheet" href="/css/style.css?v=34"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
.dl-wrap{max-width:1400px;margin:0 auto;padding:24px 16px 60px}
.dl-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:14px}
.dl-bar input,.dl-bar select{padding:8px 10px;border:1px solid #c9ced6;border-radius:6px;font:inherit}
.dl-bar input{flex:1;min-width:200px}
.dl-btn{background:#10233d;color:#fff;border:0;border-radius:6px;padding:8px 14px;font:inherit;cursor:pointer}
.dl-btn.alt{background:#fff;color:#10233d;border:1px solid #c9ced6}
.dl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:0 0 14px}
.dl-stat{border:1px solid #dde1e7;border-radius:8px;padding:10px 12px;background:#fff}
.dl-stat b{display:block;font-size:20px;color:#10233d}.dl-stat span{font-size:12px;color:#5a6472}
.dl-scroll{overflow:auto;max-height:calc(100vh - 120px);border:1px solid #dde1e7;border-radius:8px;background:#fff}
table.dl{border-collapse:collapse;width:100%;font-size:13px}
table.dl th,table.dl td{padding:7px 9px;border-bottom:1px solid #eef0f3;text-align:left;vertical-align:top;white-space:nowrap}
table.dl th{background:#10233d;color:#fff;position:sticky;top:0;z-index:2;cursor:pointer;user-select:none}
table.dl td.n,table.dl th.n{text-align:right}
table.dl td.wrap{white-space:normal;min-width:220px}
table.dl tr.row:hover{background:#f7f8fa;cursor:pointer}
table.dl tfoot td{position:sticky;bottom:0;z-index:2;font-weight:700;background:#f4f3ef;border-top:2px solid #10233d}
.pend{color:#b45309}
tr.detail td{white-space:normal;background:#fafbfc;font-size:13px}
.dl-login{max-width:360px;margin:60px auto;padding:24px;border:1px solid #dde1e7;border-radius:8px}
.dl-login input{width:100%;box-sizing:border-box;padding:9px;margin:8px 0 12px;border:1px solid #c9ced6;border-radius:6px}
</style></head><body>`;
const HEADER = `<header class="site-header"><div class="header-inner"><a class="brand" href="/">ACP Lending</a></div></header>`;
const FOOTER = `<footer class="site-footer"><div class="footer-inner"><p class="footer-contact">ACP Lending | Steve Waller | 936-522-8951 | steve@acp-lending.com</p><p class="footer-disclaimer">Private deal database. Not for distribution.</p></div></footer>`;

function loginHtml() {
  return HEAD + HEADER + `<main><div class="dl-login"><h1 style="font-size:22px;margin:0 0 6px">ACP Deals</h1>
<form id="lf"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required>
<button class="dl-btn" type="submit">Sign in</button><p id="le" style="color:#8a1c1c"></p></form></div></main>` + FOOTER +
  `<script src="/deals/login.js"></script></body></html>`;
}
function pageHtml() {
  return HEAD + HEADER + `<main class="dl-wrap">
<div class="dl-bar"><h1 style="font-size:24px;margin:0 12px 0 0">Deals</h1>
<input type="search" id="q" placeholder="Search borrower, property, entity, product">
<select id="fsrc"><option value="">All sources</option><option>Request for Information</option><option>Pre-Approval</option></select>
<select id="fprod"><option value="">All products</option></select>
<button class="dl-btn alt" id="csvBtn">Export CSV</button>
<button class="dl-btn alt" id="outBtn">Sign out</button></div>
<div class="dl-stats" id="stats"></div>
<div class="dl-scroll"><table class="dl" id="tbl"><thead></thead><tbody><tr><td>Loading…</td></tr></tbody><tfoot></tfoot></table></div>
</main>` + FOOTER + `<script src="/deals/app.js"></script></body></html>`;
}

const LOGIN_JS = `document.getElementById('lf').addEventListener('submit',async function(e){e.preventDefault();
var r=await fetch('/deals/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
if(r.ok)location.reload();else document.getElementById('le').textContent='Wrong password';});`;

const APP_JS = String.raw`(function(){
var rows=[],sortKey='date',sortDir=-1,openId=null;
var $=function(id){return document.getElementById(id)};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function num(v){if(v==null)return null;var s=String(v).replace(/[$,\s]/g,'');if(!/^-?\d+(\.\d+)?$/.test(s))return null;return Number(s)}
function money(n){return n==null?'':'$'+Math.round(n).toLocaleString()}
function cell(v){var s=v==null?'':String(v).trim();if(!s||/^pending$/i.test(s))return '<span class="pend">Pending</span>';return esc(s)}
function mcell(v){var n=num(v);return n==null?'<span class="pend">Pending</span>':money(n)}
var COLS=[
 {k:'date',t:'Date'},{k:'source',t:'Source'},{k:'borrower',t:'Borrower'},{k:'entity',t:'Entity'},
 {k:'property',t:'Property',wrap:1},{k:'product',t:'Product'},{k:'credit',t:'Credit'},
 {k:'financing',t:'Financing',m:1},{k:'purchase',t:'Purchase',m:1},{k:'repairs',t:'Repairs',m:1},{k:'arv',t:'ARV',m:1},{k:'liquidity',t:'Liquidity',m:1}
];
function prep(r){r.date=(r.created_at||'').slice(0,10);r.key=r.source+'-'+r.id;return r}
function filtered(){
 var q=($('q').value||'').toLowerCase(),s=$('fsrc').value,p=$('fprod').value;
 return rows.filter(function(r){
  if(s&&r.source!==s)return false;
  if(p&&String(r.product||'').indexOf(p)<0)return false;
  if(!q)return true;
  return [r.borrower,r.entity,r.property,r.product,r.email,r.summary].join(' ').toLowerCase().indexOf(q)>=0;
 }).sort(function(a,b){
  var c=COLS.filter(function(x){return x.k===sortKey})[0]||{};
  var x=c.m?num(a[sortKey]):String(a[sortKey]||'').toLowerCase(),y=c.m?num(b[sortKey]):String(b[sortKey]||'').toLowerCase();
  if(x==null)x=-1;if(y==null)y=-1;return x<y?-sortDir:x>y?sortDir:0;
 });
}
function render(){
 var list=filtered();
 $('tbl').querySelector('thead').innerHTML='<tr>'+COLS.map(function(c){return '<th data-k="'+c.k+'" class="'+(c.m?'n':'')+'">'+c.t+(sortKey===c.k?(sortDir>0?' ▲':' ▼'):'')+'</th>'}).join('')+'</tr>';
 var body='';
 list.forEach(function(r){
  body+='<tr class="row" data-key="'+esc(r.key)+'">'+COLS.map(function(c){
   var v=c.m?mcell(r[c.k]):cell(r[c.k]);if(c.k==='date'||c.k==='source')v=esc(r[c.k]);
   return '<td class="'+(c.m?'n':'')+(c.wrap?' wrap':'')+'">'+v+'</td>'}).join('')+'</tr>';
  if(openId===r.key){
   body+='<tr class="detail"><td colspan="'+COLS.length+'"><b>'+esc(r.source)+' #'+esc(r.id)+'</b> · '+cell(r.email)+' · '+cell(r.phone)+
    '<br>Type: '+cell(r.property_type)+' · Owned: '+cell(r.owned)+' · Exit: '+cell(r.exit_strategy)+' · Closing: '+cell(r.closing)+
    (r.signature?' · Signed: '+esc(r.signature):'')+'<br>'+cell(r.summary)+'</td></tr>';
  }
 });
 $('tbl').querySelector('tbody').innerHTML=body||'<tr><td colspan="'+COLS.length+'">No deals match.</td></tr>';
 var tot={},cnt={};COLS.forEach(function(c){if(c.m){tot[c.k]=0;cnt[c.k]=0}});
 list.forEach(function(r){COLS.forEach(function(c){if(c.m){var n=num(r[c.k]);if(n!=null){tot[c.k]+=n;cnt[c.k]++}}})});
 $('tbl').querySelector('tfoot').innerHTML='<tr>'+COLS.map(function(c,i){
  if(i===0)return '<td>Totals ('+list.length+')</td>';
  if(!c.m)return '<td></td>';
  return '<td class="n">'+money(tot[c.k])+'<br><span style="font-weight:400;font-size:11px">'+cnt[c.k]+' of '+list.length+' with figures</span></td>'}).join('')+'</tr>';
 var borrowers={};list.forEach(function(r){if(r.borrower&&!/^pending$/i.test(r.borrower))borrowers[r.borrower.toLowerCase()]=1});
 $('stats').innerHTML=
  '<div class="dl-stat"><b>'+list.length+'</b><span>Deals</span></div>'+
  '<div class="dl-stat"><b>'+Object.keys(borrowers).length+'</b><span>Borrowers</span></div>'+
  '<div class="dl-stat"><b>'+money(tot.financing)+'</b><span>Total financing requested ('+cnt.financing+' deals)</span></div>'+
  '<div class="dl-stat"><b>'+money(tot.purchase)+'</b><span>Total purchase price ('+cnt.purchase+' deals)</span></div>'+
  '<div class="dl-stat"><b>'+money(tot.arv)+'</b><span>Total ARV / value ('+cnt.arv+' deals)</span></div>';
}
function csv(){
 var keys=['source','id','date','borrower','email','phone','entity','property','property_type','product','owned','credit','liquidity','financing','purchase','repairs','arv','closing','exit_strategy','summary'];
 var lines=[keys.join(',')].concat(filtered().map(function(r){return keys.map(function(k){return '"'+String(r[k]==null?'':r[k]).replace(/"/g,'""')+'"'}).join(',')}));
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download='ACP_Deals.csv';a.click();
}
fetch('/deals/api/list').then(function(r){return r.json()}).then(function(d){
 rows=(d.rows||[]).map(prep);
 var prods={};rows.forEach(function(r){String(r.product||'').split(',').forEach(function(p){p=p.trim();if(p&&!/^pending$/i.test(p))prods[p]=1})});
 $('fprod').innerHTML='<option value="">All products</option>'+Object.keys(prods).sort().map(function(p){return '<option>'+esc(p)+'</option>'}).join('');
 render();
});
['q','fsrc','fprod'].forEach(function(id){$(id).addEventListener('input',render)});
$('tbl').addEventListener('click',function(e){
 var th=e.target.closest('th');if(th){var k=th.getAttribute('data-k');if(sortKey===k)sortDir=-sortDir;else{sortKey=k;sortDir=1}render();return}
 var tr=e.target.closest('tr.row');if(tr){var k2=tr.getAttribute('data-key');openId=openId===k2?null:k2;render()}
});
$('csvBtn').addEventListener('click',csv);
$('outBtn').addEventListener('click',function(){fetch('/deals/api/logout').then(function(){location.reload()})});
})();`;
