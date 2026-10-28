const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const Ecomail = require('./_ecomail');
const Mail = require('./_mail');

function response(statusCode, body) {
  return {
    statusCode,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

// E-mail po zaplacení presetů. Bez něj má člověk v poště jen účtenku ze Stripu
// a musí si sám vzpomenout, že se má přihlásit na web. Stejný světlý vzhled jako
// ostatní e-maily (_mail.js); nedoručený e-mail nikdy nesmí shodit webhook.
function presetEmailHtml() {
  const odkaz = `${Mail.siteUrl()}/moje-presety.html`;
  const body = Mail.heading('Presety jsou tvoje')
    + Mail.paragraph('Díky za nákup. Devět presetů máš odemčených napořád — stáhneš si je kdykoli, i za dva roky na novém počítači.')
    + Mail.button(odkaz, 'Stáhnout presety →')
    + Mail.paragraph('<strong style="color:#0E0E10;">Jak na to</strong><br>'
      + '1. Klikni na tlačítko a přihlas se <strong style="color:#0E0E10;">stejným e-mailem, na který ti přišel tenhle e-mail</strong>.<br>'
      + '2. Stáhni si soubory — jednotlivě, nebo všechny naráz.<br>'
      + '3. Pusť si video návod (3 minuty), projdeme spolu instalaci v Lightroomu i Photoshopu.')
    + Mail.paragraph('<strong style="color:#8A5A14;">Bonus navíc:</strong> na stejné stránce najdeš dvě dlouhá videa, kde upravuju fotky odshora dolů — přes tři a půl hodiny.');
  return Mail.layout({ title: 'Tvoje presety jsou připravené', preheader: 'Presety máš odemčené — tady je najdeš.', body });
}

async function sendPresetEmail(email) {
  return Mail.sendEmail({ to: email, subject: 'Tvoje presety jsou připravené', html: presetEmailHtml() });
}

// Uvítání po nákupu Academy nebo Databáze. Odkaz vede na stránku po platbě,
// která podle session_id předvyplní e-mail a pošle přihlašovací odkaz — člověk
// se tak dostane dovnitř, i když stránku po platbě zavřel.
const WELCOME = {
  academy: {
    name: 'Kenji Academy', heading: 'Vítej v Kenji Academy', product: 'academy',
    subject: 'Vítej v Kenji Academy — tady je vstup',
    what: 'Máš odemčené všechny kurzy, komunitu, databázi, Kenji AI i bonusy. Napořád.'
  },
  knihovna: {
    name: 'Databázi', heading: 'Databáze je tvoje', product: 'databaze',
    subject: 'Databáze je tvoje — tady je vstup',
    what: 'Máš odemčenou celou databázi praktických článků. Napořád.'
  }
};

// Koupil-li k Academy i presety, dostane jeden e-mail se zmínkou o presetech,
// ne dva vedle sebe.
function welcomeEmailHtml(tier, sessionId, withPresets) {
  const w = WELCOME[tier];
  const link = `${Mail.siteUrl()}/platba-uspesna.html?product=${w.product}&session_id=${encodeURIComponent(sessionId)}`;
  const body = Mail.heading(w.heading)
    + Mail.paragraph(`Díky, platba proběhla. ${w.what}`)
    + Mail.button(link, 'Vstoupit dovnitř →')
    + Mail.paragraph('<strong style="color:#0E0E10;">Jak se přihlásit:</strong> klikni na tlačítko a nech si poslat přihlašovací odkaz. Přihlas se <strong style="color:#0E0E10;">stejným e-mailem, na který ti přišel tenhle e-mail</strong>, přístup je přiřazený k němu.')
    + (withPresets ? Mail.paragraph(`<strong style="color:#0E0E10;">Presety:</strong> máš je taky odemčené. Po přihlášení je stáhneš v sekci <a href="${Mail.siteUrl()}/moje-presety.html" style="color:#8A5A14;">Moje presety</a>.`) : '');
  return Mail.layout({ title: `Vítej v ${w.name}`, preheader: 'Přístup máš odemčený. Tady je, jak se dostaneš dovnitř.', body });
}

async function markPlanRequestBought(email) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/plan_requests?email=eq.${encodeURIComponent(email)}&status=neq.koupil`, {
      method: 'PATCH',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ status: 'koupil' })
    });
  } catch (e) { console.warn('plan_requests: označení nákupu selhalo:', e.message); }
}

// Záznam objednávky pro admin (Prodej, karta člověka). Selhání nesmí shodit
// webhook — přístup už je přidělený a Stripe by doručení zkoušel znovu.
async function recordOrder(session, email, meta) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?on_conflict=stripe_session_id`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        stripe_session_id: session.id,
        email: email.toLowerCase(),
        product: meta.product || null,
        tier: meta.tier || null,
        presets: meta.presets === '1',
        amount_total: typeof session.amount_total === 'number' ? Math.round(session.amount_total / 100) : null,
        currency: session.currency || null,
        coupon: meta.coupon || null,
        source: meta.source || null
      })
    });
    if (!res.ok) console.warn('orders: zápis selhal', res.status, await res.text());
  } catch (e) { console.warn('orders: zápis selhal:', e.message); }
}

async function grantAccess(session) {
  const email = session.customer_details && session.customer_details.email;
  const meta = session.metadata || {};
  const tier = meta.tier;
  const presets = meta.presets === '1';

  // Presety se kupují i samostatně — ty nemají tier, ale přístup přidělit musíme.
  if (!email || (!tier && !presets)) return;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Payment succeeded, but Supabase service credentials are missing.');
    return;
  }

  const endpoint = `${process.env.SUPABASE_URL}/rest/v1/users`;
  // Člen Academy, který si dokoupí Databázi, nesmí spadnout na nižší tier.
  let grantTier = tier;
  if (tier === 'knihovna') {
    try {
      const cur = await fetch(`${endpoint}?email=eq.${encodeURIComponent(email.toLowerCase())}&select=tier`, {
        headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }
      });
      const rows = cur.ok ? await cur.json() : [];
      if (Array.isArray(rows) && rows[0] && rows[0].tier === 'academy') grantTier = 'academy';
    } catch (e) { console.warn('stripe-webhook: kontrola tieru selhala:', e.message); }
  }
  const body = {
    email: email.toLowerCase(),
    updated_at: new Date().toISOString(),
    ...(grantTier ? { tier: grantTier } : {}),
    ...(presets ? { has_presets: true } : {})
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
  await recordOrder(session, email, meta);

  // Přístup je přidělený — teď dej vědět e-mailem. Selhání odesílání nesmí
  // shodit webhook, jinak by Stripe zkoušel doručení znovu a znovu.
  if (WELCOME[tier]) {
    const sent = await Mail.sendEmail({ to: email, subject: WELCOME[tier].subject, html: welcomeEmailHtml(tier, session.id, presets) });
    console.log(`stripe-webhook: přístup ${tier}${presets ? ' + presety' : ''} pro objednávku ${session.id}, uvítací e-mail ${sent ? 'odeslán' : 'NEODESLÁN'}`);
    await markPlanRequestBought(email.toLowerCase());
  } else if (presets) {
    const sent = await sendPresetEmail(email);
    console.log(`stripe-webhook: presety pro objednávku ${session.id}, e-mail ${sent ? 'odeslán' : 'NEODESLÁN'}`);
  }

  // Nákup promítni i do marketingového profilu, ale jen pokud už má člověk
  // platný marketingový souhlas. Selhání Ecomailu nikdy nesmí zdržet přístup.
  if (Ecomail.requiredEnv()) {
    try {
      const row = await Ecomail.userRow(email);
      if (Ecomail.canMarket(row)) {
        await Ecomail.syncContact(row);
        await Ecomail.trackerEvent(row, 'purchase.completed', { tier: tier || '', presets: presets });
      }
    } catch (e) { console.warn('Ecomail purchase sync failed:', e.message); }
  }

  // Použitý slevový kupón → zvýšit počítadlo (best-effort, neblokuje grant).
  const coupon = meta.coupon;
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
