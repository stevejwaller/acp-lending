(function () {
var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
var pctFmt = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

function num(id) {
var el = document.getElementById(id);
if (!el) return 0;
var v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ''));
return isNaN(v) ? 0 : v;
}

function setText(id, value) {
var el = document.getElementById(id);
if (el) el.textContent = value;
}

function textVal(id) {
var el = document.getElementById(id);
return el ? String(el.value).trim() : '';
}

function calc() {
var purchase = num('purchasePrice');
var repairs = num('repairsBudget');
var arv = num('arvEstimate');
var arvPct = num('arvPct');
var rate = num('interestRate');
var taxes = num('annualTaxes');
var insurance = num('annualInsurance');
// Steve, 26 Sep 2026: flood insurance, if applicable - one-year premium prepaid at closing.
var flood = num('annualFlood');
var hoa = num('annualHoa');
var originationPct = num('originationPct');
// Steve, 2 Sep 2026: the closing costs are now itemised the way the lender's own fee
// sheet reads. Origination stays a percentage of the loan; everything else is a flat
// dollar figure the borrower can override. The earnest-money line is a CREDIT and is
// subtracted. The old closingFeeFlat / lenderLegalFlat / titleFeePct inputs are gone.
var processingFee = num('processingFee');
// Steve, 26 Sep 2026: underwriting fee, flat lender fee, default $500.
var underwritingFee = num('underwritingFee');
// Steve, 26 Sep 2026: prepaid interest is no longer an input. It is one month of
// interest on the loan, computed below and shown only in the results column.
var dailyInterest = 0;
var appraisalFee = num('appraisalFee');
var creditReportFee = num('creditReportFee');
var titleInsurance = num('titleInsurance');
var escrowFee = num('escrowFee');
var recordingFee = num('recordingFee');
var hoaTransferFee = num('hoaTransferFee');
var surveyFee = num('surveyFee');
var misc1Fee = num('misc1Fee');
var misc2Fee = num('misc2Fee');
var earnestCredit = num('earnestCredit');
var brokerOrigPct = num('brokerOrigPct');
var brokerClosingFlat = num('brokerClosingFlat');
var monthsToSell = num('monthsToSell');
var sellingCostsPct = num('sellingCostsPct');

var totalProjectCost = purchase + repairs;
// Steve, 26 Sep 2026: the cost test is 90% of purchase plus 100% of renovation.
var ltcLimit = 0.90 * purchase + repairs;
var arvLimit = (arvPct / 100) * arv;
var stEl = document.getElementById('propertyState');
var hmEl = document.getElementById('hmlFunded');
var txHml = false; // Texas HML removed for now (22 Oct 2026)
// Steve, 1 Sep 2026: the calculation always begins at the approved advance against
// the ARV. Repairs come off it, then the lender closing costs; what is left funds the
// purchase. Short of the purchase price, the difference is cash from the borrower.
// Over it, the borrower is NOT paid a surplus - the approved advance is reduced until
// the purchase is covered exactly and nothing is due either way.
//
// Origination and title are a percentage of the loan, so trimming the loan trims them
// too. Solve it directly rather than iterating:
//     L = purchase + repairs + (pct x L) + flat   ->   L = (cost + flat) / (1 - pct)
var approvedAdvance = txHml ? arvLimit : Math.min(ltcLimit, arvLimit);
if (!(approvedAdvance > 0)) approvedAdvance = 0;
// Hazard insurance is prepaid at closing and collected by the lender (Steve, 2 Sep 2026),
// so it belongs in this settlement total. It is NOT added anywhere else - see the note on
// allInCost below. flatSettlement is the gross of every flat line; netFlatSettlement is
// what actually comes off the loan proceeds after the borrower's credit.
var flatSettlement = processingFee + underwritingFee + insurance + flood + appraisalFee +
  creditReportFee + titleInsurance + escrowFee + recordingFee + hoaTransferFee +
  surveyFee + misc1Fee + misc2Fee;
var netFlatSettlement = flatSettlement - earnestCredit;
// One month of prepaid interest is a percentage of the loan, like origination.
var pctFees = originationPct / 100 + rate / 1200;
var flatFees = netFlatSettlement;
var loanNeeded = (pctFees < 1) ? (totalProjectCost + flatFees) / (1 - pctFees) : approvedAdvance;
if (!(loanNeeded > 0)) loanNeeded = 0;
var maxLoan = Math.min(approvedAdvance, loanNeeded);
// Steve, 1 Sep 2026: express the reduction as the ARV, not as a cut to the advance.
// Solving back through the advance gives the ARV this loan is actually written on -
// the value at which the surplus disappears. It sizes the loan ONLY; the profit
// section still resells at the ARV the user entered, which is the market figure.
// A surplus can only ever arise on an HML deal: on a standard deal the 90% cost test
// holds the loan below cost, which is always below what the deal needs.
dailyInterest = maxLoan * rate / 1200;
flatSettlement += dailyInterest;
netFlatSettlement += dailyInterest;
var arvAdjusted = (approvedAdvance - maxLoan) > 0.5;
// Steve, 26 Sep 2026: ARV Applied always equals the ARV entered. A surplus is removed by
// reducing the loan advance (shown as the % on the maximum-loan line), never the ARV.
var arvApplied = arv;

var originationFee = maxLoan * (originationPct / 100);
var brokerOrigFee = maxLoan * (brokerOrigPct / 100);
// Steve, 28 Aug 2026: the client-approved broker fees are the borrower's own
// arrangement and are NOT part of the lender's closing costs. They are reported
// separately, after the cash payable to the lender. Do not fold them back in.
var lenderClosingCosts = originationFee + netFlatSettlement;
// Gross of the credit. The credit is money the borrower already spent before closing,
// so it lowers the cash due at the table but not the true cost of the project.
var grossClosingCosts = originationFee + flatSettlement;
var brokerFees = brokerOrigFee + brokerClosingFlat;

// Approved advance, less repairs, less lender closing costs = what funds the purchase.
// The trim above guarantees this never exceeds the purchase price; the Math.min is a guard.
var availableForPurchase = Math.max(maxLoan - repairs - lenderClosingCosts, 0);
availableForPurchase = Math.min(availableForPurchase, purchase);

var monthlyInterest = (maxLoan * (rate / 100)) / 12;
var monthlyTaxesHoa = (taxes + hoa) / 12;
var monthlyCarry = monthlyInterest + monthlyTaxesHoa;

// Insurance, superseding the 28 Aug 2026 treatment: the lender now REQUIRES the
// one-year policy to be prepaid at closing and collects it there (Steve, 2 Sep 2026).
// It is therefore inside flatSettlement above and must NOT be added to allInCost or
// cashInvested a second time. It stays out of the monthly carry, as before.
var cashAtClosing = Math.max(purchase - availableForPurchase, 0);
var totalCashAtClosing = cashAtClosing + brokerFees;

var hasInput = purchase > 0 || repairs > 0 || arv > 0;
var dash = '—';

// Steve, 1 Sep 2026: the downloaded PDF has to identify the deal on its face -
// property address, borrower and the ARV it was run at. The inputs column is hidden
// in print, so this header carries them. Screen-hidden, print-only.
setText('ph-address', textVal('dealAddress') || dash);
setText('ph-borrower', textVal('borrowerName') || dash);
setText('ph-arv', arv > 0 ? fmt.format(arv) : dash);
var cphApplied = document.getElementById('cph-arvApplied');
if (cphApplied) cphApplied.style.display = 'none';
setText('ph-arvApplied', arvAdjusted ? fmt.format(arvApplied) : dash);
setText('ph-arvPct', arvPct > 0 ? (arvPct + '%') : dash);
setText('ph-purchase', purchase > 0 ? fmt.format(purchase) : dash);
setText('ph-repairs', repairs > 0 ? fmt.format(repairs) : dash);
setText('ph-rate', rate > 0 ? (rate + '%') : dash);
setText('ph-date', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

var ltcRow = document.getElementById('row-ltc');
// Steve, 26 Sep 2026: show only the resulting loan amount, not the LTC test line.
if (ltcRow) ltcRow.style.display = 'none';
setText('r-ltc', hasInput ? fmt.format(ltcLimit) : dash);

// Steve, 1 Sep 2026: this row stays on screen at all times, adjusted or not, so the
// ARV the loan is actually sized on is always stated rather than inferred.
setText('r-arvApplied', hasInput && arv > 0 ? fmt.format(arvApplied) : dash);
setText('r-arvAppliedNote', !hasInput || arv <= 0 ? '' : 'As entered');

// Steve, 1 Sep 2026: one line, no explanation. A paragraph about why the advance was
// reduced reads as money withheld and invites a request for the difference as extra
// repair budget. The label states the loan carries no surplus and the rate it lands at,
// and stops there.
var effPct = (arv > 0) ? (maxLoan / arv) * 100 : 0;
var effTxt = String(Math.round(effPct * 10) / 10) + '%';
setText('r-maxLoanLabel', !txHml
  ? 'Estimated Maximum Loan (lower of LTC or ARV)'
  : (hasInput && arv > 0 && maxLoan > 0)
    ? 'Estimated Maximum Loan with No Surplus (' + effTxt + ')'
    : 'Estimated Maximum Loan with No Surplus');
setText('r-maxLoan', hasInput ? fmt.format(maxLoan) : dash);

// --- Texas: show both branches side by side (display only, no maths duplicated) ---
var stdLoan = Math.min(ltcLimit, arvLimit);
var hmlLoan = arvLimit;
var isTX = !!(stEl && stEl.value === 'TX');
var cmpEl = document.getElementById('tx-compare');
// Steve, 26 Sep 2026: the borrower picks HML or Hybrid, so the side-by-side comparison
// is no longer shown - it read as a second answer.
if (cmpEl) cmpEl.style.display = 'none';
if (isTX && hasInput && !txHml) {
  setText('r-stdLoan', fmt.format(stdLoan) + '  \u2190 shown above');
  setText('r-hmlLoan', fmt.format(hmlLoan));
  var vEl = document.getElementById('r-txVerdict');
  if (vEl) {
    var diff = hmlLoan - stdLoan;
    var msg;
    if (diff > 0.5) {
      msg = 'On this deal the HML advance is worth ' + fmt.format(diff) +
            ' more, because 70-75 percent of ARV comes in above 90 percent of purchase plus 100 percent of repairs.';
    } else {
      var needArv = (arvPct > 0) ? ltcLimit / (arvPct / 100) : 0;
      msg = 'Identical on this deal. The ARV limit is already the binding constraint, so the HML advance adds nothing here. ' +
            'It only starts to help once ARV clears about ' + fmt.format(needArv) +
            ' at a ' + arvPct + ' percent advance.';
    }
    vEl.textContent = msg + ' Estimates only, not a commitment to lend.';
  }
}
setText('r-originationFee', hasInput ? fmt.format(originationFee) : dash);
// Steve, 1 Sep 2026: disclose the rate a percentage fee is charged at, not only the dollars.
setText('r-origPctNote', originationPct > 0 ? originationPct + '% of the loan amount' : '');
setText('r-processingFee', hasInput ? fmt.format(processingFee) : dash);
setText('r-underwritingFee', hasInput ? fmt.format(underwritingFee) : dash);
setText('r-dailyInterest', hasInput ? fmt.format(dailyInterest) : dash);
setText('r-dailyIntNote', (hasInput && rate > 0) ? 'One month at ' + rate + '% on the loan' : '');
setText('r-appraisalFee', hasInput ? fmt.format(appraisalFee) : dash);
setText('r-creditReportFee', hasInput ? fmt.format(creditReportFee) : dash);
setText('r-hazardInsurance', hasInput ? fmt.format(insurance) : dash);
setText('r-floodInsurance', hasInput ? fmt.format(flood) : dash);
setText('r-titleInsurance', hasInput ? fmt.format(titleInsurance) : dash);
setText('r-escrowFee', hasInput ? fmt.format(escrowFee) : dash);
setText('r-recordingFee', hasInput ? fmt.format(recordingFee) : dash);
setText('r-hoaTransferFee', hasInput ? fmt.format(hoaTransferFee) : dash);
setText('r-surveyFee', hasInput ? fmt.format(surveyFee) : dash);
setText('r-misc1Fee', hasInput ? fmt.format(misc1Fee) : dash);
setText('r-misc2Fee', hasInput ? fmt.format(misc2Fee) : dash);
setText('r-earnestCredit', hasInput ? (earnestCredit > 0 ? '-' + fmt.format(earnestCredit) : fmt.format(0)) : dash);
setText('r-brokerOrigFee', hasInput ? fmt.format(brokerOrigFee) : dash);
setText('r-brokerClosing', hasInput ? fmt.format(brokerClosingFlat) : dash);
setText('r-closingCosts', hasInput ? fmt.format(lenderClosingCosts) : dash);
setText('r-availPurchase', hasInput ? fmt.format(availableForPurchase) : dash);
// Steve, 1 Sep 2026: echo the purchase price under the amount available so the
// subtraction that produces the cash due is visible on the page.
setText('r-purchasePriceOut', hasInput ? fmt.format(purchase) : dash);
// Nothing due reads as N/A, not as a dollar figure of zero.
setText('r-cashAtClosing', hasInput ? (cashAtClosing > 0.5 ? fmt.format(cashAtClosing) : 'N/A') : dash);
setText('r-brokerFees', hasInput ? fmt.format(brokerFees) : dash);
// Steve, 1 Sep 2026: with no broker fees this line just repeats the row above and reads
// as a duplicate. It only earns its place when the client is paying their own broker.
var totalCashRow = document.getElementById('row-totalCashClosing');
if (totalCashRow) totalCashRow.style.display = (hasInput && brokerFees > 0) ? '' : 'none';
setText('r-totalCashClosing', hasInput ? fmt.format(totalCashAtClosing) : dash);

setText('r-monthlyInterest', hasInput ? fmt.format(monthlyInterest) : dash);
setText('r-monthlyTaxesHoa', hasInput ? fmt.format(monthlyTaxesHoa) : dash);
setText('r-monthlyCarry', hasInput ? fmt.format(monthlyCarry) : dash);

// --- Liquidity required to carry the project ---
// Steve's definition, 28 Aug 2026: six months of interest-only payment plus
// 1/12 of annual taxes, PLUS one third of the repair budget. Note this
// deliberately EXCLUDES insurance and HOA, so it is not the same figure as
// 'Estimated Monthly Carry' above, which includes both. Do not "fix" that.
var liqMonthly = monthlyInterest + (taxes / 12);
var liqCarry = liqMonthly * 6;
var liqRepairs = repairs / 3;
var liqTotal = liqCarry + liqRepairs;
setText('r-liqCarry', hasInput ? fmt.format(liqCarry) : dash);
setText('r-liqRepairs', hasInput ? fmt.format(liqRepairs) : dash);
setText('r-liqTotal', hasInput ? fmt.format(liqTotal) : dash);

// --- Borrower profit calculation ---
// Assumes resale at the estimated ARV, full loan principal payoff at sale,
// and out-of-pocket carrying costs (interest + taxes + HOA) through the hold period.
// The one-year insurance premium is paid at closing, so it sits in allInCost, not holdingCost.
// Steve, 2 Sep 2026: the first month of interest is collected at closing, so it sits in
// the settlement total above. Deduct it here or the hold pays for that month twice.
// Total interest over the project is unchanged - only its timing moves.
var holdingCost = Math.max(monthlyCarry * monthsToSell - dailyInterest, 0);
var sellingCosts = arv * (sellingCostsPct / 100);
var allInCost = totalProjectCost + grossClosingCosts + brokerFees;
var netProfit = arv - sellingCosts - allInCost - holdingCost;
// The credit is added back: that money left the borrower's pocket before closing, so it
// is cash invested even though it is not cash due at the table.
var cashInvested = totalCashAtClosing + earnestCredit + holdingCost;
var roi = cashInvested > 0 ? (netProfit / cashInvested) : 0;
// Margin is measured against the sale price; ROI against the cash the borrower put in.
var margin = arv > 0 ? (netProfit / arv) : 0;

var hasProfitInput = hasInput && arv > 0;

setText('p-salePrice', hasProfitInput ? fmt.format(arv) : dash);
setText('p-allInCost', hasProfitInput ? fmt.format(allInCost) : dash);
setText('r-closingCostsGross', hasProfitInput ? fmt.format(grossClosingCosts) : dash);
setText('p-holdingCost', hasProfitInput ? fmt.format(holdingCost) : dash);
setText('p-sellingCosts', hasProfitInput ? fmt.format(sellingCosts) : dash);
setText('p-netProfit', hasProfitInput ? fmt.format(netProfit) : dash);
setText('p-cashInvested', hasProfitInput ? fmt.format(cashInvested) : dash);
setText('p-margin', hasProfitInput && arv > 0 ? pctFmt.format(margin) : dash);
setText('p-roi', hasProfitInput && cashInvested > 0 ? pctFmt.format(roi) : dash);

var netProfitEl = document.getElementById('p-netProfit');
if (netProfitEl) {
netProfitEl.classList.toggle('negative', hasProfitInput && netProfit < 0);
}
var roiEl = document.getElementById('p-roi');
if (roiEl) {
roiEl.classList.toggle('negative', hasProfitInput && roi < 0);
}
}

document.addEventListener('DOMContentLoaded', function () {
var _stSel = document.getElementById('propertyState');
var _hmSel = document.getElementById('hmlFunded');
var _hmFld = document.getElementById('hmlField');
var _note = document.getElementById('calc-state-note');
function syncTexas() {
var isTx = !!(_stSel && _stSel.value === 'TX');
if (_hmFld) _hmFld.style.display = 'none';
if (!isTx && _hmSel) _hmSel.value = '';
var _pct = document.getElementById('arvPct');
var _on = false;
if (_note) _note.style.display = _on ? '' : 'none';
calc();
}
if (_stSel) _stSel.addEventListener('change', syncTexas);
if (_hmSel) _hmSel.addEventListener('change', syncTexas);
syncTexas();
var ids = ['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct', 'propertyState', 'interestRate', 'annualTaxes', 'annualInsurance', 'annualFlood', 'annualHoa', 'originationPct', 'processingFee', 'underwritingFee', 'dailyInterest', 'appraisalFee', 'creditReportFee', 'titleInsurance', 'escrowFee', 'recordingFee', 'hoaTransferFee', 'surveyFee', 'misc1Fee', 'misc2Fee', 'earnestCredit', 'brokerOrigPct', 'brokerClosingFlat', 'monthsToSell', 'sellingCostsPct'];
ids.forEach(function (id) {
var el = document.getElementById(id);
if (el) el.addEventListener('input', calc);
});
calc();

// --- New: explicit Calculate / Recalculate + Download PDF controls ---
// Fields above already recalc live as you type; this button gives a visible,
// explicit "Calculate / Recalculate" action (e.g. after pasting values or
// using autofill), and briefly highlights itself so the click registers.
var recalcBtn = document.getElementById('calc-recalc-btn');
if (recalcBtn) {
recalcBtn.addEventListener('click', function () {
calc();
recalcBtn.classList.add('calc-flash');
setTimeout(function () { recalcBtn.classList.remove('calc-flash'); }, 350);
});
}
// --- Input display formatting -------------------------------------------------
// Steve, 1 Sep 2026: show the inputs the way the results read - dollars with a comma,
// percentages with a sign. Applied on blur and stripped on focus, so it never fights
// the caret mid-typing. Safe against the maths: calculator.js, fix-or-rent.js and
// validate.js all strip non-numeric characters before parsing, so no symbol reaches a
// calculation. A field left blank stays blank, so the required-field guard still fires.
var MONEY_INPUTS = ['purchasePrice', 'repairsBudget', 'arvEstimate', 'annualTaxes',
  'annualInsurance', 'annualFlood', 'annualHoa', 'processingFee', 'underwritingFee', 'dailyInterest', 'appraisalFee',
  'creditReportFee', 'titleInsurance', 'escrowFee', 'recordingFee', 'hoaTransferFee',
  'surveyFee', 'misc1Fee', 'misc2Fee', 'earnestCredit', 'brokerClosingFlat',
  'fr-rent', 'fr-refiCost', 'fr-other', 'liquidity'];
var PCT_INPUTS = ['arvPct', 'interestRate', 'originationPct',
  'brokerOrigPct', 'sellingCostsPct', 'fr-ltv', 'fr-rate', 'fr-vac', 'fr-maint', 'fr-mgmt'];

function rawNumber(v) {
var s = String(v == null ? '' : v).replace(/[^0-9.\-]/g, '');
if (s === '' || s === '-' || s === '.') return null;
var n = parseFloat(s);
return isNaN(n) ? null : n;
}

function attachFormat(id, kind) {
var el = document.getElementById(id);
if (!el || el.tagName !== 'INPUT') return;
el.addEventListener('focus', function () {
var n = rawNumber(el.value);
el.value = (n === null) ? '' : String(n);
});
el.addEventListener('blur', function () {
if (String(el.value).trim() === '') return;
var n = rawNumber(el.value);
if (n === null) return;
el.value = (kind === 'money')
  ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  : (Math.round(n * 1000) / 1000) + '%';
});
}

for (var mi = 0; mi < MONEY_INPUTS.length; mi++) attachFormat(MONEY_INPUTS[mi], 'money');
for (var pi = 0; pi < PCT_INPUTS.length; pi++) attachFormat(PCT_INPUTS[pi], 'pct');

var pdfBtn = document.getElementById('calc-pdf-btn');
if (pdfBtn) {
pdfBtn.addEventListener('click', function () {
calc();
window.print();
});
}

// --- Saved quotes and anonymous usage logging (2 Sep 2026) -------------------
// Two separate things, deliberately kept apart:
//   * The usage log records the SHAPE of a deal - prices, ARV, state, results -
//     so we can see whether the calculator is used at all. It never sends the
//     property address or the borrower name.
//   * A saved quote is opt-in. Only when someone clicks Save do the address,
//     the name and any email they choose to give leave this page.
var QUOTE_FLIP_IDS = ['dealAddress', 'borrowerName', 'dealEmail', 'purchasePrice', 'repairsBudget',
  'arvEstimate', 'arvPct', 'interestRate', 'propertyState', 'hmlFunded', 'annualTaxes',
  'annualHoa', 'originationPct', 'processingFee', 'underwritingFee', 'dailyInterest', 'appraisalFee',
  'creditReportFee', 'annualInsurance', 'annualFlood', 'titleInsurance', 'escrowFee', 'recordingFee',
  'hoaTransferFee', 'surveyFee', 'misc1Fee', 'misc2Fee', 'earnestCredit', 'brokerOrigPct',
  'brokerClosingFlat', 'monthsToSell', 'sellingCostsPct'];
var QUOTE_RENT_IDS = ['fr-rent', 'fr-months', 'fr-ltv', 'fr-rate', 'fr-term', 'fr-refiCost',
  'fr-vac', 'fr-maint', 'fr-mgmt', 'fr-other'];
var QUOTE_EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;
// Which fields decide whether a run is "the same deal" for logging purposes.
// Identity fields count only by presence, so typing an address one character at
// a time does not burn through the per-page log budget.
var QUOTE_SIG_IDS = ['purchasePrice', 'repairsBudget', 'arvEstimate', 'arvPct',
  'interestRate', 'propertyState', 'hmlFunded', 'monthsToSell', 'sellingCostsPct'];
var QUOTE_RESULT_IDS = ['r-arvApplied', 'r-ltc', 'r-maxLoan', 'r-stdLoan', 'r-hmlLoan',
  'r-originationFee', 'r-processingFee', 'r-underwritingFee', 'r-dailyInterest', 'r-appraisalFee',
  'r-creditReportFee', 'r-hazardInsurance', 'r-floodInsurance', 'r-titleInsurance', 'r-escrowFee',
  'r-recordingFee', 'r-hoaTransferFee', 'r-surveyFee', 'r-misc1Fee', 'r-misc2Fee',
  'r-earnestCredit', 'r-closingCosts', 'r-availPurchase', 'r-purchasePriceOut',
  'r-cashAtClosing', 'r-brokerOrigFee', 'r-brokerClosing', 'r-brokerFees',
  'r-totalCashClosing', 'r-monthlyInterest', 'r-monthlyTaxesHoa', 'r-monthlyCarry',
  'r-liqCarry', 'r-liqRepairs', 'r-liqTotal', 'p-salePrice', 'p-allInCost',
  'p-holdingCost', 'p-sellingCosts', 'p-netProfit', 'p-margin', 'p-cashInvested', 'p-roi',
  'fr-refiLoan', 'fr-cashOut', 'fr-cashLeft', 'fr-noi', 'fr-pi', 'fr-cashflow',
  'fr-dscr', 'fr-coc'];

function quoteCollect() {
var ids = QUOTE_FLIP_IDS.concat(QUOTE_RENT_IDS);
var inputs = {}, results = {}, i, el, v, t;
for (i = 0; i < ids.length; i++) {
el = document.getElementById(ids[i]);
if (!el) continue;
v = String(el.value == null ? '' : el.value).trim();
if (v) inputs[ids[i]] = v;
}
for (i = 0; i < QUOTE_RESULT_IDS.length; i++) {
el = document.getElementById(QUOTE_RESULT_IDS[i]);
if (!el) continue;
t = String(el.textContent || '').trim();
if (t && t !== '—' && t !== '-') results[QUOTE_RESULT_IDS[i]] = t;
}
return { inputs: inputs, results: results };
}

function quoteHeadline() {
var v = function (id) {
var el = document.getElementById(id);
return el ? String(el.value || '').trim() : '';
};
var bits = [];
if (v('dealAddress')) bits.push(v('dealAddress'));
if (v('purchasePrice')) bits.push(v('purchasePrice') + ' purchase');
if (v('repairsBudget')) bits.push(v('repairsBudget') + ' rehab');
if (v('arvEstimate')) bits.push(v('arvEstimate') + ' ARV');
return bits.join(' \u00b7 ').slice(0, 200);
}

// --- the usage beacon ---
var quoteLogged = {}, quoteLogCount = 0, quoteLogTimer = null;
function quoteSig(inputs, ranRental) {
var parts = [], i;
for (i = 0; i < QUOTE_SIG_IDS.length; i++) parts.push(inputs[QUOTE_SIG_IDS[i]] || '');
parts.push(inputs.dealAddress ? 'a' : '');
parts.push(inputs.borrowerName ? 'n' : '');
parts.push(QUOTE_EMAIL_RE.test(inputs.dealEmail || '') ? 'e' : '');
parts.push(ranRental ? 'r' : '');
return parts.join('|');
}
// `final` fires from the page-hide handler with the visitor's last state, so a
// half-typed address logged mid-session is always followed by the real one.
function quoteSendLog(ranRental, final) {
if (!final && quoteLogCount >= 8) return;
var snap = quoteCollect();
if (!snap.inputs.purchasePrice || !snap.inputs.repairsBudget || !snap.inputs.arvEstimate) return;
var sig = final ? 'F' + JSON.stringify(snap.inputs) : quoteSig(snap.inputs, ranRental);
if (quoteLogged[sig]) return;
quoteLogged[sig] = 1;
quoteLogCount++;
var body = JSON.stringify({ tool: 'flip', headline: quoteHeadline(), inputs: snap.inputs, results: snap.results, rental: !!ranRental });
try {
if (navigator.sendBeacon && navigator.sendBeacon('/quote/log', new Blob([body], { type: 'application/json' }))) return;
} catch (e) {}
try {
fetch('/quote/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true })['catch'](function () {});
} catch (e) {}
}
function quoteScheduleLog() {
if (quoteLogTimer) clearTimeout(quoteLogTimer);
quoteLogTimer = setTimeout(function () { quoteSendLog(false); }, 4000);
}
for (var qli = 0; qli < QUOTE_FLIP_IDS.length; qli++) {
var qlEl = document.getElementById(QUOTE_FLIP_IDS[qli]);
if (qlEl) {
qlEl.addEventListener('input', quoteScheduleLog);
qlEl.addEventListener('change', quoteScheduleLog);
}
}
if (recalcBtn) recalcBtn.addEventListener('click', function () { setTimeout(function () { quoteSendLog(false); }, 60); });
if (pdfBtn) pdfBtn.addEventListener('click', function () { quoteSendLog(false); });
var quoteFrBtn = document.getElementById('fr-run-btn');
if (quoteFrBtn) quoteFrBtn.addEventListener('click', function () { setTimeout(function () { quoteSendLog(true); }, 600); });
function quoteFinalLog() { quoteSendLog(false, true); }
window.addEventListener('pagehide', quoteFinalLog);
document.addEventListener('visibilitychange', function () {
if (document.visibilityState === 'hidden') quoteFinalLog();
});

// --- Save / Share ---
var saveBtn = document.getElementById('calc-save-btn');
var savePanel = document.getElementById('calc-save-panel');
var saveGo = document.getElementById('calc-save-go');
var saveMsg = document.getElementById('calc-save-msg');
var saveOut = document.getElementById('calc-save-out');
var saveLink = document.getElementById('calc-save-link');
var saveCopy = document.getElementById('calc-save-copy');

function quoteSay(text, kind) {
if (!saveMsg) return;
saveMsg.textContent = text || '';
saveMsg.className = 'calc-save-msg' + (kind ? ' is-' + kind : '');
}

if (saveBtn && savePanel) {
saveBtn.addEventListener('click', function () {
savePanel.hidden = !savePanel.hidden;
if (!savePanel.hidden) {
var em = document.getElementById('calc-save-email');
var formEm = document.getElementById('dealEmail');
if (em && formEm && !String(em.value).trim() && String(formEm.value).trim()) em.value = String(formEm.value).trim();
if (em) em.focus();
}
});
}

if (saveGo) {
saveGo.addEventListener('click', function () {
calc();
var snap = quoteCollect();
if (!snap.inputs.purchasePrice || !snap.inputs.arvEstimate) {
quoteSay('Enter at least a purchase price and an ARV before saving.', 'bad');
return;
}
var emEl = document.getElementById('calc-save-email');
var noteEl = document.getElementById('calc-save-note');
var hpEl = document.getElementById('calc-save-website');
var payload = {
tool: 'flip',
headline: quoteHeadline(),
inputs: snap.inputs,
results: snap.results,
email: (emEl && String(emEl.value || '').trim()) || snap.inputs.dealEmail || '',
note: noteEl ? String(noteEl.value || '').trim() : '',
website: hpEl ? String(hpEl.value || '').trim() : ''
};
saveGo.disabled = true;
quoteSay('Saving…', '');
fetch('/quote/save', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
}).then(function (r) { return r.json(); }).then(function (d) {
saveGo.disabled = false;
if (!d || !d.ok) {
quoteSay((d && d.error) || 'That did not save. Please try again, or email steve@acp-lending.com.', 'bad');
return;
}
if (saveLink) saveLink.value = d.url;
if (saveOut) saveOut.hidden = false;
quoteSay(d.notified
? 'Saved. The link is below and a copy is on its way to your inbox.'
: 'Saved. Keep the link below — it brings these figures back.', 'good');
})['catch'](function () {
saveGo.disabled = false;
quoteSay('That did not save. Please try again, or email steve@acp-lending.com.', 'bad');
});
});
}

if (saveCopy && saveLink) {
saveCopy.addEventListener('click', function () {
saveLink.select();
saveLink.setSelectionRange(0, 99999);
var done = function () {
saveCopy.textContent = 'Copied';
setTimeout(function () { saveCopy.textContent = 'Copy'; }, 1600);
};
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(saveLink.value).then(done)['catch'](function () { done(); });
} else {
try { document.execCommand('copy'); } catch (e) {}
done();
}
});
}

// --- restoring a saved quote from /quote/<ref> ---
function quoteReformat() {
var all = MONEY_INPUTS.concat(PCT_INPUTS);
for (var i = 0; i < all.length; i++) {
var el = document.getElementById(all[i]);
if (el && String(el.value).trim() !== '') {
try { el.dispatchEvent(new Event('blur')); } catch (e) {}
}
}
}
function quoteBanner(text, kind) {
var wrap = document.getElementById('calc-quote-banner');
if (!wrap) return;
wrap.textContent = text;
wrap.className = 'calc-quote-banner is-' + kind;
wrap.hidden = false;
}
var quoteMatch = /[?&]q=([a-z0-9]{10})(?:&|$)/.exec(window.location.search || '');
if (quoteMatch) {
fetch('/quote/' + quoteMatch[1] + '/data', { headers: { Accept: 'application/json' } })
.then(function (r) { return r.json(); })
.then(function (d) {
if (!d || !d.ok || !d.inputs) throw new Error('not found');
var k, el;
for (k in d.inputs) {
if (!Object.prototype.hasOwnProperty.call(d.inputs, k)) continue;
el = document.getElementById(k);
if (el) el.value = d.inputs[k];
}
quoteReformat();
syncTexas();
calc();
quoteLogged['restored'] = 1;
quoteBanner('Saved quote ' + quoteMatch[1] + ' loaded' +
(d.savedAt ? ' — saved ' + String(d.savedAt).slice(0, 10) : '') +
(d.note ? ' — note: ' + d.note : '') +
'. Change anything you like; saving again creates a new link.', 'good');
})['catch'](function () {
quoteBanner('That saved quote could not be loaded. The link may have been mistyped or cut short in an email.', 'bad');
});
}
// --- Submit Loan Request (25 Sep 2026) ----------------------------------------
// Replaces the old mailto: link, which sent the deal figures only and did nothing
// on a computer with no mail app. The request now posts to /quote/save, so it
// lands in D1 (calc_quotes) and Steve gets the notification email. The borrower
// block is required. Phone, credit, liquidity and experience are sent only on
// submit, never with the anonymous usage log.
var APPLY_REQ = ['dealAddress', 'borrowerName', 'dealEmail', 'dealPhone', 'creditScore',
  'liquidity', 'experience', 'purchasePrice', 'repairsBudget', 'arvEstimate'];
var APPLY_EXTRA = ['dealPhone', 'creditScore', 'liquidity', 'experience'];
function applyVal(id) {
var el = document.getElementById(id);
return el ? String(el.value == null ? '' : el.value).trim() : '';
}
function applyFlag(el, on) {
if (!el) return;
if (on) { el.classList.add('acp-missing'); el.style.borderColor = '#c0392b'; el.style.background = '#fff6f6'; }
else { el.classList.remove('acp-missing'); el.style.borderColor = ''; el.style.background = ''; }
}
function applySay(text, kind) {
var m = document.getElementById('calc-apply-msg');
if (!m) return;
m.textContent = text;
m.className = 'calc-save-msg' + (kind ? ' is-' + kind : '');
}
var applyForm = document.getElementById('calc-form');
var applyBtn = document.querySelector('.calc-submit');
var applySent = false;
if (applyForm) {
applyForm.addEventListener('submit', function (e) {
e.preventDefault();
if (applySent) return;
var miss = [], i, el, v;
for (i = 0; i < APPLY_REQ.length; i++) {
el = document.getElementById(APPLY_REQ[i]);
if (!el) continue;
v = applyVal(APPLY_REQ[i]);
var bad = !v;
if (!bad && APPLY_REQ[i] === 'dealEmail') bad = !QUOTE_EMAIL_RE.test(v);
if (!bad && APPLY_REQ[i] === 'dealPhone') bad = v.replace(/[^0-9]/g, '').length < 10;
applyFlag(el, bad);
if (bad) miss.push(el);
}
if (miss.length) {
applySay('Complete the ' + miss.length + ' highlighted field' + (miss.length > 1 ? 's' : '') +
  ' to submit. The property address, your contact details, credit score, liquid funds and experience are needed to review the request.', 'bad');
try { miss[0].focus(); miss[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (x) {}
return;
}
calc();
var snap = quoteCollect();
for (i = 0; i < APPLY_EXTRA.length; i++) {
v = applyVal(APPLY_EXTRA[i]);
if (v) snap.inputs[APPLY_EXTRA[i]] = v;
}
var note = ('LOAN REQUEST submitted from the deal calculator. ' +
  'Property: ' + applyVal('dealAddress') + '. ' +
  'Phone: ' + applyVal('dealPhone') + '. ' +
  'Estimated credit score: ' + applyVal('creditScore') + '. ' +
  'Estimated liquid funds: ' + applyVal('liquidity') + '. ' +
  'Flips or rentals completed, last 36 months: ' + applyVal('experience') + '.').slice(0, 500);
var payload = {
tool: 'flip',
request: true,
headline: ('LOAN REQUEST: ' + quoteHeadline()).slice(0, 200),
inputs: snap.inputs,
results: snap.results,
email: applyVal('dealEmail'),
note: note,
website: ''
};
if (applyBtn) applyBtn.disabled = true;
applySay('Sending your request…', '');
fetch('/quote/save', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
}).then(function (r) { return r.json(); }).then(function (d) {
if (!d || !d.ok) {
if (applyBtn) applyBtn.disabled = false;
applySay((d && d.error) || 'That did not go through. Please try again, or email steve@acp-lending.com or call 936-522-8951.', 'bad');
return;
}
applySent = true;
if (applyBtn) applyBtn.textContent = 'Loan Request Received';
applySay('Received. Your request (reference ' + d.ref + ') is with Steve Waller, and a copy is on its way to ' +
  applyVal('dealEmail') + '. Steve will follow up directly.', 'good');
})['catch'](function () {
if (applyBtn) applyBtn.disabled = false;
applySay('That did not go through. Please try again, or email steve@acp-lending.com or call 936-522-8951.', 'bad');
});
});
for (var ai = 0; ai < APPLY_REQ.length; ai++) {
var aEl = document.getElementById(APPLY_REQ[ai]);
if (aEl) aEl.addEventListener('input', function () { if (this.classList.contains('acp-missing') && String(this.value).trim()) applyFlag(this, false); });
if (aEl) aEl.addEventListener('change', function () { if (this.classList.contains('acp-missing') && String(this.value).trim()) applyFlag(this, false); });
}
}
});
})();
