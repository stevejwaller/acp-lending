// ACP Prospects — private prospecting report at acp-lending.com/prospects
// Added 30 Oct 2026. New file only; no v61 base file is changed.
//   /prospects            -> page (login screen until signed in)
//   /prospects/app.js     -> page script (served here so it sits behind the same gate)
//   /prospects/api/...    -> JSON API (list, add, update, remove, import, PropertyReach contact lookup)
// Bindings: env.DB (D1 acp-lending-forms, via wrangler.toml), env.PROPERTYREACH_API_KEY (Pages secret).

const PASS_HASH = "b029eed3f2094d8bdc6d1ae9b9c6fa2d4a840084fdcc649533c9bc5a34882bc3"; // sha256(sha256("acp-prospects:"+password))
const COOKIE = "acp_px";
const STATUSES = ["New", "Texted", "Emailed", "Talking", "Quoted", "Not now", "Not interested", "Do not contact"];

const SCHEMA = `CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY, entity TEXT, person TEXT, phone TEXT, alt TEXT, email TEXT, website TEXT,
  src TEXT, mail TEXT, sheet_notes TEXT, win TEXT, soon TEXT, total REAL, loans_json TEXT,
  status TEXT DEFAULT 'New', outcome TEXT, next_touch TEXT, my_notes TEXT,
  texted TEXT, emailed TEXT, called TEXT,
  contacts_json TEXT, traced_at TEXT, credits_used REAL DEFAULT 0,
  created_at TEXT, updated_at TEXT)`;

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
  const t = getCookie(req, COOKIE) || req.headers.get("X-ACP-Token") || "";
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
function cors(req) {
  // Allows the one-time import from the local dial sheet file (Origin: null) using the token header.
  const o = req.headers.get("Origin");
  return o === "null" ? { "Access-Control-Allow-Origin": "null", "Access-Control-Allow-Headers": "Content-Type, X-ACP-Token", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" } : {};
}
function json(req, data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...SEC, ...cors(req), ...extra } });
}

export async function onRequest(context) {
  const { request: req, env, params } = context;
  const path = (params.path || []).join("/");

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...SEC, ...cors(req) } });

  if (path === "" || path === "index.html") {
    return new Response(await authed(req) ? pageHtml() : loginHtml(), { headers: { "Content-Type": "text/html; charset=utf-8", ...SEC } });
  }
  if (path === "login.js") {
    return new Response(LOGIN_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...SEC } });
  }
  if (path === "app.js") {
    if (!(await authed(req))) return new Response("// sign in", { status: 401, headers: { "Content-Type": "text/javascript", ...SEC } });
    return new Response(APP_JS, { headers: { "Content-Type": "text/javascript; charset=utf-8", ...SEC } });
  }
  if (path === "api/login" && req.method === "POST") {
    let b = {}; try { b = await req.json(); } catch (e) {}
    const tok = await sha256("acp-prospects:" + String(b.password || ""));
    if ((await sha256(tok)) !== PASS_HASH) return json(req, { ok: false, error: "Wrong password" }, 401);
    return json(req, { ok: true }, 200, { "Set-Cookie": `${COOKIE}=${tok}; Path=/prospects; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 60}` });
  }
  if (path === "api/logout") {
    return json(req, { ok: true }, 200, { "Set-Cookie": `${COOKIE}=; Path=/prospects; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }
  if (!path.startsWith("api/")) return new Response("Not found", { status: 404, headers: SEC });
  if (!(await authed(req))) return json(req, { ok: false, error: "Not signed in" }, 401);
  if (!env.DB) return json(req, { ok: false, error: "Database not connected" }, 500);
  await env.DB.prepare(SCHEMA).run();

  try {
    switch (path) {
      case "api/status": {
        const c = await env.DB.prepare("SELECT COUNT(*) n, SUM(CASE WHEN traced_at IS NOT NULL THEN 1 ELSE 0 END) traced, SUM(credits_used) credits FROM prospects").first();
        return json(req, { ok: true, lookupReady: !!env.PROPERTYREACH_API_KEY, count: c.n, traced: c.traced || 0, credits: c.credits || 0, statuses: STATUSES });
      }
      case "api/list": {
        const r = await env.DB.prepare("SELECT * FROM prospects ORDER BY CASE WHEN soon IS NULL OR soon='' THEN 1 ELSE 0 END, soon, total DESC").all();
        return json(req, { ok: true, rows: r.results });
      }
      case "api/import": return json(req, await importRows(env, await req.json()));
      case "api/add": return json(req, await addRow(env, await req.json()));
      case "api/update": return json(req, await updateRow(env, await req.json()));
      case "api/remove": {
        const b = await req.json();
        await env.DB.prepare("DELETE FROM prospects WHERE id=?").bind(String(b.id)).run();
        return json(req, { ok: true });
      }
      case "api/lookup": return json(req, await lookup(env, await req.json()));
    }
  } catch (e) {
    return json(req, { ok: false, error: e.message }, 500);
  }
  return json(req, { ok: false, error: "Unknown action" }, 404);
}

const now = () => new Date().toISOString();
const s = v => (v === undefined || v === null) ? "" : String(v);

async function importRows(env, body) {
  const rows = Array.isArray(body) ? body : (body.rows || []);
  if (!rows.length) return { ok: false, error: "No rows" };
  const stmt = env.DB.prepare(`INSERT INTO prospects (id, entity, person, phone, alt, email, website, src, mail, sheet_notes, win, soon, total, loans_json,
      status, outcome, next_touch, my_notes, texted, emailed, called, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?22)
    ON CONFLICT(id) DO UPDATE SET entity=excluded.entity, person=excluded.person, alt=excluded.alt, website=excluded.website,
      src=excluded.src, mail=excluded.mail, sheet_notes=excluded.sheet_notes, win=excluded.win, soon=excluded.soon,
      total=excluded.total, loans_json=excluded.loans_json,
      phone=COALESCE(NULLIF(prospects.phone,''), excluded.phone), email=COALESCE(NULLIF(prospects.email,''), excluded.email),
      outcome=COALESCE(NULLIF(prospects.outcome,''), excluded.outcome), next_touch=COALESCE(NULLIF(prospects.next_touch,''), excluded.next_touch),
      my_notes=COALESCE(NULLIF(prospects.my_notes,''), excluded.my_notes), texted=COALESCE(NULLIF(prospects.texted,''), excluded.texted),
      emailed=COALESCE(NULLIF(prospects.emailed,''), excluded.emailed), called=COALESCE(NULLIF(prospects.called,''), excluded.called),
      updated_at=excluded.updated_at`);
  const t = now();
  const batch = rows.map(r => {
    const st = r.st || {};
    let status = "New";
    if (st.outcome && /not interested/i.test(st.outcome)) status = "Not interested";
    else if (st.emailed) status = "Emailed";
    else if (st.texted) status = "Texted";
    const myNotes = [s(st.notes), (st.q || []).filter(Boolean).join(" | ")].filter(Boolean).join("\n");
    return stmt.bind(s(r.id), s(r.entity), s(r.person), s(r.phone), s(r.alt), s(r.email), s(r.website), s(r.src), s(r.mail),
      s(r.notes), s(r.window), s(r.soon), Number(r.total) || 0, JSON.stringify(r.loans || []),
      status, s(st.outcome), s(st.next), myNotes, s(st.texted), s(st.emailed), s(st.called), t);
  });
  for (let i = 0; i < batch.length; i += 50) await env.DB.batch(batch.slice(i, i + 50));
  return { ok: true, imported: rows.length };
}

async function addRow(env, b) {
  const id = "m-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const loans = b.address ? [{ addr: s(b.address), mat: s(b.maturity), amt: Number(b.amount) || 0, lender: s(b.lender) }] : [];
  const t = now();
  await env.DB.prepare(`INSERT INTO prospects (id, entity, person, phone, email, src, my_notes, soon, total, loans_json, status, created_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,'New',?11,?11)`)
    .bind(id, s(b.entity), s(b.person), s(b.phone), s(b.email), s(b.src) || "Manual", s(b.notes), s(b.maturity), Number(b.amount) || 0, JSON.stringify(loans), t).run();
  return { ok: true, id };
}

const EDITABLE = ["status", "outcome", "next_touch", "my_notes", "phone", "alt", "email", "person", "entity", "texted", "emailed", "called"];
async function updateRow(env, b) {
  const sets = [], vals = [];
  for (const k of EDITABLE) if (k in (b.fields || {})) { sets.push(k + "=?"); vals.push(s(b.fields[k])); }
  if (!sets.length) return { ok: false, error: "Nothing to update" };
  sets.push("updated_at=?"); vals.push(now()); vals.push(s(b.id));
  await env.DB.prepare(`UPDATE prospects SET ${sets.join(", ")} WHERE id=?`).bind(...vals).run();
  return { ok: true };
}

// ---------- PropertyReach skip trace (2 credits per address) ----------
function splitAddr(a) {
  const parts = s(a).split(",").map(x => x.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const last = parts[parts.length - 1].split(/\s+/);
  const state = last[0], zip = last[1] || "";
  const city = parts[parts.length - 2];
  const street = parts.slice(0, parts.length - 2).join(" ");
  return { streetAddress: street, city, state, zip };
}
function pick(o, keys) { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]; }
function normPhone(p) {
  if (typeof p === "string" || typeof p === "number") return { number: String(p) };
  const n = pick(p, ["phone", "number", "phoneNumber", "phone_number", "value"]);
  const type = pick(p, ["type", "phoneType", "lineType", "line_type", "carrierType"]);
  const dnc = pick(p, ["dnc", "doNotCall", "isDnc", "do_not_call", "dncFlag"]);
  return { number: s(n), type: s(type), dnc: dnc === true || dnc === "true" || dnc === "Y" || dnc === 1 };
}
function normEmail(e) { return typeof e === "string" ? e : s(pick(e, ["email", "address", "value", "emailAddress"])); }

async function lookup(env, b) {
  if (!env.PROPERTYREACH_API_KEY) return { ok: false, error: "PropertyReach key not added to the site yet" };
  const row = await env.DB.prepare("SELECT * FROM prospects WHERE id=?").bind(s(b.id)).first();
  if (!row) return { ok: false, error: "Prospect not found" };
  let loans = []; try { loans = JSON.parse(row.loans_json || "[]"); } catch (e) {}
  const addrs = b.address ? [b.address] : (b.all ? loans.map(l => l.addr) : [loans[0] && loans[0].addr]).filter(Boolean);
  if (!addrs.length) return { ok: false, error: "No property address on file for this prospect" };
  let prior = []; try { prior = JSON.parse(row.contacts_json || "[]"); } catch (e) {}
  let credits = 0;
  const found = [];
  for (const addr of addrs) {
    const target = splitAddr(addr);
    if (!target) { found.push({ addr, error: "Could not read address" }); continue; }
    let res, txt = "";
    try {
      res = await fetch("https://api.propertyreach.com/v1/skip-trace", {
        method: "POST", headers: { "x-api-key": env.PROPERTYREACH_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      txt = await res.text();
    } catch (e) { found.push({ addr, error: "PropertyReach unreachable: " + e.message }); continue; }
    let data = {}; try { data = JSON.parse(txt); } catch (e) {}
    if (!res.ok || (data.meta && data.meta.status && data.meta.status !== 200)) {
      found.push({ addr, error: "PropertyReach " + res.status + ": " + s((data.meta && data.meta.message) || txt).slice(0, 160) });
      continue;
    }
    credits += Number(data.meta && data.meta.credits) || 2;
    const persons = (data.persons || []).map(p => ({
      name: [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" "),
      phones: (p.phones || []).map(normPhone).filter(x => x.number),
      emails: (p.emails || []).map(normEmail).filter(Boolean),
    }));
    found.push({ addr, persons, at: now() });
  }
  const merged = prior.filter(p => !found.some(f => f.addr === p.addr)).concat(found);
  const anyOk = found.some(f => !f.error);
  await env.DB.prepare("UPDATE prospects SET contacts_json=?, traced_at=CASE WHEN ? THEN ? ELSE traced_at END, credits_used=COALESCE(credits_used,0)+?, updated_at=? WHERE id=?")
    .bind(JSON.stringify(merged), anyOk ? 1 : 0, now(), credits, now(), row.id).run();
  if (!anyOk) return { ok: false, error: found.map(f => f.error).join("; "), contacts: merged };
  return { ok: true, contacts: merged, credits };
}

// ---------- Page ----------
const HEAD = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>ACP Prospects</title>
<link rel="stylesheet" href="/css/style.css?v=34"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
.px-wrap{max-width:1180px;margin:0 auto;padding:20px 16px 48px}
.px-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 14px}
.px-bar input,.px-bar select{padding:8px 10px;border:1px solid #c9ced6;border-radius:6px;font:inherit}
.px-bar input[type=search]{flex:1 1 220px}
.px-btn{background:#1b2a41;color:#fff;border:0;border-radius:6px;padding:8px 12px;font:inherit;cursor:pointer}
.px-btn.alt{background:#fff;color:#1b2a41;border:1px solid #1b2a41}.px-btn.gold{background:#c9974a}
.px-btn:disabled{opacity:.5;cursor:default}
.px-reach{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}.px-reach a.px-btn{text-decoration:none;display:inline-block}
.px-stats{display:flex;flex-wrap:wrap;gap:16px;font-size:14px;color:#4a5568;margin:0 0 12px}
.px-stats b{color:#1b2a41}
.px-note{background:#fff6e6;border:1px solid #e8c98f;border-radius:6px;padding:10px 12px;margin:0 0 12px;font-size:14px}
.px-card{border:1px solid #dde1e7;border-radius:8px;margin:0 0 10px;background:#fff}
.px-head{display:grid;grid-template-columns:1.6fr 1fr .8fr .9fr;gap:10px;padding:12px 14px;cursor:pointer;align-items:center}
.px-head:hover{background:#f7f8fa}
.px-name{font-weight:600;color:#1b2a41}.px-sub{font-size:13px;color:#5a6472}
.px-pill{display:inline-block;font-size:12px;padding:2px 8px;border-radius:10px;background:#eef1f5;color:#1b2a41;margin:2px 4px 0 0}
.px-pill.hot{background:#fde8d4}.px-pill.dnc{background:#fbd5d5;color:#8a1c1c}.px-pill.ok{background:#dff3e4;color:#1d5b2c}
.px-body{display:none;border-top:1px solid #eef0f3;padding:14px}
.px-card.open .px-body{display:block}
.px-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.px-grid label{font-size:12px;color:#5a6472;display:block}
.px-grid input,.px-grid select,.px-grid textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid #c9ced6;border-radius:6px;font:inherit}
.px-grid textarea{min-height:70px}
.px-loans{font-size:13px;margin:10px 0}.px-loans div{padding:3px 0}
.px-contacts{margin:12px 0;font-size:14px}.px-person{padding:8px 10px;background:#f7f8fa;border-radius:6px;margin:6px 0}
.px-person a{color:#1b2a41}.px-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.px-mini{font-size:12px;padding:3px 8px}
.px-add{display:none;border:1px solid #dde1e7;border-radius:8px;padding:14px;margin:0 0 14px;background:#fafbfc}
.px-login{max-width:360px;margin:60px auto;padding:24px;border:1px solid #dde1e7;border-radius:8px}
.px-login input{width:100%;box-sizing:border-box;padding:9px;margin:8px 0 12px;border:1px solid #c9ced6;border-radius:6px}
@media (max-width:700px){.px-head{grid-template-columns:1fr 1fr}}
</style></head><body>`;

const HEADER = `<header class="site-header"><div class="header-inner"><a class="brand" href="/">ACP Lending</a></div></header>`;
const FOOTER = `<footer class="site-footer"><div class="footer-inner"><p class="footer-contact">ACP Lending | Steve Waller | 936-522-8951 | steve@acp-lending.com</p><p class="footer-disclaimer">Private prospecting workspace. Not for distribution.</p></div></footer>`;

function loginHtml() {
  return HEAD + HEADER + `<main><div class="px-login"><h1 style="font-size:22px;margin:0 0 6px">ACP Prospects</h1>
<form method="post" action="/prospects" id="lf"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required>
<button class="px-btn" type="submit">Sign in</button><p id="le" style="color:#8a1c1c"></p></form></div></main>` + FOOTER +
  `<script src="/prospects/login.js"></script></body></html>`;
}
function pageHtml() {
  return HEAD + HEADER + `<main class="px-wrap">
<div class="px-bar"><h1 style="font-size:24px;margin:0 12px 0 0">Prospects</h1>
<input type="search" id="q" placeholder="Search name, entity, address, notes">
<select id="fs"><option value="">All statuses</option></select>
<select id="fc"><option value="">Any contact</option><option value="nophone">No phone</option><option value="untraced">Not looked up</option><option value="due">Next touch due</option></select>
<button class="px-btn alt" id="addBtn">+ Add prospect</button>
<button class="px-btn gold" id="bulkBtn">Find contacts for all not looked up</button>
<button class="px-btn alt" id="csvBtn">Export CSV</button>
<button class="px-btn alt" id="outBtn">Sign out</button></div>
<div id="note"></div>
<div class="px-add" id="addForm"><div class="px-grid">
<div><label>Name</label><input id="a_person"></div><div><label>Entity</label><input id="a_entity"></div>
<div><label>Phone</label><input id="a_phone"></div><div><label>Email</label><input id="a_email"></div>
<div><label>Property address (street, city, ST zip)</label><input id="a_address"></div><div><label>Maturity date</label><input id="a_maturity" type="date"></div>
<div><label>Loan amount</label><input id="a_amount" inputmode="numeric"></div><div><label>Source</label><input id="a_src" placeholder="Manual"></div>
<div style="grid-column:1/-1"><label>Notes</label><textarea id="a_notes"></textarea></div></div>
<div class="px-actions"><button class="px-btn" id="addSave">Save prospect</button><button class="px-btn alt" id="addCancel">Cancel</button></div></div>
<div class="px-stats" id="stats"></div>
<div id="list"><p>Loading…</p></div>
</main>` + FOOTER + `<script src="/prospects/app.js"></script></body></html>`;
}

const LOGIN_JS = `document.getElementById('lf').addEventListener('submit',async function(e){e.preventDefault();
var r=await fetch('/prospects/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});
if(r.ok)location.reload();else document.getElementById('le').textContent='Wrong password';});`;

const APP_JS = String.raw`(function(){
var rows=[],statuses=[],lookupReady=false,open={};
var $=function(id){return document.getElementById(id)};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(n){n=Number(n)||0;return n?'$'+n.toLocaleString():''}
function api(p,b){return fetch('/prospects/api/'+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(function(r){return r.json()})}
function loans(r){try{return JSON.parse(r.loans_json||'[]')}catch(e){return[]}}
function contacts(r){try{return JSON.parse(r.contacts_json||'[]')}catch(e){return[]}}
function digits(p){return String(p||'').replace(/\D/g,'').slice(-10)}
function today(){return new Date().toISOString().slice(0,10)}

function load(){return Promise.all([api('status'),api('list')]).then(function(x){
  var st=x[0],li=x[1];if(!st.ok){$('list').innerHTML='<p>'+esc(st.error)+'</p>';return}
  statuses=st.statuses;lookupReady=st.lookupReady;rows=li.rows||[];
  var fs=$('fs');if(fs.options.length<2)statuses.forEach(function(s){var o=document.createElement('option');o.value=s;o.textContent=s;fs.appendChild(o)});
  $('note').innerHTML=lookupReady?'':'<div class="px-note">Contact lookups are switched off until the PropertyReach key is added to the site. Everything else works.</div>';
  $('bulkBtn').disabled=!lookupReady;
  stats(st);render();})}

function stats(st){var nophone=rows.filter(function(r){return !digits(r.phone)}).length;
  var due=rows.filter(function(r){return r.next_touch&&r.next_touch<=today()}).length;
  $('stats').innerHTML='<span><b>'+rows.length+'</b> prospects</span><span><b>'+nophone+'</b> without a phone</span><span><b>'+(st.traced||0)+'</b> looked up</span><span><b>'+due+'</b> next touch due</span><span><b>'+(st.credits||0)+'</b> PropertyReach credits used</span>'}

function match(r){var q=$('q').value.toLowerCase().trim(),fs=$('fs').value,fc=$('fc').value;
  if(fs&&r.status!==fs)return false;
  if(fc==='nophone'&&digits(r.phone))return false;
  if(fc==='untraced'&&r.traced_at)return false;
  if(fc==='due'&&!(r.next_touch&&r.next_touch<=today()))return false;
  if(!q)return true;
  return [r.person,r.entity,r.phone,r.email,r.sheet_notes,r.my_notes,r.loans_json,r.contacts_json].join(' ').toLowerCase().indexOf(q)>=0}

function render(){var list=rows.filter(match);
  if(!list.length){$('list').innerHTML='<p>No prospects match.</p>';return}
  $('list').innerHTML=list.map(card).join('')}

function first(r){var n=String(r.person||'').trim().split(/\s+/)[0]||'';return n?n.charAt(0).toUpperCase()+n.slice(1).toLowerCase():'there'}
function smsBody(r){return 'Hi '+first(r)+', this is Steve Waller with ACP Lending in Houston. I work with investors on financing for their rental, flip and commercial properties. Would you have 10 minutes for a quick call this week or next? Reply STOP to opt out.'}
function mailLink(r){var sub='ACP Lending - '+(r.entity||r.person||'financing');
  var body='Hi '+first(r)+',\n\n\n\nBest,\nSteve Waller\nACP Lending\n936-522-8951\nacp-lending.com';
  return 'https://mail.google.com/mail/?authuser=steve@acp-lending.com&view=cm&fs=1&to='+encodeURIComponent(r.email)+'&su='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body)}
function reach(r,dnc){var d=digits(r.phone),h='';if(dnc)return '';
  if(d.length===10){h+='<a class="px-btn px-mini" data-act="log" data-k="called" href="tel:+1'+d+'">Call</a>';
    h+='<a class="px-btn px-mini" data-act="log" data-k="texted" href="sms:+1'+d+'&body='+encodeURIComponent(smsBody(r))+'">Text</a>'}
  if(r.email)h+='<a class="px-btn px-mini" data-act="log" data-k="emailed" target="_blank" rel="noopener" href="'+esc(mailLink(r))+'">Email</a>';
  return h}
function card(r){var L=loans(r),C=contacts(r),dnc=r.status==='Do not contact';
  var pills='<span class="px-pill'+(dnc?' dnc':'')+'">'+esc(r.status||'New')+'</span>'+(r.win?'<span class="px-pill hot">'+esc(r.win)+'</span>':'')+(r.traced_at?'<span class="px-pill ok">Looked up</span>':'');
  var h='<div class="px-card'+(open[r.id]?' open':'')+'" data-id="'+esc(r.id)+'"><div class="px-head" data-act="toggle">'+
   '<div><div class="px-name">'+esc(r.person||r.entity||(L[0]&&L[0].addr)||'Unnamed')+'</div><div class="px-sub">'+esc(r.person?r.entity:'')+'</div></div>'+
   '<div class="px-sub">'+esc(r.phone||'no phone')+'<br>'+esc(r.email||'')+'</div>'+
   '<div class="px-sub">'+(r.soon?'Matures '+esc(r.soon):'')+'<br>'+money(r.total)+'</div><div>'+pills+'<div class="px-reach">'+reach(r,dnc)+'</div></div></div><div class="px-body">';
  h+='<div class="px-loans">'+L.map(function(l){return '<div>'+esc(l.addr)+(l.mat?' · matures '+esc(l.mat):'')+(l.amt?' · '+money(l.amt):'')+(l.lender?' · '+esc(l.lender):'')+'</div>'}).join('')+'</div>';
  if(r.sheet_notes)h+='<p class="px-sub">'+esc(r.sheet_notes)+'</p>';
  h+='<div class="px-contacts">'+(C.length?C.map(function(c){
     if(c.error)return '<div class="px-sub">'+esc(c.addr)+': '+esc(c.error)+'</div>';
     if(!c.persons||!c.persons.length)return '<div class="px-sub">'+esc(c.addr)+': no contacts found</div>';
     return '<div class="px-sub">Found for '+esc(c.addr)+'</div>'+c.persons.map(function(p){
       return '<div class="px-person"><b>'+esc(p.name)+'</b><br>'+p.phones.map(function(ph){
         return (dnc?esc(ph.number):'<a href="tel:'+esc(digits(ph.number))+'">'+esc(ph.number)+'</a>')+(ph.type?' <span class="px-pill">'+esc(ph.type)+'</span>':'')+(ph.dnc?' <span class="px-pill dnc">DNC list</span>':'')+
           ' <button class="px-btn alt px-mini" data-act="usephone" data-v="'+esc(ph.number)+'">Use</button>'}).join('<br>')+
         (p.emails.length?'<br>'+p.emails.map(function(e){return '<a href="mailto:'+esc(e)+'">'+esc(e)+'</a> <button class="px-btn alt px-mini" data-act="useemail" data-v="'+esc(e)+'">Use</button>'}).join('<br>'):'')+'</div>'}).join('')}).join(''):'')+'</div>';
  var opts=statuses.map(function(s){return '<option'+(s===r.status?' selected':'')+'>'+esc(s)+'</option>'}).join('');
  h+='<div class="px-grid"><div><label>Status</label><select data-f="status">'+opts+'</select></div>'+
   '<div><label>Next touch</label><input type="date" data-f="next_touch" value="'+esc(r.next_touch)+'"></div>'+
   '<div><label>Last outcome</label><input data-f="outcome" value="'+esc(r.outcome)+'"></div>'+
   '<div><label>Name</label><input data-f="person" value="'+esc(r.person)+'"></div>'+
   '<div><label>Phone</label><input data-f="phone" value="'+esc(r.phone)+'"></div>'+
   '<div><label>Email</label><input data-f="email" value="'+esc(r.email)+'"></div>'+
   '<div style="grid-column:1/-1"><label>My notes</label><textarea data-f="my_notes">'+esc(r.my_notes)+'</textarea></div></div>';
  h+='<div class="px-actions"><button class="px-btn" data-act="save">Save</button>'+
   '<button class="px-btn gold" data-act="lookup"'+(lookupReady?'':' disabled')+'>'+(r.traced_at?'Look up again':'Find contacts')+' (2 credits)</button>'+
   (L.length>1?'<button class="px-btn alt" data-act="lookupall"'+(lookupReady?'':' disabled')+'>Look up all '+L.length+' properties ('+(L.length*2)+' credits)</button>':'')+
   '<button class="px-btn alt" data-act="remove">Remove</button><span class="px-sub" data-msg></span></div>';
  if(r.texted||r.emailed||r.called)h+='<p class="px-sub">'+[r.texted?'Texted '+r.texted.slice(0,10):'',r.emailed?'Emailed '+r.emailed.slice(0,10):'',r.called?'Called '+r.called.slice(0,10):''].filter(Boolean).join(' · ')+'</p>';
  return h+'</div></div>'}

function find(id){for(var i=0;i<rows.length;i++)if(rows[i].id===id)return rows[i]}
function msg(el,t){var m=el.querySelector('[data-msg]');if(m)m.textContent=t}

document.addEventListener('click',function(e){var b=e.target.closest('[data-act]');if(!b)return;
  var cardEl=b.closest('.px-card');var id=cardEl&&cardEl.dataset.id;var act=b.dataset.act;var r=id&&find(id);
  if(act==='log'){e.stopPropagation();var k=b.dataset.k,now=new Date().toISOString(),f={};f[k]=now;
    if(k==='texted'&&(!r.status||r.status==='New'))f.status='Texted';
    if(k==='emailed'&&(!r.status||r.status==='New'||r.status==='Texted'))f.status='Emailed';
    api('update',{id:id,fields:f}).then(function(x){if(x.ok){Object.assign(r,f);render()}});return}
  if(act==='toggle'){open[id]=!open[id];cardEl.classList.toggle('open');return}
  if(act==='usephone'||act==='useemail'){cardEl.querySelector('[data-f="'+(act==='usephone'?'phone':'email')+'"]').value=b.dataset.v;msg(cardEl,'Click Save to keep it');return}
  if(act==='save'){var f={};cardEl.querySelectorAll('[data-f]').forEach(function(x){f[x.dataset.f]=x.value});
    if(f.status==='Texted'&&!r.texted)f.texted=new Date().toISOString();
    if(f.status==='Emailed'&&!r.emailed)f.emailed=new Date().toISOString();
    msg(cardEl,'Saving…');api('update',{id:id,fields:f}).then(function(x){if(x.ok){Object.assign(r,f);msg(cardEl,'Saved');}else msg(cardEl,x.error)});return}
  if(act==='lookup'||act==='lookupall'){b.disabled=true;msg(cardEl,'Looking up…');
    api('lookup',{id:id,all:act==='lookupall'}).then(function(x){if(x.ok){r.contacts_json=JSON.stringify(x.contacts);r.traced_at=new Date().toISOString();open[id]=true;render();}else{msg(cardEl,x.error);b.disabled=false}});return}
  if(act==='remove'){if(!confirm('Remove '+(r.person||r.entity||'this prospect')+' from the list?'))return;
    api('remove',{id:id}).then(function(){rows=rows.filter(function(x){return x.id!==id});render()});return}
});

$('q').addEventListener('input',render);$('fs').addEventListener('change',render);$('fc').addEventListener('change',render);
$('addBtn').addEventListener('click',function(){$('addForm').style.display='block'});
$('addCancel').addEventListener('click',function(){$('addForm').style.display='none'});
$('addSave').addEventListener('click',function(){var b={};['person','entity','phone','email','address','maturity','amount','src','notes'].forEach(function(k){b[k]=$('a_'+k).value});
  if(!b.person&&!b.entity&&!b.address){alert('Add a name, entity or address');return}
  api('add',b).then(function(x){if(x.ok){$('addForm').style.display='none';document.querySelectorAll('#addForm input,#addForm textarea').forEach(function(i){i.value=''});load()}else alert(x.error)})});
$('outBtn').addEventListener('click',function(){api('logout',{}).then(function(){location.reload()})});
$('bulkBtn').addEventListener('click',function(){var todo=rows.filter(function(r){return !r.traced_at&&loans(r).length&&r.status!=='Do not contact'});
  if(!todo.length){alert('Everyone with an address has been looked up.');return}
  if(!confirm('Look up contacts for '+todo.length+' prospects? About '+(todo.length*2)+' PropertyReach credits.'))return;
  var i=0,btn=$('bulkBtn');btn.disabled=true;
  (function next(){if(i>=todo.length){btn.textContent='Find contacts for all not looked up';btn.disabled=false;load();return}
    btn.textContent='Looking up '+(i+1)+' of '+todo.length+'…';
    api('lookup',{id:todo[i].id}).then(function(){i++;next()},function(){i++;next()})})()});
$('csvBtn').addEventListener('click',function(){var cols=['person','entity','phone','email','status','next_touch','outcome','soon','total','my_notes'];
  var lines=[cols.concat(['properties','found_phones','found_emails']).join(',')];
  rows.filter(match).forEach(function(r){var C=contacts(r),ph=[],em=[];C.forEach(function(c){(c.persons||[]).forEach(function(p){p.phones.forEach(function(x){ph.push(x.number+(x.dnc?' (DNC)':''))});em=em.concat(p.emails)})});
    var v=cols.map(function(c){return r[c]}).concat([loans(r).map(function(l){return l.addr}).join('; '),ph.join('; '),em.join('; ')]);
    lines.push(v.map(function(x){return '"'+String(x==null?'':x).replace(/"/g,'""')+'"'}).join(','))});
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'}));a.download='ACP_Prospects_'+today()+'.csv';a.click()});
load();
})();`;
