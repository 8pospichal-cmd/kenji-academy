// Import obsahu lekcí z Flixy JSON exportů → assets/course-content.js
// Použití: node tools/build-course-content.mjs
// Skenuje tools/course-exports/*.json, spáruje s manifestem (assets/courses.js)
// podle názvu lekce a vygeneruje mapu { slug: { normTitle: { youtube, content } } }.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORTS = path.join(ROOT, 'tools/course-exports');

const idToSlug = {
  'e8r81xl4fxp8a1y17lc2c9js': 'zaklady-technika',
  'yk7gavkua1gs2z9cvkizmd4h': 'kenji-v-akci',
  'etn3ew847pb01ve0lxlch1yx': 'foceni-jako-byznys',
  'pmptm3c0d3v5uh7vnultamaa': 'svatebni-masterclass',
  'dxp4am7lcwhvg6kmn80mt15oc': '90denni-vyzva'
};

const norm = (s) => String(s || '')
  .replace(/^\s*\d+\.\s*/, '')
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '');
const ytId = (u) => (String(u || '').match(/(?:youtu\.be\/|v=|embed\/|live\/|shorts\/)([\w-]{11})/) || [])[1] || null;
const clean = (h) => String(h || '')
  .replace(/\sclass="[^"]*"/g, '')          // pryč Flixy Tailwind třídy
  .replace(/\scontenteditable="[^"]*"/g, '')
  .replace(/<p>\s*<\/p>/g, '')               // prázdné odstavce
  .trim();                                   // target/rel u odkazů necháváme (_blank)

// načti manifest (shim window)
const coursesJs = fs.readFileSync(path.join(ROOT, 'assets/courses.js'), 'utf8');
const win = {};
new Function('window', coursesJs)(win);
const COURSES = win.KENJI_COURSES || [];

// posbírej obsah z exportů
const content = {};
for (const f of fs.readdirSync(EXPORTS).filter((x) => x.endsWith('.json'))) {
  const j = JSON.parse(fs.readFileSync(path.join(EXPORTS, f), 'utf8'));
  const slug = idToSlug[j.courseId];
  if (!slug) { console.warn('⚠️  neznámý courseId', j.courseId, '(' + f + ')'); continue; }
  content[slug] = content[slug] || {};
  for (const l of (j.lessons || [])) {
    if (l.type === 'INTRO') {
      content[slug].__intro = { content: clean(l.content_raw) || '' };
      continue;
    }
    content[slug][norm(l.title)] = { youtube: ytId(l.video), content: clean(l.content_raw) || '' };
  }
}

// kontrola párování
let missing = 0;
for (const c of COURSES) {
  const map = content[c.slug];
  if (!map) continue;
  const used = new Set();
  for (const m of (c.modules || [])) for (const l of m.lessons) {
    const k = norm(l.title);
    if (map[k]) used.add(k);
    else { console.warn('❌ NENÍ VIDEO/POPIS:', c.slug, '|', l.title, '(klíč: ' + k + ')'); missing++; }
  }
  for (const k of Object.keys(map)) if (k !== '__intro' && !used.has(k)) console.warn('ℹ️  navíc v JSON (nespárováno):', c.slug, '|', k);
}

fs.writeFileSync(path.join(ROOT, 'assets/course-content.js'),
  '// AUTOMATICKY GENEROVÁNO: node tools/build-course-content.mjs — needituj ručně\n' +
  'window.KENJI_COURSE_CONTENT = ' + JSON.stringify(content) + ';\n');

console.log('✓ assets/course-content.js —', Object.entries(content).map(([s, m]) => s + ': ' + Object.keys(m).length + ' lekcí').join(', '));
if (missing) console.log('⚠️  nespárováno lekcí:', missing);
