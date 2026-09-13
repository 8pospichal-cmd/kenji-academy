const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const Ecomail = require('./_ecomail');

function response(statusCode, body) {
  return {
    statusCode,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

// E-mail po zaplacení presetů. Bez něj má člověk v poště jen účtenku ze Stripu
// a musí si sám vzpomenout, že se má přihlásit na web. Odesílá se přes Resend
// (stejná doména jako přihlašovací odkazy). Když klíč chybí, jen se to přeskočí —
// nedoručený e-mail nikdy nesmí shodit webhook a zablokovat přidělení přístupu.
function presetEmailHtml(siteUrl) {
  const odkaz = `${siteUrl}/moje-presety.html`;
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tvoje presety jsou připravené</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Presety máš odemčené — tady je najdeš.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#141414;border:1px solid #262626;border-radius:16px;">
        <tr><td style="padding:36px 32px 0;">
          <img src="${siteUrl}/assets/logo-kenji.png" alt="Kenji Academy" width="170" height="29" style="display:block;border:0;outline:none;width:170px;height:29px;">
        </td></tr>
        <tr><td style="padding:26px 32px 0;">
          <h1 style="margin:0;font:700 25px/1.2 Helvetica,Arial,sans-serif;color:#ffffff;">Presety jsou tvoje</h1>
        </td></tr>
        <tr><td style="padding:14px 32px 0;">
          <p style="margin:0;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:#a8a8a8;">Díky za nákup. Devět presetů máš odemčených napořád — stáhneš si je kdykoli, i za dva roky na novém počítači.</p>
        </td></tr>
        <tr><td style="padding:26px 32px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td align="center" bgcolor="#ffffff" style="border-radius:10px;">
              <a href="${odkaz}" style="display:block;padding:15px 26px;font:700 15px/1 Helvetica,Arial,sans-serif;color:#0a0a0a;text-decoration:none;">Stáhnout presety →</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:26px 32px 0;">
          <p style="margin:0 0 10px;font:700 13px/1.5 Helvetica,Arial,sans-serif;color:#ffffff;">Jak na to</p>
          <p style="margin:0;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:#a8a8a8;">
            <strong style="color:#d8d8d4;">1.</strong> Klikni na tlačítko výš a přihlas se <strong style="color:#d8d8d4;">stejným e-mailem, na který ti přišel tenhle e-mail</strong>.<br>
            <strong style="color:#d8d8d4;">2.</strong> Stáhni si soubory — jednotlivě, nebo všechny naráz.<br>
            <strong style="color:#d8d8d4;">3.</strong> Pusť si video návod (3 minuty), projdeme spolu instalaci v Lightroomu i Photoshopu.
          </p>
        </td></tr>
        <tr><td style="padding:22px 32px 0;">
          <div style="padding:14px 16px;border:1px solid rgba(255,107,26,.3);border-radius:10px;background:rgba(255,107,26,.08);">
            <p style="margin:0;font:400 13.5px/1.6 Helvetica,Arial,sans-serif;color:#a8a8a8;"><strong style="color:#ff9a5c;">Bonus navíc:</strong> na stejné stránce najdeš dvě dlouhá videa, kde upravuju fotky odshora dolů — přes tři a půl hodiny.</p>
          </div>
        </td></tr>
        <tr><td style="padding:22px 32px 32px;">
          <div style="border-top:1px solid #262626;padding-top:18px;">
            <p style="margin:0;font:400 12.5px/1.6 Helvetica,Arial,sans-serif;color:#6f6f6f;">Nejde ti něco? Napiš mi na <a href="https://www.instagram.com/kenjiacademycz" style="color:#ff9a5c;">Instagram @kenjiacademycz</a> a rozchodíme to spolu.</p>
          </div>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font:400 11.5px/1.6 Helvetica,Arial,sans-serif;color:#5a5a5a;">Kenji Academy · <a href="${siteUrl}" style="color:#7a7a7a;">kenjiacademy.cz</a></p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendPresetEmail(email) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY chybi — e-mail o presetech se neodeslal.');
    return;
  }
  const siteUrl = process.env.SITE_URL || 'https://kenjiacademy.cz';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'Kenji Academy <noreply@kenjiacademy.cz>',
      to: [email],
      subject: 'Tvoje presety jsou připravené',
      html: presetEmailHtml(siteUrl)
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
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
  const body = {
    email: email.toLowerCase(),
    updated_at: new Date().toISOString(),
    ...(tier ? { tier } : {}),
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

  // Přístup je přidělený — teď dej vědět e-mailem. Selhání odesílání nesmí
  // shodit webhook, jinak by Stripe zkoušel doručení znovu a znovu.
  if (presets) {
    try { await sendPresetEmail(email); }
    catch (e) { console.warn('e-mail o presetech se neodeslal:', e.message); }
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
