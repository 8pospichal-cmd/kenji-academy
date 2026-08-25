const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

function response(statusCode, body) {
  return {
    statusCode,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

async function grantAccess(session) {
  const email = session.customer_details && session.customer_details.email;
  const tier = session.metadata && session.metadata.tier;

  if (!email || !tier) return;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Payment succeeded, but Supabase service credentials are missing.');
    return;
  }

  const endpoint = `${process.env.SUPABASE_URL}/rest/v1/users`;
  const body = {
    email: email.toLowerCase(),
    tier,
    updated_at: new Date().toISOString()
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase grant failed: ${res.status} ${text}`);
  }

  // Použitý slevový kupón → zvýšit počítadlo (best-effort, neblokuje grant).
  const coupon = session.metadata && session.metadata.coupon;
  if (coupon) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/increment_coupon_use`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_code: coupon })
      });
    } catch (e) {
      console.warn('increment_coupon_use failed', e.message);
    }
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return response(405, 'Method not allowed');
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return response(500, 'Stripe webhook env is missing');
  }

  const signature = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return response(400, `Webhook Error: ${error.message}`);
  }

  try {
    if (stripeEvent.type === 'checkout.session.completed') {
      await grantAccess(stripeEvent.data.object);
    }
  } catch (error) {
    console.error('Webhook handling failed:', error);
    return response(500, 'Webhook handler failed');
  }

  return response(200, 'ok');
};
