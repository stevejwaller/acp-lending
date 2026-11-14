/* ACP program terms used by /rates. Updated weekly from lender pricing screens.
   Programs are listed by neutral ID only - no lender names in this public file.
   rate: lender-priced starting rate (number) or null (page shows an estimate).
   points: lender origination points or null. fees: fixed lender fees in $ or null.
   feeMin: minimum origination in $ (points apply as the greater of the two). */
window.ACP_RATES = {
  asOf: '2026-11-14',
  bridge: [
    { id: 'B1', minFico: 640, minFlips: 0, purchase: 100, rehab: 100, ltc: 95, arv: 80, maxLoan: 5000000,
      rate: null, points: null, fees: null, term: '12 months, interest-only',
      note: 'Leverage may be lower for first-time investors.' },
    { id: 'B2', minFico: 720, minFlips: 10, inState: true, purchase: 100, rehab: 100, ltc: null, arv: 75, maxLoan: 800000,
      rate: null, points: null, fees: null, term: '12 months, interest-only',
      note: 'Requires 10+ completed flips, 5 in the property state. You bring closing costs and reserves.' },
    { id: 'B3', minFico: 600, minFlips: 0, purchase: 100, rehab: 100, ltc: 93, arv: 75, maxLoan: 2000000,
      rate: null, points: null, fees: 1995, term: '6 to 18 months, interest-only',
      note: 'No appraisal on most files. Draws in about 48 hours.' },
    { id: 'B4', minFico: 650, minFlips: 0, purchase: 100, rehab: 100, ltc: null, maxLoan: 1250000,
      arvFn: function (fico, flips) { return fico >= 700 && flips >= 3 ? 75 : fico >= 700 ? 70 : 65; },
      rate: 9.99, points: 1.5, fees: null, term: '9 months plus a 3-month extension',
      note: 'Closing costs are not financed. Liquidity: the greater of $15,000 or 25% of rehab plus closing costs. No rural properties.' },
    { id: 'B5', minFico: 0, minFlips: 0, purchase: 100, rehab: 100, ltc: 92.5, arv: 80, maxLoan: 3000000,
      rate: null, points: 1, feeMin: 2000, fees: 1395, term: '12 to 24 months, interest-only',
      note: 'Leverage tiers by completed deal count.' }
  ],
  dscr: [
    { id: 'D1', minFico: 680, purchase: null, refi: null, cashout: null, minDscr: '1.00x to 1.30x',
      rate: null, rateText: 'from about 5.00% with a rate buy-down', points: null, fees: null,
      term: '30-year fixed', note: 'Sharpest pricing for strong credit and coverage.' },
    { id: 'D2', minFico: 640, purchase: 80, refi: 80, cashout: 75, minDscr: 'No minimum',
      rate: null, points: null, fees: 1995, term: '30-year fixed', note: 'Short-term rentals and rural properties allowed. 1 to 10 units.' },
    { id: 'D3', minFico: 0, purchase: 80, refi: 80, cashout: 75, minDscr: 'As low as 0.75x',
      rate: null, points: 1, feeMin: 2000, fees: 1395, term: '30-year fixed', note: 'Vacant units cap leverage at 70%.' },
    { id: 'D4', minFico: 0, purchase: 75, refi: null, cashout: null, minDscr: 'Program minimum applies',
      rate: null, points: null, fees: null, term: '30-year fixed, no balloon',
      note: 'With a seller-carried second, total financing can reach 90% of the purchase price.' },
    { id: 'D5', minFico: 0, purchase: 75, purchaseFirst: 70,
      refiFn: function (fico) { return fico >= 675 ? 75 : fico >= 650 ? 70 : fico >= 600 ? 65 : 60; },
      minDscr: 'No minimum. Vacant properties qualify on market rent.',
      rate: null, points: null, fees: null, term: '30-year fixed, 10 years interest-only available',
      note: 'No minimum credit score.' }
  ]
};
