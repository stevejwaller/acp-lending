/* ACP rate and advance check (/rates). Terms below are the best published
   program terms ACP can typically structure, by credit and experience band.
   Rates are estimated ranges, not quotes. Edit the tables here to change them. */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  // Bridge / fix & flip tiers
  function bridgeTerms(fico, exp) {
    if (fico < 600) return null;
    var t;
    if (fico >= 720 && exp === '10s') {
      t = { tier: 'Maximum', purchase: '100%', rehab: '100%', arv: '75%', rate: '9.25% to 10.25%', points: '1 to 2',
        extra: 'Loan amount up to $800,000. You bring closing costs and reserves, not a down payment.' };
    } else if (fico >= 720 && (exp === '10' || exp === '10s')) {
      t = { tier: 'Preferred', purchase: 'up to 100%', rehab: '100%', arv: '75%', rate: '9.5% to 10.5%', points: '1 to 2' };
    } else if (fico >= 700 && exp !== '0' && exp !== '1') {
      t = { tier: 'Advanced', purchase: 'up to 100%', rehab: '100%', arv: '75%', rate: '9.99% to 11%', points: '1.5 to 2',
        extra: 'Closing costs are paid at closing. Most lenders want liquidity of about 25% of the rehab budget plus closing costs.' };
    } else {
      var rate = fico >= 680 ? '10.5% to 11.5%' : fico >= 640 ? '11% to 12%' : '11.5% to 12.5%';
      t = { tier: 'Standard', purchase: '90%', rehab: '100%', arv: '70%', rate: rate, points: '1 to 2' };
    }
    if (exp === '0') {
      t.extra = (t.extra ? t.extra + ' ' : '') + 'First flip: most programs fund light to moderate rehab. A heavy rehab (more than the purchase price) needs a track record or an experienced partner on the loan.';
    }
    return t;
  }

  // DSCR rental tiers
  function dscrTerms(fico, exp) {
    var t = { term: '30-year fixed (5/1 and 7/1 ARM and interest-only options available)', prepay: '5-year declining (5/4/3/2/1), buy-down options available' };
    if (fico >= 640) {
      t.purchase = 'up to 80%'; t.refi = 'up to 80%'; t.cashout = 'up to 75%';
      t.dscr = fico >= 680 ? '1.00x on most programs, as low as 0.80x on some' : 'No minimum DSCR on some programs';
      t.rate = fico >= 740 ? '6.25% to 7%' : fico >= 720 ? '6.5% to 7.25%' : fico >= 680 ? '7% to 7.75%' : '7.75% to 8.75%';
    } else {
      t.purchase = exp === '0' ? 'up to 70%' : 'up to 75%';
      t.refi = fico >= 600 ? 'up to 65%' : 'up to 60%';
      t.cashout = t.refi;
      t.dscr = 'No minimum DSCR. Vacant properties qualify on market rent.';
      t.rate = fico >= 600 ? '8.75% to 9.75%' : '9.5% to 10.5%';
    }
    return t;
  }

  function row(k, v) { return '<tr><td>' + k + '</td><td>' + v + '</td></tr>'; }

  function render() {
    var type = $('rt-type').value;
    $('rt-step2').hidden = !type;
    $('rt-exp-bridge-wrap').hidden = type !== 'bridge';
    $('rt-exp-dscr-wrap').hidden = type !== 'dscr';
    var ficoV = $('rt-fico').value;
    var exp = type === 'bridge' ? $('rt-exp-bridge').value : $('rt-exp-dscr').value;
    var res = $('rt-result');
    if (!type || ficoV === '' || exp === '') { res.hidden = true; return; }
    var fico = parseInt(ficoV, 10);
    var html = '', title = '', note = '', cta = '/request-financing';
    if (type === 'bridge') {
      var b = bridgeTerms(fico, exp);
      cta += '?product=Bridge%20%2F%20Fix%20%26%20Flip';
      if (!b) {
        title = 'Manual review';
        html = row('Advance', 'Below most bridge program minimums. Send the deal and it will be reviewed by hand, or add a partner with stronger credit as a guarantor.');
      } else {
        title = b.tier + ' tier &mdash; Bridge / Fix &amp; Flip';
        html = row('Purchase advance', b.purchase + ' of the purchase price')
          + row('Rehab advance', b.rehab + ' of the renovation budget')
          + row('Cap', 'Up to ' + b.arv + ' of after-repair value (the lower cap governs)')
          + row('Term', '12 months, interest-only (up to 24 months available)')
          + row('Estimated rate', b.rate + ', ' + b.points + ' points');
        note = b.extra || '';
      }
    } else {
      var d = dscrTerms(fico, exp);
      cta += '?product=DSCR%20Rental';
      title = 'DSCR Rental';
      html = row('Purchase', d.purchase + ' of value')
        + row('Rate-and-term refinance', d.refi + ' of value')
        + row('Cash-out refinance', d.cashout + ' of value')
        + row('Minimum DSCR', d.dscr)
        + row('Term', d.term)
        + row('Prepayment', d.prepay)
        + row('Estimated rate', d.rate);
      note = 'Rates track the 10-year Treasury and depend on leverage, DSCR and loan size. Lower leverage or a rate buy-down can bring the rate down.';
    }
    $('rt-title').innerHTML = title;
    $('rt-table').innerHTML = html;
    $('rt-note').textContent = note;
    $('rt-note').hidden = !note;
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
