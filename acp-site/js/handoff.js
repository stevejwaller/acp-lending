(function () {
  'use strict';
  // Carries a completed DSCR run across to the Deal Estimator so the same
  // property can be compared as a flip. Added 9 Sep 2026.
  // Deliberately self-contained: this file touches no arithmetic. calculator.js,
  // validate.js, dscr.js and fix-or-rent.js are all left alone.
  var KEY = 'acpCalcHandoff';
  var TTL = 60 * 60 * 1000;

  function el(id) { return document.getElementById(id); }
  function val(id) { var e = el(id); return e ? String(e.value == null ? '' : e.value).trim() : ''; }
  function num(id) {
    var s = val(id).replace(/[^0-9.\-]/g, '');
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  // ---- Sending side: the DSCR calculator --------------------------------
  function initSender() {
    var verdict = el('d-verdict');
    var toolbar = el('dscr-run-btn');
    if (!verdict || !toolbar || !toolbar.parentNode) { return; }

    var link = document.createElement('a');
    link.className = 'btn btn-outline';
    link.id = 'dscr-compare-btn';
    link.href = '/deal-calculator#fix-or-rent';
    link.textContent = 'Compare as a Flip';
    link.style.display = 'none';
    toolbar.parentNode.appendChild(link);

    var hint = document.createElement('p');
    hint.className = 'footnote';
    hint.id = 'dscr-compare-hint';
    hint.style.display = 'none';
    hint.textContent = 'Takes these figures to the Deal Estimator so you can run the same property as a flip and compare the two exits side by side.';
    verdict.parentNode.insertBefore(hint, verdict.nextSibling);

    function reveal() {
      var shown = verdict.style.display !== 'none' && String(verdict.textContent || '').trim() !== '';
      link.style.display = shown ? '' : 'none';
      hint.style.display = shown ? '' : 'none';
    }
    new MutationObserver(reveal).observe(verdict, { attributes: true, childList: true, characterData: true, subtree: true });
    reveal();

    link.addEventListener('click', function () {
      var value = num('d-value');
      var loan = num('d-loan');
      var hoa = num('d-hoa');
      var f = {};
      function put(k, v) { if (v !== '' && v != null) { f[k] = String(v); } }

      put('dealAddress', val('d-address'));
      put('borrowerName', val('d-name'));
      put('dealEmail', val('d-email'));
      put('arvEstimate', val('d-value'));
      put('annualTaxes', val('d-taxes'));
      put('annualInsurance', val('d-ins'));
      if (hoa > 0) { put('annualHoa', String(Math.round(hoa * 12))); }

      put('fr-rent', val('d-rent'));
      put('fr-rate', val('d-rate'));
      put('fr-term', val('d-term'));
      put('fr-vac', val('d-vac'));
      put('fr-mgmt', val('d-mgmt'));
      put('fr-maint', val('d-maint'));
      if (value > 0 && loan > 0) { put('fr-ltv', String(Math.round(loan / value * 1000) / 10)); }

      try {
        localStorage.setItem(KEY, JSON.stringify({ v: 1, ts: Date.now(), from: 'dscr', fields: f }));
      } catch (e) { /* private mode: the link still works, just unprefilled */ }
    });
  }

  // ---- Receiving side: the Deal Estimator -------------------------------
  function takePayload() {
    var raw;
    try {
      raw = localStorage.getItem(KEY);
      localStorage.removeItem(KEY);
    } catch (e) { return null; }
    if (!raw) { return null; }
    var d;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || d.v !== 1 || !d.fields || !d.ts) { return null; }
    if ((Date.now() - d.ts) > TTL) { return null; }
    return d.fields;
  }

  function initReceiver() {
    var form = el('calc-form');
    if (!form) { return; }
    var f = takePayload();
    if (!f) { return; }

    var filled = 0;
    for (var id in f) {
      if (!Object.prototype.hasOwnProperty.call(f, id)) { continue; }
      var e = el(id);
      if (!e) { continue; }
      e.value = f[id];
      if (e.tagName === 'INPUT') { e.setAttribute('value', f[id]); }
      if (typeof e.dispatchEvent === 'function') {
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var d = e.closest ? e.closest('details') : null;
      while (d) { d.open = true; d = d.parentNode && d.parentNode.closest ? d.parentNode.closest('details') : null; }
      filled++;
    }
    if (!filled) { return; }

    var wrap = el('deal-calculator');
    if (wrap && wrap.parentNode) {
      var box = document.createElement('p');
      box.className = 'calc-quote-banner';
      box.id = 'calc-handoff-banner';
      var addr = f.dealAddress ? ' for ' + f.dealAddress : '';
      box.textContent = 'Carried over from your DSCR run' + addr +
        '. Value, taxes, insurance, HOA and your rental assumptions are filled in below. Add the purchase price, the repair budget and your bridge rate, press Calculate, then press Compare Exits in Flip It or Rent It to see both exits side by side.';
      wrap.parentNode.insertBefore(box, wrap);
    }

    // "Months to Refinance" has no DSCR-side equivalent and validate.js treats it
    // as required, so fall back to the deal estimator's own months-to-sell figure.
    var months = el('fr-months');
    var sell = el('monthsToSell');
    if (months && !String(months.value || '').trim() && sell) {
      var mv = String(sell.value || '').trim() || '6';
      months.value = mv;
      months.setAttribute('value', mv);
      months.dispatchEvent(new Event('input', { bubbles: true }));
      months.dispatchEvent(new Event('change', { bubbles: true }));
    }

    var tool = el('fix-or-rent');
    if (tool && tool.scrollIntoView) {
      setTimeout(function () { tool.scrollIntoView({ block: 'start' }); }, 120);
    }
  }

  // "Months to Refinance" is the one rental assumption with no natural default of
  // its own. fix-or-rent.js already falls back to the flip's months-to-sell when it
  // is blank, so mirror that figure into the field instead of leaving the visitor
  // staring at a required box. Typing in the field stops the mirroring.
  function initMonthsMirror() {
    var months = el('fr-months');
    var sell = el('monthsToSell');
    if (!months || !sell) { return; }
    var touched = false;
    months.addEventListener('input', function () { touched = true; });
    function mirror() {
      if (touched) { return; }
      var v = String(sell.value || '').replace(/[^0-9.]/g, '');
      if (!v) { return; }
      if (String(months.value || '').trim() === v) { return; }
      months.value = v;
      months.setAttribute('value', v);
      months.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sell.addEventListener('input', mirror);
    sell.addEventListener('change', mirror);
    mirror();
  }

  function boot() {
    initSender();
    initReceiver();
    initMonthsMirror();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
