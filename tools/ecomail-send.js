#!/usr/bin/env node
'use strict';
// Odeslání jednorázového e-mailu přes Ecomail přímo z počítače — bez nasazení na Netlify.
//
//   node tools/ecomail-send.js --segments                          vypíše segmenty seznamu
//   node tools/ecomail-send.js <email.json> --test                 test na adresu z ecomail.env (TEST_TO)
//   node tools/ecomail-send.js <email.json> --draft "Název segmentu"   založí koncept kampaně (nic neposílá)
//   node tools/ecomail-send.js <email.json> --send --yes           odešle koncept (nevratné)
//   node tools/ecomail-send.js <email.json> --stats                doručeno / otevřeno / prokliky odeslané kampaně
//
// Klíč se čte z ~/.config/kenji/ecomail.env (řádky KEY=VALUE), který NIKDY není v repozitáři:
//   ECOMAIL_API_KEY=...        ECOMAIL_LIST_ID=4        TEST_TO=8pospichal@gmail.com
// Obsah e-mailu je JSON: { name, from_name, from_email, reply_to, subject, preheader, headline, body, cta_label, cta_url }
// Šablonu i volání API sdílí s produkčními funkcemi (netlify/functions/_ecomail.js), takže test vypadá stejně jako ostrý e-mail.

const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_FILE = path.join(os.homedir(), '.config', 'kenji', 'ecomail.env');
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}
if (!process.env.ECOMAIL_LIST_ID) process.env.ECOMAIL_LIST_ID = '4';
if (!process.env.ECOMAIL_API_KEY) {
  console.error('Chybí ECOMAIL_API_KEY. Vytvoř soubor ' + ENV_FILE + ' s řádkem ECOMAIL_API_KEY=... (klíč z Ecomailu → Správa účtu → Pro vývojáře).');
  process.exit(2);
}

const E = require(path.join(__dirname, '..', 'netlify', 'functions', '_ecomail.js'));
const args = process.argv.slice(2);
const flag = function (name) { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };
const file = args.find(function (a) { return a.endsWith('.json'); });

function loadEmail() {
  if (!file) { console.error('Chybí soubor s e-mailem (.json).'); process.exit(2); }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  // Článkový e-mail (pole `blocks`) má vlastní bohatou šablonu.
  if (Array.isArray(data.blocks)) {
    const sequence = { name: data.name || data.subject, from_name: data.from_name || 'Kenji', from_email: data.from_email, reply_to: data.reply_to || data.from_email };
    const step = { id: 'mail-1', position: 1, subject: data.subject, preheader: data.preheader || '', body: '', article: data };
    ['from_email', 'subject', 'headline'].forEach(function (k) { if (!data[k]) { console.error('V e-mailu chybí pole: ' + k); process.exit(2); } });
    return { data, sequence, step, article: true };
  }
  const sequence = { plain: !!data.plain, name: data.name || data.subject, from_name: data.from_name || 'Kenji', from_email: data.from_email, reply_to: data.reply_to || data.from_email };
  const step = { id: 'mail-1', position: 1, subject: data.subject, preheader: data.preheader || '', headline: data.headline || data.subject, body: data.body, cta_label: data.cta_label || '', cta_url: data.cta_url || '' };
  ['from_email', 'subject', 'body'].forEach(function (k) { if (!data[k]) { console.error('V e-mailu chybí pole: ' + k); process.exit(2); } });
  return { data, sequence, step };
}
function saveEmail(data) { fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }

(async function main() {
  try {
    if (flag('--segments')) {
      const segments = await E.listSegments();
      if (!segments.length) return console.log('Seznam nemá žádné segmenty.');
      segments.forEach(function (s) { console.log(`${s.id}\t${String(s.count == null ? '?' : s.count).padStart(5)} kontaktů\t${s.name}`); });
      return;
    }

    const { data, sequence, step } = loadEmail();

    if (flag('--html')) {
      const out = file.replace(/\.json$/, '.html');
      fs.writeFileSync(out, (step.article ? E.articleEmailHtml(step.article) : E.emailTemplateHtml(sequence, step)));
      return console.log('Náhled uložen: ' + out);
    }

    if (flag('--test')) {
      const to = (typeof flag('--to') === 'string' && flag('--to')) || process.env.TEST_TO;
      if (!E.validEmail(to)) { console.error('Chybí adresa pro test (TEST_TO v ecomail.env nebo --to).'); process.exit(2); }
      // Transakční API vyžaduje doménu ověřenou pro transakční e-maily; když odesílací
      // doména neprojde, zkusí se stejná adresa na podadrese transaction.
      try {
        const r = await E.sendTestEmail(sequence, step, to);
        return console.log(`Test odešel na ${to} z ${sequence.from_email}. Přijato: ${r && r.results ? r.results.total_accepted_recipients : '?'}`);
      } catch (err) {
        const alt = String(sequence.from_email).replace(/@mail\./, '@transaction.');
        if (alt === sequence.from_email) throw err;
        console.warn('Odesílací doména pro test neprošla (' + err.message + '), zkouším ' + alt);
        const r = await E.sendTestEmail(Object.assign({}, sequence, { from_email: alt }), step, to);
        return console.log(`Test odešel na ${to} z ${alt}. Přijato: ${r && r.results ? r.results.total_accepted_recipients : '?'}`);
      }
    }

    if (flag('--draft')) {
      // Ecomail při odeslání použije jen PRVNÍ segment z pole → na každý segment vlastní kampaň.
      const wanted = typeof flag('--draft') === 'string' ? flag('--draft') : '';
      const segments = wanted ? await E.listSegments() : [];
      const picked = wanted ? wanted.split(',').map(function (w) { return w.trim(); }).filter(Boolean).map(function (w) {
        const seg = segments.find(function (s) { return s.name.trim().toLowerCase() === w.toLowerCase(); }) || segments.find(function (s) { return s.name.toLowerCase().includes(w.toLowerCase()); });
        if (!seg) { console.error('Segment „' + w + '“ v Ecomailu není. Dostupné: ' + segments.map(function (s) { return s.name; }).join(' | ')); process.exit(2); }
        return seg;
      }) : [null];
      const existing = Array.isArray(data.ecomail_campaigns) ? data.ecomail_campaigns : [];
      const campaigns = [];
      for (const seg of picked) {
        const already = existing.find(function (c) { return seg ? c.segment_id === seg.id : !c.segment_id; });
        if (already && already.sent_at) { console.log('Segment ' + (seg ? seg.name : 'celý seznam') + ' už odeslán (' + already.sent_at.slice(0, 16) + ') — přeskakuji.'); campaigns.push(already); continue; }
        const created = await E.createCampaign(sequence, step, seg ? seg.id : null);
        campaigns.push({ id: created.id, segment: seg ? seg.name : 'celý seznam', segment_id: seg ? seg.id : null, count: seg ? seg.count : null, created_at: new Date().toISOString() });
        console.log('Koncept ' + created.id + ' → ' + (seg ? seg.name + ' (' + (seg.count == null ? '?' : seg.count) + ' kontaktů)' : 'CELÝ seznam'));
      }
      data.ecomail_campaigns = campaigns;
      delete data.ecomail_campaign_id; delete data.ecomail_segment; delete data.ecomail_campaign_created_at; delete data.ecomail_campaign_sent_at;
      saveEmail(data);
      return console.log('Celkem ' + campaigns.filter(function (c) { return !c.sent_at; }).length + ' konceptů k odeslání (' + campaigns.filter(function (c) { return !c.sent_at; }).reduce(function (a, c) { return a + (c.count || 0); }, 0) + ' kontaktů). Nic neodešlo. Odeslat: --send --yes');
    }

    if (flag('--send')) {
      const campaigns = Array.isArray(data.ecomail_campaigns) ? data.ecomail_campaigns : (data.ecomail_campaign_id ? [{ id: data.ecomail_campaign_id, segment: data.ecomail_segment, sent_at: data.ecomail_campaign_sent_at }] : []);
      const pending = campaigns.filter(function (c) { return !c.sent_at; });
      if (!campaigns.length) { console.error('Nejdřív --draft (koncept kampaně).'); process.exit(2); }
      if (!pending.length) { console.error('Všechny koncepty už odešly.'); process.exit(2); }
      if (!flag('--yes')) { console.error('Odeslání je nevratné. Potvrď přepínačem --yes.'); process.exit(2); }
      for (const c of pending) {
        await E.sendCampaign(c.id);
        c.sent_at = new Date().toISOString();
        console.log('Kampaň ' + c.id + ' (' + c.segment + ') je ve frontě Ecomailu.');
      }
      data.ecomail_campaigns = campaigns;
      saveEmail(data);
      return;
    }

    if (flag('--stats')) {
      const campaigns = Array.isArray(data.ecomail_campaigns) ? data.ecomail_campaigns : (data.ecomail_campaign_id ? [{ id: data.ecomail_campaign_id, segment: data.ecomail_segment, sent_at: data.ecomail_campaign_sent_at }] : []);
      if (!campaigns.length) { console.error('E-mail nemá kampaň v Ecomailu.'); process.exit(2); }
      const pct = function (a, b) { return b ? Math.round(a / b * 1000) / 10 + ' %' : '—'; };
      const total = { inject: 0, delivery: 0, open: 0, click: 0, bounce: 0, unsub: 0, spam: 0 };
      for (const c of campaigns) {
        const r = await E.ecomail('/campaigns/' + encodeURIComponent(c.id) + '/stats');
        const st = (r && r.stats) || r || {};
        Object.keys(total).forEach(function (k) { total[k] += Number(st[k] || 0); });
        console.log('  ' + c.id + '  ' + String(c.segment || '').padEnd(20) + (c.sent_at ? c.sent_at.slice(0, 16).replace('T', ' ') : 'koncept        ') + '  odesl. ' + String(st.inject || 0).padStart(4) + '  otevř. ' + String(st.open || 0).padStart(4) + '  klik ' + String(st.click || 0).padStart(3) + '  odhl. ' + String(st.unsub || 0));
      }
      console.log(data.subject);
      console.log('  Odesláno:   ' + total.inject);
      console.log('  Doručeno:   ' + total.delivery + '  (' + pct(total.delivery, total.inject) + ')');
      console.log('  Otevřelo:   ' + total.open + ' lidí  (' + pct(total.open, total.delivery) + ')');
      console.log('  Prokliklo:  ' + total.click + ' lidí  (' + pct(total.click, total.delivery) + ')');
      console.log('  Nedoručeno: ' + total.bounce + '   Odhlášeno: ' + total.unsub + '   Spam: ' + total.spam);
      return;
    }

    console.log('Nic k provedení. Použij --test, --draft "segment", --send --yes, --stats, --html nebo --segments.');
  } catch (err) {
    console.error('CHYBA: ' + (err && err.message ? err.message : err));
    process.exit(1);
  }
})();
