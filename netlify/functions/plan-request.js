// Odpovědi z „plánu na míru" (plan-na-miru.html): uloží je do Supabase
// (tabulka plan_requests, jen service role) a pošle dva e-maily přes Resend:
// zájemci jeho plán a týmu upozornění se všemi odpověďmi, ať se mu ozve.
const Mail = require('./_mail');

const OBORY = {
  svatby: 'Svatby', rodina: 'Rodinné focení', lifestyle: 'Lifestyle', portret: 'Portrét',
  plesy: 'Plesy a eventy', reality: 'Nemovitosti', produkty: 'Produktovky', video: 'Video a reels',
  sport: 'Sport', nevim: 'Ještě neví'
};
const LEVELS = { zacinam: 'Začíná (méně než rok)', '1-3': 'Rozjíždí to (1–3 roky)', '3-5': 'Profík (3–5 let)', '5+': 'Veterán (5+ let)' };
const JOBS = { 0: '0', '1-2': '1–2', '3-5': '3–5', '6-10': '6–10', '10+': '10+' };
const BLOCKERS = {
  cena: 'Neví, kolik si říct', klienti: 'Nemá dost klientů', nabidka: 'Neví, co nabízet',
  portfolio: 'Slabé portfolio', chaos: 'Chaos v zakázkách', technika: 'Technika a úpravy fotek'
};
const GOALS = [20000, 40000, 60000, 100000];
const HOURS = [2, 5, 10, 20];

function reply(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

function str(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function kc(n) {
  return Math.round(n).toLocaleString('cs-CZ').replace(/ /g, ' ') + ' Kč';
}

// Vstup z prohlížeče se nikdy nebere za bernou minci: povolené hodnoty a délky.
function clean(raw) {
  const errors = [];
  const name = str(raw.name, 60);
  const email = str(raw.email, 160).toLowerCase();
  const phone = str(raw.phone, 30);
  const instagram = str(raw.instagram, 60).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (name.length < 2) errors.push('name');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('email');
  if (phone.replace(/\D/g, '').length < 9) errors.push('phone');
  if (!/^[a-z0-9._]{2,30}$/i.test(instagram)) errors.push('instagram');

  const obory = (Array.isArray(raw.obory) ? raw.obory : []).filter((o) => OBORY[o]).slice(0, 3);
  const level = LEVELS[raw.level] ? raw.level : null;
  const jobs = Object.prototype.hasOwnProperty.call(JOBS, raw.jobs) ? String(raw.jobs) : null;
  const price = Math.min(40000, Math.max(1000, Math.round(Number(raw.price) || 0)));
  const blockers = (Array.isArray(raw.blockers) ? raw.blockers : []).filter((b) => BLOCKERS[b]).slice(0, 2);
  const goal = GOALS.includes(Number(raw.goal)) ? Number(raw.goal) : null;
  const hours = HOURS.includes(Number(raw.hours)) ? Number(raw.hours) : null;
  const plan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
  const phases = (Array.isArray(plan.phases) ? plan.phases : []).slice(0, 3).map((p) => ({
    title: str(p && p.title, 80),
    items: (Array.isArray(p && p.items) ? p.items : []).slice(0, 3).map((t) => str(t, 80))
  }));

  return {
    errors,
    row: {
      name, email, phone, instagram,
      obory, level, jobs, price, blockers, goal, hours,
      marketing_consent: raw.marketing === true,
      source: str(raw.source, 40) || null,
      plan: { phases, weeks: Math.max(0, Math.min(99, Number(plan.weeks) || 0)) }
    }
  };
}

async function store(row) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('plan-request: chybí Supabase klíče, odpovědi se neuložily.');
    return false;
  }
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/plan_requests`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(row)
  });
  if (!res.ok) {
    console.warn(`plan-request: Supabase ${res.status}: ${await res.text()}`);
    return false;
  }
  return true;
}

// Osobní e-mail od Kenjiho: prostý text bez grafiky, postavený z odpovědí.
// Věty o zájemci jsou bez rodu, sedí na muže i ženy.
const OBORY_VETA = {
  svatby: 'svatby', rodina: 'rodinné focení', lifestyle: 'lifestyle', portret: 'portréty',
  plesy: 'plesy a eventy', reality: 'nemovitosti', produkty: 'produktovky', video: 'video a reels', sport: 'sport'
};
const BRZDA_VETA = {
  cena: 'nevíš, kolik si říct', klienti: 'máš málo klientů', nabidka: 'nevíš, co přesně nabízet',
  portfolio: 'portfolio zatím neprodává tak, jak by mělo', chaos: 'máš v zakázkách chaos',
  technika: 'technika a úpravy fotek ti berou moc času'
};
const CHYBI = {
  cena: 'jednoduchý systém, jak si říct o férovou cenu a obhájit ji',
  klienti: 'systém, díky kterému chodí poptávky pravidelně, ne jen náhodou',
  nabidka: 'jasná nabídka, které klient porozumí za deset vteřin',
  portfolio: 'portfolio, které ukazuje přesně tu práci, kterou chtějí prodávat',
  chaos: 'postup, díky kterému jim zakázky neberou všechen volný čas',
  technika: 'workflow, které zkrátí úpravy na zlomek času'
};

function aJoin(list) {
  return list.length < 2 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' a ' + list[list.length - 1];
}
function tydnu(n) { return n === 1 ? '1 týden' : n < 5 ? n + ' týdny' : n + ' týdnů'; }

function leadMessage(row) {
  const site = Mail.siteUrl();
  const obory = row.obory.map((o) => OBORY_VETA[o]).filter(Boolean);
  const brzdy = row.blockers.map((b) => BRZDA_VETA[b]);
  const hlavni = row.blockers[0] || 'klienti';
  const cil = row.goal ? (row.goal >= 100000 ? kc(row.goal) + ' a víc' : kc(row.goal)) + ' měsíčně' : '';
  const kdeJsi = (obory.length ? 'Fotíš ' + aJoin(obory) : 'Ještě hledáš, co přesně fotit')
    + ', za zakázku si říkáš kolem ' + kc(row.price)
    + (cil ? ' a chceš se dostat na ' + cil : '') + '.'
    // „nevíš, kolik si říct" je vedlejší věta: před dalším „a" patří čárka.
    + (brzdy.length ? ' Nejvíc tě teď brzdí, že ' + (brzdy.length > 1 && brzdy[0].includes(',') ? brzdy[0] + ', a ' + brzdy[1] : aJoin(brzdy)) + '.' : '');
  const phases = row.plan.phases.filter((p) => p.title);
  const hodiny = row.hours ? (row.hours >= 20 ? '20 a víc hodin' : row.hours + (row.hours < 5 ? ' hodiny' : ' hodin')) : '';
  const delka = hodiny && row.plan.weeks && phases.length ? `Když tomu dáš ${hodiny} týdně, máš plán prošlý zhruba za ${tydnu(row.plan.weeks)}.` : '';
  const ig = '@' + row.instagram;
  return {
    greeting: `Ahoj ${row.name},`,
    paragraphs: [
      'díky za vyplnění. Tvoje odpovědi jsem si prošel a tady je, co z nich vidím.',
      kdeJsi,
      `Tohle je místo, kde se zasekne většina fotografů. Talent jim nechybí. Chybí jim ${CHYBI[hlavni]}. Dá se to naučit a nemusí to trvat roky.`
    ],
    planIntro: 'Na tvém místě bych začal takhle:',
    phases,
    afterPlan: delka,
    next: `do dvou pracovních dnů ti napíšu na Instagram na ${ig}. Mrkni prosím i do Žádostí o zprávy. Zatím se nesledujeme, tak tam Instagram zprávy schovává. Probereme, jestli ti Academy dává smysl, a když ne, poradím ti, co dělat i bez ní.`,
    reply: 'Kdyby tě mezitím cokoli napadlo, prostě odpověz na tenhle e-mail. Čtu je sám.',
    ps: `Jestli chceš mezitím vidět, co v Academy je, podívej se na ${site.replace(/^https?:\/\//, '')}/academy`,
    academyUrl: `${site}/academy`
  };
}

function leadEmail(row) {
  const m = leadMessage(row);
  const p = (html, extra) => `<p style="margin:0 0 16px;${extra || ''}">${html}</p>`;
  const phases = m.phases.length
    ? p(`<strong>${Mail.esc(m.planIntro)}</strong>`) + `<ol style="margin:0 0 16px;padding-left:22px;">${m.phases.map((ph) =>
      `<li style="margin:0 0 8px;"><strong>${Mail.esc(ph.title)}</strong>${ph.items.length ? ' · <span style="color:#55555C;">' + Mail.esc(ph.items.join(', ')) + '</span>' : ''}</li>`).join('')}</ol>`
    : '';
  const body = p(Mail.esc(m.greeting))
    + m.paragraphs.map((t) => p(Mail.esc(t))).join('')
    + phases
    + (m.afterPlan ? p(Mail.esc(m.afterPlan)) : '')
    + p('<strong>Co bude dál:</strong> ' + Mail.esc(m.next))
    + p(Mail.esc(m.reply))
    + p('Měj se,<br><strong>Kenji</strong><br><span style="font-size:14px;color:#6b6a72;">Kenji Academy · <a href="https://www.instagram.com/kenjiacademycz" style="color:#8A5A14;">@kenjiacademycz</a></span>')
    + p(`P.S. Jestli chceš mezitím vidět, co v Academy je, podívej se na <a href="${m.academyUrl}" style="color:#8A5A14;">kenjiacademy.cz/academy</a>.`, 'padding-top:14px;border-top:1px solid #ECE7DB;font-size:14px;color:#55555C;');
  return `<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tvůj plán na míru</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Do 2 pracovních dnů ti napíšu na Instagram. Tady je, čím začít.</div>
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;font:400 16px/1.6 Helvetica,Arial,sans-serif;color:#2a2a30;">${body}</div>
</body></html>`;
}

function leadText(row) {
  const m = leadMessage(row);
  return [
    m.greeting, '', ...m.paragraphs.flatMap((t) => [t, '']),
    ...(m.phases.length ? [m.planIntro, ...m.phases.map((ph, i) => `${i + 1}. ${ph.title}${ph.items.length ? ' · ' + ph.items.join(', ') : ''}`), ''] : []),
    ...(m.afterPlan ? [m.afterPlan, ''] : []),
    'Co bude dál: ' + m.next, '', m.reply, '', 'Měj se,', 'Kenji', 'Kenji Academy · @kenjiacademycz', '', 'P.S. ' + m.ps
  ].join('\n');
}

function teamEmail(row) {
  const line = (label, value) => `<tr><td style="padding:6px 0;font:700 13px/1.5 Helvetica,Arial,sans-serif;color:#8A8A92;width:150px;vertical-align:top;">${label}</td><td style="padding:6px 0;font:400 14px/1.5 Helvetica,Arial,sans-serif;color:#0E0E10;">${value}</td></tr>`;
  const ig = row.instagram ? `<a href="https://www.instagram.com/${encodeURIComponent(row.instagram)}" style="color:#8A5A14;">@${Mail.esc(row.instagram)}</a>` : '—';
  const table = `<tr><td style="padding:18px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${line('Jméno', Mail.esc(row.name))}
    ${line('E-mail', `<a href="mailto:${Mail.esc(row.email)}" style="color:#8A5A14;">${Mail.esc(row.email)}</a>`)}
    ${line('Telefon', `<a href="tel:${Mail.esc(row.phone.replace(/\s/g, ''))}" style="color:#8A5A14;">${Mail.esc(row.phone)}</a>`)}
    ${line('Instagram', ig)}
    ${line('Obory', Mail.esc(row.obory.map((o) => OBORY[o]).join(', ') || '—'))}
    ${line('Zkušenost', Mail.esc(LEVELS[row.level] || '—'))}
    ${line('Zakázek měsíčně', Mail.esc(row.jobs != null ? JOBS[row.jobs] : '—'))}
    ${line('Cena zakázky', kc(row.price))}
    ${line('Co ho brzdí', Mail.esc(row.blockers.map((b) => BLOCKERS[b]).join(', ') || '—'))}
    ${line('Cíl měsíčně', row.goal ? kc(row.goal) + (row.goal >= 100000 ? '+' : '') : '—')}
    ${line('Čas týdně', row.hours ? row.hours + (row.hours >= 20 ? '+' : '') + ' h' : '—')}
    ${line('Marketing', row.marketing_consent ? 'souhlas ano' : 'bez souhlasu')}
    ${line('Odkud', Mail.esc(row.source || '—'))}
  </table></td></tr>`;
  const site = Mail.siteUrl();
  const phases = row.plan.phases.filter((p) => p.title);
  const planHtml = phases.length ? Mail.paragraph('<strong style="color:#0E0E10;">Plán, který dostal(a):</strong><br>'
    + phases.map((p, i) => `${i + 1}. ${Mail.esc(p.title)}${p.items.length ? ' · ' + Mail.esc(p.items.join(', ')) : ''}`).join('<br>')) : '';
  const body = Mail.heading(`Nový zájemce: ${Mail.esc(row.name)}`)
    + Mail.paragraph(`Vyplnil(a) plán na míru a právě dostal(a) e-mail od Kenjiho. V něm stojí, že mu do <strong style="color:#0E0E10;">dvou pracovních dnů napíšeš na Instagram</strong> na @${Mail.esc(row.instagram)}.`)
    + Mail.button(`https://ig.me/m/${encodeURIComponent(row.instagram)}`, `Napsat DM @${Mail.esc(row.instagram)} →`)
    + Mail.paragraph(`<a href="${site}/admin.html?osoba=${encodeURIComponent(row.email)}" style="color:#8A5A14;">Otevřít kartu v adminu</a> · po napsání přepni stav na Kontaktovaný.`)
    + table
    + planHtml;
  return Mail.layout({ title: 'Nový zájemce o Academy', preheader: `${row.name} · ${row.obory.map((o) => OBORY[o]).join(', ')}`, body });
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });
  let raw;
  try { raw = JSON.parse(event.body || '{}'); } catch (e) { return reply(400, { error: 'Neplatná data.' }); }
  if (!raw || typeof raw !== 'object') return reply(400, { error: 'Neplatná data.' });

  // Skryté pole „web" vyplní jen roboti. Tváříme se úspěšně, ať to nezkoušejí znovu.
  if (str(raw.web, 200)) return reply(200, { ok: true });

  const { errors, row } = clean(raw);
  if (errors.length) {
    const labels = { name: 'jméno', email: 'e-mail', phone: 'telefon', instagram: 'Instagram (jen uživatelské jméno)' };
    return reply(400, { error: 'Zkontroluj prosím: ' + errors.map((f) => labels[f]).join(', ') + '.', fields: errors });
  }

  const saved = await store(row);
  // Upozornění nesmí tiše zmizet: bez proměnné jde na Danielův e-mail.
  const notify = process.env.LEAD_NOTIFY_EMAIL || '8pospichal@gmail.com';
  const [toLead, toTeam] = await Promise.all([
    Mail.sendEmail({ to: row.email, subject: 'Tvůj plán na míru (a co bude dál)', html: leadEmail(row), text: leadText(row), replyTo: notify || undefined, from: process.env.PLAN_FROM || undefined }),
    notify ? Mail.sendEmail({ to: notify, subject: `Nový zájemce: ${row.name} (${row.obory.map((o) => OBORY[o]).join(', ') || 'bez oboru'})`, html: teamEmail(row), replyTo: row.email }) : Promise.resolve(false)
  ]);

  console.log(`plan-request: uloženo=${saved} e-mail zájemci=${toLead} upozornění=${toTeam} (${process.env.LEAD_NOTIFY_EMAIL ? 'z proměnné' : 'záložní adresa'})`);
  // Zájemce nesmí zmizet: aspoň jedno z uložení a upozornění týmu musí projít.
  if (!saved && !toTeam) return reply(502, { error: 'Odeslání se nepovedlo. Zkus to prosím za chvíli znovu.' });
  return reply(200, { ok: true, emailed: toLead });
};

exports._clean = clean;
