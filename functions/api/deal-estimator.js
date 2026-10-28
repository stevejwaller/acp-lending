/**
 * Cloudflare Pages Function: Deal Estimator API
 * POST /api/deal-estimator - Handle deal estimator form submissions with auto pre-approval
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Handle POST requests
  if (request.method === 'POST') {
    try {
      const formData = await request.json();

      // Validate required fields
      const required = [
        'property_address', 'property_type', 'purchase_price', 'arv',
        'repair_budget', 'borrower_credit', 'borrower_name',
        'borrower_email', 'borrower_phone', 'loan_type', 'collateral_type',
        'collateral_locations', 'annual_property_taxes'
      ];

      for (const field of required) {
        if (!formData[field]) {
          return new Response(
            JSON.stringify({ success: false, error: `Missing ${field}` }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          );
        }
      }

      // Check pre-approval eligibility
      const fico = parseFloat(formData.borrower_credit) || 0;
      const flips = parseInt(formData.flips_36_months) || 0;
      const liquidAssets = parseFloat(formData.liquid_assets) || 0;
      const repairs = parseFloat(formData.repair_budget) || 0;
      const purchase = parseFloat(formData.purchase_price) || 0;
      const arv = parseFloat(formData.arv) || 0;
      const annualTaxes = parseFloat(formData.annual_property_taxes) || 0;

      // Calculate loan amount for pre-approval
      const getTier = (fico, flips) => {
        if (fico >= 700 && flips >= 2) return 'Elite';
        if (fico >= 650 && flips >= 1) return 'Preferred';
        if (fico >= 600 && flips >= 1) return 'Standard';
        return 'Not Qualified';
      };

      const tier = getTier(fico, flips);
      let advancePercentage = 0.90;
      if (tier === 'Elite') advancePercentage = 1.00;
      else if (tier === 'Preferred') advancePercentage = 0.95;
      else if (tier === 'Standard') advancePercentage = 0.90;

      const loanEstimate = Math.min(purchase + repairs, arv * 0.75);
      const acpOriginationFee = loanEstimate * 0.03;
      const acpSubtotal = acpOriginationFee + 2500;

      const ltcAmount = (purchase * advancePercentage) + repairs;
      const arvCapAmount = arv * 0.75;
      const loanAmount = Math.min(ltcAmount, arvCapAmount);

      const availableForPurchase = loanAmount - repairs - acpSubtotal;
      const cashDuePriorToTP = Math.max(0, purchase - availableForPurchase);

      // Estimate third-party closing costs
      const titleInsurance = loanEstimate * 0.015;
      const brokerFeePercent = 0.01; // Default 1%
      const brokerFee = loanEstimate * brokerFeePercent;
      const thirdpartySubtotal = titleInsurance + brokerFee; // Simplified estimate
      const totalDueAtClosing = cashDuePriorToTP + thirdpartySubtotal;

      // Calculate liquidity requirement
      const estimatedAnnualInterest = loanAmount * 0.10;
      const estimatedMonthlyInterest = estimatedAnnualInterest / 12;
      const repairsThird = repairs / 3;
      const sixMonthsInterest = estimatedMonthlyInterest * 6;
      const taxesHalf = annualTaxes / 2;
      const requiredLiquidity = totalDueAtClosing + repairsThird + sixMonthsInterest + taxesHalf;

      // Check pre-approval criteria
      const creditQualifies = fico >= 600;
      const liquidityQualifies = liquidAssets >= requiredLiquidity;
      const experienceQualifies = flips >= 1;
      const qualifiesForAutoPreApproval = creditQualifies && liquidityQualifies && experienceQualifies;

      // Log submission
      console.log('[Deal Estimator Submission]', {
        borrower: formData.borrower_name,
        email: formData.borrower_email,
        phone: formData.borrower_phone,
        property: formData.property_address,
        creditScore: fico,
        experience: flips,
        tier: tier,
        loanAmount: loanAmount,
        qualifiesForAutoPreApproval: qualifiesForAutoPreApproval,
        timestamp: formData.timestamp
      });

      // If qualifies, would generate and email pre-approval letter
      // TODO: Integrate with email service (Mailgun/SendGrid) + PDF generation
      if (qualifiesForAutoPreApproval) {
        console.log('[Auto Pre-Approval]', {
          borrower: formData.borrower_name,
          email: formData.borrower_email,
          loanAmount: loanAmount,
          propertyAddress: formData.property_address
        });
        // Future: Generate PDF pre-approval letter and email to borrower
      } else {
        // Flag for manual review
        console.log('[Manual Review Required]', {
          borrower: formData.borrower_name,
          email: formData.borrower_email,
          reason: `Credit: ${creditQualifies ? '✓' : '✗'}, Liquidity: ${liquidityQualifies ? '✓' : '✗'}, Experience: ${experienceQualifies ? '✓' : '✗'}`
        });
        // Future: Alert Deal Desk for Steve to review
      }

      // Return success
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Deal submitted to ACP Deal Desk. You will receive a pre-approval letter or contact from us within 24 hours.',
          submissionId: `EST-${Date.now()}`,
          tier: tier,
          loanAmount: Math.round(loanAmount),
          cashDue: Math.round(totalDueAtClosing),
          preApprovalQualified: qualifiesForAutoPreApproval
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store'
          }
        }
      );

    } catch (error) {
      console.error('Deal Estimator Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || 'Failed to process submission'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
  }

  // Method not allowed
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      'Allow': 'POST, OPTIONS'
    }
  });
}
