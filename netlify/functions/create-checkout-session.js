const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

const PRODUCTS = {
  databaze: {
    envPrice: 'STRIPE_PRICE_DATABAZE',
    fallbackName: 'Kenji Databaze - dozivotni pristup',
    fallbackAmount: 149700,
    tier: 'knihovna'
  },
  academy: {
    envPrice: 'STRIPE_PRICE_ACADEMY',
    fallbackName: 'Kenji Academy - kompletni program',
    fallbackAmount: 2499700,
    tier: 'academy'
  },
  presets: {
    envPrice: 'STRIPE_PRICE_PRESETS',
    fallbackName: 'Kenjiho presety',
    fallbackAmount: 105000
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function originFromEvent(event) {
  const proto = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host;
  return process.env.SITE_URL || `${proto}://${host}`;
}

// Ověří kupón proti Supabase (get_valid_coupon, security definer, přes service role).
// Vrátí { code, percent_off } nebo null.
async function lookupCoupon(code, product) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/get_valid_coupon`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_code: clean, p_product: product })
    });
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (row && row.percent_off) return { code: row.code, percent_off: row.percent_off };
  } catch (e) {
    console.warn('lookupCoupon failed', e.message);
  }
  return null;
}

function lineItemFor(product, quantity = 1) {
  const priceId = process.env[product.envPrice];
  if (priceId) return { price: priceId, quantity };

  return {
    quantity,
    price_data: {
      currency: 'czk',
      unit_amount: product.fallbackAmount,
      product_data: { name: product.fallbackName }
    }
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

  const productKey = payload.product === 'databaze' ? 'databaze' : 'academy';
  const product = PRODUCTS[productKey];
  const origin = originFromEvent(event);
  const lineItems = [lineItemFor(product)];

  if (productKey === 'academy' && payload.includePresets) {
    lineItems.push(lineItemFor(PRODUCTS.presets));
  }

  try {
    // Náš slevový kupón (partnerské kódy z admin panelu). Ověříme proti Supabase.
    let appliedCoupon = null;
    let stripeDiscounts;
    if (payload.coupon) {
      const valid = await lookupCoupon(payload.coupon, productKey);
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
      tier: product.tier,
      source: payload.source || 'academy-page',
      ...(appliedCoupon ? { coupon: appliedCoupon } : {})
    };

    const params = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/platba-uspesna.html?session_id={CHECKOUT_SESSION_ID}`,
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
    return json(200, { url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json(500, { error: 'Checkout session could not be created' });
  }
};
