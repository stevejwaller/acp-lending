(function () {
  'use strict';
  var DASH = '—';
  var money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var money2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, signDisplay: 'always' });

  function num(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    var n = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function has(id) {
    var el = document.getElementById(id);
    return !!(el && String(el.value).trim() !== '');
  }
  function setText(id, v) {
    var el = document.getElementById(id);
    if (el) el.textContent = v;
  }
  function flag(id, on) {
    var el = document.getElementById(id);
    if (el) el.style.outline = on ? '2px solid #c0392b' : '';
  }

  var REQUIRED = ['d-value', 'd-loan', 'd-rate', 'd-term', 'd-rent', 'd-taxes', 'd-ins', 'd-vac', 'd-mgmt', 'd-maint'];

  function msgBox() {
    var btn = document.getElementById('dscr-run-btn');
    if (!btn) return null;
    var box = document.getElementById('dscr-msg');
    if (!box) {
      box = document.createElement('p');
      box.id = 'dscr-msg';
      box.className = 'footnote';
      box.style.color = '#c0392b';
      box.style.display = 'none';
      btn.parentNode.appendChild(box);
    }
    return box;
  }

  function clearAll() {
    ['d-ltv', 'd-egr', 'd-opex', 'd-noi', 'd-pi', 'd-pitia', 'd-dscr1', 'd-dscr2', 'd-cf'].forEach(function (id) {
      setText(id, DASH);
    });
    var v = document.getElementById('d-verdict');
    if (v) v.style.display = 'none';
  }

  function validate() {
    var box = msgBox();
    var missing = [];
    REQUIRED.forEach(function (id) {
      flag(id, false);
      if (!has(id)) missing.push(id);
    });
    if (missing.length) {
      missing.forEach(function (id) { flag(id, true); });
      if (box) {
        box.textContent = 'Fill in every highlighted field. A blank field is not a zero, and guessing one produces a number worth nothing.';
        box.style.display = '';
      }
      clearAll();
      return false;
    }
    var value = num('d-value'), loan = num('d-loan'), rate = num('d-rate');
    if (loan > value) {
      flag('d-loan', true);
      if (box) { box.textContent = 'The loan amount is larger than the property value. Check both figures.'; box.style.display = ''; }
      clearAll();
      return false;
    }
    if (rate > 25) {
      flag('d-rate', true);
      if (box) { box.textContent = 'That rate looks wrong. Enter an annual rate, for example 7.25.'; box.style.display = ''; }
      clearAll();
      return false;
    }
    if (box) { box.textContent = ''; box.style.display = 'none'; }
    return true;
  }

  function compute() {
    var value = num('d-value');
    var loan = num('d-loan');
    var rate = num('d-rate') / 100;
    var term = num('d-term');
    var io = (document.getElementById('d-io') || {}).value === 'io';
    var rent = num('d-rent');
    var taxes = num('d-taxes') / 12;
    var ins = num('d-ins') / 12;
    var hoa = num('d-hoa');
    var vac = num('d-vac') / 100;
    var mgmt = num('d-mgmt') / 100;
    var maint = num('d-maint') / 100;

    var egr = rent * (1 - vac);
    var opex = taxes + ins + hoa + (egr * mgmt) + (egr * maint);
    var noi = egr - opex;

    var r = rate / 12;
    var n = term * 12;
    var pi;
    if (io || r === 0 || n === 0) {
      pi = io ? loan * r : (n ? loan / n : 0);
    } else {
      pi = loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }
    var pitia = pi + taxes + ins + hoa;
    var dscrLender = pitia > 0 ? rent / pitia : 0;
    var dscrCons = pi > 0 ? noi / pi : 0;
    var cf = noi - pi;

    return {
      ltv: value > 0 ? loan / value : 0,
      egr: egr, opex: opex, noi: noi, pi: pi, pitia: pitia,
      dscrLender: dscrLender, dscrCons: dscrCons, cf: cf
    };
  }

  function run() {
    if (!validate()) return;
    var o = compute();
    setText('d-ltv', (o.ltv * 100).toFixed(1) + '%');
    setText('d-egr', money.format(o.egr));
    setText('d-opex', money.format(o.opex));
    setText('d-noi', money.format(o.noi));
    setText('d-pi', money.format(o.pi));
    setText('d-pitia', money.format(o.pitia));
    setText('d-dscr1', o.dscrLender.toFixed(2));
    setText('d-dscr2', o.dscrCons.toFixed(2));
    setText('d-cf', money2.format(o.cf));

    var v = document.getElementById('d-verdict');
    if (v) {
      var t;
      if (o.dscrLender >= 1.20) {
        t = 'At ' + o.dscrLender.toFixed(2) + ' this clears the common program thresholds comfortably.';
      } else if (o.dscrLender >= 1.00) {
        t = 'At ' + o.dscrLender.toFixed(2) + ' this is inside the range most programs start at.';
      } else if (o.dscrLender >= 0.80) {
        t = 'At ' + o.dscrLender.toFixed(2) + ' this needs a program that goes below 1.00. Those exist, usually with lower leverage.';
      } else {
        t = 'At ' + o.dscrLender.toFixed(2) + ' the rent does not cover the payment. Lower the loan amount or revisit the rent assumption.';
      }
      if (o.ltv > 0.80) {
        t += ' Note the requested loan is ' + (o.ltv * 100).toFixed(1) + '% LTV. DSCR programs typically advance 75 to 80 percent for borrowers who meet the credit bands, and cash-out is usually capped lower, so expect this to be sized down.';
      }
      if (o.cf < 0) {
        t += ' Note the property runs ' + money.format(Math.abs(o.cf)) + ' a month short after management and maintenance, even where the lender test passes.';
      }
      t += ' Estimates only, not a commitment to lend.';
      v.textContent = t;
      v.style.display = '';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('dscr-run-btn');
    if (btn) btn.addEventListener('click', run);
    REQUIRED.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { flag(id, false); });
    });
    if (btn) btn.addEventListener('click', function () { setTimeout(function () { dqSendLog(); }, 200); });

  // --- Saved quotes and anonymous usage logging (2 Sep 2026) ----------------
  // Mirrors the deal calculator. The usage log records the shape of the deal
  // and its results so we can see whether this page is used; nothing here
  // identifies anyone. A saved quote is opt-in and only travels when the
  // visitor clicks Save.
  var DQ_INPUTS = ['d-address', 'd-name', 'd-email', 'd-value', 'd-loan', 'd-rate', 'd-term', 'd-io', 'd-rent',
    'd-taxes', 'd-ins', 'd-hoa', 'd-vac', 'd-mgmt', 'd-maint'];
  var DQ_RESULTS = ['d-ltv', 'd-egr', 'd-opex', 'd-noi', 'd-pi', 'd-pitia',
    'd-dscr1', 'd-dscr2', 'd-cf'];

  function dqCollect() {
    var inputs = {}, results = {}, i, el, v, t;
    for (i = 0; i < DQ_INPUTS.length; i++) {
      el = document.getElementById(DQ_INPUTS[i]);
      if (!el) continue;
      v = String(el.value == null ? '' : el.value).trim();
      if (v) inputs[DQ_INPUTS[i]] = v;
    }
    for (i = 0; i < DQ_RESULTS.length; i++) {
      el = document.getElementById(DQ_RESULTS[i]);
      if (!el) continue;
      t = String(el.textContent || '').trim();
      if (t && t !== DASH && t !== '-') results[DQ_RESULTS[i]] = t;
    }
    return { inputs: inputs, results: results };
  }
  function dqHeadline() {
    var g = function (id) {
      var el = document.getElementById(id);
      return el ? String(el.value || '').trim() : '';
    };
    var t = function (id) {
      var el = document.getElementById(id);
      var s = el ? String(el.textContent || '').trim() : '';
      return (s && s !== DASH) ? s : '';
    };
    var bits = [];
    if (g('d-address')) bits.push(g('d-address'));
    if (g('d-value')) bits.push(g('d-value') + ' value');
    if (g('d-rent')) bits.push(g('d-rent') + ' rent');
    if (t('d-dscr1')) bits.push('DSCR ' + t('d-dscr1'));
    return bits.join(' · ').slice(0, 200);
  }

  var DQ_EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;
  var DQ_SIG_IDS = ['d-value', 'd-loan', 'd-rate', 'd-term', 'd-io', 'd-rent',
    'd-taxes', 'd-ins', 'd-hoa', 'd-vac', 'd-mgmt', 'd-maint'];
  var dqLogged = {}, dqLogCount = 0;
  function dqSig(inputs) {
    var parts = [], i;
    for (i = 0; i < DQ_SIG_IDS.length; i++) parts.push(inputs[DQ_SIG_IDS[i]] || '');
    parts.push(inputs['d-address'] ? 'a' : '');
    parts.push(inputs['d-name'] ? 'n' : '');
    parts.push(DQ_EMAIL_RE.test(inputs['d-email'] || '') ? 'e' : '');
    return parts.join('|');
  }
  function dqSendLog(final) {
    if (!final && dqLogCount >= 8) return;
    var snap = dqCollect();
    if (!snap.inputs['d-value'] || !snap.inputs['d-rent']) return;
    var sig = final ? 'F' + JSON.stringify(snap.inputs) : dqSig(snap.inputs);
    if (dqLogged[sig]) return;
    dqLogged[sig] = 1;
    dqLogCount++;
    var body = JSON.stringify({ tool: 'dscr', headline: dqHeadline(), inputs: snap.inputs, results: snap.results });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon('/quote/log', new Blob([body], { type: 'application/json' }))) return;
    } catch (e) {}
    try {
      fetch('/quote/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })['catch'](function () {});
    } catch (e) {}
  }

  function dqFinalLog() { dqSendLog(true); }
  window.addEventListener('pagehide', dqFinalLog);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') dqFinalLog();
  });

  var dqSaveBtn = document.getElementById('dscr-save-btn');
  var dqPanel = document.getElementById('dscr-save-panel');
  var dqGo = document.getElementById('dscr-save-go');
  var dqMsg = document.getElementById('dscr-save-msg');
  var dqOut = document.getElementById('dscr-save-out');
  var dqLink = document.getElementById('dscr-save-link');
  var dqCopy = document.getElementById('dscr-save-copy');

  function dqSay(text, kind) {
    if (!dqMsg) return;
    dqMsg.textContent = text || '';
    dqMsg.className = 'calc-save-msg' + (kind ? ' is-' + kind : '');
  }
  if (dqSaveBtn && dqPanel) {
    dqSaveBtn.addEventListener('click', function () {
      dqPanel.hidden = !dqPanel.hidden;
      if (!dqPanel.hidden) {
        var em = document.getElementById('dscr-save-email');
        var formEm = document.getElementById('d-email');
        if (em && formEm && !String(em.value).trim() && String(formEm.value).trim()) em.value = String(formEm.value).trim();
        if (em) em.focus();
      }
    });
  }
  if (dqGo) {
    dqGo.addEventListener('click', function () {
      var snap = dqCollect();
      if (!snap.inputs['d-value'] || !snap.inputs['d-loan']) {
        dqSay('Enter at least a property value and a loan amount before saving.', 'bad');
        return;
      }
      var emEl = document.getElementById('dscr-save-email');
      var noteEl = document.getElementById('dscr-save-note');
      var hpEl = document.getElementById('dscr-save-website');
      var payload = {
        tool: 'dscr',
        headline: dqHeadline(),
        inputs: snap.inputs,
        results: snap.results,
        email: (emEl && String(emEl.value || '').trim()) || snap.inputs['d-email'] || '',
        note: noteEl ? String(noteEl.value || '').trim() : '',
        website: hpEl ? String(hpEl.value || '').trim() : ''
      };
      dqGo.disabled = true;
      dqSay('Saving…', '');
      fetch('/quote/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json(); }).then(function (d) {
        dqGo.disabled = false;
        if (!d || !d.ok) {
          dqSay((d && d.error) || 'That did not save. Please try again, or email steve@acp-lending.com.', 'bad');
          return;
        }
        if (dqLink) dqLink.value = d.url;
        if (dqOut) dqOut.hidden = false;
        dqSay(d.notified
          ? 'Saved. The link is below and a copy is on its way to your inbox.'
          : 'Saved. Keep the link below — it brings these figures back.', 'good');
      })['catch'](function () {
        dqGo.disabled = false;
        dqSay('That did not save. Please try again, or email steve@acp-lending.com.', 'bad');
      });
    });
  }
  if (dqCopy && dqLink) {
    dqCopy.addEventListener('click', function () {
      dqLink.select();
      dqLink.setSelectionRange(0, 99999);
      var done = function () {
        dqCopy.textContent = 'Copied';
        setTimeout(function () { dqCopy.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dqLink.value).then(done)['catch'](done);
      } else {
        try { document.execCommand('copy'); } catch (e) {}
        done();
      }
    });
  }

  function dqBanner(text, kind) {
    var wrap = document.getElementById('dscr-quote-banner');
    if (!wrap) return;
    wrap.textContent = text;
    wrap.className = 'calc-quote-banner is-' + kind;
    wrap.hidden = false;
  }
  var dqMatch = /[?&]q=([a-z0-9]{10})(?:&|$)/.exec(window.location.search || '');
  if (dqMatch) {
    fetch('/quote/' + dqMatch[1] + '/data', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.inputs) throw new Error('not found');
        var k, el;
        for (k in d.inputs) {
          if (!Object.prototype.hasOwnProperty.call(d.inputs, k)) continue;
          el = document.getElementById(k);
          if (el) el.value = d.inputs[k];
        }
        dqLogged['restored'] = 1;
        run();
        dqBanner('Saved quote ' + dqMatch[1] + ' loaded' +
          (d.savedAt ? ' — saved ' + String(d.savedAt).slice(0, 10) : '') +
          (d.note ? ' — note: ' + d.note : '') +
          '. Change anything you like; saving again creates a new link.', 'good');
      })['catch'](function () {
        dqBanner('That saved quote could not be loaded. The link may have been mistyped or cut short in an email.', 'bad');
      });
  }
  });

  window.__dscrCompute = compute;
})();
