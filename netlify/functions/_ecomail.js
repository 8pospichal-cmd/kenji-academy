'use strict';

const API = 'https://api2.ecomailapp.cz';

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) };
}

function email(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email(value));
}

function requiredEnv() {
  return !!(process.env.ECOMAIL_API_KEY && process.env.ECOMAIL_LIST_ID && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function discoveryEnv() {
  return !!(process.env.ECOMAIL_API_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabase(path, options) {
  const headers = Object.assign({
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  }, (options && options.headers) || {});
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, options || {}, { headers }));
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

async function verifiedUser(event) {
  const authorization = String((event.headers && (event.headers.authorization || event.headers.Authorization)) || '');
  if (!/^Bearer\s+\S+/i.test(authorization)) return null;
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: authorization }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.email ? user : null;
}

async function userRow(address) {
  const rows = await supabase(`users?email=eq.${encodeURIComponent(email(address))}&select=email,tier,role,account_status,display_name,instagram,profile,ai_context,last_seen_at,acquisition_source,marketing_consent_at,marketing_unsubscribed_at,email_preferences,email_status,ecomail_synced_at&limit=1`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

async function adminUser(event) {
  const auth = await verifiedUser(event);
  if (!auth) return null;
  const row = await userRow(auth.email);
  return row && (row.role === 'admin' || email(auth.email) === '8pospichal@gmail.com') ? auth : null;
}

async function ecomail(path, options) {
  const res = await fetch(`${API}${path}`, Object.assign({}, options || {}, {
    headers: Object.assign({ key: process.env.ECOMAIL_API_KEY, 'Content-Type': 'application/json' }, (options && options.headers) || {})
  }));
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
  if (!res.ok) throw new Error(`Ecomail ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

function profileValue(row, key) {
  const profile = row && row.profile && typeof row.profile === 'object' ? row.profile : {};
  const context = row && row.ai_context && typeof row.ai_context === 'object' ? row.ai_context : {};
  return profile[key] != null ? profile[key] : context[key];
}

function contactData(row) {
  const displayName = String(row.display_name || profileValue(row, 'displayName') || profileValue(row, 'name') || '').trim();
  const parts = displayName.split(/\s+/).filter(Boolean);
  const industries = profileValue(row, 'industries') || profileValue(row, 'industry') || [];
  return {
    email: email(row.email),
    name: parts.shift() || '',
    surname: parts.join(' '),
    source: 'kenji-academy',
    custom_fields: {
      kenji_tier: row.tier || 'free',
      kenji_instagram: row.instagram || '',
      kenji_industries: Array.isArray(industries) ? industries.join(', ') : String(industries || ''),
      kenji_stage: String(profileValue(row, 'experience') || profileValue(row, 'stage') || ''),
      kenji_blocker: String(profileValue(row, 'blocker') || ''),
      kenji_last_active: row.last_seen_at || '',
      kenji_source: row.acquisition_source || 'academy'
    }
  };
}

function canMarket(row) {
  return !!(row && validEmail(row.email) && row.marketing_consent_at && !row.marketing_unsubscribed_at && !['unsubscribed','bounced','complained'].includes(row.email_status));
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
  });
}

function emailTemplateHtml(sequence, step) {
  const plain = !!((sequence && sequence.plain) || (step && step.plain));   // bez loga a nadpisu — působí jako osobní e-mail
  const contentPad = plain ? '32px 32px 34px' : '20px 32px 34px';
  const paragraphs = String(step.body || '').split(/\n\s*\n/).filter(Boolean).map(function (part) {
    const formatted = escapeHtml(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    return `<p style="margin:0 0 20px;color:#292927;font:17px/1.65 Arial,sans-serif;">${formatted}</p>`;
  }).join('');
  const cta = step.cta_label && /^https:\/\//i.test(String(step.cta_url || ''))
    ? `<p style="margin:30px 0;"><a href="${escapeHtml(step.cta_url)}" style="display:inline-block;padding:15px 22px;background:#ff6b1a;color:#fff;text-decoration:none;font:bold 16px/1.2 Arial,sans-serif;border-radius:6px;">${escapeHtml(step.cta_label)}</a></p>`
    : '';
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(step.subject)}</title><style>@media(max-width:480px){.email-content{padding:20px!important}.email-headline{font-size:26px!important}}</style></head><body style="margin:0;background:#f3f3f1;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(step.preheader || '')}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f3f1;"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;max-width:640px;background:#fff;overflow-wrap:anywhere;word-wrap:break-word;border:1px solid #deded9;">${plain ? '' : '<tr><td style="padding:28px 32px 8px;color:#111;font:bold 22px/1 Arial,sans-serif;">kenji<span style="font-weight:normal;">academy</span></td></tr>'}<tr><td class="email-content" style="padding:${contentPad};">${plain ? '' : '<h1 class="email-headline" style="margin:0 0 22px;color:#111;font:bold 32px/1.15 Arial,sans-serif;">' + escapeHtml(step.headline || step.subject) + '</h1>'}${paragraphs}${cta}<p style="margin:26px 0 0;color:#292927;font:17px/1.6 Arial,sans-serif;">Měj se,<br><strong>Kenji</strong></p></td></tr><tr><td style="padding:20px 32px;border-top:1px solid #ecece8;color:#777;font:12px/1.6 Arial,sans-serif;">Tento e-mail dostáváš, protože ses přihlásil/a k užitečným e-mailům Kenji Academy. <a href="*|UNSUB|*" style="color:#777;">Odhlásit se</a></td></tr></table></td></tr></table></body></html>`;
}

async function syncContact(row) {
  if (!canMarket(row)) return { skipped: 'no_consent' };
  const data = await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ subscriber_data: contactData(row), trigger_autoresponders: false, update_existing: true, skip_confirmation: true, resubscribe: false })
  });
  const responseStatus = Number(data && ((data.subscriber_data && data.subscriber_data.status) || data.status));
  const mappedStatus = { 1: 'active', 2: 'unsubscribed', 4: 'bounced', 5: 'complained' }[responseStatus];
  const patch = { ecomail_synced_at: new Date().toISOString(), ecomail_sync_error: null, updated_at: new Date().toISOString() };
  if (mappedStatus) patch.email_status = mappedStatus;
  if (mappedStatus === 'unsubscribed' || mappedStatus === 'complained') patch.marketing_unsubscribed_at = new Date().toISOString();
  await supabase(`users?email=eq.${encodeURIComponent(email(row.email))}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(patch)
  });
  return data;
}

function emailInFilter(rows) {
  return encodeURIComponent(`(${rows.map(function (row) { return `"${email(row.email).replace(/["\\]/g, '')}"`; }).join(',')})`);
}

async function syncContacts(rows) {
  const eligible = (rows || []).filter(canMarket);
  if (!eligible.length) return { synced: 0 };
  const data = await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/subscribe-bulk`, {
    method: 'POST',
    body: JSON.stringify({ subscriber_data: eligible.map(contactData), trigger_autoresponders: false, update_existing: true, resubscribe: false })
  });
  const now = new Date().toISOString();
  await supabase(`users?email=in.${emailInFilter(eligible)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ecomail_synced_at: now, ecomail_sync_error: null, updated_at: now })
  });
  return { synced: eligible.length, data };
}

async function unsubscribe(row) {
  const data = await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/unsubscribe`, {
    method: 'DELETE', body: JSON.stringify({ email: email(row.email) })
  });
  await supabase(`users?email=eq.${encodeURIComponent(email(row.email))}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ecomail_synced_at: new Date().toISOString(), ecomail_sync_error: null, email_status: 'unsubscribed', updated_at: new Date().toISOString() })
  });
  return data;
}

async function trackerEvent(row, action, value) {
  return ecomail('/tracker/events', {
    method: 'POST',
    body: JSON.stringify({ event: { email: email(row.email), category: 'kenji_academy', action, label: action.replace(/[._]/g, ' '), value: value || {} } })
  });
}

// ---------------- SROVNÁNÍ PUBLIKA ----------------
// Porovná seznam v Ecomailu s účty v Supabase a řekne, komu se první sekvence
// smí poslat. Nikdy nic neposílá ani nemění — jen čte a klasifikuje.

const ADMIN_EMAIL = '8pospichal@gmail.com';
// Vlastní a testovací adresy Kenji — nikdy nejsou příjemci kampaní.
const OWN_ADDRESSES = ['8pospichal@gmail.com', 'ahoj@kenji.cz', 'info@kenji.cz', 'cigarioapp@gmail.com', 'realtest@kenji.cz', 'webhook-test@kenji.cz'];
const TEST_LOCAL_RE = /(^|[._+-])(test|tester|testing|testovaci|demo|fake|dummy|example|sample|foo|asdf|qwerty|noreply|no-reply|pokus|zkouska)([._+-]|\d|$)/i;
const TEST_DOMAIN_RE = /(^|\.)(example\.(com|cz|org|net)|test\.(com|cz)|mailinator\.com|yopmail\.com|tempmail\.com|guerrillamail\.com|10minutemail\.com|trashmail\.com|lidugw\.com|localhost)$/i;
const TYPO_DOMAINS = {
  'gmial.com':'gmail.com','gmal.com':'gmail.com','gmai.com':'gmail.com','gmail.co':'gmail.com','gmail.cz':'gmail.com','gmail.con':'gmail.com','gmail.comm':'gmail.com','gnail.com':'gmail.com','gamil.com':'gmail.com','gmaill.com':'gmail.com','gmail.cm':'gmail.com','gimail.com':'gmail.com','gmail.co.':'gmail.com',
  'seznam.com':'seznam.cz','seznam.cy':'seznam.cz','seznma.cz':'seznam.cz','senam.cz':'seznam.cz','sezam.cz':'seznam.cz','sezanm.cz':'seznam.cz','seznan.cz':'seznam.cz','seynam.cz':'seznam.cz','seznam.c':'seznam.cz',
  'hotmail.co':'hotmail.com','hotmal.com':'hotmail.com','hotmial.com':'hotmail.com','outlok.com':'outlook.com','outlook.co':'outlook.com','yahoo.co':'yahoo.com','icloud.co':'icloud.com','centrum.com':'centrum.cz','cetrum.cz':'centrum.cz','emial.cz':'email.cz','volny.com':'volny.cz'
};
const STRICT_EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

async function listSubscribers(status) {
  const out = [];
  for (let page = 1; page <= 50; page += 1) {
    const q = `/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/subscribers?status=${encodeURIComponent(status)}&per_page=1000&page=${page}`;
    const data = await ecomail(q);
    const rows = data && Array.isArray(data.data) ? data.data : [];
    out.push.apply(out, rows);
    const last = Number(data && data.last_page) || 1;
    if (page >= last || !rows.length) break;
  }
  return out;
}

function subscriberTags(row) {
  const sub = row && row.subscriber ? row.subscriber : {};
  const raw = sub.tags != null ? sub.tags : row.tags;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === 'string') {
    try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean); } catch (_) {}
    return raw.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  }
  return [];
}

// Vrátí { verdict, reason, suggestion } pro jeden aktivní kontakt z Ecomailu.
function classifySubscriber(row, user, seen) {
  const addr = email(row.email);
  const at = addr.indexOf('@');
  const local = at > 0 ? addr.slice(0, at) : addr;
  const domain = at > 0 ? addr.slice(at + 1) : '';
  const sub = row.subscriber || {};
  if (!STRICT_EMAIL_RE.test(addr) || /\.\./.test(addr)) return { verdict: 'invalid', reason: 'Neplatný tvar adresy' };
  if (seen.has(addr)) return { verdict: 'duplicate', reason: 'Duplicitní adresa' };
  if (TEST_DOMAIN_RE.test(domain) || TEST_LOCAL_RE.test(local)) return { verdict: 'test', reason: 'Vypadá jako testovací adresa' };
  if (TYPO_DOMAINS[domain]) return { verdict: 'typo', reason: 'Pravděpodobný překlep v doméně', suggestion: local + '@' + TYPO_DOMAINS[domain] };
  if (OWN_ADDRESSES.includes(addr) || addr === ADMIN_EMAIL || (user && user.role === 'admin')) return { verdict: 'admin', reason: 'Vlastní nebo testovací adresa Kenji' };
  if (user && user.tier === 'academy') return { verdict: 'academy', reason: 'Člen Kenji Academy' };
  if (user && (user.marketing_unsubscribed_at || ['unsubscribed', 'bounced', 'complained'].includes(user.email_status))) return { verdict: 'unsubscribed_academy', reason: 'V Academy odhlášen nebo nedoručitelný' };
  if (Number(sub.bounced_hard) > 0) return { verdict: 'bounce', reason: 'Tvrdý bounce v Ecomailu' };
  if (user && user.account_status === 'blocked') return { verdict: 'blocked', reason: 'Zablokovaný účet' };
  return { verdict: 'ok', reason: '' };
}

const VERDICT_ORDER = ['ok', 'academy', 'admin', 'test', 'typo', 'invalid', 'duplicate', 'unsubscribed_academy', 'bounce', 'blocked'];

async function auditAudience() {
  const [subscribed, unsubscribed, bounced, complained, notConfirmed, users] = await Promise.all([
    listSubscribers('subscribed'),
    listSubscribers('unsubscribed').catch(function () { return []; }),
    listSubscribers('bounced').catch(function () { return []; }),
    listSubscribers('complained').catch(function () { return []; }),
    listSubscribers('not_confirmed').catch(function () { return []; }),
    supabase('users?select=email,tier,role,account_status,marketing_consent_at,marketing_unsubscribed_at,email_status&limit=10000')
  ]);
  const byEmail = new Map();
  (users || []).forEach(function (u) { if (validEmail(u.email)) byEmail.set(email(u.email), u); });

  const seen = new Set();
  const rows = subscribed.map(function (row) {
    const addr = email(row.email);
    const user = byEmail.get(addr) || null;
    const c = classifySubscriber(row, user, seen);
    seen.add(addr);
    const sub = row.subscriber || {};
    return {
      email: addr,
      verdict: c.verdict,
      reason: c.reason,
      suggestion: c.suggestion || '',
      tier: user ? (user.tier || 'free') : '',
      registered: !!user,
      consented: !!(user && user.marketing_consent_at),
      engaged: !!(sub.last_open || sub.last_click),
      tags: subscriberTags(row),
      source: row.source || sub.source || '',
      subscribed_at: row.subscribed_at || sub.inserted_at || ''
    };
  }).sort(function (a, b) {
    const d = VERDICT_ORDER.indexOf(a.verdict) - VERDICT_ORDER.indexOf(b.verdict);
    return d || a.email.localeCompare(b.email);
  });

  const count = function (fn) { return rows.filter(fn).length; };
  const safe = rows.filter(function (r) { return r.verdict === 'ok'; });
  const excluded = {};
  VERDICT_ORDER.slice(1).forEach(function (v) { excluded[v] = count(function (r) { return r.verdict === v; }); });
  excluded.total = rows.length - safe.length;

  const tiers = { free: 0, knihovna: 0, academy: 0, other: 0 };
  (users || []).forEach(function (u) { tiers[['free', 'knihovna', 'academy'].includes(u.tier) ? u.tier : 'other'] += 1; });
  const activeSet = new Set(subscribed.map(function (r) { return email(r.email); }));
  const onlyAcademy = (users || []).filter(function (u) { return validEmail(u.email) && !activeSet.has(email(u.email)); });

  return {
    generated_at: new Date().toISOString(),
    ecomail: { subscribed: subscribed.length, unsubscribed: unsubscribed.length, bounced: bounced.length, complained: complained.length, not_confirmed: notConfirmed.length },
    academy: { total: (users || []).length, free: tiers.free, knihovna: tiers.knihovna, academy: tiers.academy, consented: (users || []).filter(function (u) { return u.marketing_consent_at; }).length },
    overlap: {
      active_in_both: count(function (r) { return r.registered; }),
      only_ecomail: count(function (r) { return !r.registered; }),
      only_academy: onlyAcademy.length,
      only_academy_consented: onlyAcademy.filter(function (u) { return u.marketing_consent_at && !u.marketing_unsubscribed_at; }).length
    },
    safe: {
      total: safe.length,
      engaged: safe.filter(function (r) { return r.engaged; }).length,
      registered: safe.filter(function (r) { return r.registered; }).length,
      tier_knihovna: safe.filter(function (r) { return r.tier === 'knihovna'; }).length,
      not_registered: safe.filter(function (r) { return !r.registered; }).length
    },
    excluded,
    rows
  };
}

// Přidá štítek bezpečnému segmentu. Štítky se slučují s existujícími — Ecomail je
// při update přepisuje, takže posíláme sjednocení. Autorespondery se nespouští.
async function tagSafeAudience(tag) {
  const audit = await auditAudience();
  const safe = audit.rows.filter(function (r) { return r.verdict === 'ok'; });
  let tagged = 0;
  for (let i = 0; i < safe.length; i += 1000) {
    const batch = safe.slice(i, i + 1000).map(function (r) {
      const tags = r.tags.includes(tag) ? r.tags : r.tags.concat([tag]);
      return { email: r.email, tags: tags };
    });
    await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/subscribe-bulk`, {
      method: 'POST',
      body: JSON.stringify({ subscriber_data: batch, trigger_autoresponders: false, update_existing: true, resubscribe: false })
    });
    tagged += batch.length;
  }
  return { tagged, safe_total: safe.length, generated_at: audit.generated_at };
}

// ---------------- JEDNORÁZOVÁ KAMPAŇ ----------------
// Test jde přes transakční API na jednu adresu; ostrá kampaň se založí jako koncept
// v Ecomailu a odešle se zvlášť. Odeslání je nevratné, proto je to samostatná akce.

async function listSegments() {
  // /lists/{id}/segments vrací i počet kontaktů; když selže, spadne se na /lists/{id}.
  let raw = null;
  try { const d = await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}/segments`); raw = d && (d.segments || d.data || d); } catch (_) { raw = null; }
  if (!raw) { const data = await ecomail(`/lists/${encodeURIComponent(process.env.ECOMAIL_LIST_ID)}`); raw = data && data.list && data.list.segments ? data.list.segments : (data && data.segments) || {}; }
  const arr = Array.isArray(raw) ? raw : Object.keys(raw).map(function (k) { return raw[k]; });
  return arr.filter(function (sg) { return sg && (sg.id || sg.name); }).map(function (sg) { return { id: String(sg.id || ''), name: String(sg.name || sg.id || ''), count: sg.count != null ? Number(sg.count) : null }; }).filter(function (sg) { return sg.id; });
}

function senderOf(sequence) {
  return {
    from_name: String(sequence.from_name || 'Kenji').trim(),
    from_email: email(sequence.from_email),
    reply_to: email(sequence.reply_to || sequence.from_email)
  };
}

// Prostý text článku — pro klienty bez HTML a pro kontrolu obsahu v API.
function articlePlainText(a) {
  const strip = function (t) { return String(t == null ? '' : t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); };
  const out = [strip(a.headline), ''];
  (a.blocks || []).forEach(function (b) {
    if (b.type === 'h') out.push('', strip(b.text).toUpperCase(), '');
    else if (b.type === 'p' || b.type === 'lead') out.push(strip(b.text), '');
    else if (b.type === 'quote') out.push('„' + strip(b.text) + '“', '');
    else if (b.type === 'box') out.push((b.title ? strip(b.title) + ': ' : '') + strip(b.text), '');
    else if (b.type === 'compare') (b.items || []).forEach(function (it) { out.push((it.ok === false ? '✕ ' : '✓ ') + strip(it.title), strip(it.text), ''); });
    else if (b.type === 'cards') (b.items || []).forEach(function (it) { out.push(strip(it.tag) + ' — ' + strip(it.title), strip(it.text), ''); });
    else if (b.type === 'steps') { (b.items || []).forEach(function (it, i) { out.push((i + 1) + '. ' + strip(it)); }); out.push(''); }
  });
  const o = a.offer || {};
  if (o.text) out.push('---', strip(o.kicker || ''), strip(o.text), o.url ? (strip(o.label || 'Otevřít') + ': ' + o.url) : '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Článkový e-mail má vlastní šablonu; ostatní jdou přes jednoduchou.
function bodyHtml(sequence, step) {
  return step && step.article ? articleEmailHtml(step.article) : emailTemplateHtml(sequence, step);
}

async function sendTestEmail(sequence, step, toEmail) {
  const sender = senderOf(sequence);
  if (!validEmail(sender.from_email)) throw new Error('Chybí platná adresa odesílatele.');
  const html = bodyHtml(sequence, step).replace(/\*\|UNSUB\|\*/g, 'https://kenjiacademy.cz/nastaveni.html');
  return ecomail('/transactional/send-message', {
    method: 'POST',
    body: JSON.stringify({ message: {
      subject: String(step.subject || ''),
      from_name: sender.from_name, from_email: sender.from_email, reply_to: sender.reply_to,
      html: html, text: step && step.article ? articlePlainText(step.article) : String(step.body || ''),
      to: [{ email: email(toEmail) }],
      options: { click_tracking: false, open_tracking: false }
    } })
  });
}

async function createCampaign(sequence, step, segmentId) {
  const sender = senderOf(sequence);
  if (!validEmail(sender.from_email)) throw new Error('Chybí platná adresa odesílatele.');
  const listId = Number(process.env.ECOMAIL_LIST_ID);
  const ids = (Array.isArray(segmentId) ? segmentId : [segmentId]).filter(Boolean).map(String);
  const recipients = ids.length ? { segments: ids.map(function (id) { return { id: id, list: listId }; }) } : [listId];
  const data = await ecomail('/campaigns', {
    method: 'POST',
    body: JSON.stringify({
      title: `[Kenji] ${sequence.name} — ${step.subject}`,
      from_name: sender.from_name, from_email: sender.from_email, reply_to: sender.reply_to,
      subject: String(step.subject || ''),
      html_text: bodyHtml(sequence, step),
      recepient_lists: recipients
    })
  });
  const id = data && (data.id || (data.data && data.data.id));
  if (!id) throw new Error('Ecomail nevrátil ID kampaně');
  return { id: id, data: data };
}

async function sendCampaign(campaignId) {
  return ecomail(`/campaign/${encodeURIComponent(campaignId)}/send`);
}

// ---------------- ČLÁNKOVÝ E-MAIL ----------------
// Celý článek v těle e-mailu. Tabulkové rozložení a inline styly kvůli Outlooku,
// šířka 640 px, bez webfontů. Bloky: h, p, quote, box, compare, cards, steps, cta, hr.

const A_INK = '#1b1b1f', A_DIM = '#4a4a52', A_MUTE = '#8b8b95', A_LINE = '#e6e6ea', A_ORANGE = '#e0590d', A_BG = '#f4f4f2';

function rich(text) {
  return escapeHtml(String(text == null ? '' : text))
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + A_INK + ';">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:' + A_ORANGE + ';text-decoration:underline;">$1</a>')
    .replace(/\n/g, '<br>');
}
function cell(inner, pad) {
  return '<tr><td style="padding:' + (pad || '0 34px') + ';">' + inner + '</td></tr>';
}

function articleBlock(b) {
  const t = b.type;
  if (t === 'h') return cell('<h2 style="margin:34px 0 14px;color:' + A_INK + ';font:bold 25px/1.25 Georgia,\'Times New Roman\',serif;">' + rich(b.text) + '</h2>');
  if (t === 'p') return cell('<p style="margin:0 0 18px;color:' + A_DIM + ';font:17px/1.65 Georgia,\'Times New Roman\',serif;">' + rich(b.text) + '</p>');
  if (t === 'lead') return cell('<p style="margin:0 0 22px;color:' + A_INK + ';font:19px/1.6 Georgia,\'Times New Roman\',serif;">' + rich(b.text) + '</p>');
  if (t === 'hr') return cell('<div style="height:1px;background:' + A_LINE + ';margin:30px 0;"></div>');
  if (t === 'quote') return cell('<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>'
    + '<td style="border-left:3px solid ' + A_ORANGE + ';padding:6px 0 6px 20px;">'
    + '<p style="margin:0;color:' + A_INK + ';font:italic 19px/1.5 Georgia,serif;">' + rich(b.text) + '</p></td></tr></table>'
    + '<div style="height:26px;"></div>');
  if (t === 'box') return cell('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' + (b.tone === 'warn' ? '#fff6ed' : '#f3f5f3') + ';border-left:3px solid ' + (b.tone === 'warn' ? A_ORANGE : '#3f8f68') + ';"><tr>'
    + '<td style="padding:18px 20px;">'
    + (b.title ? '<p style="margin:0 0 7px;color:' + A_INK + ';font:bold 14px/1.3 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;">' + rich(b.title) + '</p>' : '')
    + '<p style="margin:0;color:' + A_DIM + ';font:16px/1.6 Georgia,serif;">' + rich(b.text) + '</p>'
    + '</td></tr></table><div style="height:26px;"></div>');
  if (t === 'compare') return cell('<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
    + (b.items || []).map(function (it, i) {
      const bad = it.ok === false;
      return '<tr><td style="padding:' + (i ? '12px' : '0') + ' 0 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ' + A_LINE + ';"><tr>'
        + '<td width="44" valign="top" style="padding:16px 0 16px 16px;color:' + (bad ? '#c0332e' : '#2d8a5c') + ';font:bold 20px/1 Arial,sans-serif;">' + (bad ? '✕' : '✓') + '</td>'
        + '<td style="padding:16px 18px 16px 4px;">'
        + '<p style="margin:0 0 5px;color:' + A_INK + ';font:bold 15px/1.35 Arial,sans-serif;">' + rich(it.title) + '</p>'
        + '<p style="margin:0;color:' + A_DIM + ';font:16px/1.6 Georgia,serif;">' + rich(it.text) + '</p>'
        + '</td></tr></table></td></tr>';
    }).join('') + '</table><div style="height:26px;"></div>');
  if (t === 'cards') return cell('<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
    + (b.items || []).map(function (it, i) {
      const hi = !!it.highlight;
      return '<tr><td style="padding:' + (i ? '10px' : '0') + ' 0 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:' + (hi ? '2px solid ' + A_ORANGE : '1px solid ' + A_LINE) + ';background:' + (hi ? '#fff8f3' : '#ffffff') + ';"><tr>'
        + '<td style="padding:16px 18px;">'
        + '<p style="margin:0 0 4px;color:' + (hi ? A_ORANGE : A_MUTE) + ';font:bold 12px/1.2 Arial,sans-serif;letter-spacing:.14em;">' + rich(it.tag) + '</p>'
        + '<p style="margin:0 0 6px;color:' + A_INK + ';font:bold 16px/1.3 Arial,sans-serif;">' + rich(it.title) + '</p>'
        + '<p style="margin:0;color:' + A_DIM + ';font:15px/1.55 Georgia,serif;">' + rich(it.text) + '</p>'
        + '</td></tr></table></td></tr>';
    }).join('') + '</table><div style="height:26px;"></div>');
  if (t === 'steps') return cell('<table role="presentation" width="100%" cellspacing="0" cellpadding="0">'
    + (b.items || []).map(function (it, i) {
      return '<tr>'
        + '<td width="40" valign="top" style="padding:0 0 16px;color:' + A_ORANGE + ';font:bold 17px/1.5 Arial,sans-serif;">' + (i + 1) + '.</td>'
        + '<td style="padding:0 0 16px;color:' + A_DIM + ';font:16px/1.6 Georgia,serif;">' + rich(it) + '</td></tr>';
    }).join('') + '</table>');
  if (t === 'cta') return cell('<table role="presentation" cellspacing="0" cellpadding="0"><tr>'
    + '<td style="background:' + A_ORANGE + ';border-radius:6px;">'
    + '<a href="' + escapeHtml(b.url) + '" style="display:inline-block;padding:16px 30px;color:#fff;font:bold 16px/1 Arial,sans-serif;text-decoration:none;">' + escapeHtml(b.label) + ' →</a>'
    + '</td></tr></table><div style="height:8px;"></div>');
  return '';
}

function articleEmailHtml(email) {
  const blocks = (email.blocks || []).map(articleBlock).join('');
  const readMin = email.read_minutes ? escapeHtml(String(email.read_minutes)) + ' min čtení' : '';
  const offer = email.offer || {};
  return '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>' + escapeHtml(email.subject) + '</title>'
    + '<style>@media(max-width:480px){.pad{padding-left:20px!important;padding-right:20px!important}.hl{font-size:29px!important}}</style>'
    + '</head><body style="margin:0;padding:0;background:' + A_BG + ';">'
    + '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + escapeHtml(email.preheader || '') + '</div>'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:' + A_BG + ';"><tr><td align="center" style="padding:26px 12px 40px;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid ' + A_LINE + ';">'
    // hlavička
    + '<tr><td class="pad" style="padding:26px 34px 0;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>'
    + '<td style="color:' + A_INK + ';font:bold 17px/1 Arial,sans-serif;">kenji<span style="font-weight:normal;color:' + A_MUTE + ';">academy</span></td>'
    + '<td align="right" style="color:' + A_MUTE + ';font:12px/1 Arial,sans-serif;">' + escapeHtml(email.kicker || '') + (readMin ? ' · ' + readMin : '') + '</td>'
    + '</tr></table></td></tr>'
    // titulek
    + '<tr><td class="pad" style="padding:22px 34px 0;">'
    + '<h1 class="hl" style="margin:0 0 6px;color:' + A_INK + ';font:bold 36px/1.15 Georgia,\'Times New Roman\',serif;">' + rich(email.headline) + '</h1>'
    + '<div style="height:3px;width:64px;background:' + A_ORANGE + ';margin:16px 0 22px;"></div>'
    + '</td></tr>'
    + blocks
    // nabídka
    + '<tr><td class="pad" style="padding:14px 34px 34px;">'
    + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid ' + A_LINE + ';"><tr><td style="padding:26px 0 0;">'
    + (offer.kicker ? '<p style="margin:0 0 10px;color:' + A_MUTE + ';font:bold 12px/1.2 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;">' + escapeHtml(offer.kicker) + '</p>' : '')
    + '<p style="margin:0 0 16px;color:' + A_DIM + ';font:16px/1.6 Georgia,serif;">' + rich(offer.text || '') + '</p>'
    + (offer.url ? '<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="background:' + A_ORANGE + ';border-radius:6px;">'
        + '<a href="' + escapeHtml(offer.url) + '" style="display:inline-block;padding:15px 28px;color:#fff;font:bold 15px/1 Arial,sans-serif;text-decoration:none;">' + escapeHtml(offer.label || 'Otevřít') + ' →</a>'
        + '</td></tr></table>' : '')
    // Drobný textový dovětek pod tlačítkem — druhá, nenápadná nabídka bez dalšího tlačítka.
    + (offer.note ? '<p style="margin:18px 0 0;color:' + A_MUTE + ';font:14px/1.6 Georgia,serif;">' + rich(offer.note) + '</p>' : '')
    + '</td></tr></table></td></tr>'
    // patička
    + '<tr><td class="pad" style="padding:20px 34px;border-top:1px solid ' + A_LINE + ';background:#fafafa;color:' + A_MUTE + ';font:12px/1.6 Arial,sans-serif;">'
    + 'Tenhle e-mail ti přišel, protože jsi v seznamu Kenji Academy. <a href="*|UNSUB|*" style="color:' + A_MUTE + ';">Odhlásit se</a>.'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';
}

module.exports = { json, email, validEmail, requiredEnv, discoveryEnv, supabase, verifiedUser, userRow, adminUser, ecomail, contactData, canMarket, emailTemplateHtml, articleEmailHtml, articlePlainText, syncContact, syncContacts, unsubscribe, trackerEvent, listSubscribers, auditAudience, tagSafeAudience, listSegments, sendTestEmail, createCampaign, sendCampaign };
