/* ACP Lending - /ask "Ask a Lender" page. Added 25 Nov 2026.
   1) Shows the thank-you (or error) message after the form posts to /ask/submit.
   2) The loan-size calculator and its "Send me my numbers" form (posts to /ask/numbers).
   3) The Q&A list is normally rendered on the server (functions/ask/index.js) from
      /data/ask-qa.json. If it arrives empty, this script renders it from the same file. */
(function () {
  var qs = new URLSearchParams(location.search);
  var form = document.getElementById('ask-form');
  var msg = document.getElementById('ask-msg');
  if (form && msg) {
    if (qs.get('sent')) {
      msg.textContent = 'Thanks, your question is in. Steve Waller will get back to you by email or phone. Want to talk sooner? Call or text 936-522-8951.';
      msg.hidden = false;
      form.hidden = true;
      document.getElementById('ask-box').scrollIntoView();
    } else if (qs.get('error')) {
      msg.textContent = qs.get('error') === 'missing'
        ? 'Please fill in every field marked * with a valid email.'
        : 'Something went wrong sending your question. Please try again, or call or text 936-522-8951.';
      msg.className = 'ask-msg ask-err';
      msg.hidden = false;
    }
  }

  // Loan-size calculator (25 Nov 2026, Steve): loan = the lower of 90% of cost
  // (purchase + repairs) and 75% of ARV. Cash shown = purchase + repairs - loan.
  var cIn = { p: document.getElementById('calc-price'), r: document.getElementById('calc-repairs'), a: document.getElementById('calc-arv') };
  var cMsg = document.getElementById('calc-msg');
  function num(el) { var n = parseFloat(String(el.value || '').replace(/[^0-9.]/g, '')); return isFinite(n) && n > 0 ? Math.round(n) : 0; }
  function usd(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function calc() {
    var P = num(cIn.p), R = num(cIn.r), A = num(cIn.a);
    var out = document.getElementById('calc-result');
    if (!P || !A) { out.hidden = true; return; }
    var cost = P + R, byCost = Math.round(0.9 * cost), byArv = Math.round(0.75 * A);
    var L = Math.min(byCost, byArv), cash = Math.max(0, cost - L);
    document.getElementById('calc-loan').textContent = usd(L);
    document.getElementById('calc-cash').textContent = usd(cash);
    document.getElementById('calc-why').textContent = byArv < byCost
      ? '75% of the ARV (' + usd(byArv) + ') is lower than 90% of your cost (' + usd(byCost) + '), so it sets the loan.'
      : '90% of your cost (' + usd(byCost) + ') is lower than 75% of the ARV (' + usd(byArv) + '), so it sets the loan.';
    document.getElementById('calc-min').hidden = L >= 50000;
    document.getElementById('calc-h-price').value = P;
    document.getElementById('calc-h-repairs').value = R;
    document.getElementById('calc-h-arv').value = A;
    out.hidden = false;
  }
  if (cIn.p && cIn.r && cIn.a) {
    ['p', 'r', 'a'].forEach(function (k) {
      cIn[k].addEventListener('input', calc);
      cIn[k].addEventListener('blur', function () { var n = num(cIn[k]); if (n) { cIn[k].value = usd(n); } });
    });
    if (cMsg && qs.get('numbers')) {
      cMsg.textContent = qs.get('numbers') === 'sent'
        ? 'Thanks, your numbers are on their way to Steve Waller. He will follow up with you about your deal. Want to talk sooner? Call or text 936-522-8951.'
        : (qs.get('numbers') === 'missing'
          ? 'Please enter your purchase price and ARV, plus your name, a valid email and the property city.'
          : 'Something went wrong sending your numbers. Please try again, or call or text 936-522-8951.');
      if (qs.get('numbers') !== 'sent') { cMsg.className = 'ask-msg ask-err'; }
      cMsg.hidden = false;
      document.getElementById('calc-box').scrollIntoView();
    }
  }

  var box = document.getElementById('ask-qa');
  if (!box || box.querySelector('.faq-item')) { return; }
  fetch(box.getAttribute('data-src') || '/data/ask-qa.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !data.items) { return; }
      data.items.forEach(function (it) {
        if (!it || !it.q || !it.a) { return; }
        var d = document.createElement('div');
        d.className = 'faq-item';
        var h = document.createElement('h3');
        h.textContent = it.q;
        d.appendChild(h);
        String(it.a).split(/\n\s*\n/).forEach(function (para) {
          var p = document.createElement('p');
          p.textContent = para.trim();
          d.appendChild(p);
        });
        box.appendChild(d);
      });
    })
    .catch(function () {});
})();
