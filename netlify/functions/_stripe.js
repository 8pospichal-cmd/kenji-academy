'use strict';
// Sdílený základ pokladny. Ceny, tiery a slevové kupóny žijí JEN tady, ať se
// nemůže stát, že se cena změní v jednom vstupu do pokladny a ve druhém zůstane
// stará. Používá to create-checkout-session.js (POST z webu) i koupit.js (GET
// z e-mailu, Instagramu a odkudkoli mimo web).

// tier musí přesně odpovídat hodnotám, které čte web (assets/nav.js) a přiděluje
// stripe-webhook.js — Databáze je historicky 'knihovna', ne 'databaze'.
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
    fallbackAmount: 98200,      // 982 Kč (zvýhodněná cena, běžně 1 227 Kč)
    grantsPresets: true          // nedává tier, jen odemkne stažení presetů
  }
};

// České i anglické názvy produktů, ať odkaz snese /koupit/databaze i /koupit/presety.
const ALIASES = { knihovna: 'databaze', databáze: 'databaze', presety: 'presets', akademie: 'academy' };

// Vrátí klíč produktu z libovolného počtu kandidátů (cesta, parametr, …), jinak null.
function productKey() {
  for (const raw of arguments) {
    const k = String(raw == null ? '' : raw).trim().toLowerCase();
    const resolved = ALIASES[k] || k;
    if (Object.prototype.hasOwnProperty.call(PRODUCTS, resolved)) return resolved;
  }
  return null;
}

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
}

// Ecomail do odkazu vkládá *|EMAIL|*. Když se merge tag nenahradí (nebo přijde
// prázdný), nesmí to pokladnu shodit — prostě se e-mail nepředvyplní.
function cleanEmail(value) {
  const v = String(value || '').trim().toLowerCase();
  return validEmail(v) ? v : '';
}

function lineItemFor(product, quantity) {
  const priceId = process.env[product.envPrice];
  if (priceId) return { price: priceId, quantity: quantity || 1 };
  return {
    quantity: quantity || 1,
    price_data: {
      currency: 'czk',
      unit_amount: product.fallbackAmount,
      product_data: { name: product.fallbackName }
    }
  };
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

function originFromEvent(event) {
  const proto = (event.headers && event.headers['x-forwarded-proto']) || 'https';
  const host = event.headers && event.headers.host;
  return process.env.SITE_URL || `${proto}://${host}`;
}

// Testovací klíč vypadá při nákupu stejně jako ostrý, jen nestrhne peníze —
// ať to nikdy neběží nepovšimnuté.
function warnIfTestMode() {
  const test = String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');
  if (test) console.warn('POZOR: Stripe bezi v TESTOVACIM rezimu — platby se nestrhavaji.');
  return test;
}

module.exports = { PRODUCTS, productKey, validEmail, cleanEmail, lineItemFor, lookupCoupon, originFromEvent, warnIfTestMode };
