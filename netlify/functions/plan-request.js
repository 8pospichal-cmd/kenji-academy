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

function leadEmail(row) {
  const site = Mail.siteUrl();
  const phases = row.plan.phases.filter((p) => p.title).map((p, i) =>
    `<tr><td style="padding:12px 32px 0;"><div style="padding:14px 16px;border-radius:14px;background:#FBF6EA;border:1px solid #F0E3C4;">
      <div style="font:800 12px/1.4 Helvetica,Arial,sans-serif;letter-spacing:1.4px;color:#8A5A14;">FÁZE ${i + 1}</div>
      <div style="font:800 16px/1.35 Helvetica,Arial,sans-serif;color:#0E0E10;margin-top:4px;">${Mail.esc(p.title)}</div>
      <div style="font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#55555C;margin-top:4px;">${p.items.map(Mail.esc).join(' · ')}</div>
    </div></td></tr>`).join('');
  const body = Mail.heading(`${Mail.esc(row.name)}, tady je tvůj plán`)
    + Mail.paragraph('Díky za odpovědi. Podle nich jsme ti poskládali, čím začít, aby ses co nejrychleji dostal k zakázkám, které tě uživí.')
    + phases
    + Mail.paragraph('<strong style="color:#0E0E10;">Co bude dál?</strong> Projdeme si tvoje odpovědi, připravíme ti k plánu návrh přímo na míru a do dvou pracovních dnů se ti ozveme. Řekneme ti na rovinu, jestli ti Academy pomůže. Sleduj proto e-mail.')
    + Mail.button(`${site}/academy#b-cena`, 'Podívat se na Academy →');
  return Mail.layout({ title: 'Tvůj plán na míru', preheader: 'Tvůj osobní plán, čím začít. A co bude dál.', body });
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
  const body = Mail.heading('Nový zájemce o Academy')
    + Mail.paragraph(`${Mail.esc(row.name)} vyplnil(a) plán na míru. Ozvi se do dvou pracovních dnů, tak jsme to slíbili.`)
    + table;
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
  const notify = process.env.LEAD_NOTIFY_EMAIL;
  const [toLead, toTeam] = await Promise.all([
    Mail.sendEmail({ to: row.email, subject: `${row.name}, tady je tvůj plán na míru`, html: leadEmail(row), replyTo: notify || undefined }),
    notify ? Mail.sendEmail({ to: notify, subject: `Nový zájemce: ${row.name} (${row.obory.map((o) => OBORY[o]).join(', ') || 'bez oboru'})`, html: teamEmail(row), replyTo: row.email }) : Promise.resolve(false)
  ]);

  // Zájemce nesmí zmizet: aspoň jedno z uložení a upozornění týmu musí projít.
  if (!saved && !toTeam) return reply(502, { error: 'Odeslání se nepovedlo. Zkus to prosím za chvíli znovu.' });
  return reply(200, { ok: true, emailed: toLead });
};

exports._clean = clean;
