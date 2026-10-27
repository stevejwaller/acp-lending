/* ACP Lending - local draft autosave for long forms.
   Keeps a working copy in the visitor's own browser so a phone call, a closed
   tab or a back button does not cost them the form. Identity fields are never
   stored: SSN, TIN/EIN, date of birth, account and routing numbers are skipped
   on the way in, so they are not in the draft to restore.
   The draft never leaves the browser and expires after 24 hours. */
(function () {
  'use strict';

  var FORMS = { 'credit-app-form': 'acpDraft.creditApp' };
  var TTL = 24 * 60 * 60 * 1000;
  var SENSITIVE = /(^|[_-])(ssn|tin|ein|taxid|dob|dateofbirth|account|routing)/i;
  var NEVER = { signatureDate: 1 };

  function store() {
    try {
      var t = window.localStorage;
      t.setItem('acp.probe', '1');
      t.removeItem('acp.probe');
      return t;
    } catch (e) { return null; }
  }

  function skip(el) {
    var key = el.name || el.id || '';
    if (!key) { return true; }
    if (NEVER[key]) { return true; }
    if (SENSITIVE.test(key)) { return true; }
    if (el.type === 'password' || el.type === 'hidden' || el.type === 'file') { return true; }
    if (el.type === 'date') { return true; }
    return false;
  }

  function fields(form) {
    return Array.prototype.slice.call(form.querySelectorAll('input, select, textarea'));
  }

  function collect(form) {
    var data = {};
    fields(form).forEach(function (el) {
      if (skip(el)) { return; }
      var key = el.name || el.id;
      data[key] = (el.type === 'checkbox') ? !!el.checked : el.value;
    });
    return data;
  }

  function apply(form, data) {
    var restored = 0;
    fields(form).forEach(function (el) {
      if (skip(el)) { return; }
      var key = el.name || el.id;
      if (!Object.prototype.hasOwnProperty.call(data, key)) { return; }
      var val = data[key];
      if (el.type === 'checkbox') {
        if (el.checked !== !!val) { el.checked = !!val; restored++; }
      } else if (val !== '' && el.value !== val) {
        el.value = val;
        restored++;
      }
    });
    return restored;
  }

  function notice(form, onDiscard) {
    var box = document.createElement('div');
    box.className = 'app-draft-notice';
    box.setAttribute('role', 'status');
    box.style.cssText = 'margin:0 0 1rem;padding:.65rem .85rem;border:1px solid #c9d6e4;' +
      'background:#f4f8fc;border-radius:4px;font-size:.92rem;line-height:1.45;';
    var txt = document.createElement('span');
    txt.textContent = 'We filled this in from your unfinished draft on this device. ' +
      'Social Security numbers and dates of birth are never saved, so please re-enter those. ';
    box.appendChild(txt);
    var link = document.createElement('a');
    link.href = '#';
    link.textContent = 'Start a blank application';
    link.style.cssText = 'font-weight:600;';
    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      onDiscard();
      box.parentNode.removeChild(box);
    });
    box.appendChild(link);
    form.insertBefore(box, form.firstChild);
  }

  function wire(formId, key) {
    var form = document.getElementById(formId);
    if (!form) { return; }
    var mem = store();
    if (!mem) { return; }

    function save() {
      try {
        mem.setItem(key, JSON.stringify({ v: 1, ts: Date.now(), fields: collect(form) }));
      } catch (e) { /* quota or private mode - the form still works */ }
    }

    function clear() {
      try { mem.removeItem(key); } catch (e) {}
    }

    var raw = null;
    try { raw = mem.getItem(key); } catch (e) {}
    if (raw) {
      var draft = null;
      try { draft = JSON.parse(raw); } catch (e) { draft = null; }
      if (!draft || !draft.fields || (Date.now() - (draft.ts || 0)) > TTL) {
        clear();
      } else {
        var n = apply(form, draft.fields);
        // Dynamic blocks (guarantors) are built on change, then filled.
        var count = form.querySelector('#guarantorCount');
        if (count && count.value) {
          count.dispatchEvent(new Event('change', { bubbles: true }));
          n += apply(form, draft.fields);
        }
        var toggle = form.querySelector('#hasExistingDebt');
        if (toggle) { toggle.dispatchEvent(new Event('change', { bubbles: true })); }
        if (n > 0) { notice(form, function () { clear(); form.reset(); location.reload(); }); }
      }
    }

    var pending = null;
    form.addEventListener('input', function () {
      if (pending) { clearTimeout(pending); }
      pending = setTimeout(save, 600);
    });
    form.addEventListener('change', function () {
      if (pending) { clearTimeout(pending); }
      pending = setTimeout(save, 200);
    });
    form.addEventListener('reset', clear);
    window.addEventListener('pagehide', save);
  }

  function init() {
    Object.keys(FORMS).forEach(function (id) { wire(id, FORMS[id]); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
