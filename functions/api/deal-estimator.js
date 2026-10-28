/**
 * Cloudflare Pages Function: Deal Estimator API
 * POST /api/deal-estimator - Handle deal estimator form submissions
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

      // Format the deal data for email
      const cashDue = Math.max(0,
        (formData.purchase_price + formData.repair_budget +
         (formData.purchase_price * 0.03 + 2500) +
         (formData.repair_budget * 0.25)) -
        Math.min(
          formData.purchase_price + formData.repair_budget +
          (formData.purchase_price * 0.03 + 2500) +
          (formData.repair_budget * 0.25),
          formData.arv * 0.75
        )
      );

      const emailSubject = `New Deal Estimator Submission: ${formData.property_address}`;
      const emailBody = `
NEW DEAL ESTIMATOR SUBMISSION

Borrower Information:
- Name: ${formData.borrower_name}
- Email: ${formData.borrower_email}
- Phone: ${formData.borrower_phone}

Property Details:
- Address: ${formData.property_address}
- Type: ${formData.property_type}
- Purchase Price: $${parseInt(formData.purchase_price).toLocaleString()}
- After-Repair Value: $${parseInt(formData.arv).toLocaleString()}
- Estimated Repairs: $${parseInt(formData.repair_budget).toLocaleString()}
- Estimated Cash Due at Closing: $${parseInt(cashDue).toLocaleString()}

Borrower Credit Profile:
- FICO Score: ${formData.borrower_credit}

Submitted: ${new Date(formData.timestamp).toLocaleString('en-US', {timeZone: 'America/Chicago'})}

NEXT STEPS:
1. Review deal information in Deal Desk
2. Generate full Deal Analysis Report ($99)
3. Send summary + report offer email to borrower
4. Follow up with borrower at phone number above

---
Contact borrower at: ${formData.borrower_phone} or ${formData.borrower_email}
`;

      // Send alert email to Steve using Mailgun API (or Gmail via worker binding if available)
      // For now, we'll store this in a KV namespace or just log it
      // In production, integrate with email service (Mailgun, SendGrid, etc.)

      try {
        // If you have Mailgun configured in env, uncomment and use:
        // const mgResponse = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
        //   method: 'POST',
        //   headers: { 'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}` },
        //   body: new URLSearchParams({
        //     from: 'noreply@acp-lending.com',
        //     to: 'steve@acp-lending.com',
        //     subject: emailSubject,
        //     text: emailBody
        //   })
        // });

        // For now, log to console (visible in Cloudflare logs)
        console.log('[Deal Estimator] New submission:', {
          borrower: formData.borrower_name,
          email: formData.borrower_email,
          phone: formData.borrower_phone,
          property: formData.property_address,
          timestamp: formData.timestamp
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the submission if email fails
      }

      // Return success
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Deal submitted to Deal Desk. Steve will contact you within 24 hours.',
          submissionId: `EST-${Date.now()}`,
          estimatedCashDue: Math.round(cashDue)
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
