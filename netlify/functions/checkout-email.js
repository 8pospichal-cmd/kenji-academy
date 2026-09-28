'use strict';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');

// Po platbě se člověk přihlašuje e-mailem, pod kterým zaplatil — tier mu na něj
// přidělil stripe-webhook.js. Když ho přepíše překlepem nebo použije jinou adresu,
// přihlásí se do prázdného účtu a myslí si, že nákup nedorazil. Tahle funkce proto
// vrátí e-mail z dokončené Stripe session, aby ho platba-uspesna.html předvyplnila.
//
//   /.netlify/functions/checkout-email?session_id=cs_live_…  →  { "email": "…" }
//
// Session ID zná jen kupující (přišlo mu v adrese po platbě) a vrací se z něj
// jediný údaj, navíc jen u zaplacené objednávky.

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function handler(event) {
  const id = (event.queryStringParameters || {}).session_id || '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json(400, { error: 'Bad session id' });
  if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Missing STRIPE_SECRET_KEY' });

  try {
    const session = await stripe.checkout.sessions.retrieve(id);
    if (!session || session.payment_status !== 'paid') return json(404, { error: 'Not paid' });
    const email = (session.customer_details && session.customer_details.email) || '';
    return json(200, { email: String(email).toLowerCase() });
  } catch (error) {
    console.warn('checkout-email:', error.message);
    return json(404, { error: 'Not found' });
  }
};
