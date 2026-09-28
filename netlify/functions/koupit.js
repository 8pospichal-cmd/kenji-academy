'use strict';
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const S = require('./_stripe.js');

// Klikací vstup do pokladny. Na rozdíl od create-checkout-session.js přijímá GET,
// takže na něj jde odkázat odkudkoli mimo web — z e-mailu, z bia na Instagramu,
// ze storky, z popisku videa. Session se založí a člověk se rovnou přesměruje do
// Stripe Checkoutu; podle e-mailu, který u platby použije, mu pak stripe-webhook.js
// přidělí tier v Supabase (účet nemusí mít, řádek se založí).
//
//   /koupit                          Databáze (1 497 Kč)
//   /koupit/academy                  Academy · /koupit/presety  presety
//   /koupit?od=email-namitky         zdroj se uloží do metadat objednávky
//   /koupit?email=*|EMAIL|*          předvyplní e-mail (merge tag z Ecomailu)
//   /koupit?kod=PARTNER10            partnerská sleva ověřená proti Supabase

function redirect(url) {
  return { statusCode: 302, headers: { Location: url, 'Cache-Control': 'no-store' }, body: '' };
}

// Nikdo nesmí skončit u chybové hlášky — když se pokladna nezaloží, pošli ho na
// prodejní stránku, kde si koupí normální cestou.
function fallback(event, reason) {
  console.error('koupit.js: ' + reason);
  return redirect(`${S.originFromEvent(event)}/academy.html?upgrade=free`);
}

exports.handler = async function handler(event) {
  const origin = S.originFromEvent(event);
  const params = event.queryStringParameters || {};
  const fromPath = String(event.path || '').split('/').filter(Boolean).pop();
  const key = S.productKey(params.produkt, params.product, fromPath) || 'databaze';
  const product = S.PRODUCTS[key];

  if (!process.env.STRIPE_SECRET_KEY) return fallback(event, 'chybí STRIPE_SECRET_KEY');

  const meta = {
    product: key,
    source: String(params.od || params.source || 'odkaz').slice(0, 60),
    ...(product.tier ? { tier: product.tier } : {}),
    ...(product.grantsPresets ? { presets: '1' } : {})
  };

  try {
    // Slevový kód z odkazu. Neplatný kód nákup nezastaví — jen se neuplatní,
    // protože odkaz v e-mailu nemá kam vypsat chybu.
    let discounts;
    const kod = params.kod || params.coupon;
    if (kod) {
      const valid = await S.lookupCoupon(kod, key);
      if (valid) {
        const c = await stripe.coupons.create({ percent_off: valid.percent_off, duration: 'once', name: valid.code });
        discounts = [{ coupon: c.id }];
        meta.coupon = valid.code;
      } else {
        console.warn('koupit.js: neplatný kód ' + kod);
      }
    }

    const email = S.cleanEmail(params.email);
    const checkout = {
      mode: 'payment',
      line_items: [S.lineItemFor(product)],
      success_url: `${origin}/platba-uspesna.html?product=${key}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/platba-zrusena.html`,
      billing_address_collection: 'auto',
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === 'true' },
      metadata: meta,
      payment_intent_data: { metadata: meta }
    };
    // Předvyplněný e-mail = platba i přihlášení pod stejnou adresou. Prázdný
    // nebo nenahrazený merge tag se sem nedostane (cleanEmail).
    if (email) checkout.customer_email = email;
    // Stripe nedovolí discounts + allow_promotion_codes zároveň.
    if (discounts) checkout.discounts = discounts;
    else checkout.allow_promotion_codes = true;

    const session = await stripe.checkout.sessions.create(checkout);
    S.warnIfTestMode();
    return redirect(session.url);
  } catch (error) {
    return fallback(event, error.message);
  }
};
