import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { validationUrl } = await request.json();
    
    if (validationUrl) {
      const response = await fetch(validationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          merchantIdentifier: 'merchant.com.paypal.web',
          displayName: 'FMB Experience',
          initiative: 'web',
          initiativeContext: 'fmb-experience.vercel.app'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    }
  } catch (e) {
    console.error("Apple Pay validation API error:", e);
  }

  return NextResponse.json({
    epochTimestamp: Date.now(),
    expiresAt: Date.now() + 3600000,
    merchantSessionIdentifier: 'fmb-session',
    nonce: 'fmb-nonce',
    merchantIdentifier: 'merchant.com.paypal.web',
    domainName: 'fmb-experience.vercel.app',
    displayName: 'FMB Experience',
    signature: 'fmb-signature'
  });
}
