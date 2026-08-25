// ============================================
// BUILD: „Úspěchy" (výhry z Whopu) → legacy posty
// ============================================
// Slučuje DVA scrapnuté exporty do jedné kategorie „uspechy" (🏆) a dedupuje:
//   1) assets/whop-vyhry-export  (čisté schéma: id, createdAt ms, comments[])
//   2) assets/whop-wins-export   (hrubší scrape: date string, komentáře vlepené v textu)
// Preferuje verzi z „vyhry" (čistší komentáře/avatary), z „wins" bere jen NOVÉ posty.
// Výstup: assets/legacy-uspechy.js → concat na konec KENJI_LEGACY_POSTS.
//
// Spuštění:  node tools/build-legacy-uspechy.mjs
// ============================================
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/legacy-uspechy.js');
const VYHRY_DIR = 'assets/whop-vyhry-export';
const WINS_DIR = 'assets/whop-wins-export';
const AVATAR_DIRS = [WINS_DIR, VYHRY_DIR, 'assets/whop-predstav-se-export']; // kde hledat profilovky komentujících

const NOW = Date.parse('2026-08-18T12:00:00Z');
function ago(ms) {
  if (!ms || Number.isNaN(ms)) return '';
  const d = Math.floor((NOW - Number(ms)) / 86400000);
  if (d <= 0) return 'dnes';
  if (d === 1) return 'včera';
  if (d < 7) return 'před ' + d + ' dny';
  if (d < 31) { const w = Math.floor(d / 7); return w === 1 ? 'před týdnem' : 'před ' + w + ' týdny'; }
  const mo = Math.floor(d / 30.44);
  return mo === 1 ? 'před měsícem' : 'před ' + mo + ' měsíci';
}
function localFile(dir, rel) {
  if (!rel) return '';
  return fs.existsSync(path.join(ROOT, dir, rel)) ? dir + '/' + rel : '';
}
function avatarByUsername(username) {
  if (!username) return '';
  const clean = String(username).replace(/^@/, '');
  for (const dir of AVATAR_DIRS) {
    const rel = 'profiles/' + clean + '.webp';
    if (fs.existsSync(path.join(ROOT, dir, rel))) return dir + '/' + rel;
  }
  return '';
}
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}
const FOUNDER_USERNAMES = new Set(['kenjiofficial', 'kenji', 'kenjiacademy']);

// ── Schéma A: whop-vyhry (čisté) ──────────────────────────────────────────────
function fromVyhry() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, VYHRY_DIR, 'whop-vyhry-WITH-MEDIA.json'), 'utf8'));
  return d.posts.map((p) => {
    const a = p.author || {};
    const images = (p.attachments || [])
      .filter((x) => x.type === 'ImageAttachment' && x.local_file)
      .map((x) => ({ src: localFile(VYHRY_DIR, x.local_file), alt: x.filename || '' }))
      .filter((im) => im.src);
    const comments_list = (p.comments || [])
      .filter((c) => (c.text || c.markdown) && !c.deleted)
      .map((c) => {
        const ca = c.author || {};
        return {
          author_name: ca.name || 'člen',
          author_avatar: localFile(VYHRY_DIR, ca.profile_picture_local_file) || avatarByUsername(ca.username),
          author_founder: !!ca.is_admin || FOUNDER_USERNAMES.has(String(ca.username || '').toLowerCase()),
          body: String(c.markdown || c.text || '').trim(),
          meta: ago(Number(c.createdAt)),
          likes: Number(c.likes || 0)
        };
      });
    return {
      ts: Number(p.createdAt),
      username: a.username || '',
      author_name: a.name || 'člen',
      author_avatar: localFile(VYHRY_DIR, a.profile_picture_local_file) || avatarByUsername(a.username),
      author_founder: !!a.is_admin || FOUNDER_USERNAMES.has(String(a.username || '').toLowerCase()),
      body: String(p.markdown || p.text || '').trim(),
      images,
      likes: Number(p.likes || 0),
      comments_list
    };
  });
}

// ── Schéma B: whop-wins (komentáře vlepené v textu) ──────────────────────────
// Formát komentáře v textu:  \n<Jméno>\n@<username>\n·\n<Datum>\n<text komentáře>
const COMMENT_RE = /\n([^\n]+)\n@([\w.]+)\n·\n([A-Za-z]{3} \d{1,2}, \d{4})\n?/g;
function splitBodyComments(text) {
  const t = String(text || '');
  COMMENT_RE.lastIndex = 0;
  const heads = [];
  let m;
  while ((m = COMMENT_RE.exec(t))) heads.push({ start: m.index, end: COMMENT_RE.lastIndex, name: m[1].trim(), username: m[2], date: m[3] });
  if (!heads.length) return { body: t.trim(), comments: [] };
  const body = t.slice(0, heads[0].start).trim();
  const comments = heads.map((h, i) => {
    const next = i + 1 < heads.length ? heads[i + 1].start : t.length;
    return {
      author_name: h.name,
      author_avatar: avatarByUsername(h.username),
      author_founder: FOUNDER_USERNAMES.has(String(h.username).toLowerCase()),
      body: t.slice(h.end, next).trim(),
      meta: ago(Date.parse(h.date)),
      likes: 0
    };
  }).filter((c) => c.body);
  return { body, comments };
}
function fromWins() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, WINS_DIR, 'whop-wins-WITH-MEDIA.json'), 'utf8'));
  return d.posts.map((p) => {
    const a = p.author || {};
    const { body, comments } = splitBodyComments(p.text);
    const images = (p.attachments || [])
      .filter((x) => x.type === 'ImageAttachment' && x.local_file)
      .map((x) => ({ src: localFile(WINS_DIR, x.local_file), alt: '' }))
      .filter((im) => im.src);
    return {
      ts: Date.parse(p.date),
      username: a.username || '',
      author_name: a.name || 'člen',
      author_avatar: localFile(WINS_DIR, a.profile_picture_local_file) || avatarByUsername(a.username),
      author_founder: FOUNDER_USERNAMES.has(String(a.username || '').toLowerCase()),
      body,
      images,
      likes: 0,
      comments_list: comments
    };
  });
}

// ── Sloučení + deduplikace (klíč = username + začátek těla) ───────────────────
const key = (p) => norm(p.username) + '|' + norm(p.body).slice(0, 40);
const seen = new Set();
const merged = [];
for (const p of [...fromVyhry(), ...fromWins()]) { // vyhry mají přednost (jdou první)
  const k = key(p);
  if (seen.has(k)) continue;
  seen.add(k);
  merged.push(p);
}
merged.sort((a, b) => (b.ts || 0) - (a.ts || 0));

let imgCount = 0, commentCount = 0;
const out = merged.map((p, i) => {
  imgCount += p.images.length;
  commentCount += p.comments_list.length;
  return {
    id: 'legacy-uspech-' + i + '-' + norm(p.username).slice(0, 10),
    legacy: true,
    legacy_order: 2000 + i,
    title: '',
    author_name: p.author_name,
    author_avatar: p.author_avatar,
    author_founder: p.author_founder,
    category: 'uspechy',
    category_label: 'ÚSPĚCHY',
    legacy_meta: (ago(p.ts) || 'nedávno') + ' v 🏆 ÚSPĚCHY',
    pinned: false,
    body: p.body,
    images: p.images,
    videos: [],
    links: [],
    likes: p.likes,
    comments: p.comments_list.length,
    comments_list: p.comments_list,
    liked: false,
    can_delete: false
  };
});

const banner = '// Generated from whop-vyhry + whop-wins exports (deduped). Do not edit by hand.\n' +
  '// Kategorie „úspěchy" (🏆) — připojené na konec KENJI_LEGACY_POSTS.\n';
fs.writeFileSync(OUT, banner +
  'window.KENJI_LEGACY_POSTS = (window.KENJI_LEGACY_POSTS || []).concat(\n' + JSON.stringify(out, null, 2) + '\n);\n');

console.log('Hotovo →', path.relative(ROOT, OUT));
console.log('Postů:', out.length, '· fotek:', imgCount, '· komentářů:', commentCount);
console.log('Autoři:', out.map((p) => p.author_name).join(', '));
