// ============================================
// BUILD: „Představ se" (starší archiv z Whopu) → legacy posty
// ============================================
// Vezme scrapnutý export z Whopu (whop-predstav-se-WITH-MEDIA.json) a vygeneruje
// assets/legacy-predstav-se.js, který PŘIPOJÍ posty na KONEC window.KENJI_LEGACY_POSTS.
// Tím se v feedu zobrazí pod stávajícími (jsou starší) a komentáře jsou rozklikávací.
//
// Spuštění:  node tools/build-legacy-predstav-se.mjs
// ============================================
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const EXPORT_DIR = 'assets/whop-predstav-se-export';
const SRC = path.join(ROOT, EXPORT_DIR, 'whop-predstav-se-WITH-MEDIA.json');
const OUT = path.join(ROOT, 'assets/legacy-predstav-se.js');

// „před X" relativně k datu exportu (dnes = 2026-08-18)
const NOW = Date.parse('2026-08-18T12:00:00Z');
function ago(ms) {
  const d = Math.floor((NOW - Number(ms)) / 86400000);
  if (d <= 0) return 'dnes';
  if (d === 1) return 'včera';
  if (d < 7) return 'před ' + d + ' dny';
  if (d < 31) { const w = Math.floor(d / 7); return w === 1 ? 'před týdnem' : 'před ' + w + ' týdny'; }
  const mo = Math.floor(d / 30.44);
  return mo === 1 ? 'před měsícem' : 'před ' + mo + ' měsíci';
}

function localOrEmpty(rel) {
  if (!rel) return '';
  const abs = path.join(ROOT, EXPORT_DIR, rel);
  return fs.existsSync(abs) ? EXPORT_DIR + '/' + rel : '';
}

const data = JSON.parse(fs.readFileSync(SRC, 'utf8'));
// Nejnovější z tohoto (staršího) balíku nahoře, nejstarší dole.
const posts = [...data.posts].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));

let imgCount = 0;
let commentCount = 0;

const out = posts.map((p, i) => {
  const author = p.author || {};
  const images = (p.attachments || [])
    .filter((a) => a.type === 'ImageAttachment' && a.local_file)
    .map((a) => ({ src: localOrEmpty(a.local_file), alt: a.filename || '' }))
    .filter((im) => im.src);
  imgCount += images.length;

  const comments_list = (p.comments || [])
    .filter((c) => (c.text || c.markdown) && !c.deleted)
    .map((c) => {
      const ca = c.author || {};
      return {
        author_name: ca.name || 'člen',
        author_avatar: localOrEmpty(ca.profile_picture_local_file),
        author_founder: !!ca.is_admin,
        body: String(c.markdown || c.text || '').trim(),
        meta: ago(c.createdAt),
        likes: Number(c.likes || 0)
      };
    });
  commentCount += comments_list.length;

  return {
    id: 'legacy-ps-' + p.id,
    legacy: true,
    legacy_order: 1000 + i,
    title: String(p.title || '').trim(),
    author_name: author.name || 'člen',
    author_avatar: localOrEmpty(author.profile_picture_local_file),
    author_founder: !!author.is_admin,
    category: 'predstav-se',
    category_label: 'PŘEDSTAV SE',
    legacy_meta: ago(p.createdAt) + ' v 👤 PŘEDSTAV SE',
    pinned: false,
    body: String(p.markdown || p.text || '').trim(),
    images,
    videos: [],
    links: [],
    likes: Number(p.likes || 0),
    comments: comments_list.length,
    comments_list,
    liked: false,
    can_delete: false
  };
});

const banner = '// Generated from whop-predstav-se export. Do not edit by hand.\n' +
  '// Starší „Představ se" posty — připojené na konec KENJI_LEGACY_POSTS (zobrazí se pod novějšími).\n';
const body = 'window.KENJI_LEGACY_POSTS = (window.KENJI_LEGACY_POSTS || []).concat(\n' +
  JSON.stringify(out, null, 2) + '\n);\n';
fs.writeFileSync(OUT, banner + body);

console.log('Hotovo →', path.relative(ROOT, OUT));
console.log('Postů:', out.length, '· fotek:', imgCount, '· komentářů:', commentCount);
