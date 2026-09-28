'use strict';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const S = require('./_stripe.js');

// Pokladna pro web (POST z nákupního modalu a prodejních stránek). Ceny, tiery
// a ověřování kupónů jsou společné s klikacím odkazem /koupit — viz _stripe.js.

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(500, { error: 'Missing STRIPE_SECRET_KEY' });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (error) {
    return json(400, { error: 'Invalid JSON payload' });
  }

  const productKey = S.productKey(payload.product) || 'academy';
  const product = S.PRODUCTS[productKey];
  const origin = S.originFromEvent(event);
  const lineItems = [S.lineItemFor(product)];

  if (productKey === 'academy' && payload.includePresets) {
    lineItems.push(S.lineItemFor(S.PRODUCTS.presets));
  }

  try {
    // Náš slevový kupón (partnerské kódy z admin panelu). Ověříme proti Supabase.
    let appliedCoupon = null;
    let stripeDiscounts;
    if (payload.coupon) {
      const valid = await S.lookupCoupon(payload.coupon, productKey);
      if (valid) {
        const c = await stripe.coupons.create({ percent_off: valid.percent_off, duration: 'once', name: valid.code });
        stripeDiscounts = [{ coupon: c.id }];
        appliedCoupon = valid.code;
      } else {
        return json(400, { error: 'Slevový kód není platný nebo vypršel.' });
      }
    }

    const meta = {
      product: productKey,
      source: payload.source || 'academy-page',
      ...(product.tier ? { tier: product.tier } : {}),
      ...(product.grantsPresets || payload.includePresets ? { presets: '1' } : {}),
      ...(appliedCoupon ? { coupon: appliedCoupon } : {})
    };

    const params = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/platba-uspesna.html?product=${productKey}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/platba-zrusena.html`,
      customer_email: payload.email || undefined,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
      metadata: meta,
      payment_intent_data: { metadata: meta }
    };
    // Stripe nedovolí discounts + allow_promotion_codes zároveň.
    if (stripeDiscounts) params.discounts = stripeDiscounts;
    else params.allow_promotion_codes = true;

    const session = await stripe.checkout.sessions.create(params);
    return json(200, { url: session.url, testMode: S.warnIfTestMode() });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json(500, { error: 'Checkout session could not be created' });
  }
};
