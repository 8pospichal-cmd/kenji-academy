// Transakční e-maily přes Resend (stejná doména jako přihlašovací odkazy).
// Chybějící klíč nebo nedoručený e-mail nikdy nesmí shodit volající funkci —
// sendEmail vrací true/false a chybu jen zaloguje.

function siteUrl() {
  return (process.env.SITE_URL || 'https://kenjiacademy.cz').replace(/\/$/, '');
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY chybí — e-mail „' + subject + '" se neodeslal.');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Kenji Academy <noreply@kenjiacademy.cz>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    if (!res.ok) {
      console.warn(`Resend ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Resend selhal:', e.message);
    return false;
  }
}

// Světlé rozvržení ve stylu nové prodejní stránky (zlatá na krémové).
// `body` je hotové HTML vnitřku karty, `preheader` text náhledu ve schránce.
function layout({ title, preheader, body }) {
  const site = siteUrl();
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#FBFAF6;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border:1px solid #EFE7D6;border-radius:18px;">
        <tr><td style="padding:34px 32px 0;">
          <img src="${site}/assets/academy-b/logo-dark.png" alt="Kenji Academy" width="150" height="25" style="display:block;border:0;outline:none;width:150px;height:auto;">
        </td></tr>
        ${body}
        <tr><td style="padding:22px 32px 30px;">
          <div style="border-top:1px solid #EFE7D6;padding-top:16px;">
            <p style="margin:0;font:400 12.5px/1.6 Helvetica,Arial,sans-serif;color:#8A8A92;">Máš otázku? Odpověz na tenhle e-mail, nebo napiš na <a href="https://www.instagram.com/kenjiacademycz" style="color:#8A5A14;">Instagram @kenjiacademycz</a>.</p>
          </div>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font:400 11.5px/1.6 Helvetica,Arial,sans-serif;color:#9A9AA2;">Kenji Academy · <a href="${site}" style="color:#8A8A92;">kenjiacademy.cz</a></p>
    </td></tr>
  </table>
</body></html>`;
}

function heading(text) {
  return `<tr><td style="padding:24px 32px 0;"><h1 style="margin:0;font:800 25px/1.2 Helvetica,Arial,sans-serif;color:#0E0E10;letter-spacing:-.4px;">${text}</h1></td></tr>`;
}

function paragraph(html) {
  return `<tr><td style="padding:14px 32px 0;"><p style="margin:0;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:#55555C;">${html}</p></td></tr>`;
}

function button(href, label) {
  return `<tr><td style="padding:24px 32px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
    <td align="center" bgcolor="#C8913A" style="border-radius:999px;background:#C8913A;">
      <a href="${esc(href)}" style="display:block;padding:16px 26px;font:800 15px/1 Helvetica,Arial,sans-serif;color:#0E0E10;text-decoration:none;">${label}</a>
    </td></tr></table></td></tr>`;
}

module.exports = { sendEmail, layout, heading, paragraph, button, esc, siteUrl };
