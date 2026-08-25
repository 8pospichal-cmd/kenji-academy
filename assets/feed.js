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
    { id: 'foto-feedback', label: 'Foto feedback', icon: 'camera', free: true },
    { id: 'tydenni-vyzva', label: 'Týdenní výzva', icon: 'target', free: true },
    { id: '', label: 'Vše', icon: 'grid' },
    { id: 'novinky', label: 'Novinky', icon: 'diamond', adminOnly: true },
    { id: 'slevy', label: 'Slevy', icon: 'tag', adminOnly: true },
    { id: 'dotazy', label: 'Dotazy', icon: 'help' },
    { id: 'fotka-mesice', label: 'Fotka měsíce', icon: 'camera' },
    { id: 'predstav-se', label: 'Představ se', icon: 'user' },
    { id: 'uspechy', label: 'Úspěchy', icon: 'trophy' },
    { id: 'second-shooting', label: 'Second shooting', icon: 'users' }
  ];
  const catLabel = (id) => (CATS.find((c) => c.id === id) || {}).label || id;
  const FEED_ICONS = {
    grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    diamond: '<path d="m12 3 8 6-8 12L4 9zM4 9h16"/>', tag: '<path d="M3 12V5h7l11 11-5 5z"/><circle cx="7.5" cy="8.5" r="1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.2 1-1.2 1.7M12 17h.01"/>',
    camera: '<path d="M4 8h3l1.4-2h7.2L17 8h3v10H4z"/><circle cx="12" cy="13" r="3.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M16 14a4.5 4.5 0 0 1 4.5 4.5V19"/>'
  };
  const feedIcon = (name) => '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (FEED_ICONS[name] || FEED_ICONS.grid) + '</svg>';

  const A = window.KenjiAuth || {};
  const user = A.getUser ? A.getUser() : null;
  const canFreeCommunity = !!(A.can && A.can('communityFree'));
  const canPremiumCommunity = !!(A.can && A.can('communityPremium'));
  const email = user && user.email ? user.email : '';
  const ig = user && user.instagram ? user.instagram : '';
  const isAdmin = ADMIN_EMAILS.indexOf((email || '').toLowerCase()) >= 0;
  const requestedCat = new URLSearchParams(location.search).get('category') || '';
  const communityView = new URLSearchParams(location.search).get('view') === 'leaderboard' ? 'leaderboard' : 'feed';
  let activeCat = CATS.some((cat) => cat.id === requestedCat)
    ? requestedCat
    : (canPremiumCommunity ? '' : 'foto-feedback');
  let searchQuery = (new URLSearchParams(location.search).get('q') || '').trim();
  let sb = null;
  let sessionUserId = '';
  const legacyPosts = Array.isArray(window.KENJI_LEGACY_POSTS) ? window.KENJI_LEGACY_POSTS : [];

  function canAccessCategory(category) {
    const cat = CATS.find((item) => item.id === category);
    return !!(cat && (cat.free || canPremiumCommunity));
  }

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
  function feedEmptyMarkup(searching) {
    const art = searching
      ? '<svg viewBox="0 0 180 128" fill="none" aria-hidden="true"><circle cx="77" cy="58" r="31"/><path d="m101 82 25 25"/><path class="feed-art-accent" d="M64 58h26M77 45v26"/></svg>'
      : '<svg viewBox="0 0 180 128" fill="none" aria-hidden="true"><rect x="28" y="27" width="124" height="78" rx="18"/><circle cx="68" cy="61" r="14"/><path d="m43 91 27-20 17 13 18-15 32 22"/><path class="feed-art-accent" d="M136 19v14M129 26h14"/></svg>';
    return '<div class="feed-empty feed-empty-state"><div class="feed-empty-art">' + art + '</div><strong>' +
      (searching ? 'Nic přesného jsem nenašel' : 'Tady může začít nová konverzace') + '</strong><span>' +
      (searching ? 'Zkus kratší dotaz nebo jiné klíčové slovo.' : 'Přidej první užitečný příspěvek pro ostatní tvůrce.') + '</span></div>';
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
  // ---------- PROFIL ČLENA (modal) ----------
  let PROFILES = null;
  function profileKey(avatarSrc, name) {
    const m = /([^/]+)\.[a-z0-9]+$/i.exec(avatarSrc || '');
    if (m) return m[1].toLowerCase();
    return normalizeSearch(name || '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function buildProfiles() {
    if (PROFILES) return PROFILES;
    const map = {};
    legacyPosts.forEach((p) => {
      const key = profileKey(p.author_avatar, p.author_name);
      if (!key) return;
      let e = map[key];
      if (!e) e = map[key] = { key: key, name: p.author_name || 'člen', avatar: p.author_avatar || '', founder: false, bio: '', posts: 0, likes: 0, comments: 0 };
      if (p.author_name && (!e.name || e.name === 'člen')) e.name = p.author_name;
      if (p.author_avatar && !e.avatar) e.avatar = p.author_avatar;
      if (p.author_founder) e.founder = true;
      e.posts += 1;
      e.likes += Number(p.likes || 0);
      e.comments += Number(p.comments || 0);
      if (p.category === 'predstav-se' && p.body && !e.bio) e.bio = String(p.body);
    });
    PROFILES = map;
    return map;
  }
  function profileScore(e) { return Math.round(e.posts * 5 + e.likes + e.comments * 2); }
  function getProfile(key, fallback) {
    const map = buildProfiles();
    if (map[key]) return map[key];
    return { key: key, name: (fallback && fallback.name) || 'člen', avatar: (fallback && fallback.avatar) || '', founder: false, bio: '', posts: 0, likes: 0, comments: 0 };
  }
  function trimBio(text, max) {
    const t = String(text || '').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'));
    return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut).trim() + ' …';
  }
  function openProfileModal(key, fallback) {
    if (document.querySelector('.kprofile-modal')) return;
    const e = getProfile(key, fallback);
    // IG jen u skutečných whop usernames — ne u hash-avatarů ani jmen odvozených klíčů.
    const isHash = /^[0-9a-f]{12,}$/.test(e.key || '');
    const handle = (!isHash && /^[a-z0-9._]{3,30}$/.test(e.key || '')) ? e.key : '';
    const igHtml = handle ? '<a class="kprofile-ig" href="https://instagram.com/' + esc(handle) + '" target="_blank" rel="noopener">@' + esc(handle) + '</a>' : '';
    const bio = trimBio(e.bio, 440);
    const av = e.avatar
      ? '<span class="kprofile-avatar has-image"><img src="' + esc(e.avatar) + '" alt="" onerror="this.parentNode.classList.remove(\'has-image\');this.remove()"><b>' + initials(e.name) + '</b></span>'
      : '<span class="kprofile-avatar">' + initials(e.name) + '</span>';
    const wrap = document.createElement('div');
    wrap.className = 'kprofile-modal';
    wrap.innerHTML =
      '<div class="kprofile-card" role="dialog" aria-modal="true" aria-label="Profil člena">' +
        '<button class="kprofile-close" type="button" aria-label="Zavřít">✕</button>' +
        '<div class="kprofile-head">' + av +
          '<div class="kprofile-id"><strong>' + esc(e.name) + (e.founder ? ' <small class="post-founder">Zakladatel</small>' : '') + '</strong>' + igHtml + '</div>' +
        '</div>' +
        (bio
          ? '<div class="kprofile-bio">' + esc(bio).replace(/\n+/g, '<br>') + '</div>'
          : '<div class="kprofile-bio is-empty">Tenhle člen se zatím nepředstavil.</div>') +
        '<div class="kprofile-stats">' +
          '<div><b>' + profileScore(e) + '</b><span>skóre</span></div>' +
          '<div><b>' + e.posts + '</b><span>příspěvků</span></div>' +
          '<div><b>' + e.likes + '</b><span>lajků</span></div>' +
        '</div>' +
      '</div>';
    function close() { wrap.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(ev) { if (ev.key === 'Escape') close(); }
    wrap.addEventListener('click', (ev) => { if (ev.target === wrap || ev.target.closest('.kprofile-close')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    const c = wrap.querySelector('.kprofile-close'); if (c) c.focus();
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

  // ---------- KOMUNITA JE DOSTUPNÁ KAŽDÉMU PŘIHLÁŠENÉMU ----------
  if (!canFreeCommunity) {
    ROOT_EL.innerHTML =
      '<div class="paywall"><div class="paywall-lock">🔒</div>' +
      '<h2 class="paywall-title">Přihlas se do komunity</h2>' +
      '<p class="paywall-text">Foto feedback a Týdenní výzva jsou zdarma. Sdílej tvorbu, zkušenosti a pomáhej ostatním tvůrcům.</p>' +
      '<div class="paywall-actions">' +
        '<a class="paywall-cta" href="index.html">Přihlásit se zdarma</a>' +
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
    return '<div class="feed-tabs">' + CATS.map((c) => {
      const locked = !canAccessCategory(c.id);
      return '<button class="feed-tab' + (c.id === activeCat ? ' active' : '') + (locked ? ' locked' : '') + '" data-cat="' + c.id + '"' + (locked ? ' title="Součást Kenji Academy"' : '') + '>' +
        feedIcon(c.icon) + '<span>' + c.label + '</span><small>' + (locked ? '🔒' : categoryCount(c.id)) + '</small></button>';
    }).join('') + '</div>';
  }
  function composer() {
    const opts = CATS.filter((c) => c.id && canAccessCategory(c.id) && (!c.adminOnly || isAdmin))
      .map((c) => '<option value="' + c.id + '"' + (c.id === activeCat ? ' selected' : '') + '>' + c.label + '</option>').join('');
    return '' +
      '<div class="composer" data-tour="community-composer" hidden>' +
        '<div class="composer-top"><span class="feed-avatar">' + initials(ig) + '</span>' +
          '<textarea id="composer-text" class="composer-input" rows="2" placeholder="Co je nového' + (ig ? ', @' + esc(ig) : '') + '?"></textarea>' +
        '</div>' +
        '<div id="composer-preview" class="composer-preview" hidden></div>' +
        '<div class="composer-bar">' +
          '<label class="composer-tool" title="Nahrát foto">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h.9l.8-1.3A1 1 0 0 1 9 4.2h6a1 1 0 0 1 .8.5l.8 1.3h.9A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.3"/></svg>' +
            '<span>Nahrát foto</span>' +
            '<input type="file" id="composer-file" accept="image/jpeg,image/png,image/webp" hidden></label>' +
          '<input type="url" id="composer-link" class="composer-link" placeholder="Odkaz / YouTube (nepovinné)">' +
          '<select id="composer-cat" class="composer-cat">' + opts + '</select>' +
          '<button id="composer-send" class="composer-send">Publikovat</button>' +
        '</div>' +
        '<div id="composer-err" class="composer-err" hidden></div>' +
      '</div>';
  }
  function weeklyChallengeBanner() {
    const challenge = window.KenjiWeeklyChallenge && window.KenjiWeeklyChallenge.current
      ? window.KenjiWeeklyChallenge.current()
      : { title: 'Sdílej svůj posun z tohoto týdne', description: 'Napiš, co se povedlo nebo co ses naučil.' };
    return '<section class="feed-weekly-challenge" id="feed-weekly-challenge"' + (activeCat === 'tydenni-vyzva' ? '' : ' hidden') + '>' +
      '<span>Tento týden · +250 KP</span><h2>' + esc(challenge.title) + '</h2><p>' + esc(challenge.description) + '</p>' +
    '</section>';
  }
  function searchBar() {
    return '<div class="feed-search" role="search">' +
      '<span class="feed-search-ico">⌕</span>' +
      '<input id="feed-search-input" type="search" value="' + esc(searchQuery) + '" placeholder="Hledat v příspěvcích">' +
      '<button id="feed-search-clear" type="button" aria-label="Vymazat hledání"' + (searchQuery ? '' : ' hidden') + '>×</button>' +
      '<span id="feed-search-status" class="feed-search-status"></span>' +
    '</div>';
  }

  function communityViewTabs() {
    return '<nav class="community-view-tabs" aria-label="Pohled komunity">' +
      '<a href="prispevky.html" class="' + (communityView === 'feed' ? 'active' : '') + '">' + feedIcon('grid') + '<span>Příspěvky</span></a>' +
      '<a href="prispevky.html?view=leaderboard" class="' + (communityView === 'leaderboard' ? 'active' : '') + '">' + feedIcon('trophy') + '<span>Žebříček</span></a>' +
    '</nav>';
  }

  if (communityView === 'leaderboard') {
    ROOT_EL.innerHTML = '<div class="feed-wrap feed-wrap-leaderboard">' + communityViewTabs() +
      (window.KenjiLeaderboard ? window.KenjiLeaderboard.render() : '<div class="feed-loading">Žebříček se nepodařilo načíst.</div>') + '</div>';
    return;
  }

  ROOT_EL.innerHTML =
    '<div class="feed-wrap">' + communityViewTabs() + '<div class="feed-mobile-categories"><span>Kategorie</span>' + catTabs() + '</div>' + weeklyChallengeBanner() + searchBar() + composer() +
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
    const archived = legacyPosts.filter((post) => (canPremiumCommunity && searchQuery) || !activeCat || post.category === activeCat);
    let current = [];
    const paint = () => {
      const basePosts = archived.filter((post) => post.pinned).concat(current, archived.filter((post) => !post.pinned));
      const posts = filterAndRankPosts(basePosts);
      const status = document.getElementById('feed-search-status');
      if (status) status.textContent = searchQuery ? posts.length + ' výsledků' : '';
      if (!posts.length) {
        list.innerHTML = feedEmptyMarkup(!!searchQuery);
        updateCategoryUI(current);
        return;
      }
      list.innerHTML = posts.map(renderPost).join('');
      wirePosts();
      updateCategoryUI(current);
    };
    if (archived.length) paint();
    try {
      const rpcCategory = canPremiumCommunity && searchQuery ? null : activeCat || null;
      current = await rpc('list_posts', { p_email: email, p_category: rpcCategory, p_limit: 60 }) || [];
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
    const pkey = profileKey(p.author_avatar, p.author_name);
    const pdata = ' data-profile="' + esc(pkey) + '" data-pname="' + esc(p.author_name || '') + '" data-pavatar="' + esc(p.author_avatar || '') + '"';
    const legacyComments = p.legacy && Array.isArray(p.comments_list) && p.comments_list.length;
    const sub = p.legacy ? p.legacy_meta : catLabel(p.category) + ' · ' + timeAgo(p.created_at);
    const longBody = String(p.body || '').length > 520 || bodyBlocks(p.body).length > 4;
    const body = p.body ? '<div class="post-copy"><div class="post-body' + (longBody ? ' is-collapsed' : '') + '">' + renderBody(p.body, p) + '</div>' +
      (longBody ? '<button class="post-more" type="button" aria-expanded="false">Zobrazit více</button>' : '') + '</div>' : '';
    return '<article class="post' + (p.legacy ? ' post-legacy' : '') + (p.pinned ? ' post-pinned' : '') + '" data-id="' + esc(p.id) + '">' +
      (p.pinned ? '<div class="post-pinned-label">Připnuto</div>' : '') +
      '<div class="post-head">' +
        '<button type="button" class="post-idbtn"' + pdata + ' aria-label="Zobrazit profil: ' + esc(author) + '">' + avatar(author, p.author_avatar, false) + '</button>' +
        '<div class="post-meta"><span class="post-author"><button type="button" class="post-authorbtn"' + pdata + '>' + esc(author) + '</button>' + (p.author_founder ? ' <small class="post-founder">Zakladatel</small>' : '') + '</span>' +
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
    document.querySelectorAll('[data-profile]').forEach((btn) => {
      if (btn._pwired) return; btn._pwired = true;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        openProfileModal(btn.getAttribute('data-profile'), { name: btn.getAttribute('data-pname'), avatar: btn.getAttribute('data-pavatar') });
      });
    });
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
  function awardWeeklyChallengeXp() {
    if (!window.KenjiWeeklyChallenge) return false;
    const key = window.KenjiWeeklyChallenge.weekKey();
    try {
      const challengeState = JSON.parse(localStorage.getItem('kenji_challenge_v1') || '{}') || {};
      challengeState[key] = true;
      localStorage.setItem('kenji_challenge_v1', JSON.stringify(challengeState));

      const xpState = JSON.parse(localStorage.getItem('kenji_xp_v1') || '{"xp":0,"log":[]}') || { xp: 0, log: [] };
      if (!Array.isArray(xpState.log)) xpState.log = [];
      if (!xpState.log.some((entry) => entry.k === 'chal:' + key)) {
        xpState.xp = (Number(xpState.xp) || 0) + 250;
        xpState.log.push({ k: 'chal:' + key, a: 250, r: 'Týdenní výzva', t: Date.now() });
        localStorage.setItem('kenji_xp_v1', JSON.stringify(xpState));
        return true;
      }
    } catch (_) {}
    return false;
  }
  function showWeeklyXpToast() {
    const toast = document.createElement('div');
    toast.className = 'co-xptoast';
    toast.innerHTML = '<strong>+250 KP</strong><span>Týdenní výzva splněna</span>';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }
  function wireComposer() {
    const fileInput = document.getElementById('composer-file');
    const preview = document.getElementById('composer-preview');
    const errEl = document.getElementById('composer-err');
    const showErr = (m) => { errEl.textContent = m; errEl.hidden = false; };
    const uploadErrorMessage = (error) => {
      const message = String((error && error.message) || '').toLowerCase();
      if (message.includes('bucket not found')) return 'Nahrávání fotek zatím není na serveru aktivní.';
      if (message.includes('row-level security') || message.includes('unauthorized') || message.includes('jwt')) {
        return 'Platnost přihlášení vypršela. Obnov stránku a ověř e-mail znovu.';
      }
      if (message.includes('mime') || message.includes('content type')) return 'Nahraj fotku ve formátu JPG, PNG nebo WebP.';
      if (message.includes('maximum allowed size') || message.includes('too large')) return 'Foto je moc velké (max 6 MB).';
      return 'Foto se nepovedlo nahrát. Zkus to prosím znovu.';
    };

    fileInput.addEventListener('change', async () => {
      const f = fileInput.files[0]; if (!f) return;
      errEl.hidden = true;
      pendingImageUrl = null;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { showErr('Nahraj fotku ve formátu JPG, PNG nebo WebP.'); fileInput.value = ''; return; }
      if (f.size > 25 * 1024 * 1024) { showErr('Foto je moc velké (max 25 MB).'); fileInput.value = ''; return; }
      preview.hidden = false; preview.innerHTML = '<span class="cp-up">Zpracovávám foto…</span>';
      try {
        const small = window.KenjiImage ? await window.KenjiImage.compress(f, { maxDim: 1600, quality: 0.82 }) : f;
        const c = await getSB();
        if (!c || !sessionUserId) throw new Error('Unauthorized session');
        preview.innerHTML = '<span class="cp-up">Nahrávám foto…</span>';
        const ext = /png/.test(small.type) ? 'png' : (/jpeg/.test(small.type) ? 'jpg' : 'webp');
        const path = sessionUserId + '/' + Date.now() + '.' + ext;
        const up = await c.storage.from('post-media').upload(path, small, { contentType: small.type, upsert: false });
        if (up.error) throw up.error;
        const pub = c.storage.from('post-media').getPublicUrl(path);
        pendingImageUrl = pub.data.publicUrl;
        preview.innerHTML = '<img src="' + esc(pendingImageUrl) + '" alt=""><button class="cp-remove" type="button">✕ odebrat</button>';
        preview.querySelector('.cp-remove').addEventListener('click', () => { pendingImageUrl = null; preview.hidden = true; preview.innerHTML = ''; fileInput.value = ''; });
      } catch (e) {
        console.warn('upload', e);
        pendingImageUrl = null;
        fileInput.value = '';
        preview.hidden = true;
        preview.innerHTML = '';
        showErr(uploadErrorMessage(e));
      }
    });

    document.getElementById('composer-send').addEventListener('click', async () => {
      errEl.hidden = true;
      const body = document.getElementById('composer-text').value.trim();
      const link = document.getElementById('composer-link').value.trim();
      const cat = document.getElementById('composer-cat').value;
      if (!body && !pendingImageUrl && !link) { showErr('Napiš text, přidej foto nebo odkaz.'); return; }
      if (!canAccessCategory(cat)) { showErr('Do tohoto kanálu nemáš ve svém členství přístup.'); return; }
      // Týdenní výzva: jen jedna odpověď za týden (žádný spam).
      if (cat === 'tydenni-vyzva' && window.KenjiWeeklyChallenge) {
        var wk = window.KenjiWeeklyChallenge.weekKey();
        var cs = {}; try { cs = JSON.parse(localStorage.getItem('kenji_challenge_v1') || '{}') || {}; } catch (_) {}
        if (wk && cs[wk]) { showErr('Na tuhle výzvu už jsi tento týden odpověděl — další zas příští týden. 💪'); return; }
      }
      let media_url = pendingImageUrl, media_type = pendingImageUrl ? 'image' : null;
      if (!media_url && link) { media_type = ytId(link) ? 'youtube' : 'link'; }
      const btn = document.getElementById('composer-send');
      btn.disabled = true; btn.textContent = 'Publikuju…';
      try {
        await rpc('create_post', { p_email: email, p_ig: ig, p_category: cat, p_body: body, p_media_url: media_url, p_media_type: media_type, p_link_url: link || null });
        const weeklyXpAwarded = cat === 'tydenni-vyzva' && awardWeeklyChallengeXp();
        try { if (media_url && cat === 'foto-feedback') localStorage.setItem('kenji_task_community', '1'); } catch (e2) {}
        if (media_url && cat === 'foto-feedback') {
          try { document.dispatchEvent(new CustomEvent('kenji:community-post-published', { detail: { category: cat, media: true } })); } catch (e3) {}
        }
        document.getElementById('composer-text').value = '';
        document.getElementById('composer-link').value = '';
        pendingImageUrl = null; preview.hidden = true; preview.innerHTML = '';
        await loadFeed();
        if (weeklyXpAwarded) showWeeklyXpToast();
      } catch (e) {
        console.warn('create_post', e);
        const message = String((e && e.message) || '');
        showErr(/jwt|session|ověř|over/i.test(message)
          ? 'Platnost přihlášení vypršela. Obnov stránku a ověř e-mail znovu.'
          : (message || 'Příspěvek se nepovedlo publikovat. Zkus to prosím znovu.'));
      }
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
    const composerEl = document.querySelector('.composer');
    const searchEl = document.querySelector('.feed-search');
    const weeklyEl = document.getElementById('feed-weekly-challenge');
    const allowed = canAccessCategory(activeCat);
    if (composerEl) composerEl.hidden = !allowed;
    if (searchEl) searchEl.hidden = !allowed;
    if (weeklyEl) weeklyEl.hidden = activeCat !== 'tydenni-vyzva' || !allowed;
    const categorySelect = document.getElementById('composer-cat');
    if (categorySelect && Array.from(categorySelect.options).some((option) => option.value === activeCat)) categorySelect.value = activeCat;
    if (!allowed) {
      const cat = CATS.find((item) => item.id === activeCat);
      document.getElementById('feed-list').innerHTML =
        '<div class="paywall community-channel-paywall"><div class="paywall-lock">🔒</div>' +
        '<h2 class="paywall-title">' + esc((cat && cat.label) || 'Tento kanál') + ' je v Academy</h2>' +
        '<p class="paywall-text">Odemkni všechny komunitní kanály, kurzy, webináře a podporu ostatních členů.</p>' +
        '<div class="paywall-actions"><a class="paywall-cta" href="academy.html">Zjistit více o Academy</a></div></div>';
      return;
    }
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
  document.addEventListener('kenji:challenge-updated', function () {
    var challenge = window.KenjiWeeklyChallenge && window.KenjiWeeklyChallenge.current
      ? window.KenjiWeeklyChallenge.current() : null;
    var banner = document.getElementById('feed-weekly-challenge');
    if (!challenge || !banner) return;
    var title = banner.querySelector('h2'), body = banner.querySelector('p'), meta = banner.querySelector('span');
    if (title) title.textContent = challenge.title;
    if (body) body.textContent = challenge.description;
    if (meta) meta.textContent = 'Tento týden · +' + Number(challenge.xp || 250) + ' KP';
  });
  wireSearch();
  updateCategoryUI([]);
  (async function bootCommunity() {
    try {
      const client = await getSB();
      const sessionResult = client ? await client.auth.getSession() : null;
      const session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
      const verifiedEmail = session && session.user && String(session.user.email || '').toLowerCase();
      if (!verifiedEmail || verifiedEmail !== String(email || '').toLowerCase()) {
        const composerEl = document.querySelector('.composer');
        const searchEl = document.querySelector('.feed-search');
        if (composerEl) composerEl.hidden = true;
        if (searchEl) searchEl.hidden = true;
        document.getElementById('feed-list').innerHTML =
          '<div class="paywall community-verify"><div class="paywall-lock">✉</div>' +
          '<h2 class="paywall-title">Ověř e-mail pro komunitu</h2>' +
          '<p class="paywall-text">Příspěvky, komentáře a lajky jsou navázané na ověřený účet. Pošleme ti bezpečný přihlašovací odkaz na ' + esc(email) + '.</p>' +
          '<div class="paywall-actions"><button class="paywall-cta" id="community-verify-btn" type="button">Poslat ověřovací odkaz</button>' +
          '<span class="paywall-note" id="community-verify-note">Foto feedback i Týdenní výzva zůstávají zdarma.</span></div></div>';
        const button = document.getElementById('community-verify-btn');
        button.addEventListener('click', async () => {
          button.disabled = true;
          button.textContent = 'Odesílám…';
          const result = A.requestMagicLink ? await A.requestMagicLink(email) : { ok: false };
          button.textContent = result && result.ok ? 'Odkaz je v e-mailu ✓' : 'Odeslání se nepovedlo';
          document.getElementById('community-verify-note').textContent = result && result.ok
            ? 'Po kliknutí v e-mailu se vrátíš rovnou do komunity.'
            : 'Zkus to za chvíli znovu.';
          if (!(result && result.ok)) button.disabled = false;
        });
        return;
      }
      sessionUserId = session.user.id;
    } catch (error) {
      console.warn('community session', error);
      const searchEl = document.querySelector('.feed-search');
      if (searchEl) searchEl.hidden = true;
      document.getElementById('feed-list').innerHTML =
        '<div class="feed-empty"><strong>Komunitu se nepovedlo připojit.</strong><span>Obnov stránku a zkus to prosím znovu.</span></div>';
      return;
    }
    selectCategory(activeCat);
    if (isAdmin) loadLegacyPinOverrides();
  })();
})();
