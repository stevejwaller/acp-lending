console.log('deal-analyzer.js loaded');

const form = document.getElementById('analyzerForm');
const submitBtn = document.getElementById('submitBtn');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');

console.log('Elements found:', {
  form: !!form,
  submitBtn: !!submitBtn,
  loading: !!loading,
  errorDiv: !!errorDiv,
  successDiv: !!successDiv
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';
  submitBtn.disabled = true;
  loading.style.display = 'block';

  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    // Parse numbers
    const purchasePrice = parseFloat(data.purchasePrice) || 0;
    const arv = parseFloat(data.arv) || 0;
    const repairs = parseFloat(data.repairs) || 0;
    const closingCostPercent = (parseFloat(data.closingCosts) || 3) / 100;

    if (!purchasePrice || !arv || !repairs) {
      throw new Error('Purchase price, ARV, and repairs are required');
    }

    // Calculate financing at 70% and 75%
    const advance70 = arv * 0.70;
    const advance75 = arv * 0.75;

    const closingCosts70 = advance70 * closingCostPercent;
    const closingCosts75 = advance75 * closingCostPercent;

    const maxPurchase70 = advance70 - repairs - closingCosts70;
    const maxPurchase75 = advance75 - repairs - closingCosts75;

    const cashDueAtClosing70 = Math.max(0, purchasePrice - maxPurchase70);
    const cashDueAtClosing75 = Math.max(0, purchasePrice - maxPurchase75);

    const walkAwayCeiling = Math.max(Math.round(maxPurchase70), Math.round(maxPurchase75));

    // Generate report HTML
    const reportHTML = generateDealBook({
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      subdivision: data.subdivision,
      purchasePrice,
      arv,
      repairs,
      advance70: Math.round(advance70),
      advance75: Math.round(advance75),
      closingCosts70: Math.round(closingCosts70),
      closingCosts75: Math.round(closingCosts75),
      maxPurchase70: Math.max(0, Math.round(maxPurchase70)),
      maxPurchase75: Math.max(0, Math.round(maxPurchase75)),
      walkAwayCeiling,
      cashDueAtClosing70: Math.round(cashDueAtClosing70),
      cashDueAtClosing75: Math.round(cashDueAtClosing75),
      sqft: data.sqft,
      yearBuilt: data.yearBuilt,
      propertyDescription: data.propertyDescription,
      repairDetails: data.repairDetails
    });

    // Create downloadable file
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `deal-summary-${data.address.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    link.remove();

    successDiv.textContent = 'Report generated successfully! Open the HTML file in your browser. To save as PDF: Print (Ctrl+P / Cmd+P) and select "Save as PDF".';
    successDiv.style.display = 'block';
    form.reset();
  } catch (err) {
    errorDiv.textContent = 'Error: ' + err.message;
    errorDiv.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    loading.style.display = 'none';
  }
});

function generateDealBook(data) {
  const {
    address, city, state, zip, purchasePrice, arv, repairs,
    advance70, advance75, closingCosts70, closingCosts75,
    maxPurchase70, maxPurchase75, walkAwayCeiling,
    cashDueAtClosing70, cashDueAtClosing75,
    sqft, yearBuilt, propertyDescription, repairDetails
  } = data;

  // Executive summary narrative
  const gap75 = Math.round(purchasePrice - maxPurchase75);
  const summaryText = gap75 > 0
    ? `Our review supports the $${arv.toLocaleString()} ARV. With repairs now $${repairs.toLocaleString()}, the $${purchasePrice.toLocaleString()} price is $${gap75.toLocaleString()} over the most the numbers support. The numbers support an offer of $${Math.round(maxPurchase75).toLocaleString()} with a walk-away ceiling of $${walkAwayCeiling.toLocaleString()}.`
    : `Our review supports the $${arv.toLocaleString()} ARV. With repairs estimated at $${repairs.toLocaleString()}, the $${purchasePrice.toLocaleString()} purchase price is supportable.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Executive Summary - ${address}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      background: white;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 30px; }
    .header {
      border-bottom: 3px solid #001a4d;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-title { font-size: 24px; color: #001a4d; font-weight: 700; }
    .address { color: #666; font-size: 13px; margin-top: 4px; }
    .executive-summary {
      background: #f9f9f9;
      border-left: 4px solid #c9974a;
      padding: 16px;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 30px;
    }
    .metric {
      background: #f9f9f9;
      border-left: 4px solid #c9974a;
      padding: 14px;
    }
    .metric-label { font-size: 11px; color: #999; text-transform: uppercase; }
    .metric-value { font-size: 18px; color: #001a4d; font-weight: 700; margin-top: 6px; }
    .metric-value.negative { color: #c33; }
    .section-header {
      font-size: 13px;
      color: #001a4d;
      border-bottom: 2px solid #c9974a;
      padding-bottom: 8px;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    th {
      background: #f0f0f0;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
    }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    .section { margin-bottom: 36px; page-break-inside: avoid; }
    .footer {
      font-size: 11px;
      color: #999;
      text-align: center;
      padding-top: 20px;
      margin-top: 40px;
      border-top: 1px solid #eee;
    }
    .page-break { page-break-after: always; margin: 40px 0; }
    @page { margin: 0.5in; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <div class="container">
    <!-- COVER PAGE -->
    <div class="header">
      <div style="font-size: 12px; color: #001a4d; margin-bottom: 8px;">ACP REAL ESTATE LENDING | Deal Analysis, ARV, Repairs, Slotting — ${new Date().toLocaleDateString()}</div>
      <div class="header-title">${address}, ${city}, ${state} ${zip}</div>
    </div>

    <div class="executive-summary">
      ${summaryText}
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">ARV</div>
        <div class="metric-value">$${arv.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Repairs</div>
        <div class="metric-value">$${repairs.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Offer</div>
        <div class="metric-value">$${Math.round(maxPurchase75).toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Walk-Away</div>
        <div class="metric-value">$${walkAwayCeiling.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Price</div>
        <div class="metric-value">$${purchasePrice.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Seller's ARV</div>
        <div class="metric-value">$${arv.toLocaleString()}</div>
      </div>
    </div>

    <!-- Property Details -->
    <div class="section">
      <div class="section-header">Property</div>
      ${propertyDescription ? `<p>${propertyDescription}</p><p style="margin-top: 10px;">` : '<p>'}
      ${sqft ? `Square feet: ${parseInt(sqft).toLocaleString()} SF` : ''}
      ${sqft && yearBuilt ? '<br>' : ''}
      ${yearBuilt ? `Built: ${yearBuilt}` : ''}
      </p>
    </div>

    <!-- After-Repair Value -->
    <div class="section">
      <div class="section-header">After-Repair Value — $${arv.toLocaleString()}</div>
      <p>ARV estimate based on subdivision comps (PropertyReach integration pending) — minimum 20 closed sales, same subdivision only, within 20% of subject size and configuration.</p>
    </div>

    <!-- Financing -->
    <div class="section">
      <div class="section-header">Supported Purchase Price — 70% and 75% of ARV</div>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>70% ARV</th>
            <th>75% ARV</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ARV Advance</td>
            <td>$${advance70.toLocaleString()}</td>
            <td>$${advance75.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Less: Repairs</td>
            <td>-$${repairs.toLocaleString()}</td>
            <td>-$${repairs.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Less: Closing Costs</td>
            <td>-$${closingCosts70.toLocaleString()}</td>
            <td>-$${closingCosts75.toLocaleString()}</td>
          </tr>
          <tr style="background: #f0f0f0; font-weight: 600;">
            <td>Maximum Purchase Price</td>
            <td>$${maxPurchase70.toLocaleString()}</td>
            <td>$${maxPurchase75.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Target Purchase Price</td>
            <td>$${purchasePrice.toLocaleString()}</td>
            <td>$${purchasePrice.toLocaleString()}</td>
          </tr>
          <tr style="background: #fde4e4; color: #c33; font-weight: 600;">
            <td>Cash Due at Closing</td>
            <td>$${cashDueAtClosing70.toLocaleString()}</td>
            <td>$${cashDueAtClosing75.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="page-break"></div>

    <!-- Repairs (Exhibit) -->
    ${repairDetails ? `<div class="section">
      <div class="section-header">Exhibit A — Repair Breakdown</div>
      <pre style="font-family: inherit; white-space: pre-wrap; background: #f9f9f9; padding: 14px; border-radius: 4px; font-size: 12px;">${repairDetails}</pre>
      <p style="margin-top: 14px; font-size: 12px;"><strong>Total Estimated Repairs:</strong> $${repairs.toLocaleString()}</p>
    </div>` : ''}

    <!-- Lender Options (Placeholder for Matrix) -->
    <div class="section">
      <div class="section-header">Best Financing Options</div>
      <p style="font-size: 12px; color: #666; margin-bottom: 14px;">Lender matrix comparison coming with PropertyReach API integration. Will show cash due at closing for each lender option (ACP-K, ACP-R, ACP-E, ACP-F, ACP-L).</p>
      <table>
        <thead>
          <tr>
            <th>Lender Option</th>
            <th>Loan Amount</th>
            <th>Cash @ 1031k</th>
            <th>Cash @ 138k</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="5" style="text-align: center; color: #999; padding: 20px;">PropertyReach API integration pending — will auto-populate lender options and pricing</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>ACP Real Estate Lending</strong> | Steve Waller | steve@acp-lending.com | 936-522-8951 | acp-lending.com</p>
      <p>This analysis is ACP's review of public record and MLS data. It is not an appraisal or a commitment to lend. Business-purpose investment financing only.</p>
      <p style="margin-top: 14px; font-size: 10px;">Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
  </div>
</body>
</html>`;
}
