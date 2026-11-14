/* ACP rate and advance check (/rates). Reads program terms from js/rates-data.js
   and shows three options for the visitor's credit and experience:
   lowest rate, highest advance, lowest lender fees. Starting terms, subject to quote. */
(function () {
  var D = window.ACP_RATES;
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var SAMPLE_B = { p: 200000, r: 50000, arv: 350000 };
  var SAMPLE_D = { v: 300000 };

  function estRate(type, fico) {
    if (type === 'bridge') return fico >= 720 ? '9.5% to 10.5%' : fico >= 680 ? '10.5% to 11.5%' : fico >= 640 ? '11% to 12%' : '11.5% to 12.5%';
    return fico >= 740 ? '6.25% to 7%' : fico >= 720 ? '6.5% to 7.25%' : fico >= 680 ? '7% to 7.75%' : fico >= 640 ? '7.75% to 8.75%' : fico >= 600 ? '8.75% to 9.75%' : '9.5% to 10.5%';
  }
  function lenderFees(p, loan) {
    if (p.points == null && p.fees == null) return null;
    var orig = p.points != null ? Math.max(loan * p.points / 100, p.feeMin || 0) : 0;
    return orig + (p.fees || 0);
  }

  function bridgeOptions(fico, flipsKey) {
    var flips = flipsKey === '10s' ? 10 : parseInt(flipsKey, 10);
    var inState = flipsKey === '10s';
    var s = SAMPLE_B;
    return D.bridge.filter(function (p) {
      return fico >= p.minFico && flips >= p.minFlips && (!p.inState || inState);
    }).map(function (p) {
      var arv = p.arvFn ? p.arvFn(fico, flips) : p.arv;
      var caps = [s.p * p.purchase / 100 + s.r * p.rehab / 100, s.arv * arv / 100, p.maxLoan];
      if (p.ltc) caps.push((s.p + s.r) * p.ltc / 100);
      var loan = Math.min.apply(null, caps);
      return { p: p, arv: arv, loan: loan, fees: lenderFees(p, loan) };
    });
  }
  function dscrOptions(fico, expKey) {
    var first = expKey === '0';
    return D.dscr.filter(function (p) { return fico >= p.minFico; }).map(function (p) {
      var pur = first && p.purchaseFirst ? p.purchaseFirst : p.purchase;
      var refi = p.refiFn ? p.refiFn(fico) : p.refi;
      var cash = p.refiFn ? p.refiFn(fico) : p.cashout;
      var loan = pur ? SAMPLE_D.v * pur / 100 : null;
      return { p: p, pur: pur, refi: refi, cash: cash, loan: loan, fees: loan ? lenderFees(p, loan) : null };
    });
  }
  function pick(list, key, dir) {
    var best = null;
    list.forEach(function (o) {
      var v = key(o); if (v == null) return;
      if (!best || (dir > 0 ? v > best.v : v < best.v)) best = { o: o, v: v };
    });
    return best && best.o;
  }
  function row(k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; }
  function rateCell(type, o, fico) {
    if (o.p.rate != null) return 'from ' + o.p.rate.toFixed(2) + '%' + (o.p.points != null ? ', ' + o.p.points + ' points' : '');
    if (o.p.rateText) return o.p.rateText;
    return 'est. ' + estRate(type, fico) + ' (quoted on your deal)';
  }
  function card(label, type, o, fico) {
    var p = o.p, h = '<h4 style="margin:18px 0 6px">' + label + ' &mdash; Program ' + p.id + '</h4><table class="snapshot">';
    if (type === 'bridge') {
      h += row('Purchase advance', 'up to ' + p.purchase + '% of the purchase price')
        + row('Rehab advance', p.rehab + '% of the renovation budget')
        + row('Caps', 'up to ' + o.arv + '% of after-repair value' + (p.ltc ? ' and ' + p.ltc + '% of total cost' : '') + '; loans up to ' + money(p.maxLoan))
        + row('On the sample deal', money(o.loan) + ' loan');
    } else {
      h += row('Purchase', o.pur ? 'up to ' + o.pur + '% of value' : 'quoted on your deal')
        + row('Refinance / cash-out', (o.refi ? 'up to ' + o.refi + '%' : 'quoted') + ' / ' + (o.cash ? 'up to ' + o.cash + '%' : 'quoted'))
        + row('Minimum DSCR', p.minDscr);
    }
    h += row('Term', p.term) + row('Rate', rateCell(type, o, fico))
      + row('Lender fees', o.fees != null ? 'about ' + money(o.fees) + ' on the sample loan' : 'quoted on your deal')
      + (p.note ? row('Note', p.note) : '') + '</table>';
    return h;
  }

  function render() {
    var type = $('rt-type').value;
    $('rt-step2').hidden = !type;
    $('rt-exp-bridge-wrap').hidden = type !== 'bridge';
    $('rt-exp-dscr-wrap').hidden = type !== 'dscr';
    var ficoV = $('rt-fico').value;
    var exp = type === 'bridge' ? $('rt-exp-bridge').value : $('rt-exp-dscr').value;
    var res = $('rt-result');
    if (!type || ficoV === '' || exp === '') { res.hidden = true; return; }
    var fico = parseInt(ficoV, 10), html = '', intro, cta = '/request-financing';
    var list = type === 'bridge' ? bridgeOptions(fico, exp) : dscrOptions(fico, exp);
    if (type === 'bridge') {
      cta += '?product=Bridge%20%2F%20Fix%20%26%20Flip';
      intro = 'Ranked on a sample deal: ' + money(SAMPLE_B.p) + ' purchase, ' + money(SAMPLE_B.r) + ' rehab, ' + money(SAMPLE_B.arv) + ' after-repair value.';
    } else {
      cta += '?product=DSCR%20Rental';
      intro = 'Ranked on a sample ' + money(SAMPLE_D.v) + ' rental purchase.';
    }
    if (!list.length) {
      html = '<p>No published program fits this credit and experience. Send the deal and it will be reviewed by hand, or add a partner with stronger credit or more experience as a guarantor.</p>';
    } else {
      var lowRate = pick(list, function (o) { return o.p.rate; }, -1);
      var hiAdv = pick(list, function (o) { return type === 'bridge' ? o.loan : o.pur; }, 1);
      var lowFee = pick(list, function (o) { return o.fees; }, -1);
      var rateTextPick = lowRate || list.filter(function (o) { return o.p.rateText; })[0];
      var order = [], labels = {};
      [['Lowest rate', rateTextPick], ['Highest advance', hiAdv], ['Lowest lender fees', lowFee]].forEach(function (x) {
        if (!x[1]) return;
        var id = x[1].p.id;
        if (!labels[id]) { labels[id] = []; order.push(x[1]); }
        labels[id].push(x[0]);
      });
      order.forEach(function (o) { html += card(labels[o.p.id].join(' + '), type, o, fico); });
      if (!rateTextPick) {
        html += '<p class="footnote">Lowest rate: rates on these programs are priced on your file. Estimated range for your credit: ' + estRate(type, fico) + '.</p>';
      }
      html += '<p class="footnote">' + list.length + ' program' + (list.length === 1 ? '' : 's') + ' fit your profile. Terms as of ' + D.asOf + '.</p>';
    }
    $('rt-title').innerHTML = (type === 'bridge' ? 'Bridge / Fix &amp; Flip' : 'DSCR Rental') + ' &mdash; your best options';
    $('rt-intro').textContent = intro;
    $('rt-cards').innerHTML = html;
    $('rt-cta').href = cta;
    res.hidden = false;
  }

  ['rt-type', 'rt-fico', 'rt-exp-bridge', 'rt-exp-dscr'].forEach(function (id) {
    var el = $(id); if (el) el.addEventListener('change', render);
  });
  var q = new URLSearchParams(location.search).get('type');
  if (q === 'dscr' || q === 'bridge') { $('rt-type').value = q; }
  render();
})();
