// ============================================
// KENJI ACADEMY — KOMUNITNÍ FEED (příspěvky)
// ============================================
// Napojení na Supabase přes bezpečné funkce (viz SUPABASE_PRISPEVKY.md).
// Identita autora zatím z brány (Instagram + e-mail); postovat smí jen člen.
// ============================================
(function () {
  const ROOT_EL = document.getElementById('feed-root');
  if (!ROOT_EL) return;

  const ADMIN_EMAILS = ['8pospichal@gmail.com']; // jen pro UI; server to stejně vynucuje
  const CATS = [
    { id: '', label: 'Vše', emoji: '🗂' },
    { id: 'novinky', label: 'Novinky', emoji: '💎', adminOnly: true },
    { id: 'slevy', label: 'Slevy', emoji: '🤑', adminOnly: true },
    { id: 'dotazy', label: 'Dotazy', emoji: '❓' },
    { id: 'fotka-mesice', label: 'Fotka měsíce', emoji: '📸' },
    { id: 'predstav-se', label: 'Představ se', emoji: '👤' },
    { id: 'uspechy', label: 'Úspěchy', emoji: '🏆' },
    { id: 'second-shooting', label: 'Second shooting', emoji: '📷' }
  ];
  const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || id;
  const catEmoji = (id) => (CATS.find((c) => c.id === id) || {}).emoji || '•';

  const A = window.KenjiAuth || {};
  const user = A.getUser ? A.getUser() : null;
  const isMember = !!(A.isMember && A.isMember());
  const email = user && user.email ? user.email : '';
  const ig = user && user.instagram ? user.instagram : '';
  const isAdmin = ADMIN_EMAILS.indexOf((email || '').toLowerCase()) >= 0;
  const requestedCat = new URLSearchParams(location.search).get('category') || '';
  let activeCat = CATS.some((cat) => cat.id === requestedCat) ? requestedCat : '';
  let searchQuery = (new URLSearchParams(location.search).get('q') || '').trim();
  let sb = null;
  const legacyPosts = Array.isArray(window.KENJI_LEGACY_POSTS) ? window.KENJI_LEGACY_POSTS : [];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function legacyLikeKey(id) { return 'kenji_legacy_like_' + id; }
  function legacyLiked(id) {
    try { return localStorage.getItem(legacyLikeKey(id)) === '1'; } catch (_) { return false; }
  }
  function setLegacyLiked(id, liked) {
    try {
      if (liked) localStorage.setItem(legacyLikeKey(id), '1');
      else localStorage.removeItem(legacyLikeKey(id));
    } catch (_) {}
  }
  function legacyLikeCount(post) { return Math.max(0, Number(post.likes || 0) + (legacyLiked(post.id) ? 1 : 0)); }
  function initials(handle) { const h = (handle || '?').replace(/^@/, ''); return (h[0] || '?').toUpperCase(); }
  function safeUrl(value) { const url = String(value || '').trim(); return /^(https?:|mailto:)/i.test(url) ? url : ''; }
  function mappedUrl(value) {
    const raw = String(value || '').trim();
    const withProtocol = /^kenjihodatabaze\.netlify\.app\//i.test(raw) ? 'https://' + raw : raw;
    if (/^https?:\/\/kenjihodatabaze\.netlify\.app/i.test(withProtocol)) {
      try {
        let path = new URL(withProtocol).pathname.replace(/^\//, '');
        if (!path) return 'index.html';
        if (path.startsWith('clanky/') && !/\.html$/i.test(path)) path += '.html';
        return path;
      } catch (_) { return 'index.html'; }
    }
    if (/^https?:\/\/moje\.flixy\.cz/i.test(withProtocol)) {
      return /\/course\//.test(withProtocol) ? 'kurzy.html' : '';
    }
    return safeUrl(withProtocol);
  }
  function renderInline(value) {
    const parts = String(value || '').split(/((?:https?:\/\/|kenjihodatabaze\.netlify\.app\/)[^\s]+)/gi);
    return parts.map((part) => {
      if (!/^(?:https?:\/\/|kenjihodatabaze\.netlify\.app\/)/i.test(part)) return esc(part);
      const clean = part.replace(/[),.;]+$/, '');
      const suffix = part.slice(clean.length);
      const href = mappedUrl(clean);
      if (!href) return '';
      const internal = !/^(?:https?:|mailto:)/i.test(href);
      const label = /kenjihodatabaze\.netlify\.app/i.test(clean) ? 'Otevřít v databázi' : href === 'kurzy.html' ? 'Otevřít kurzy' : clean;
      return '<a href="' + esc(href) + '"' + (internal ? '' : ' target="_blank" rel="noopener"') + '>' + esc(label) + '</a>' + esc(suffix);
    }).join('');
  }
  function normalizeImportedBody(value) {
    let text = String(value || '').replace(/\r\n?/g, '\n');
    let previous = '';
    for (let i = 0; i < 6 && text !== previous; i += 1) {
      previous = text;
      text = text.replace(/(\d)\n(?=\d(?:[.\n]))/g, '$1');
    }
    text = text.replace(/([^\n])\s*\n(?=\d{2,4}\.(?:\s|$))/g, '$1 ');
    text = text.replace(/([^\n])(?=\s*[1-4]\.\s*(?:JAK DLOUHO|CÍL PRO ROK|PROČ JSI TU|BIZÁR))/gi, '$1\n');
    text = text.replace(/\b(JAK DLOUHO|CÍL PRO ROK 2026|PROČ JSI TU|BIZÁR(?:\s*\/\s*FUNFACT O MNĚ)?|ŠABLONA|NADPIS|THE FINAL VERDICT|ÚKOL PRO VÁS):(?=\S)/gi, '$1: ');
    return text;
  }
  function bodyBlocks(value) {
    const lines = normalizeImportedBody(value).replace(/([^\n])(?=(?:1️⃣|2️⃣|3️⃣|4️⃣|5️⃣|✅|🔥|💸|🧠|🎯|📞|⚡|📝|🔍|🖥️|🤝|📹|📚))/g, '$1\n').split(/\n+/);
    const blocks = [];
    lines.forEach((line) => {
      const text = line.trim();
      if (!text) return;
      if (text.length <= 420) { blocks.push(text); return; }
      const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/);
      let chunk = '';
      sentences.forEach((sentence) => {
        if (chunk && (chunk.length + sentence.length > 330)) { blocks.push(chunk.trim()); chunk = ''; }
        chunk += (chunk ? ' ' : '') + sentence;
      });
      if (chunk) blocks.push(chunk.trim());
    });
    return blocks;
  }
  function introBlock(block) {
    const match = String(block || '').match(/^([1-4])\.\s*([^:?\n]+(?:\s*\/\s*[^:?\n]+)?)(?:\?|:)?\s*(.*)$/i);
    if (!match) return null;
    const rawLabel = match[2].trim().replace(/\s+/g, ' ');
    const answer = match[3].trim();
    const label = rawLabel
      .replace(/^JAK DLOUHO$/i, 'Jak dlouho fotí')
      .replace(/^CÍL PRO ROK 2026$/i, 'Cíl pro rok 2026')
      .replace(/^PROČ JSI TU$/i, 'Proč je tady')
      .replace(/^BIZÁR(?:\s*\/\s*FUNFACT O MNĚ)?$/i, 'Bizár / fun fact');
    return '<section class="post-intro-block"><h3>' + esc(label) + '</h3>' + (answer ? '<p>' + renderInline(answer) + '</p>' : '') + '</section>';
  }
  function renderBody(value, post) {
    const blocks = bodyBlocks(value);
    return blocks.map((block) => {
      if (post && post.category === 'predstav-se') {
        const intro = introBlock(block);
        if (intro) return intro;
      }
      const isStep = /^(?:\d+[.)]|[1-9]️⃣|✅|👉|🔍|🖥️|🤝|📹|📚)/.test(block);
      const isHeading = block.length < 105 && (/[?:]$/.test(block) || /^(?:🔥|💸|🧠|🎯|📞|⚡|📝)/.test(block) || block === block.toUpperCase());
      if (isHeading) return '<h3>' + renderInline(block) + '</h3>';
      if (isStep) return '<div class="post-body-step">' + renderInline(block) + '</div>';
      return '<p>' + renderInline(block) + '</p>';
    }).join('');
  }
  function avatar(author, src, small) {
    const cls = 'feed-avatar' + (small ? ' sm' : '');
    return src
      ? '<span class="' + cls + ' has-image"><img src="' + esc(src) + '" alt="" loading="lazy" onerror="this.parentNode.classList.remove(\'has-image\');this.remove()"><b>' + initials(author) + '</b></span>'
      : '<span class="' + cls + '">' + initials(author) + '</span>';
  }
  function timeAgo(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return 'teď'; if (d < 3600) return Math.floor(d / 60) + ' min';
    if (d < 86400) return Math.floor(d / 3600) + ' h'; if (d < 604800) return Math.floor(d / 86400) + ' d';
    return new Date(iso).toLocaleDateString('cs');
  }
  function ytId(url) { const m = String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return m ? m[1] : null; }
  function normalizeSearch(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function searchWords(value) {
    return normalizeSearch(value).split(/[^a-z0-9]+/).filter((word) => word.length > 1);
  }
  function postSearchParts(post) {
    return {
      title: normalizeSearch(post.title || ''),
      author: normalizeSearch(post.author_name || post.author_ig || ''),
      category: normalizeSearch([catLabel(post.category), post.category_label, post.category].filter(Boolean).join(' ')),
      body: normalizeSearch([post.body, post.link_url, ...(post.links || []), ...(post.videos || [])].filter(Boolean).join(' '))
    };
  }
  function searchScore(post, words) {
    if (!words.length) return 0;
    const parts = postSearchParts(post);
    let score = 0;
    words.forEach((word) => {
      let hit = false;
      if (parts.title.includes(word)) { score += parts.title === word ? 22 : 14; hit = true; }
      if (parts.author.includes(word)) { score += 10; hit = true; }
      if (parts.category.includes(word)) { score += 7; hit = true; }
      if (parts.body.includes(word)) {
        const first = parts.body.indexOf(word);
        score += 4 + (first >= 0 && first < 260 ? 3 : 0);
        hit = true;
      }
      if (!hit) score -= 8;
    });
    if (post.pinned) score += 2;
    if (post.legacy) score += 1;
    return score;
  }
  function filterAndRankPosts(posts) {
    const words = searchWords(searchQuery);
    if (!words.length) return posts;
    return posts
      .map((post, index) => ({ post, index, score: searchScore(post, words) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || Number(!!b.post.pinned) - Number(!!a.post.pinned) || a.index - b.index)
      .map((item) => item.post);
  }

  // ---------- ZÁMEK PRO NEČLENY ----------
  if (!isMember) {
    ROOT_EL.innerHTML =
      '<div class="paywall"><div class="paywall-lock">🔒</div>' +
      '<h2 class="paywall-title">Komunita je pro členy</h2>' +
      '<p class="paywall-text">Tady se potkávají tvůrci z Kenji Academy — sdílí fotky, ptají se, ukazují práci a domlouvají second shooting. Feed a diskuze jsou součástí plného členství.</p>' +
      '<div class="paywall-actions">' +
        '<a class="paywall-cta" href="academy.html">Chci do Kenji Academy</a>' +
        '<span class="paywall-note">Kompletní program + komunita · nebo jen <a href="#" data-checkout-product="databaze">databáze 1 497 Kč</a></span>' +
      '</div></div>';
    return;
  }

  // ---------- KOSTRA (composer + taby + feed) ----------
  function categoryCount(id, current) {
    const archived = legacyPosts.filter((post) => !id || post.category === id).length;
    const live = (current || []).filter((post) => !id || post.category === id).length;
    return archived + live;
  }
  function updateCategoryUI(current) {
    document.querySelectorAll('[data-feed-cat]').forEach((el) => el.classList.toggle('active', el.getAttribute('data-feed-cat') === activeCat));
    document.querySelectorAll('[data-feed-count]').forEach((el) => {
      el.textContent = categoryCount(el.getAttribute('data-feed-count'), current);
    });
  }
  function catTabs() {
    return '<div class="feed-tabs">' + CATS.map((c) =>
      '<button class="feed-tab' + (c.id === activeCat ? ' active' : '') + '" data-cat="' + c.id + '">' +
      c.emoji + ' ' + c.label + ' <small>' + categoryCount(c.id) + '</small></button>').join('') + '</div>';
  }
  function composer() {
    const opts = CATS.filter((c) => c.id && (!c.adminOnly || isAdmin))
      .map((c) => '<option value="' + c.id + '">' + c.emoji + ' ' + c.label + '</option>').join('');
    return '' +
      '<div class="composer">' +
        '<div class="composer-top"><span class="feed-avatar">' + initials(ig) + '</span>' +
          '<textarea id="composer-text" class="composer-input" rows="2" placeholder="Co je nového' + (ig ? ', @' + esc(ig) : '') + '?"></textarea>' +
        '</div>' +
        '<div id="composer-preview" class="composer-preview" hidden></div>' +
        '<div class="composer-bar">' +
          '<label class="composer-tool" title="Nahrát foto">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h.9l.8-1.3A1 1 0 0 1 9 4.2h6a1 1 0 0 1 .8.5l.8 1.3h.9A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.3"/></svg>' +
            '<span>Nahrát foto</span>' +
            '<input type="file" id="composer-file" accept="image/*" hidden></label>' +
          '<input type="url" id="composer-link" class="composer-link" placeholder="Odkaz / YouTube (nepovinné)">' +
          '<select id="composer-cat" class="composer-cat">' + opts + '</select>' +
          '<button id="composer-send" class="composer-send">Publikovat</button>' +
        '</div>' +
        '<div id="composer-err" class="composer-err" hidden></div>' +
      '</div>';
  }
  function searchBar() {
    return '<div class="feed-search" role="search">' +
      '<span class="feed-search-ico">⌕</span>' +
      '<input id="feed-search-input" type="search" value="' + esc(searchQuery) + '" placeholder="Hledat v příspěvcích">' +
      '<button id="feed-search-clear" type="button" aria-label="Vymazat hledání"' + (searchQuery ? '' : ' hidden') + '>×</button>' +
      '<span id="feed-search-status" class="feed-search-status"></span>' +
    '</div>';
  }

  ROOT_EL.innerHTML =
    '<div class="feed-wrap"><div class="feed-mobile-categories"><span>Kategorie</span>' + catTabs() + '</div>' + searchBar() + composer() +
    '<div id="feed-list" class="feed-list"><div class="feed-loading">Načítám příspěvky…</div></div></div>';

  // ---------- SUPABASE ----------
  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  async function rpc(fn, args) {
    const c = await getSB();
    if (!c) throw new Error('offline');
    const { data, error } = await c.rpc(fn, args);
    if (error) throw error;
    return data;
  }
  async function loadLegacyPinOverrides() {
    try {
      const rows = await rpc('list_legacy_pin_overrides', { p_email: email });
      (rows || []).forEach((row) => {
        const post = legacyPosts.find((entry) => entry.id === row.post_id);
        if (post) post.pinned = !!row.pinned;
      });
      loadFeed();
    } catch (_) {
      // Migrace pro adminské připínání zatím nemusí být v Supabase spuštěná.
    }
  }

  // ---------- FEED ----------
  async function loadFeed() {
    const list = document.getElementById('feed-list');
    list.innerHTML = '<div class="feed-loading">Načítám příspěvky…</div>';
    const archived = legacyPosts.filter((post) => searchQuery || !activeCat || post.category === activeCat);
    let current = [];
    const paint = () => {
      const basePosts = archived.filter((post) => post.pinned).concat(current, archived.filter((post) => !post.pinned));
      const posts = filterAndRankPosts(basePosts);
      const status = document.getElementById('feed-search-status');
      if (status) status.textContent = searchQuery ? posts.length + ' výsledků' : '';
      if (!posts.length) {
        list.innerHTML = '<div class="feed-empty">' + (searchQuery ? 'Nic jsem nenašel. Zkus jiné klíčové slovo.' : 'Zatím tu nic není. Buď první, kdo něco napíše 👋') + '</div>';
        updateCategoryUI(current);
        return;
      }
      list.innerHTML = posts.map(renderPost).join('');
      wirePosts();
      updateCategoryUI(current);
    };
    if (archived.length) paint();
    try {
      current = await rpc('list_posts', { p_email: email, p_category: searchQuery ? null : activeCat || null, p_limit: 60 }) || [];
    } catch (e) {
      console.warn('list_posts', e);
    }
    paint();
  }

  function renderMedia(p) {
    if (p.legacy) {
      let html = '';
      const images = Array.isArray(p.images) ? p.images : [];
      if (images.length) {
        html += '<div class="post-media post-gallery count-' + Math.min(images.length, 5) + '">' + images.map((image) =>
          '<button class="post-gallery-item" type="button" data-full="' + esc(image.src) + '" aria-label="Zvětšit fotografii"><img src="' + esc(image.src) + '" alt="' + esc(image.alt || '') + '" loading="lazy"></button>'
        ).join('') + '</div>';
      }
      const videos = Array.isArray(p.videos) ? p.videos : [];
      html += videos.map((url) => {
        const id = ytId(url);
        return id ? '<div class="post-media post-yt"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '" title="Video k příspěvku" frameborder="0" loading="lazy" allowfullscreen></iframe></div>' : '';
      }).join('');
      return html;
    }
    if (p.media_type === 'image' && p.media_url) return '<div class="post-media"><img src="' + esc(p.media_url) + '" alt="" loading="lazy"></div>';
    if (p.media_type === 'youtube' && p.link_url) { const id = ytId(p.link_url); if (id) return '<div class="post-media post-yt"><iframe src="https://www.youtube-nocookie.com/embed/' + id + '" frameborder="0" allowfullscreen></iframe></div>'; }
    if (p.link_url) return '<a class="post-link" href="' + esc(p.link_url) + '" target="_blank" rel="noopener">🔗 ' + esc(p.link_url) + '</a>';
    return '';
  }
  function renderLinks(p) {
    if (!p.legacy) return '';
    const videos = new Set(Array.isArray(p.videos) ? p.videos : []);
    const links = (Array.isArray(p.links) ? p.links : [])
      .map((url) => ({ original: url, href: mappedUrl(url) }))
      .filter((item, index, all) => item.href && !videos.has(item.original) && all.findIndex((other) => other.href === item.href) === index);
    if (!links.length) return '';
    return '<div class="post-links">' + links.map((item) => {
      const internal = !/^(?:https?:|mailto:)/i.test(item.href);
      const label = item.href === 'index.html' || item.href.startsWith('clanky/') ? 'Otevřít v databázi' : item.href === 'kurzy.html' ? 'Otevřít kurzy' : item.original;
      return '<a class="post-link" href="' + esc(item.href) + '"' + (internal ? '' : ' target="_blank" rel="noopener"') + '>' + esc(label) + '</a>';
    }).join('') + '</div>';
  }
  function renderLegacyComments(p) {
    const list = Array.isArray(p.comments_list) ? p.comments_list : [];
    if (!list.length) return '';
    return list.map((c) =>
      '<div class="comment">' + avatar(c.author_name, c.author_avatar, true) +
      '<div class="comment-body"><span class="comment-author">' + esc(c.author_name || 'člen') +
      (c.author_founder ? ' <small class="post-founder">Zakladatel</small>' : '') + '</span> ' +
      esc(c.body) + '<div class="comment-sub">' + esc(c.meta || '') +
      (c.likes ? ' · ❤️ ' + c.likes : '') + '</div></div></div>').join('') +
      '<div class="comment-archive-note">Komentáře z archivu — nové přidávej u aktuálních příspěvků 👆</div>';
  }
  function renderPost(p) {
    const author = p.author_name || (p.author_ig ? '@' + p.author_ig : 'člen');
    const legacyComments = p.legacy && Array.isArray(p.comments_list) && p.comments_list.length;
    const sub = p.legacy ? p.legacy_meta : catEmoji(p.category) + ' ' + catLabel(p.category) + ' · ' + timeAgo(p.created_at);
    const longBody = String(p.body || '').length > 520 || bodyBlocks(p.body).length > 4;
    const body = p.body ? '<div class="post-copy"><div class="post-body' + (longBody ? ' is-collapsed' : '') + '">' + renderBody(p.body, p) + '</div>' +
      (longBody ? '<button class="post-more" type="button" aria-expanded="false">Zobrazit více</button>' : '') + '</div>' : '';
    return '<article class="post' + (p.legacy ? ' post-legacy' : '') + (p.pinned ? ' post-pinned' : '') + '" data-id="' + esc(p.id) + '">' +
      (p.pinned ? '<div class="post-pinned-label">Připnuto</div>' : '') +
      '<div class="post-head">' +
        avatar(author, p.author_avatar, false) +
        '<div class="post-meta"><span class="post-author">' + esc(author) + (p.author_founder ? ' <small class="post-founder">Zakladatel</small>' : '') + '</span>' +
          '<span class="post-sub">' + esc(sub) + '</span></div>' +
        (isAdmin ? '<button class="post-pin" type="button" title="' + (p.pinned ? 'Odepnout příspěvek' : 'Připnout příspěvek') + '" aria-label="' + (p.pinned ? 'Odepnout příspěvek' : 'Připnout příspěvek') + '">' + (p.pinned ? '◆' : '◇') + '</button>' : '') +
        (p.can_delete ? '<button class="post-del" title="Smazat">✕</button>' : '') +
      '</div>' +
      (p.title ? '<h2 class="post-title">' + esc(p.title) + '</h2>' : '') +
      renderMedia(p) +
      body +
      renderLinks(p) +
      '<div class="post-actions">' +
        (p.legacy
          ? '<button class="post-like post-legacy-like' + (legacyLiked(p.id) ? ' on' : '') + '" type="button"><span class="pl-ico">' + (legacyLiked(p.id) ? '❤️' : '🤍') + '</span> <span class="pl-count">' + legacyLikeCount(p) + '</span></button>' +
            (legacyComments
              ? '<button class="post-comments-toggle post-legacy-comments-toggle" type="button">💬 <span class="pc-count">' + p.comments + '</span></button>'
              : '<span class="post-static-action">💬 <span>' + p.comments + '</span></span>') +
            '<span class="post-archive-label">Archiv z Flixy</span>'
          : '<button class="post-like' + (p.liked ? ' on' : '') + '"><span class="pl-ico">' + (p.liked ? '❤️' : '🤍') + '</span> <span class="pl-count">' + p.likes + '</span></button><button class="post-comments-toggle">💬 <span class="pc-count">' + p.comments + '</span></button>') +
      '</div>' +
      '<div class="post-comments" hidden>' + (legacyComments ? renderLegacyComments(p) : '') + '</div>' +
      '</article>';
  }

  // ---------- INTERAKCE ----------
  function wirePosts() {
    document.querySelectorAll('.post').forEach((el) => {
      const id = el.getAttribute('data-id');
      if (el.classList.contains('post-legacy')) {
        const legacyLike = el.querySelector('.post-legacy-like');
        if (legacyLike) legacyLike.addEventListener('click', () => {
          const next = !legacyLiked(id);
          setLegacyLiked(id, next);
          legacyLike.classList.toggle('on', next);
          legacyLike.querySelector('.pl-ico').textContent = next ? '❤️' : '🤍';
          const count = legacyLike.querySelector('.pl-count');
          count.textContent = Math.max(0, (parseInt(count.textContent, 10) || 0) + (next ? 1 : -1));
        });
        const legacyCommentsToggle = el.querySelector('.post-legacy-comments-toggle');
        if (legacyCommentsToggle) legacyCommentsToggle.addEventListener('click', () => {
          const box = el.querySelector('.post-comments');
          if (box) box.hidden = !box.hidden;
        });
        return;
      }
      const likeBtn = el.querySelector('.post-like');
      likeBtn.addEventListener('click', async () => {
        try {
          const liked = await rpc('toggle_like', { p_email: email, p_post: id });
          likeBtn.classList.toggle('on', liked);
          likeBtn.querySelector('.pl-ico').textContent = liked ? '❤️' : '🤍';
          const cEl = likeBtn.querySelector('.pl-count');
          cEl.textContent = Math.max(0, (parseInt(cEl.textContent, 10) || 0) + (liked ? 1 : -1));
        } catch (e) { console.warn('like', e); }
      });
      el.querySelector('.post-comments-toggle').addEventListener('click', () => toggleComments(el, id));
      const del = el.querySelector('.post-del');
      if (del) del.addEventListener('click', async () => {
        if (!confirm('Smazat příspěvek?')) return;
        try { await rpc('delete_post', { p_email: email, p_post: id }); el.remove(); } catch (e) { console.warn('del', e); }
      });
    });
    document.querySelectorAll('.post-gallery-item').forEach((button) => button.addEventListener('click', () => {
      const src = button.getAttribute('data-full');
      if (!src) return;
      const lightbox = document.createElement('div');
      lightbox.className = 'post-lightbox';
      lightbox.innerHTML = '<button type="button" aria-label="Zavřít">✕</button><img src="' + esc(src) + '" alt="">';
      lightbox.addEventListener('click', () => lightbox.remove());
      document.body.appendChild(lightbox);
    }));
    document.querySelectorAll('.post-more').forEach((button) => button.addEventListener('click', () => {
      const body = button.previousElementSibling;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      body.classList.toggle('is-collapsed', expanded);
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      button.textContent = expanded ? 'Zobrazit více' : 'Zobrazit méně';
    }));
    document.querySelectorAll('.post-pin').forEach((button) => button.addEventListener('click', async () => {
      const post = button.closest('.post');
      const id = post.getAttribute('data-id');
      const legacy = post.classList.contains('post-legacy');
      button.disabled = true;
      try {
        const pinned = legacy
          ? await rpc('toggle_legacy_pin', { p_email: email, p_post_id: id })
          : await rpc('toggle_pin_post', { p_email: email, p_post: id });
        if (legacy) {
          const item = legacyPosts.find((entry) => entry.id === id);
          if (item) item.pinned = !!pinned;
        }
        await loadFeed();
      } catch (e) {
        console.warn('pin', e);
        alert('Připínání bude aktivní po spuštění připravené Supabase migrace.');
        button.disabled = false;
      }
    }));
  }

  async function toggleComments(el, id) {
    const box = el.querySelector('.post-comments');
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="feed-loading">Načítám…</div>';
    try {
      const comments = await rpc('list_comments', { p_email: email, p_post: id });
      box.innerHTML =
        (comments || []).map((c) =>
          '<div class="comment" data-cid="' + c.id + '"><span class="feed-avatar sm">' + initials(c.author_ig) + '</span>' +
          '<div class="comment-body"><span class="comment-author">' + (c.author_ig ? '@' + esc(c.author_ig) : 'člen') + '</span> ' +
          esc(c.body) + '<div class="comment-sub">' + timeAgo(c.created_at) +
          (c.can_delete ? ' · <button class="comment-del">smazat</button>' : '') + '</div></div></div>').join('') +
        '<div class="comment-add"><span class="feed-avatar sm">' + initials(ig) + '</span>' +
        '<input type="text" class="comment-input" placeholder="Napiš komentář…">' +
        '<button class="comment-send">Odeslat</button></div>';
      // odeslání komentáře
      const input = box.querySelector('.comment-input');
      const send = async () => {
        const val = input.value.trim(); if (!val) return;
        input.value = ''; input.disabled = true;
        try { await rpc('add_comment', { p_email: email, p_ig: ig, p_post: id, p_body: val }); await toggleComments(el, id); await toggleComments(el, id); const cc = el.querySelector('.pc-count'); cc.textContent = (parseInt(cc.textContent, 10) || 0) + 1; }
        catch (e) { console.warn('comment', e); input.disabled = false; }
      };
      box.querySelector('.comment-send').addEventListener('click', send);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
      box.querySelectorAll('.comment-del').forEach((b) => b.addEventListener('click', async () => {
        const cEl = b.closest('.comment'); const cid = cEl.getAttribute('data-cid');
        try { await rpc('delete_comment', { p_email: email, p_comment: cid }); cEl.remove(); const cc = el.querySelector('.pc-count'); cc.textContent = Math.max(0, (parseInt(cc.textContent, 10) || 0) - 1); } catch (e) { console.warn(e); }
      }));
    } catch (e) { box.innerHTML = '<div class="feed-empty">Nepovedlo se načíst komentáře.</div>'; }
  }

  // ---------- COMPOSER ----------
  let pendingImageUrl = null;
  function wireComposer() {
    const fileInput = document.getElementById('composer-file');
    const preview = document.getElementById('composer-preview');
    const errEl = document.getElementById('composer-err');
    const showErr = (m) => { errEl.textContent = m; errEl.hidden = false; };

    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0]; if (!f) return;
      errEl.hidden = true;
      if (f.size > 6 * 1024 * 1024) { showErr('Foto je moc velké (max 6 MB).'); fileInput.value = ''; return; }
      preview.hidden = false; preview.innerHTML = '<span class="cp-up">Nahrávám foto…</span>';
      try {
        const c = await getSB();
        const path = (email.replace(/[^a-z0-9]/gi, '') || 'u') + '/' + Date.now() + '-' + f.name.replace(/[^a-z0-9.\-]/gi, '');
        const up = await c.storage.from('post-media').upload(path, f, { contentType: f.type, upsert: false });
        if (up.error) throw up.error;
        const pub = c.storage.from('post-media').getPublicUrl(path);
        pendingImageUrl = pub.data.publicUrl;
        preview.innerHTML = '<img src="' + esc(pendingImageUrl) + '" alt=""><button class="cp-remove" type="button">✕ odebrat</button>';
        preview.querySelector('.cp-remove').addEventListener('click', () => { pendingImageUrl = null; preview.hidden = true; preview.innerHTML = ''; fileInput.value = ''; });
      } catch (e) { console.warn('upload', e); showErr('Foto se nepovedlo nahrát. (Úložiště možná ještě není nastavené.)'); preview.hidden = true; }
    });

    document.getElementById('composer-send').addEventListener('click', async () => {
      errEl.hidden = true;
      const body = document.getElementById('composer-text').value.trim();
      const link = document.getElementById('composer-link').value.trim();
      const cat = document.getElementById('composer-cat').value;
      if (!body && !pendingImageUrl && !link) { showErr('Napiš text, přidej foto nebo odkaz.'); return; }
      let media_url = pendingImageUrl, media_type = pendingImageUrl ? 'image' : null;
      if (!media_url && link) { media_type = ytId(link) ? 'youtube' : 'link'; }
      const btn = document.getElementById('composer-send');
      btn.disabled = true; btn.textContent = 'Publikuju…';
      try {
        await rpc('create_post', { p_email: email, p_ig: ig, p_category: cat, p_body: body, p_media_url: media_url, p_media_type: media_type, p_link_url: link || null });
        document.getElementById('composer-text').value = '';
        document.getElementById('composer-link').value = '';
        pendingImageUrl = null; preview.hidden = true; preview.innerHTML = '';
        await loadFeed();
      } catch (e) { console.warn('create_post', e); showErr(e.message || 'Nepovedlo se publikovat.'); }
      btn.disabled = false; btn.textContent = 'Publikovat';
    });
  }

  function selectCategory(category) {
    activeCat = CATS.some((cat) => cat.id === category) ? category : '';
    const url = new URL(location.href);
    if (activeCat) url.searchParams.set('category', activeCat); else url.searchParams.delete('category');
    if (searchQuery) url.searchParams.set('q', searchQuery); else url.searchParams.delete('q');
    history.replaceState({}, '', url);
    updateCategoryUI([]);
    loadFeed();
  }
  function updateSearchUrl() {
    const url = new URL(location.href);
    if (searchQuery) url.searchParams.set('q', searchQuery);
    else url.searchParams.delete('q');
    history.replaceState({}, '', url);
  }
  function wireSearch() {
    const input = document.getElementById('feed-search-input');
    const clear = document.getElementById('feed-search-clear');
    if (!input) return;
    let timer = null;
    const apply = () => {
      searchQuery = input.value.trim();
      if (clear) clear.hidden = !searchQuery;
      updateSearchUrl();
      loadFeed();
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(apply, 180);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(timer);
        apply();
      }
    });
    if (clear) clear.addEventListener('click', () => {
      input.value = '';
      searchQuery = '';
      clear.hidden = true;
      updateSearchUrl();
      loadFeed();
      input.focus();
    });
  }

  document.querySelectorAll('.feed-tab').forEach((tab) => tab.addEventListener('click', () => selectCategory(tab.getAttribute('data-cat'))));
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.feed-category-link');
    if (!link) return;
    event.preventDefault();
    selectCategory(link.getAttribute('data-feed-cat'));
  });

  wireComposer();
  wireSearch();
  updateCategoryUI([]);
  loadFeed();
  loadLegacyPinOverrides();
})();
