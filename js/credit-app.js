/* ACP Lending - Commercial Loan Credit Application */
(function () {
  var form = document.getElementById('credit-app-form');
  if (!form) { return; }

  var MARK = 'acp-missing';
  var dateEl = document.getElementById('signatureDate');
  if (dateEl) {
    var d = new Date();
    dateEl.value = (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  }

  /* ---- Existing-debt toggle ---- */
  var debtCheck = document.getElementById('hasExistingDebt');
  var debtBlock = document.getElementById('existingDebtBlock');
  function syncDebtBlock() {
    if (!debtCheck || !debtBlock) { return; }
    debtBlock.classList.toggle('app-hidden', !debtCheck.checked);
  }
  if (debtCheck) {
    debtCheck.addEventListener('change', syncDebtBlock);
    syncDebtBlock();
  }

  /* ---- Guarantor repeater ---- */
  var countSelect = document.getElementById('guarantorCount');
  var blocksWrap = document.getElementById('guarantorBlocks');
  var MAX_GUARANTORS = 5;
  var guarantorFieldDefs = [
    { key: 'name', label: 'Full Legal Name', type: 'text', required: true },
    { key: 'ssn', label: 'SSN', type: 'text', required: true },
    { key: 'dob', label: 'Date of Birth', type: 'date', required: true },
    { key: 'address', label: 'Home Address', type: 'text', required: true },
    { key: 'ownershipPct', label: 'Ownership %', type: 'number', required: false },
    { key: 'fico', label: 'Estimated FICO', type: 'number', required: false },
    { key: 'phone', label: 'Phone', type: 'tel', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true }
  ];

  function buildGuarantorBlock(index) {
    var wrap = document.createElement('div');
    wrap.className = 'guarantor-block';
    wrap.setAttribute('data-guarantor-index', String(index));

    var h4 = document.createElement('h4');
    h4.textContent = 'Guarantor ' + index;
    wrap.appendChild(h4);

    for (var i = 0; i < guarantorFieldDefs.length; i += 2) {
      var row = document.createElement('div');
      row.className = 'app-field-row';
      for (var j = i; j < Math.min(i + 2, guarantorFieldDefs.length); j++) {
        var def = guarantorFieldDefs[j];
        var field = document.createElement('div');
        field.className = 'calc-field';

        var id = 'g' + index + '_' + def.key;
        var label = document.createElement('label');
        label.setAttribute('for', id);
        label.textContent = def.label + (def.required ? ' *' : '');
        field.appendChild(label);

        var input = document.createElement('input');
        input.type = def.type;
        input.id = id;
        input.name = id;
        if (def.required) { input.required = true; }
        field.appendChild(input);

        row.appendChild(field);
      }
      wrap.appendChild(row);
    }
    return wrap;
  }

  function syncGuarantorBlocks() {
    if (!countSelect || !blocksWrap) { return; }
    var n = parseInt(countSelect.value, 10);
    blocksWrap.innerHTML = '';
    if (!n || isNaN(n)) { return; }
    n = Math.min(n, MAX_GUARANTORS);
    for (var i = 1; i <= n; i++) {
      blocksWrap.appendChild(buildGuarantorBlock(i));
    }
  }
  if (countSelect) {
    countSelect.addEventListener('change', syncGuarantorBlocks);
  }

  /* ---- Validation + submit ---- */
  var msgBox = document.getElementById('credit-app-msg');
  var submitBtn = document.getElementById('credit-app-submit-btn');

  function showMsg(text, kind) {
    if (!msgBox) { return; }
    msgBox.textContent = text;
    msgBox.style.display = '';
    if (kind === 'error') {
      msgBox.style.color = '#8a1c1c';
      msgBox.style.background = '#fff6f6';
      msgBox.style.border = '1px solid #e3b8b8';
    } else {
      msgBox.style.color = '#155724';
      msgBox.style.background = '#f1faf3';
      msgBox.style.border = '1px solid #b6dfc0';
    }
  }

  function resetTurnstile() {
    try { if (window.turnstile) { window.turnstile.reset(); } } catch (e) {}
  }

  function flag(el, on) {
    if (on) {
      el.classList.add(MARK);
      el.style.borderColor = '#c0392b';
      el.style.background = '#fff6f6';
    } else {
      el.classList.remove(MARK);
      el.style.borderColor = '';
      el.style.background = '';
    }
  }

  function collectRequired() {
    var required = form.querySelectorAll('[required]');
    var missing = [];
    required.forEach(function (el) {
      var blank;
      if (el.type === 'checkbox') { blank = !el.checked; }
      else { blank = String(el.value == null ? '' : el.value).trim() === ''; }
      if (blank) { missing.push(el); flag(el, true); }
      else { flag(el, false); }
    });
    return missing;
  }

  function buildPayload() {
    var data = {};
    var fields = form.querySelectorAll('input, select, textarea');
    fields.forEach(function (el) {
      if (!el.name) { return; }
      if (el.name.indexOf('g') === 0 && /^g\d+_/.test(el.name)) { return; }
      if (el.type === 'checkbox') { data[el.name] = el.checked; }
      else { data[el.name] = el.value; }
    });
    var guarantors = [];
    var blocks = blocksWrap ? blocksWrap.querySelectorAll('.guarantor-block') : [];
    blocks.forEach(function (block) {
      var idx = block.getAttribute('data-guarantor-index');
      var g = {};
      guarantorFieldDefs.forEach(function (def) {
        var input = document.getElementById('g' + idx + '_' + def.key);
        g[def.key] = input ? input.value : '';
      });
      guarantors.push(g);
    });
    data.guarantors = guarantors;
    data.submittedAt = new Date().toISOString();
    return data;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var missing = collectRequired();
    if (missing.length) {
      showMsg('Please fill in the ' + missing.length + ' highlighted required field' + (missing.length > 1 ? 's' : '') + '.', 'error');
      try { missing[0].focus(); missing[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
      return;
    }
    var tsEl = form.querySelector('[name="cf-turnstile-response"]');
    if (!tsEl || String(tsEl.value || '').trim() === '') {
      showMsg('Please complete the human verification check below the form, then submit again.', 'error');
      try {
        var w = document.querySelector('.cf-turnstile');
        if (w) { w.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      } catch (e) {}
      return;
    }
    var payload = buildPayload();
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting\u2026'; }
    showMsg('Submitting your application\u2026', 'success');

    fetch('/credit-application-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) { throw new Error('Request failed'); }
      return res.json().catch(function () { return {}; });
    }).then(function () {
      showMsg('Application received. ACP Lending will follow up by email or phone.', 'success');
      form.reset();
      if (blocksWrap) { blocksWrap.innerHTML = ''; }
      syncDebtBlock();
      if (dateEl) {
        var d2 = new Date();
        dateEl.value = (d2.getMonth() + 1) + '/' + d2.getDate() + '/' + d2.getFullYear();
      }
      resetTurnstile();
    }).catch(function () {
      resetTurnstile();
      showMsg('Something went wrong submitting the application. Please call or text Steve Waller at 936-522-8951, or email steve@acp-lending.com directly.', 'error');
    }).finally(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Application'; }
    });
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t && t.classList && t.classList.contains(MARK)) {
      var filled = t.type === 'checkbox' ? t.checked : String(t.value).trim() !== '';
      if (filled) { flag(t, false); }
    }
  });
})();
