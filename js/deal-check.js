/* ACP Deal Check. The page collects the deal; the snapshot is computed on the server
   (POST /leads/deal-check, action "snapshot") so the scoring logic is not published.
   The contact step posts action "contact" with the row id and a Turnstile token. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var form = $('dc-form');
  if (!form) return;

  var step = 1, rowId = null;
  var MONEY = ['dc-price', 'dc-rehab', 'dc-arv', 'dc-liq'];
  var REQ = {
    1: ['dc-addr', 'dc-ptype', 'dc-price', 'dc-rehab', 'dc-arv', 'dc-stage'],
    2: ['dc-exp', 'dc-fico', 'dc-liq']
  };

  function num(id) {
    var raw = ($(id).value || '').toLowerCase().replace(/,/g, '');
    var v = raw.replace(/[^0-9.]/g, '');
    if (!v) return NaN;
    var n = parseFloat(v);
    if (/\d\s*k\b/.test(raw)) n *= 1000;
    else if (/\d\s*(m|mm)\b/.test(raw)) n *= 1000000;
    return n;
  }
  function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function mark(el, bad) { el.style.borderColor = bad ? '#b3261e' : ''; }
  function say(id, text) { var el = $(id); el.textContent = text; el.hidden = !text; }

  MONEY.forEach(function (id) {
    $(id).addEventListener('blur', function () { var n = num(id); if (!isNaN(n)) this.value = money(n); });
  });

  function check(s) {
    var bad = 0;
    (REQ[s] || []).forEach(function (id) {
      var el = $(id), v = el.value.trim();
      var miss = !v || (MONEY.indexOf(id) > -1 && isNaN(num(id)));
      mark(el, miss); if (miss) bad++;
    });
    if (s === 3 && !form.querySelector('input[name=dc-goal]:checked')) return 'Pick the option that describes you best.';
    if (bad) return 'Fill in the highlighted fields.';
    if (s === 1 && num('dc-arv') <= num('dc-price')) { mark($('dc-arv'), true); return 'The ARV should be higher than the purchase price.'; }
    return '';
  }

  function show(s) {
    step = s;
    [1, 2, 3].forEach(function (i) { $('dc-step' + i).hidden = i !== s; });
    $('dc-progress').textContent = 'Step ' + s + ' of 3';
    $('dc-back').style.display = s === 1 ? 'none' : '';
    $('dc-next').textContent = s === 3 ? 'See my snapshot' : 'Next';
  }

  $('dc-next').addEventListener('click', function () {
    var e = check(step); say('dc-err', e); if (e) return;
    if (step < 3) show(step + 1); else snapshot();
  });
  $('dc-back').addEventListener('click', function () { say('dc-err', ''); show(step - 1); });

  function post(body) {
    return fetch('/leads/deal-check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function snapshot() {
    var btn = $('dc-next'); btn.disabled = true; btn.textContent = 'Checking the numbers…';
    var sel = $('dc-fico');
    post({
      action: 'snapshot',
      address: $('dc-addr').value.trim(), property_type: $('dc-ptype').value,
      sqft: num('dc-sqft') || null, purchase_price: num('dc-price'), rehab: num('dc-rehab'),
      arv: num('dc-arv'), deal_stage: $('dc-stage').value, experience: $('dc-exp').value,
      credit: sel.value, credit_range: sel.options[sel.selectedIndex].text,
      liquidity: num('dc-liq'), goal: form.querySelector('input[name=dc-goal]:checked').value
    }).then(function (d) {
      if (!d || !d.ok) throw new Error('bad');
      rowId = d.id;
      var s = d.snapshot;
      $('dc-grade').textContent = s.grade;
      $('dc-grade').style.color = { strong: '#2e7d4f', workable: '#10233d', tight: '#b4541c', no: '#b3261e' }[s.grade_key] || '';
      $('dc-addr-out').textContent = $('dc-addr').value.trim();
      $('dc-fit').textContent = s.best_fit;
      $('dc-cash').textContent = s.cash_due < 1 ? '$0' : money(s.cash_due);
      $('dc-liq-out').textContent = s.liquidity_ok ? 'Covers it' : 'Short about ' + money(s.liquidity_short);
      var ul = $('dc-flags'); ul.innerHTML = '';
      s.flags.forEach(function (f) { var li = document.createElement('li'); li.textContent = f; ul.appendChild(li); });
      form.hidden = true; $('dc-result').hidden = false;
      $('dc-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () {
      say('dc-err', 'That did not go through. Call or text Steve at 936-522-8951, or email steve@acp-lending.com.');
    }).then(function () { btn.disabled = false; if (step === 3) btn.textContent = 'See my snapshot'; });
  }

  $('dc-gate').addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = 0;
    ['dc-name', 'dc-email', 'dc-phone', 'dc-how'].forEach(function (id) {
      var miss = !$(id).value.trim(); mark($(id), miss); if (miss) bad++;
    });
    if (!/^\S+@\S+\.\S+$/.test($('dc-email').value)) { mark($('dc-email'), true); bad++; }
    var tokEl = document.querySelector('#dc-gate [name="cf-turnstile-response"]');
    var token = tokEl ? tokEl.value : '';
    var msg = bad ? 'Fill in the highlighted fields.'
      : !$('dc-consent').checked ? 'Check the box so Steve can contact you.'
      : !token ? 'Please complete the security check above the button.' : '';
    say('dc-err2', msg); if (msg) return;
    var btn = $('dc-send'); btn.disabled = true;
    post({
      action: 'contact', id: rowId, name: $('dc-name').value.trim(), email: $('dc-email').value.trim(),
      phone: $('dc-phone').value.trim(), contact_pref: $('dc-how').value, consent: true,
      company: $('dc-hpz').value, 'cf-turnstile-response': token
    }).then(function (d) {
      if (!d || !d.ok) throw new Error('bad');
      $('dc-how-out').textContent = $('dc-how').value.toLowerCase();
      $('dc-result').hidden = true; $('dc-thanks').hidden = false;
      $('dc-thanks').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(function () {
      btn.disabled = false;
      if (window.turnstile) { try { window.turnstile.reset(); } catch (x) {} }
      say('dc-err2', 'That did not go through. Call or text Steve at 936-522-8951, or email steve@acp-lending.com.');
    });
  });
})();
