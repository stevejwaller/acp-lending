// Deal calculator gate (26 Sep 2026, Steve's spec): anyone can size their
// leverage from purchase, repairs, ARV, ARV limit and state. Rates, fees,
// closing costs, carry, liquidity, profit and the flip-or-rent tool open only
// after the borrower gives the property address, name, email, phone, a credit
// score range and experience in the last 36 months. Unlocking posts the lead to
// /quote/save, so it lands in D1 and Steve gets the notification email.
// Additive: calculator.js, validate.js and fix-or-rent.js keep all the maths.
(function () {
'use strict';
var KEY = 'acpCalcUnlocked';
var TTL = 30 * 24 * 3600 * 1000;
var OPEN_IDS = ['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct', 'propertyState', 'hmlFunded'];
var GATE_REQ = ['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct',
  'dealAddress', 'borrowerName', 'dealEmail', 'dealPhone', 'creditScore', 'experience'];
var EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;
var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function $(id) { return document.getElementById(id); }
function val(id) { var el = $(id); return el ? String(el.value == null ? '' : el.value).trim() : ''; }
function num(id) { var n = parseFloat(val(id).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; }

var form = $('calc-form');
var results = document.querySelector('#deal-calculator .calc-results') || document.querySelector('.calc-results');
var apply = $('calc-apply');
var submitBtn = document.querySelector('.calc-submit');
if (!form || !results || !apply || !submitBtn) return;

function isUnlocked() {
if (/[?&]q=[a-z0-9]{10}/.test(window.location.search || '')) return true; // a saved quote link
try {
var t = parseInt(localStorage.getItem(KEY) || '0', 10);
return t > 0 && (Date.now() - t) < TTL;
} catch (e) { return false; }
}

// --- build the leverage panel and the unlock button ---
var panel = document.createElement('div');
panel.id = 'calc-leverage';
panel.innerHTML =
  '<h2 style="margin-top:0;border:none;padding:0;font-size:1.2rem;">Your Leverage</h2>' +
  '<div class="result-row" id="lv-ltcRow"><span>90% of Purchase + Repairs</span><span class="val" id="lv-ltc">—</span></div>' +
  '<div class="result-row"><span id="lv-arvLabel">ARV Limit</span><span class="val" id="lv-arv">—</span></div>' +
  '<div class="result-row strong"><span>Estimated Maximum Loan <span class="hint" id="lv-note"></span></span><span class="val" id="lv-max">—</span></div>' +
  '<p class="calc-note" id="lv-hint">Enter the purchase price, repairs, ARV and ARV limit, then choose Calculate Leverage.</p>';
results.insertBefore(panel, results.firstChild);

var unlockBtn = document.createElement('button');
unlockBtn.type = 'button';
unlockBtn.id = 'calc-unlock-btn';
unlockBtn.className = 'btn calc-submit';
unlockBtn.textContent = 'Unlock Rates, Fees & Full Numbers';
var unlockMsg = document.createElement('p');
unlockMsg.className = 'calc-save-msg';
unlockMsg.id = 'calc-unlock-msg';
unlockMsg.setAttribute('role', 'status');
apply.parentNode.insertBefore(unlockBtn, apply.nextSibling);
unlockBtn.parentNode.insertBefore(unlockMsg, unlockBtn.nextSibling);

var badge = apply.querySelector('.calc-badge');
var badgeFull = badge ? badge.innerHTML : '';
var liq = $('liquidity');
var liqField = liq ? liq.closest('.calc-field') : null;

// --- what is hidden while locked ---
var hidden = [];
function hide(el) { if (el && hidden.indexOf(el) < 0) { hidden.push(el); el.setAttribute('data-gate', el.style.display || ''); el.style.display = 'none'; } }
function lock() {
var i, el, f;
var inputs = form.querySelectorAll('input, select, textarea');
for (i = 0; i < inputs.length; i++) {
el = inputs[i];
if (OPEN_IDS.indexOf(el.id) >= 0) continue;
f = el.closest('.calc-field');
if (f) hide(f);
}
var more = form.querySelectorAll('details.calc-more');
for (i = 0; i < more.length; i++) hide(more[i]);
var rows = form.querySelectorAll('.calc-field-row');
for (i = 0; i < rows.length; i++) {
var kids = rows[i].children, any = false;
for (var k = 0; k < kids.length; k++) if (kids[k].style.display !== 'none' && kids[k].id !== 'hmlField') any = true;
if (!any) hide(rows[i]);
}
var ch = results.children;
for (i = 0; i < ch.length; i++) {
el = ch[i];
if (el === panel || el === apply || el === unlockBtn || el === unlockMsg) continue;
if (el.classList.contains('calc-note') && !el.id) continue; // the preliminary-estimate disclaimer
hide(el);
}
hide(document.querySelector('.calc-profit'));
hide(document.querySelector('.calc-more-tool'));
hide($('calc-hero'));
hide($('calc-pdf-btn'));
hide($('calc-save-btn'));
hide($('calc-save-panel'));
hide(liqField);
var rb = $('calc-recalc-btn');
if (rb) { rb.setAttribute('data-label', rb.textContent); rb.textContent = 'Calculate Leverage'; }
if (badge) badge.innerHTML = 'See rates, fees &amp; your full numbers';
}
function unlock() {
for (var i = 0; i < hidden.length; i++) { hidden[i].style.display = hidden[i].getAttribute('data-gate') || ''; hidden[i].removeAttribute('data-gate'); }
hidden = [];
panel.style.display = 'none';
unlockBtn.style.display = 'none';
unlockMsg.style.display = 'none';
var rb = $('calc-recalc-btn');
if (rb && rb.getAttribute('data-label')) rb.textContent = rb.getAttribute('data-label');
if (badge) badge.innerHTML = badgeFull;
var hero = $('calc-hero');
if (hero && $('r-maxLoan') && /\d/.test($('r-maxLoan').textContent || '')) hero.hidden = false;
}

// --- leverage only: the same tests calculator.js applies, before closing costs ---
function leverage() {
var p = num('purchasePrice'), r = num('repairsBudget'), a = num('arvEstimate'), pct = num('arvPct');
if (!(p > 0 && a > 0 && pct > 0)) {
$('lv-hint').textContent = 'Enter the purchase price, repairs, ARV and ARV limit, then choose Calculate Leverage.';
return false;
}
if (pct > 75) { $('lv-hint').textContent = 'The ARV advance runs 70-75 percent. Enter 75 or less.'; return false; }
var ltc = 0.90 * (p + r), arvLim = (pct / 100) * a;
var tx = val('propertyState') === 'TX' && val('hmlFunded') === 'hml';
var max = tx ? arvLim : Math.min(ltc, arvLim);
$('lv-ltc').textContent = tx ? fmt.format(ltc) + ' — not applied' : fmt.format(ltc);
$('lv-arvLabel').textContent = 'ARV Limit (' + pct + '% of ' + fmt.format(a) + ')';
$('lv-arv').textContent = fmt.format(arvLim);
$('lv-max').textContent = fmt.format(max);
$('lv-note').textContent = tx ? 'Texas HML Advance, sized on ARV' : (ltc <= arvLim ? 'cost test governs' : 'ARV test governs');
$('lv-hint').textContent = 'Preliminary leverage before closing costs. Add your details below to see the rate, fees, cash due at closing, monthly carry and profit.';
return true;
}

function flag(el, on) {
if (!el) return;
if (on) { el.classList.add('acp-missing'); el.style.borderColor = '#c0392b'; el.style.background = '#fff6f6'; }
else { el.classList.remove('acp-missing'); el.style.borderColor = ''; el.style.background = ''; }
}

var sent = false;
function doUnlock() {
var miss = [], i, el, v, bad;
for (i = 0; i < GATE_REQ.length; i++) {
el = $(GATE_REQ[i]);
if (!el) continue;
v = val(GATE_REQ[i]);
bad = !v;
if (!bad && GATE_REQ[i] === 'dealEmail') bad = !EMAIL_RE.test(v);
if (!bad && GATE_REQ[i] === 'dealPhone') bad = v.replace(/[^0-9]/g, '').length < 10;
flag(el, bad);
if (bad) miss.push(el);
}
if (miss.length) {
unlockMsg.textContent = 'Complete the ' + miss.length + ' highlighted field' + (miss.length > 1 ? 's' : '') + ' to see rates, fees and your full numbers.';
unlockMsg.className = 'calc-save-msg is-bad';
try { miss[0].focus(); miss[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
return;
}
leverage();
var inputs = {};
var ids = OPEN_IDS.concat(['dealAddress', 'borrowerName', 'dealEmail', 'dealPhone', 'creditScore', 'experience']);
for (i = 0; i < ids.length; i++) { v = val(ids[i]); if (v) inputs[ids[i]] = v; }
var res = {};
if (/\d/.test($('lv-max').textContent)) res['r-maxLoan'] = $('lv-max').textContent;
if (/\d/.test($('lv-ltc').textContent)) res['r-ltc'] = $('lv-ltc').textContent;
var head = [val('dealAddress')];
if (val('purchasePrice')) head.push(val('purchasePrice') + ' purchase');
if (val('repairsBudget')) head.push(val('repairsBudget') + ' rehab');
if (val('arvEstimate')) head.push(val('arvEstimate') + ' ARV');
var payload = {
tool: 'flip',
lead: true,
headline: ('CALCULATOR LEAD: ' + head.join(' · ')).slice(0, 200),
inputs: inputs,
results: res,
email: val('dealEmail'),
note: ('CALCULATOR LEAD: unlocked rates and fees on the deal calculator. ' +
  'Property: ' + val('dealAddress') + '. Phone: ' + val('dealPhone') + '. ' +
  'Estimated credit score: ' + val('creditScore') + '. ' +
  'Flips or rentals completed, last 36 months: ' + val('experience') + '. ' +
  'Estimated maximum loan shown: ' + $('lv-max').textContent + '.').slice(0, 500),
website: ''
};
unlockBtn.disabled = true;
unlockMsg.textContent = 'Opening your full numbers…';
unlockMsg.className = 'calc-save-msg';
var finish = function () {
try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
unlock();
var rb = $('calc-recalc-btn');
try { apply.scrollIntoView({ block: 'nearest' }); } catch (e) {}
var first = $('interestRate');
if (first) { try { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus(); } catch (e) {} }
};
if (sent) { finish(); return; }
fetch('/quote/save', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
}).then(function (r) { return r.json(); }).then(function () { sent = true; finish(); })
['catch'](function () { finish(); });
}

// While locked, Calculate sizes leverage only. Registered on window in capture
// phase so it runs before validate.js, which would otherwise demand the fee fields.
window.addEventListener('click', function (e) {
if (!hidden.length) return;
var t = e.target && e.target.closest ? e.target.closest('#calc-recalc-btn') : null;
if (!t) return;
e.preventDefault();
e.stopImmediatePropagation();
leverage();
}, true);
unlockBtn.addEventListener('click', doUnlock);
var i2;
for (i2 = 0; i2 < GATE_REQ.length; i2++) {
(function (el) {
if (!el) return;
var clear = function () { if (el.classList.contains('acp-missing') && String(el.value).trim()) flag(el, false); };
el.addEventListener('input', clear);
el.addEventListener('change', clear);
})($(GATE_REQ[i2]));
}
['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct', 'propertyState', 'hmlFunded'].forEach(function (id) {
var el = $(id);
if (el) el.addEventListener('change', function () { if (hidden.length && /\d/.test($('lv-max').textContent)) leverage(); });
});

if (!isUnlocked()) {
lock();
if (window.location.hash === '#fix-or-rent') {
setTimeout(function () { try { panel.scrollIntoView({ block: 'start' }); } catch (e) {} }, 400);
}
}
window.__calcGate = { unlock: unlock, locked: function () { return hidden.length > 0; } };
})();
