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
      fs.writeFileSync(out, E.emailTemplateHtml(sequence, step));
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
      const wanted = typeof flag('--draft') === 'string' ? flag('--draft') : '';
      let segmentId = null;
      if (wanted) {
        // Více segmentů oddělených čárkou → jedna kampaň, Ecomail adresy sloučí.
        const segments = await E.listSegments();
        const picked = wanted.split(',').map(function (w) { return w.trim(); }).filter(Boolean).map(function (w) {
          const seg = segments.find(function (s) { return s.name.trim().toLowerCase() === w.toLowerCase(); }) || segments.find(function (s) { return s.name.toLowerCase().includes(w.toLowerCase()); });
          if (!seg) { console.error('Segment „' + w + '“ v Ecomailu není. Dostupné: ' + segments.map(function (s) { return s.name; }).join(' | ')); process.exit(2); }
          return seg;
        });
        segmentId = picked.map(function (s) { return s.id; });
        picked.forEach(function (seg) { console.log('Segment: ' + seg.name + ' (' + seg.id + ') — ' + (seg.count == null ? '?' : seg.count) + ' kontaktů'); });
        console.log('Celkem: ' + picked.reduce(function (a, s) { return a + (s.count || 0); }, 0) + ' kontaktů');
      } else {
        console.log('Bez segmentu — kampaň půjde na CELÝ seznam.');
      }
      const created = await E.createCampaign(sequence, step, segmentId);
      data.ecomail_campaign_id = created.id;
      data.ecomail_segment = wanted || 'celý seznam';
      data.ecomail_campaign_created_at = new Date().toISOString();
      delete data.ecomail_campaign_sent_at;
      saveEmail(data);
      return console.log('Koncept kampaně založen v Ecomailu: ID ' + created.id + '. Nic neodešlo. Zkontroluj v Ecomailu → Kampaně, pak: --send --yes');
    }

    if (flag('--send')) {
      if (!data.ecomail_campaign_id) { console.error('Nejdřív --draft (koncept kampaně).'); process.exit(2); }
      if (data.ecomail_campaign_sent_at) { console.error('Tahle kampaň už odešla ' + data.ecomail_campaign_sent_at + '.'); process.exit(2); }
      if (!flag('--yes')) { console.error('Odeslání je nevratné. Potvrď přepínačem --yes.'); process.exit(2); }
      await E.sendCampaign(data.ecomail_campaign_id);
      data.ecomail_campaign_sent_at = new Date().toISOString();
      saveEmail(data);
      return console.log('Kampaň ' + data.ecomail_campaign_id + ' je ve frontě Ecomailu (' + data.ecomail_segment + ').');
    }

    if (flag('--stats')) {
      if (!data.ecomail_campaign_id) { console.error('E-mail nemá kampaň v Ecomailu.'); process.exit(2); }
      const r = await E.ecomail('/campaigns/' + encodeURIComponent(data.ecomail_campaign_id) + '/stats');
      const st = (r && r.stats) || r || {};
      const pct = function (v) { return v == null ? '—' : (Math.round(Number(v) * 10) / 10) + ' %'; };
      console.log('Kampaň ' + data.ecomail_campaign_id + ' — ' + (data.ecomail_segment || '') + (data.ecomail_campaign_sent_at ? ' — odesláno ' + data.ecomail_campaign_sent_at.slice(0, 16).replace('T', ' ') : ''));
      console.log('  Odesláno:   ' + (st.inject != null ? st.inject : '—'));
      console.log('  Doručeno:   ' + (st.delivery != null ? st.delivery : '—') + '  (' + pct(st.delivery_rate) + ')');
      console.log('  Otevřelo:   ' + (st.open != null ? st.open : '—') + ' lidí  (' + pct(st.open_rate) + ')  celkem otevření ' + (st.total_open != null ? st.total_open : '—'));
      console.log('  Prokliklo:  ' + (st.click != null ? st.click : '—') + ' lidí  (' + pct(st.click_rate) + ')  celkem prokliků ' + (st.total_click != null ? st.total_click : '—'));
      console.log('  Nedoručeno: ' + (st.bounce != null ? st.bounce : '—') + '  (' + pct(st.bounce_rate) + ')');
      console.log('  Odhlášeno:  ' + (st.unsub != null ? st.unsub : '—') + '  (' + pct(st.unsub_rate) + ')');
      console.log('  Spam:       ' + (st.spam != null ? st.spam : '—') + '  (' + pct(st.spam_rate) + ')');
      return;
    }

    console.log('Nic k provedení. Použij --test, --draft "segment", --send --yes, --stats, --html nebo --segments.');
  } catch (err) {
    console.error('CHYBA: ' + (err && err.message ? err.message : err));
    process.exit(1);
  }
})();
