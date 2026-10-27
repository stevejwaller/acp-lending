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
var GATE_REQ = ['propertyState', 'purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct',
  'creditScore', 'experience', 'dealAddress', 'borrowerName', 'dealEmail', 'dealPhone'];
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

// --- layout (26 Sep 2026): state first, balanced columns, application full width ---
var css = document.createElement('style');
css.id = 'calc-gate-css';
css.textContent =
  '.calc-state-step{display:grid;grid-template-columns:1.2fr 1.3fr;gap:8px 28px;align-items:center;background:#fffaf1;border-top:3px solid var(--gold);border-bottom:1px solid var(--border);padding:18px 24px 8px;}' +
  '.calc-state-step .calc-step-text{grid-column:1;}' +
  '.calc-state-step .calc-field-row{grid-column:2;}' +
  '.calc-state-step .footnote{grid-column:1 / -1;}' +
  '.calc-state-step select{border:2px solid var(--gold);font-weight:600;}' +
  '@media (max-width:800px){.calc-state-step{grid-template-columns:1fr;}.calc-state-step .calc-step-text,.calc-state-step .calc-field-row{grid-column:1;}}' +
  '.calc-step-title{display:block;font-weight:700;color:var(--navy);font-size:15px;margin:0 0 6px;}' +
  '.calc-state-step p{font-size:13px;line-height:1.5;margin:0 0 10px;color:#3a4350;}' +
  '.calc-state-step ul{font-size:13px;line-height:1.5;margin:0 0 12px;padding-left:18px;color:#3a4350;}' +
  '.calc-state-step .calc-field-row{margin-bottom:10px;}' +
  '.calc-state-step .footnote{margin:0 0 10px;}' +
  '#calc-apply-band{padding:24px;border-top:1px solid var(--border);background:#fafbfc;}' +
  '#calc-apply-band .calc-apply{margin-top:0;padding-top:0;border-top:none;}' +
  '#calc-apply-band .calc-apply > .calc-field-row{grid-template-columns:repeat(3,1fr);}' +
  '#calc-apply-band .calc-submit{display:block;width:100%;max-width:420px;margin:4px auto 0;}' +
  '#calc-apply-band .calc-save-msg{text-align:center;}' +
  '#lv-testRow .val{font-size:13px;text-align:right;}' +
  '.calc-locked #row-ltc{display:none !important;}' +
  '#lv-ltcRow,#lv-arvRow{display:none;}' +
  '@media (max-width:800px){#calc-apply-band .calc-apply > .calc-field-row{grid-template-columns:1fr 1fr;}}' +
  '@media (max-width:500px){#calc-apply-band .calc-apply > .calc-field-row{grid-template-columns:1fr;}}';
document.head.appendChild(css);

var stEl = $('propertyState');
var stField = stEl ? stEl.closest('.calc-field') : null;
var hmlField = $('hmlField');
var stNote = $('calc-state-note');
var step = null;
if (stField) {
step = document.createElement('div');
step.className = 'calc-state-step';
step.id = 'calc-state-step';
step.innerHTML =
  '<div class="calc-step-text"><span class="calc-step-title">Step 1 &mdash; Select the Property State</span>' +
  '<p>The state confirms which leverage test applies to your loan:</p>' +
  '<ul><li><strong>All states, including Texas:</strong> the lower of 90% of purchase + 100% of renovation (LTC) or 75% of ARV.</li></ul></div>';
var stRow = document.createElement('div');
stRow.className = 'calc-field-row';
stRow.appendChild(stField);
if (hmlField) stRow.appendChild(hmlField);
step.appendChild(stRow);
if (stNote) step.appendChild(stNote);
var typeMsg = document.createElement('p');
typeMsg.className = 'calc-save-msg is-bad';
typeMsg.id = 'calc-type-msg';
typeMsg.style.cssText = 'display:none;grid-column:1 / -1;margin:0 0 10px;';
typeMsg.textContent = 'Texas: choose HML or Hybrid to confirm your leverage.';
step.appendChild(typeMsg);
var dealTitle = document.createElement('span');
dealTitle.className = 'calc-step-title';
dealTitle.id = 'calc-deal-title';
dealTitle.textContent = 'Step 2 \u2014 Enter the Deal';
form.insertBefore(dealTitle, form.firstChild);
}
var applyHome = { parent: apply.parentNode, next: apply.nextSibling };
var body = results.closest('.calc-body');
if (step && body) body.parentNode.insertBefore(step, body);
var band = document.createElement('div');
band.id = 'calc-apply-band';
band.style.display = 'none';
if (body) body.parentNode.insertBefore(band, body.nextSibling);

// --- build the leverage panel and the unlock button ---
var panel = document.createElement('div');
panel.id = 'calc-leverage';
panel.innerHTML =
  '<h2 style="margin-top:0;border:none;padding:0;font-size:1.2rem;">Your Leverage</h2>' +
  '<div class="result-row" id="lv-testRow"><span>Leverage Test</span><span class="val" id="lv-test">Select the property state</span></div>' +
  '<div class="result-row" id="lv-ltcRow"><span>90% of Purchase + 100% of Renovation</span><span class="val" id="lv-ltc">—</span></div>' +
  '<div class="result-row" id="lv-arvRow"><span id="lv-arvLabel">ARV Limit</span><span class="val" id="lv-arv">—</span></div>' +
  '<div class="result-row strong"><span>Estimated Maximum Loan <span class="hint" id="lv-note"></span></span><span class="val" id="lv-max">—</span></div>' +
  '<p class="calc-note" id="lv-hint">Select the property state, enter the purchase price, repairs, ARV and ARV limit, then choose Calculate Leverage.</p>';
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
if (badge) badge.innerHTML = 'Step 3 &mdash; See rates, fees &amp; your full numbers';
results.classList.add('calc-locked');
if (body) {
band.appendChild(apply);
band.appendChild(unlockBtn);
band.appendChild(unlockMsg);
band.style.display = '';
}
}
function unlock() {
for (var i = 0; i < hidden.length; i++) { hidden[i].style.display = hidden[i].getAttribute('data-gate') || ''; hidden[i].removeAttribute('data-gate'); }
hidden = [];
panel.style.display = 'none';
unlockBtn.style.display = 'none';
unlockMsg.style.display = 'none';
if (apply.parentNode === band) applyHome.parent.insertBefore(apply, applyHome.next);
band.style.display = 'none';
results.classList.remove('calc-locked');
var rb = $('calc-recalc-btn');
if (rb && rb.getAttribute('data-label')) rb.textContent = rb.getAttribute('data-label');
if (badge) badge.innerHTML = badgeFull;
// Re-run the full calculation so rows the maths hides (the LTC line on a Texas
// HML deal) are hidden again after the gate restores everything it hid.
try { var pp = $('purchasePrice'); if (pp) pp.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
var hero = $('calc-hero');
if (hero && $('r-maxLoan') && /\d/.test($('r-maxLoan').textContent || '')) hero.hidden = false;
}

function testRow() {
var st = val('propertyState');
var ty = val('hmlFunded');
var txNow = false;
$('lv-test').textContent = !st ? 'Select the property state' :
  st + ' \u00b7 lower of LTC and ARV';
var ltcRow = $('lv-ltcRow');
if (ltcRow) ltcRow.classList.toggle('lv-off', txNow);
return st;
}

// --- leverage only: the same tests calculator.js applies, before closing costs ---
function leverage() {
var p = num('purchasePrice'), r = num('repairsBudget'), a = num('arvEstimate'), pct = num('arvPct');
var st = testRow();
if (!st) {
flag(stEl, true);
$('lv-hint').textContent = 'Select the property state first. It confirms the leverage test that applies.';
try { stEl.focus(); stEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
return false;
}
flag(stEl, false);
if (needsType()) {
flag($('hmlFunded'), true);
$('lv-hint').textContent = 'Texas: choose HML or Hybrid to confirm your leverage.';
if ($('calc-type-msg')) $('calc-type-msg').style.display = '';
try { $('hmlFunded').focus(); $('hmlFunded').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
return false;
}
if (!(p > 0 && a > 0 && pct > 0)) {
$('lv-hint').textContent = 'Enter the purchase price, repairs, ARV and ARV limit, then choose Calculate Leverage.';
return false;
}
if (pct > 75) { $('lv-hint').textContent = 'The ARV advance runs 70-75 percent. Enter 75 or less.'; return false; }
var ltc = 0.90 * p + r, arvLim = (pct / 100) * a;
var tx = val('propertyState') === 'TX' && val('hmlFunded') === 'hml';
var max = tx ? arvLim : Math.min(ltc, arvLim);
$('lv-ltc').textContent = tx ? fmt.format(ltc) + ' — not applied' : fmt.format(ltc);
$('lv-arvLabel').textContent = 'ARV Limit (' + pct + '% of ' + fmt.format(a) + ')';
$('lv-arv').textContent = fmt.format(arvLim);
$('lv-max').textContent = fmt.format(max);
$('lv-note').textContent = tx ? 'HML, sized on ARV' : 'lower of LTC or ARV';
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
if (needsType()) { flag($('hmlFunded'), true); miss.unshift($('hmlFunded')); if ($('calc-type-msg')) $('calc-type-msg').style.display = ''; }
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
// Steve, 26 Sep 2026: in Texas the borrower must choose HML (ARV only) or Hybrid
// (lower of 90% of purchase + 100% of renovation, or the ARV limit). No default - the choice is required.
function needsType() { return false; } // Steve, 22 Oct 2026: Texas HML removed for now; Texas uses the same LTC/ARV test as every state.
window.addEventListener('click', function (e) {
var t = e.target && e.target.closest ? e.target.closest('#calc-recalc-btn, button.calc-submit[form], #fr-run-btn') : null;
if (!t || !needsType()) return;
e.preventDefault();
e.stopImmediatePropagation();
flag($('hmlFunded'), true);
var m = $('calc-type-msg');
if (m) m.style.display = '';
try { $('hmlFunded').focus(); $('hmlFunded').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
}, true);
if ($('hmlFunded')) $('hmlFunded').addEventListener('change', function () {
// Steve, 26 Sep 2026: choosing HML on a Texas property sets the advance to 70% of ARV.
if (val('propertyState') === 'TX' && val('hmlFunded') === 'hml' && $('arvPct')) {
$('arvPct').value = '70';
try { $('arvPct').dispatchEvent(new Event('input', { bubbles: true })); } catch (x) {}
}
if (val('hmlFunded')) { flag($('hmlFunded'), false); var m = $('calc-type-msg'); if (m) m.style.display = 'none'; }
});
// Steve, 26 Sep 2026: interest rate defaults to 12% on an HML loan and 10% on any
// non-HML loan. Set whenever the state or leverage type changes; still editable.
function rateDefault() {
var ir = $('interestRate'), st = val('propertyState'), ty = val('hmlFunded');
if (!ir || !st) return;
ir.value = '10%';
try { ir.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
}
if (stEl) stEl.addEventListener('change', rateDefault);
if ($('hmlFunded')) $('hmlFunded').addEventListener('change', rateDefault);
['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct', 'propertyState', 'hmlFunded'].forEach(function (id) {
var el = $(id);
if (el) el.addEventListener('change', function () { testRow(); if (hidden.length && /\d/.test($('lv-max').textContent)) leverage(); });
});

if (isUnlocked()) {
// Returning visitor: nothing is gated, so the leverage-only panel and the unlock
// button have no job and read as an empty duplicate of the full numbers.
panel.style.display = 'none';
unlockBtn.style.display = 'none';
unlockMsg.style.display = 'none';
} else {
lock();
if (window.location.hash === '#fix-or-rent') {
setTimeout(function () { try { panel.scrollIntoView({ block: 'start' }); } catch (e) {} }, 400);
}
}
window.__calcGate = { unlock: unlock, locked: function () { return hidden.length > 0; } };
})();
