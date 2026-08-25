// ============================================
// KENJI KNIHOVNA — NAVIGACE & VYHLEDÁVÁNÍ
// ============================================
//
// Generuje sidebar (kategorie + počty + nejnovější), homepage rozcestník
// a fulltextové vyhledávání — všechno z assets/articles.js.
//
// Běží synchronně (skript je na konci body, DOM nad ním už existuje),
// aby scrollspy ve script.js našel vygenerované TOC odkazy.
// ============================================

(function () {
  const cats = window.KENJI_CATEGORIES || [];
  const articles = window.KENJI_ARTICLES || [];

  // --- Kde jsme? Článek v /clanky/ potřebuje prefix '../' ---
  const inArticle = /\/clanky\//.test(location.pathname);
  const ROOT = inArticle ? '../' : '';

  // Aktuální stránka (pro zvýraznění aktivní položky)
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  function navTier() {
    const override = (location.search.match(/[?&]tier=(free|knihovna|academy)/) || [])[1];
    if (override) return override;
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname)) return 'academy';
    try {
      const u = JSON.parse(localStorage.getItem('kenji_user')) || {};
      return ['free', 'knihovna', 'academy'].includes(u.tier) ? u.tier : 'free';
    } catch (_) { return 'free'; }
  }

  // --- Pomocníci ---
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
    home: '<path d="m3 11 9-8 9 8v9h-6v-6H9v6H3z"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-3 4.5 3-1-9"/>',
    audit: '<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5M8 11l2 2 4-5"/>',
    calculator: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>',
    folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
    diamond: '<path d="m12 3 8 6-8 12L4 9zM4 9h16M9 3l-2 6 5 12 5-12-2-6"/>',
    tag: '<path d="M3 12V5h7l11 11-5 5z"/><circle cx="7.5" cy="8.5" r="1"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.2 1-1.2 1.7M12 17h.01"/>',
    camera: '<path d="M4 8h3l1.4-2h7.2L17 8h3v10H4z"/><circle cx="12" cy="13" r="3.3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M16 14a4.5 4.5 0 0 1 4.5 4.5V19"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a1.8 1.8 0 0 0 0-3.6h-.8a1.7 1.7 0 0 1 0-3.4H16a5 5 0 0 0 5-5c0-3.3-4-6-9-6z"/>',
    briefcase: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
    brain: '<path d="M9.5 5.2A3 3 0 0 0 4.8 8a3.2 3.2 0 0 0 .4 5.8A3 3 0 0 0 9.5 18M14.5 5.2A3 3 0 0 1 19.2 8a3.2 3.2 0 0 1-.4 5.8 3 3 0 0 1-4.3 4.2M9.5 4v16M14.5 4v16"/>',
    scale: '<path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6zM17 6l-4 7h8l-4-7zM8 21h8"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>'
  };
  const uiIcon = (name, cls = '') => `<svg class="ui-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;
  const categoryIcon = (id) => uiIcon(({ zacatecnik: 'camera', technika: 'camera', editace: 'palette', sablony: 'file', byznys: 'briefcase', obory: 'video', mindset: 'brain', pravo: 'scale' })[id] || 'file');
  const searchEmptyArt = () => '<svg class="kenji-search-art" viewBox="0 0 120 86" fill="none" aria-hidden="true"><circle cx="49" cy="38" r="23"/><path d="m66 55 18 18"/><circle class="ksa-accent" cx="49" cy="38" r="10"/><path class="ksa-soft" d="M91 17h15M98.5 9.5v15M15 69h18"/></svg>';

  const catById = (id) => cats.find((c) => c.id === id);
  const publishedIn = (id) =>
    articles.filter((a) => a.category === id && a.status === 'published');

  // Odkaz na kotvu kategorie na homepage (funguje i z článku)
  const catHref = (id) => `${ROOT}index.html#cat-${id}`;
  // Odkaz na článek (jen published; soon = nikam)
  const artHref = (a) => (a.status === 'published' ? ROOT + a.url : '#');

  // =========================================================
  //  STAV PŘEČTENÍ (odškrtávání článků)
  // =========================================================
  // Teď se ukládá do prohlížeče (localStorage) — pamatuje si to hned.
  // ►► Až bude Google login (Supabase), v toggleRead() přibude sync,
  //    ať je postup uložený k uživateli napříč zařízeními.
  const READ_KEY = 'kenji_read_v1';
  function getRead() {
    try { return JSON.parse(localStorage.getItem(READ_KEY)) || []; }
    catch (e) { return []; }
  }
  function isRead(slug) { return getRead().includes(slug); }
  function toggleRead(slug) {
    const r = getRead();
    const i = r.indexOf(slug);
    if (i >= 0) r.splice(i, 1); else r.push(slug);
    try { localStorage.setItem(READ_KEY, JSON.stringify(r)); } catch (e) {}
    if (window.KenjiProgress) window.KenjiProgress.push(); // sync na server (Supabase)
    return isRead(slug);
  }

  // Poslední navštívené články + pozice čtení. Dashboard z toho skládá
  // „Pokračovat“, zatímco data zůstávají lokálně do zapojení účtu.
  const HISTORY_KEY = 'kenji_article_history_v1';
  function getHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY));
      return Array.isArray(value) ? value : [];
    } catch (e) { return []; }
  }
  function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))); } catch (e) {}
  }
  function updateHistory(slug, progress) {
    if (!slug) return;
    const history = getHistory();
    const previous = history.find((item) => item.slug === slug) || {};
    const item = {
      slug: slug,
      at: Date.now(),
      progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : (previous.progress || 0)
    };
    saveHistory([item].concat(history.filter((entry) => entry.slug !== slug)));
  }

  function initArticleTracking() {
    if (!inArticle) return;
    const slug = slugOfFile(currentFile);
    if (!slug) return;
    const previous = getHistory().find((item) => item.slug === slug);
    updateHistory(slug);

    // Návrat na poslední místo proběhne jen po vědomém kliknutí na „Pokračovat“.
    if (new URLSearchParams(location.search).get('continue') === '1' && previous && previous.progress > 3 && previous.progress < 96) {
      setTimeout(() => {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo({ top: max * previous.progress / 100, behavior: 'smooth' });
      }, 260);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        updateHistory(slug, Math.round(window.scrollY / max * 100));
        ticking = false;
      });
    }, { passive: true });
  }

  // Akční kroky v článcích fungují jako skutečný checklist a pamatují si stav.
  function initActionChecklists() {
    if (!inArticle) return;
    const items = Array.from(document.querySelectorAll('.checklist-item'));
    const slug = slugOfFile(currentFile);
    if (!items.length || !slug) return;
    const key = 'kenji_checklists_v1';
    let all = {};
    try { all = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {}
    let done = Array.isArray(all[slug]) ? all[slug] : [];

    function paint(item, index) {
      const checked = done.includes(index);
      item.classList.toggle('is-done', checked);
      item.setAttribute('aria-checked', checked ? 'true' : 'false');
    }
    function toggle(item, index) {
      done = done.includes(index) ? done.filter((value) => value !== index) : done.concat(index);
      all[slug] = done;
      try { localStorage.setItem(key, JSON.stringify(all)); } catch (e) {}
      paint(item, index);
      item.classList.remove('just-toggled');
      void item.offsetWidth;
      item.classList.add('just-toggled');
      window.setTimeout(() => item.classList.remove('just-toggled'), 420);
      if (navigator.vibrate) navigator.vibrate(10);
    }

    items.forEach((item, index) => {
      item.setAttribute('role', 'checkbox');
      item.setAttribute('tabindex', '0');
      paint(item, index);
      item.addEventListener('click', (event) => {
        if (event.target.closest('a, button, input, textarea, select')) return;
        toggle(item, index);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggle(item, index);
      });
    });
  }
  const slugOfFile = (file) => {
    const a = articles.find((x) => (x.url || '').split('/').pop() === file);
    return a ? a.slug : null;
  };

  // Sjednotí stav přečtení v sidebaru i na badge článku
  function refreshReadUI() {
    document.querySelectorAll('#sidebar .sidebar-sublink[data-slug]').forEach((lnk) => {
      lnk.classList.toggle('is-read', isRead(lnk.getAttribute('data-slug')));
    });
    updateReadBadge();
  }

  // =========================================================
  // 1) SIDEBAR
  // =========================================================
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const onHome = !inArticle && (currentFile === 'index.html' || currentFile === '');

    // --- Přepínač hlavních sekcí (Kurzy / Databáze / Komunita) ---
    // Podle aktuální stránky se pozná sekce a obsah lišty se pod přepínačem mění.
    const section = (currentFile === 'kurzy.html' || currentFile === 'kurz.html') ? 'kurzy'
      : (currentFile === 'prispevky.html') ? 'prispevky'
      : 'databaze';

    // Propracované čárové ikony (dědí barvu přes currentColor — fungují i pod oranžovou pilulkou).
    // Kurzy = akademický klobouk, Databáze = otevřená kniha, Komunita = skupina lidí.
    const icoKurzy = '<svg class="sw-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.6 8.2 12 12.4l9.4-4.2z"/><path d="M6.2 10.3v4.1c0 1.4 2.6 2.6 5.8 2.6s5.8-1.2 5.8-2.6v-4.1"/><path d="M21.4 8.2v4.6"/><circle cx="21.4" cy="14" r=".95" fill="currentColor" stroke="none"/></svg>';
    const icoDatabaze = '<svg class="sw-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.6C10.3 5.3 8 4.8 4 4.8v13.4c4 0 6.3.5 8 1.9 1.7-1.4 4-1.9 8-1.9V4.8c-4 0-6.3.5-8 1.8z"/><path d="M12 6.6v13.5"/><path d="M6.6 9.3c1.3 0 2.5.2 3.6.7M6.6 12.4c1.3 0 2.5.2 3.6.7"/></svg>';
    const icoKomunita = '<svg class="sw-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.6 18.5v-1.3a3.4 3.4 0 0 0-3.4-3.4H6.9a3.4 3.4 0 0 0-3.4 3.4v1.3"/><circle cx="9.55" cy="7.4" r="3.15"/><path d="M20.5 18.5v-1.3a3.4 3.4 0 0 0-2.55-3.29"/><path d="M15.6 4.45a3.15 3.15 0 0 1 0 6.05"/></svg>';

    // Přepínač sekcí je nově dole ve spodní glass liště → v sidebaru už není.
    let html = '';

    // ================= KENJI AI (přepínač + historie chatu, plní kenji-ai.js) =================
    if (currentFile === 'kenji-ai.html') {
      html += `<div class="sidebar-section" id="ai-side"></div>`;
      sidebar.innerHTML = html;
      return;
    }

    // ================= KURZY =================
    if (section === 'kurzy') {
      const courses = window.KENJI_COURSES || [];
      const curSlug = new URLSearchParams(location.search).get('slug');

      if (currentFile === 'kurz.html') {
        // Detail kurzu → v liště strom lekcí (naplní kurz.html do #course-tree)
        const cur = courses.find((c) => c.slug === curSlug);
        html += `
        <div class="sidebar-section">
          <a href="${ROOT}kurzy.html" class="sidebar-back">‹ Všechny kurzy</a>` +
          (cur ? `<div class="sidebar-course-head"><span class="sch-ico">${cur.icon}</span><span class="sch-title">${esc(cur.title)}</span></div>` : '') +
          `<div id="course-tree" class="course-tree"></div>
        </div>`;
      } else {
        // Přehled kurzů → seznam
        const canWatchCourses = navTier() === 'academy';
        html += `
        <div class="sidebar-section">
          <div class="sidebar-label">Kurzy</div>
          <nav class="sidebar-nav">`;
        courses.forEach((c) => {
          html += `<a href="${ROOT}kurz.html?slug=${encodeURIComponent(c.slug)}" class="sidebar-link${canWatchCourses ? '' : ' locked'}">
              <span class="icon">${c.icon}</span><span>${esc(c.title)}</span>${canWatchCourses ? '' : '<span class="nav-course-lock">🔒</span>'}
            </a>`;
        });
        html += `
          </nav>
        </div>`;
      }
      sidebar.innerHTML = html;
      return;
    }

    // ================= PŘÍSPĚVKY =================
    if (section === 'prispevky') {
      const premiumCommunity = navTier() === 'academy';
      const feedCats = [
        { id: 'foto-feedback', label: 'Foto feedback', icon: 'camera', free: true },
        { id: 'tydenni-vyzva', label: 'Týdenní výzva', icon: 'trophy', free: true },
        { id: '', label: 'Všechny příspěvky', icon: 'folder' },
        { id: 'novinky', label: 'Novinky', icon: 'diamond' },
        { id: 'slevy', label: 'Slevy', icon: 'tag' },
        { id: 'dotazy', label: 'Dotazy', icon: 'help' },
        { id: 'fotka-mesice', label: 'Fotka měsíce', icon: 'camera' },
        { id: 'predstav-se', label: 'Představ se', icon: 'user' },
        { id: 'uspechy', label: 'Úspěchy', icon: 'trophy' },
        { id: 'second-shooting', label: 'Second shooting', icon: 'users' }
      ];
      const activeFeedCat = new URLSearchParams(location.search).get('category') || '';
      const activeCommunityView = new URLSearchParams(location.search).get('view') || '';
      const chatIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-2.8.8.8-2.7-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.13-.17.25-.65.82-.8.99-.15.17-.3.19-.55.06a6.7 6.7 0 0 1-2-1.23 7.4 7.4 0 0 1-1.36-1.7c-.14-.25-.01-.38.11-.5l.38-.44c.13-.15.17-.25.25-.42.09-.17.04-.32-.02-.45l-.8-1.9c-.2-.48-.42-.42-.57-.42l-.49-.01c-.17 0-.45.06-.68.32-.23.25-.9.87-.9 2.12s.92 2.46 1.05 2.63c.13.17 1.8 2.75 4.36 3.86.61.26 1.08.42 1.45.54.61.19 1.16.16 1.6.1.49-.07 1.5-.61 1.72-1.2.21-.6.21-1.1.15-1.2-.06-.11-.23-.17-.48-.3z"/></svg>';
      html += `
        <div class="sidebar-section community-sidebar-main">
          <nav class="sidebar-nav">
            <a href="#" class="sidebar-link community-chat-link" data-community-chat="1">
              <span class="icon">${chatIcon}</span><span>Chat</span>
            </a>
            <a href="${ROOT}prispevky.html?view=leaderboard" class="sidebar-link${activeCommunityView === 'leaderboard' ? ' active' : ''}">
              <span class="icon">${uiIcon('trophy')}</span><span>Žebříček</span>
            </a>
          </nav>
        </div>
        <div class="sidebar-section">
          <div class="sidebar-label">Příspěvky</div>
          <nav class="sidebar-nav">`;
      feedCats.forEach((cat) => {
        const href = `${ROOT}prispevky.html${cat.id ? `?category=${encodeURIComponent(cat.id)}` : ''}`;
        const locked = !cat.free && !premiumCommunity;
        html += `<a href="${href}" class="sidebar-link feed-category-link${!activeCommunityView && cat.id === activeFeedCat ? ' active' : ''}${locked ? ' locked' : ''}" data-feed-cat="${cat.id}"${locked ? ' data-community-locked="1" title="Součást Kenji Academy"' : ''}>
          <span class="icon">${uiIcon(cat.icon)}</span><span>${esc(cat.label)}</span>${locked ? '<span class="feed-category-lock">🔒</span>' : `<span class="feed-category-count" data-feed-count="${cat.id}"></span>`}
        </a>`;
      });
      html += `
          </nav>
        </div>`;
      sidebar.innerHTML = html;
      return;
    }

    // ================= DATABÁZE =================
    // --- Vyhledávání + Přehled ---
    html += `
      <div class="sidebar-section">
        <div class="sidebar-search" data-tour="database">
          <span class="search-icon">${uiIcon('search')}</span>
          <input type="text" id="kenji-search" class="search-input"
                 placeholder="Hledej článek…" autocomplete="off" aria-label="Hledat v databázi">
          <kbd class="search-kbd">/</kbd>
        </div>
        <div id="kenji-search-results" class="search-results" hidden></div>
        <div class="sidebar-label">Přehled</div>
        <nav class="sidebar-nav">
          <a href="${ROOT}index.html" class="sidebar-link${onHome ? ' active' : ''}">
            <span class="icon">${uiIcon('home')}</span>
            <span>Hlavní stránka</span>
          </a>
          <a href="${ROOT}kviz.html" class="sidebar-link${(currentFile === 'kviz.html' || currentFile === 'odmena.html') ? ' active' : ''}">
            <span class="icon">${uiIcon('award')}</span>
            <span>Kvíz &amp; odměna</span>
          </a>
          <a href="${ROOT}audit.html" class="sidebar-link${currentFile === 'audit.html' ? ' active' : ''}">
            <span class="icon">${uiIcon('audit')}</span>
            <span>Audit pro tvůrce</span>
          </a>
          <a href="${ROOT}hodinovka.html" class="sidebar-link${currentFile === 'hodinovka.html' ? ' active' : ''}">
            <span class="icon">${uiIcon('calculator')}</span>
            <span>Kalkulačka hodinovky</span>
          </a>
        </nav>
      </div>`;

    // --- Sekce: Kategorie (rozklikávací accordion) ---
    // Každá kategorie se sbalí/rozbalí. Sublist obsahuje VŠECHNY články
    // (published = klikací, soon = šedé „připravujeme"). Aktuální kategorie
    // je defaultně rozbalená, ostatní sbalené — ať není všechno najednou.
    const curArt = inArticle
      ? articles.find((a) => (a.url || '').split('/').pop() === currentFile)
      : null;

    html += `
      <div class="sidebar-section">
        <div class="sidebar-label">Kategorie</div>
        <nav class="sidebar-nav">`;

    cats.forEach((cat) => {
      // Speciální kategorie odkazující na vlastní stránku (např. Šablony) — místo accordionu je to link.
      if (cat.page) {
        const active = currentFile === cat.page;
        html += `
        <div class="sidebar-cat sidebar-cat-page">
          <a href="${ROOT}${cat.page}" class="cat-toggle cat-link${active ? ' active' : ''}">
            <span class="icon">${categoryIcon(cat.id)}</span>
            <span class="cat-name">${esc(cat.name)}</span>
            ${cat.locked ? '<span class="cat-lock" title="Pouze pro členy">🔒</span>' : '<span class="cat-arrow">→</span>'}
          </a>
        </div>`;
        return;
      }
      const all = articles.filter((a) => a.category === cat.id);
      const pubCount = all.filter((a) => a.status === 'published').length;
      const hasArticles = all.length > 0;
      const openByDefault = hasArticles && curArt && curArt.category === cat.id;

      html += `
        <div class="sidebar-cat${openByDefault ? ' open' : ''}${hasArticles ? '' : ' empty'}">
          <button class="cat-toggle" data-cat="${cat.id}"${hasArticles ? '' : ' disabled'}>
            <span class="icon">${categoryIcon(cat.id)}</span>
            <span class="cat-name">${esc(cat.name)}</span>
            <span class="badge">${pubCount}</span>
            ${hasArticles ? '<span class="cat-arrow">▾</span>' : ''}
          </button>`;

      if (hasArticles) {
        html += `<div class="sidebar-sublist">`;
        all.forEach((a) => {
          if (a.status === 'published') {
            const active = inArticle && (a.url.split('/').pop() === currentFile);
            const read = isRead(a.slug);
            html += `<a href="${artHref(a)}" class="sidebar-sublink${active ? ' active' : ''}${read ? ' is-read' : ''}" data-slug="${a.slug}">
              <span class="read-check" data-check="${a.slug}" title="Označit jako přečtené"></span>
              <span class="sublink-text">${esc(a.title)}</span>
            </a>`;
          } else {
            html += `<span class="sidebar-sublink coming">${esc(a.title)}</span>`;
          }
        });
        html += `</div>`;
      }
      html += `</div>`;
    });

    html += `
        </nav>
      </div>`;

    // --- Sekce: TOC článku ("V tomto článku") — data z window.KENJI_TOC ---
    // POZOR: musí zůstat POSLEDNÍ sekce kvůli scrollspy ve script.js.
    if (Array.isArray(window.KENJI_TOC) && window.KENJI_TOC.length) {
      html += `
        <div class="sidebar-section">
          <div class="sidebar-label">V tomto článku</div>
          <nav class="sidebar-nav">`;
      window.KENJI_TOC.forEach((item) => {
        html += `<a href="#${item.id}" class="sidebar-sublink">${esc(item.label)}</a>`;
      });
      html += `
          </nav>
        </div>`;
    }

    sidebar.innerHTML = html;

    // Accordion — klik na kategorii rozbalí/sbalí její články
    sidebar.querySelectorAll('.cat-toggle:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.sidebar-cat').classList.toggle('open');
      });
    });

    // Checkbox přečtení — klik odškrtne, aniž by navigoval na článek
    sidebar.querySelectorAll('.read-check').forEach((box) => {
      box.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRead(box.getAttribute('data-check'));
        refreshReadUI();
      });
    });
  }

  // =========================================================
  // 2) HOMEPAGE — rozcestník kategorií + seznam článků
  // =========================================================
  function renderHome() {
    const grid = document.getElementById('category-grid');
    if (grid) {
      let html = '';
      cats.forEach((cat) => {
        // Speciální kategorie se stránkou (Šablony) — odkaz na vlastní stránku, zatím „připravujeme".
        if (cat.page) {
          html += `
          <a href="${ROOT}${cat.page}" id="cat-${cat.id}" class="category-card category-card-soon">
            <div class="category-icon">${cat.icon}</div>
            <h3>${esc(cat.name)}</h3>
            <p>${esc(cat.desc)}</p>
            <div class="category-meta">
              <span class="count">PŘIPRAVUJEME</span>
              <span class="arrow">${cat.locked ? '🔒' : '→'}</span>
            </div>
          </a>`;
          return;
        }
        const pub = publishedIn(cat.id);
        const count = pub.length
          ? `${pub.length} ${pub.length === 1 ? 'ČLÁNEK' : pub.length < 5 ? 'ČLÁNKY' : 'ČLÁNKŮ'}`
          : 'PŘIPRAVUJEME';
        const dead = pub.length === 0 ? ' onclick="return false;"' : '';
        html += `
          <a href="${catHref(cat.id)}" id="cat-${cat.id}" class="category-card"${dead}>
            <div class="category-icon">${cat.icon}</div>
            <h3>${esc(cat.name)}</h3>
            <p>${esc(cat.desc)}</p>
            <div class="category-meta">
              <span class="count">${count}</span>
              <span class="arrow">→</span>
            </div>
          </a>`;
      });
      grid.innerHTML = html;
    }

    const list = document.getElementById('articles-list');
    if (list) {
      // published první (dle data), pak soon
      const sorted = [...articles].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
        return (b.date || '').localeCompare(a.date || '');
      });
      let html = '';
      sorted.forEach((a) => {
        const cat = catById(a.category);
        const catName = cat ? cat.name : '';
        if (a.status === 'published') {
          html += `
            <a href="${artHref(a)}" class="article-row">
              <div class="article-row-icon">${a.icon}</div>
              <div class="article-row-content">
                <div class="article-row-cat">${esc(catName)}</div>
                <div class="article-row-title">${esc(a.title)}</div>
                <div class="article-row-desc">${esc(a.desc)}</div>
              </div>
              <div class="article-row-status new">NOVÉ</div>
            </a>`;
        } else {
          html += `
            <div class="article-row coming-soon">
              <div class="article-row-icon">${a.icon}</div>
              <div class="article-row-content">
                <div class="article-row-cat">${esc(catName)}</div>
                <div class="article-row-title">${esc(a.title)}</div>
                <div class="article-row-desc">${esc(a.desc)}</div>
              </div>
              <div class="article-row-status soon">PŘIPRAVUJEME</div>
            </div>`;
        }
      });
      list.innerHTML = html;
    }
  }

  // =========================================================
  // 3) VYHLEDÁVÁNÍ
  // =========================================================
  function initSearch() {
    const input = document.getElementById('kenji-search');
    const box = document.getElementById('kenji-search-results');
    if (!input || !box) return;

    const norm = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // ignoruj diakritiku

    const RECENT_KEY = 'kenji_search_recent_v1';
    const popular = ['cenik-ktery-prodava', 'prvni-klienti', 'expozice', 'jak-vybrat-fotak'];
    const synonymGroups = [
      ['cena', 'cenik', 'cenotvorba', 'nacenit', 'zdrazit', 'hodinovka'],
      ['klient', 'klienti', 'zakazka', 'zakazky', 'poptavka', 'akvizice'],
      ['svatba', 'svatby', 'svatebni', 'wedding'],
      ['fotak', 'fotoaparat', 'technika', 'telo'],
      ['objektiv', 'sklo', 'ohnisko', 'mm'],
      ['svetlo', 'blesk', 'blesky', 'sviceni', 'softbox'],
      ['uprava', 'editace', 'lightroom', 'photoshop', 'barvy'],
      ['smlouva', 'pravo', 'gdpr', 'souhlas'],
      ['dan', 'dane', 'fakturace', 'osvc', 'ucetnictvi'],
      ['instagram', 'socialni', 'reels', 'obsah', 'marketing'],
      ['web', 'portfolio', 'seo', 'google']
    ];

    const recentGet = () => {
      try { const value = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(value) ? value : []; }
      catch (e) { return []; }
    };
    const remember = (q) => {
      const value = q.trim();
      if (value.length < 2) return;
      try { localStorage.setItem(RECENT_KEY, JSON.stringify([value].concat(recentGet().filter((item) => norm(item) !== norm(value))).slice(0, 5))); } catch (e) {}
    };
    const expand = (token) => {
      const group = synonymGroups.find((items) => items.includes(token));
      return group || [token];
    };
    const tokenMatch = (field, token) => {
      if (field.includes(token)) return 1;
      if (token.length < 4) return 0;
      const words = field.split(/[^a-z0-9]+/).filter(Boolean);
      return words.some((word) => word.startsWith(token) || token.startsWith(word)) ? .45 : 0;
    };

    const search = (q) => {
      const phrase = norm(q.trim());
      const tokens = phrase.split(/\s+/).filter(Boolean);
      if (!tokens.length) return [];
      return articles
        .map((a) => {
          const cat = catById(a.category);
          const title = norm(a.title), desc = norm(a.desc), tags = norm((a.tags || []).join(' '));
          const category = norm(cat ? cat.name : '');
          let score = title.includes(phrase) ? 12 : (desc.includes(phrase) ? 5 : 0);
          let matched = 0;
          tokens.forEach((token) => {
            let best = 0;
            expand(token).forEach((term) => {
              best = Math.max(best,
                tokenMatch(title, term) * 5,
                tokenMatch(tags, term) * 4,
                tokenMatch(desc, term) * 2.5,
                tokenMatch(category, term) * 1.5);
            });
            if (best > 0) { score += best; matched += 1; }
          });
          if (matched === tokens.length) score += 4;
          return { a, score, matched };
        })
        .filter((result) => result.matched > 0 && result.score >= 2)
        .sort((x, y) => y.score - x.score || (y.a.status === 'published') - (x.a.status === 'published'))
        .slice(0, 8)
        .map((result) => result.a);
    };

    const resultHtml = (a) => {
      const cat = catById(a.category);
      const soon = a.status !== 'published';
      const free = (window.KENJI_FREE_SLUGS || []).includes(a.slug);
      return `
        <a href="${artHref(a)}" class="search-result${soon ? ' is-soon' : ''}" data-search-result${soon ? ' onclick="return false;"' : ''}>
          <span class="sr-icon">${a.icon}</span>
          <span class="sr-text">
            <span class="sr-title">${esc(a.title)}</span>
            <span class="sr-desc">${esc(a.desc || '')}</span>
            <span class="sr-cat">${esc(cat ? cat.name : '')}${soon ? ' · připravujeme' : (free ? ' · zdarma' : ' · plný přístup')}</span>
          </span>
        </a>`;
    };

    const renderSuggestions = () => {
      const recent = recentGet();
      const picks = popular.map((slug) => articles.find((a) => a.slug === slug)).filter(Boolean);
      box.innerHTML = `
        ${recent.length ? `<div class="search-suggest-label">Poslední hledání</div><div class="search-chips">${recent.map((q) => `<button type="button" class="search-chip" data-search-query="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
        <div class="search-suggest-label">Často hledané</div>
        ${picks.map(resultHtml).join('')}`;
      box.hidden = false;
    };

    const render = (results, q) => {
      if (!q.trim()) { renderSuggestions(); return; }
      if (!results.length) {
        box.innerHTML = `<div class="search-empty-state">${searchEmptyArt()}<strong>Tuhle přesnou shodu nemáme</strong><span>Zkus kratší výraz, nebo nech Kenji AI projít databázi za tebe.</span></div><a class="search-ai-fallback" href="${ROOT}kenji-ai.html?q=${encodeURIComponent(q.trim())}">Zeptat se Kenji AI →</a>`;
        box.hidden = false;
        return;
      }
      box.innerHTML = results.map(resultHtml).join('');
      box.hidden = false;
    };

    input.addEventListener('input', () => render(search(input.value), input.value));
    input.addEventListener('focus', () => render(search(input.value), input.value));
    box.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-search-query]');
      if (chip) {
        input.value = chip.getAttribute('data-search-query') || '';
        render(search(input.value), input.value);
        input.focus();
        return;
      }
      if (event.target.closest('[data-search-result]')) remember(input.value);
    });

    // Esc = zavřít/vyčistit, Enter = první výsledek
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; box.hidden = true; box.innerHTML = ''; input.blur(); }
      if (e.key === 'Enter') {
        const first = box.querySelector('.search-result:not(.is-soon)');
        if (first) { remember(input.value); first.click(); }
      }
    });

    // Klik mimo = zavřít
    document.addEventListener('click', (e) => {
      if (!box.contains(e.target) && e.target !== input) box.hidden = true;
    });

    // "/" odkudkoliv zaostří vyhledávání
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }

  // =========================================================
  //  BADGE „PŘEČTENO" NA KONCI ČLÁNKU
  // =========================================================
  function renderReadToggle() {
    if (!inArticle) return;
    const slug = slugOfFile(currentFile);
    if (!slug) return;
    const inner = document.querySelector('.main-inner');
    if (!inner) return;

    const wrap = document.createElement('div');
    wrap.className = 'read-toggle-wrap';
    wrap.innerHTML = `<button class="read-toggle" id="kenji-read-toggle"><span class="rt-box"></span><span class="rt-label"></span></button>`;

    // Umísti za obsah, před prev/další (nebo před signoff)
    const anchor = inner.querySelector('.article-footer-nav') || inner.querySelector('.signoff');
    if (anchor) inner.insertBefore(wrap, anchor); else inner.appendChild(wrap);

    document.getElementById('kenji-read-toggle').addEventListener('click', () => {
      const read = toggleRead(slug);
      refreshReadUI();
      try { document.dispatchEvent(new CustomEvent('kenji:article-read', { detail: { slug, read } })); } catch (_) {}
    });
    updateReadBadge();
  }

  // =========================================================
  //  ZAMČENÝ VIDEO PLAYER (upsell do akademie) — z window.KENJI_VIDEOS
  // =========================================================
  // Má uživatel přístup k videokurzům? (tier academy). Kopíruje logiku auth.js
  // (DEV_TIER přes ?tier=, localhost = academy, jinak uložený tier).
  function hasAcademyAccess() {
    try {
      const t = (location.search.match(/[?&]tier=(free|knihovna|academy)/) || [])[1];
      if (t) return t === 'academy';
      if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /\.local$/.test(location.hostname)) return true;
      const u = JSON.parse(localStorage.getItem('kenji_user') || 'null');
      return !!(u && u.tier === 'academy');
    } catch (e) { return false; }
  }

  function renderVideoLock() {
    if (!inArticle) return;
    const slug = slugOfFile(currentFile);
    if (!slug) return;
    const map = window.KENJI_VIDEOS || {};
    const v = map[slug];
    if (!v) return; // článek bez videa → nic

    const inner = document.querySelector('.main-inner');
    if (!inner) return;

    // Idempotence — při re-renderu (po přihlášení) starý blok odeber.
    const prev = inner.querySelector('.video-lock');
    if (prev) prev.remove();

    const unlocked = hasAcademyAccess();
    const free = !!v.free;                 // 🎁 ukázka zdarma pro všechny (reciprocita)
    const canPlay = unlocked || free;      // smí přehrát
    const playInline = canPlay && v.youtube; // přehraje se přímo v článku (má YouTube ID)
    const courseUrl = v.course
      ? ROOT + 'kurz.html?slug=' + encodeURIComponent(v.course)
      : (map._academyUrl || 'academy.html');
    // Přehrání inline → #; člen/ukázka → do kurzu; nečlen → upsell.
    const url = playInline ? '#' : (canPlay ? courseUrl : (v.url || map._academyUrl || 'academy.html'));
    const thumb = v.thumb || map._defaultThumb || '';
    const title = v.title || 'Video k tomuto tématu';
    const dur = v.duration ? `<span class="vl-dur">${esc(v.duration)}</span>` : '';

    const tag = free ? '🎁 Ukázka zdarma' : (unlocked ? '🔓 Členský kurz' : '🔒 Členský kurz');
    const cta = free ? 'Přehrát zdarma →' : (unlocked ? 'Přehrát v akademii →' : 'Odemknout v akademii →');

    const a = document.createElement('a');
    a.className = 'video-lock' + (canPlay ? ' unlocked' : '') + (free ? ' free' : '');
    a.href = url;
    if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener'; } // interní kurz → stejné okno
    a.innerHTML = `
      <div class="vl-bg${thumb ? ' has-img' : ''}"${thumb ? ` style="background-image:url('${ROOT}${esc(thumb)}')"` : ''}></div>
      <div class="vl-overlay"></div>
      <div class="vl-top">
        <span class="vl-brand">KENJI ACADEMY</span>
        <span class="vl-tag">${tag}</span>
      </div>
      <div class="vl-center">
        <span class="vl-play">
          <span class="vl-play-icon">▶</span>
          ${canPlay ? '' : '<span class="vl-lock">🔒</span>'}
        </span>
        <span class="vl-cta">${cta}</span>
      </div>
      <div class="vl-bottom">
        <div class="vl-info">
          <div class="vl-kicker">VIDEO K TÉMATU</div>
          <div class="vl-title">${esc(title)}</div>
        </div>
        ${dur}
      </div>`;

    // Přehrání přímo v článku (YouTube embed) — pro ukázku zdarma i členy.
    if (playInline) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const box = document.createElement('div');
        box.className = 'video-embed';
        box.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(v.youtube)}?autoplay=1&rel=0" title="${esc(title)}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
        a.replaceWith(box);
      });
    }

    // PLACEMENT: 'mid' = za první blok číslovaných karet (přirozený zlom),
    // jinak 'end' = na konec článku (nad "přečteno" / navigaci).
    let placed = false;
    if (v.placement === 'mid') {
      const block = inner.querySelector('.numbered-cards') || inner.querySelector('.section-title');
      if (block) { block.insertAdjacentElement('afterend', a); placed = true; }
    }
    if (!placed) {
      const anchor = inner.querySelector('.read-toggle-wrap')
        || inner.querySelector('.article-footer-nav')
        || inner.querySelector('.signoff');
      if (anchor) inner.insertBefore(a, anchor); else inner.appendChild(a);
    }

    // 🎁 U ukázky zdarma přidej pod video jemný upsell (hodnotu jsme dali → teď nabídka).
    if (free) {
      const up = document.createElement('a');
      up.className = 'vl-freeupsell';
      up.href = ROOT + 'pristup.html';
      up.innerHTML = `<span>Tohle byla ochutnávka. Celý kurz <strong>${esc(v.course ? 'v Kenji Academy' : 'Academy')}</strong> + 20+ hodin videí a komunita.</span><span class="vl-freeupsell-cta">Zjistit víc →</span>`;
      a.insertAdjacentElement('afterend', up);
    }
  }

  // =========================================================
  //  PROMO BANNER: KENJI PRESETY (ostrá fotka + CTA, bez ceny)
  // =========================================================
  function renderPresetPromo() {
    if (!inArticle) return;
    const slug = slugOfFile(currentFile);
    if (!slug) return;
    const cfg = window.KENJI_PRESET_PROMO;
    if (!cfg || !cfg.slugs || !(slug in cfg.slugs)) return;

    const inner = document.querySelector('.main-inner');
    if (!inner) return;

    const a = document.createElement('a');
    a.className = 'preset-promo';
    a.href = cfg.url;
    if (/^https?:/i.test(cfg.url)) { a.target = '_blank'; a.rel = 'noopener'; }
    a.style.backgroundImage = `url('${ROOT}${esc(cfg.image)}')`;
    a.innerHTML = `
      <div class="pp-overlay"></div>
      <div class="pp-content">
        <div class="pp-kicker">${esc(cfg.kicker)}</div>
        <h3 class="pp-title">${esc(cfg.title)}</h3>
        <p class="pp-text">${esc(cfg.text)}</p>
        <div class="pp-bonus">${esc(cfg.bonus)}</div>
        <span class="pp-cta">${esc(cfg.button)} →</span>
      </div>`;

    let placed = false;
    if (cfg.slugs[slug] === 'mid') {
      const block = inner.querySelector('.numbered-cards') || inner.querySelector('.section-title');
      if (block) { block.insertAdjacentElement('afterend', a); placed = true; }
    }
    if (!placed) {
      const anchor = inner.querySelector('.read-toggle-wrap')
        || inner.querySelector('.article-footer-nav')
        || inner.querySelector('.signoff');
      if (anchor) inner.insertBefore(a, anchor); else inner.appendChild(a);
    }
  }

  function updateReadBadge() {
    const btn = document.getElementById('kenji-read-toggle');
    if (!btn) return;
    const read = isRead(slugOfFile(currentFile));
    btn.classList.toggle('is-read', read);
    btn.querySelector('.rt-label').textContent = read ? 'Přečteno' : 'Označit jako přečtené';
  }

  // =========================================================
  //  PLOVOUCÍ TLAČÍTKO „KENJI AI" (na všech stránkách kromě chatu)
  // =========================================================
  function renderHelpButton() {
    if (document.querySelector('.kenji-help')) return; // bez duplicity
    if (currentFile === 'kenji-ai.html') return;        // na chatu překáží nad inputem
    const a = document.createElement('a');
    a.className = 'kenji-help';
    a.href = ROOT + 'kenji-ai.html';
    a.setAttribute('aria-label', 'Otevřít Kenji AI');
    a.innerHTML = `
      <span class="kenji-help-orb" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3l1.45 4.05L17.5 8.5l-4.05 1.45L12 14l-1.45-4.05L6.5 8.5l4.05-1.45L12 3Z"></path>
          <path d="M18 13l.82 2.18L21 16l-2.18.82L18 19l-.82-2.18L15 16l2.18-.82L18 13Z"></path>
          <path d="M6 14l.62 1.38L8 16l-1.38.62L6 18l-.62-1.38L4 16l1.38-.62L6 14Z"></path>
        </svg>
      </span>
      <span>Kenji AI</span>`;
    document.body.appendChild(a);
  }

  // =========================================================
  //  GLOBÁLNÍ PATIČKA
  // =========================================================
  function renderSiteFooter() {
    if (document.querySelector('.site-footer')) return;
    if (currentFile === 'kenji-ai.html') return;  // celoobrazovkový chat — bez patičky
    const inner = document.querySelector('.main-inner');
    if (!inner) return;

    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="sf-main">
        <div class="sf-brand">
          <div class="sf-logo">KENJI ACADEMY</div>
          <p>Kenji Academy - komunita a vzdělávání pro fotografy, kameramany a tvůrce, kteří chtějí z tvorby postavit byznys.</p>
          <div class="sf-rating" aria-label="Hodnocení Kenji Academy 4,65 z 5, více než 150 hodnocení">
            <div class="sf-rating-body">
              <div class="sf-stars" aria-hidden="true">★★★★★</div>
              <div class="sf-rating-meta">
                <div class="sf-rating-score">Hodnocení 4,65</div>
                <div class="sf-rating-count">150+ hodnocení</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sf-links">
          <div class="sf-col">
            <div class="sf-head">Databáze</div>
            <a href="${ROOT}index.html">Hlavní stránka</a>
            <a href="${ROOT}kviz.html">Kvíz &amp; odměna</a>
            <a href="${ROOT}audit.html">Audit pro tvůrce</a>
            <a href="${ROOT}hodinovka.html">Kalkulačka hodinovky</a>
          </div>
          <div class="sf-col">
            <div class="sf-head">Obsah</div>
            <a href="${catHref('byznys')}">Byznys &amp; klienti</a>
            <a href="${catHref('technika')}">Technika &amp; výbava</a>
            <a href="${catHref('pravo')}">Právo &amp; účetnictví</a>
          </div>
          <div class="sf-col">
            <div class="sf-head">Kenji</div>
            <a href="#" data-checkout-product="databaze">Plný přístup</a>
            <a href="academy.html">Kenji Academy</a>
            <a href="https://ig.me/m/kenjiacademycz" target="_blank" rel="noopener">Instagram</a>
          </div>
        </div>
      </div>
      <div class="footer-partners" aria-label="Partneři Kenji Academy">
        <span>Partneři</span>
        <div class="footer-partner-logos">
          <a href="https://pixin.gallery/" target="_blank" rel="noopener sponsored"><img src="${ROOT}assets/partners/pixin.svg" width="117" height="29" loading="lazy" decoding="async" alt="PIXIN"></a>
          <a href="https://www.manfrotto.com/global-en/" target="_blank" rel="noopener sponsored"><img src="${ROOT}assets/partners/manfrotto.png" width="393" height="154" loading="lazy" decoding="async" alt="Manfrotto"></a>
          <a href="https://www.nikon.cz/cs_CZ" target="_blank" rel="noopener sponsored"><img src="${ROOT}assets/partners/nikon-160.webp" width="160" height="160" loading="lazy" decoding="async" alt="Nikon"></a>
          <a href="https://www.kvalitnifotky.cz/" target="_blank" rel="noopener sponsored"><img src="${ROOT}assets/partners/kvalitni-fotky.svg" width="200" height="50" loading="lazy" decoding="async" alt="Kvalitní fotky"></a>
        </div>
      </div>
      <div class="sf-bottom">
        <span>© ${new Date().getFullYear()} Kenji s.r.o.</span>
        <nav class="sf-legal">
          <a href="${ROOT}obchodni-podminky.html">Obchodní podmínky</a>
          <a href="${ROOT}zasady-ochrany-udaju.html">Ochrana osobních údajů</a>
          <a href="${ROOT}cookies.html">Cookies</a>
        </nav>
      </div>`;

    inner.appendChild(footer);
  }

  // Nenápadná cookie lišta — jednou, informativní (nezbytné úložiště souhlas nevyžaduje).
  function renderCookieNotice() {
    if (currentFile === 'kenji-ai.html') return;
    try { if (localStorage.getItem('kenji_cookies_v1')) return; } catch (e) { return; }
    setTimeout(function () {
      if (document.body.classList.contains('kenji-gated')) return; // neukazuj přes vstupní bránu
      if (document.querySelector('.cookie-notice')) return;
      const bar = document.createElement('div');
      bar.className = 'cookie-notice';
      bar.innerHTML =
        '<span>Používáme jen nezbytné cookies a úložiště pro přihlášení a chod webu. <a href="' + ROOT + 'cookies.html">Zásady cookies</a></span>' +
        '<button type="button" class="cookie-ok">Rozumím</button>';
      document.body.appendChild(bar);
      bar.querySelector('.cookie-ok').addEventListener('click', function () {
        try { localStorage.setItem('kenji_cookies_v1', '1'); } catch (e) {}
        bar.classList.add('hide');
        setTimeout(function () { bar.remove(); }, 250);
      });
    }, 600);
  }

  // Sdílený pool komunitních úspěchů (používá pop-up i karta na dashboardu).
  // Reálná česká jména + běžné úspěchy tvůrců. Nejsou klikatelné (nedají se ověřit).
  window.KENJI_COMMUNITY_WINS = window.KENJI_COMMUNITY_WINS || [
    { n: 'Klára', t: 'získala svoji třetí svatbu na příští rok' },
    { n: 'David', t: 'sehnal pravidelného klienta na střih videí' },
    { n: 'Martin', t: 'domluvil natáčení za 10 000 Kč měsíčně' },
    { n: 'Eliška', t: 'zvedla ceny o 30 % a klienti zůstali' },
    { n: 'Tomáš', t: 'nafotil první placenou reklamu pro e-shop' },
    { n: 'Lucie', t: 'má vyprodaný celý podzim' },
    { n: 'Petr', t: 'uzavřel roční spolupráci se značkou' },
    { n: 'Nikola', t: 'dostala první svatbu za 25 000 Kč' },
    { n: 'Adam', t: 'prodal sérii fotek do katalogu' },
    { n: 'Bára', t: 'získala 3 nové klienty za jeden týden' },
    { n: 'Honza', t: 'natočil klip, co má přes 100 000 zhlédnutí' },
    { n: 'Verča', t: 'si řekla o dvojnásobek a prošlo to' },
    { n: 'Filip', t: 'má první opakovanou zakázku' },
    { n: 'Míša', t: 'dodělala rebranding portfolia a hned přišla poptávka' }
  ];

  // Pop-up „Úspěch komunity" — jednou denně v náhodný čas, glass box, nekliknutelný.
  function renderWinAnnouncement() {
    if (currentFile === 'kenji-ai.html') return;             // celoobrazovkový chat
    const WINS = window.KENJI_COMMUNITY_WINS || [];
    if (!WINS.length) return;
    const KEY = 'kenji_winannounce_v1';
    const today = () => { const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    let st; try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { st = null; }
    if (!st || typeof st.idx !== 'number') st = { last: '', idx: Math.floor(Math.random() * WINS.length) };
    if (st.last === today()) return;                          // dnes už se ukázal
    const delay = 20000 + Math.floor(Math.random() * 80000);  // 20–100 s do zobrazení
    setTimeout(function () {
      if (document.body.classList.contains('kenji-gated')) return;     // ne přes vstupní bránu
      if (document.querySelector('.kenji-winpop')) return;
      try { const s2 = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s2 && s2.last === today()) return; } catch (e) {}
      const win = WINS[st.idx % WINS.length];
      st.idx = (st.idx + 1) % WINS.length; st.last = today();
      try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
      const box = document.createElement('div');
      box.className = 'kenji-winpop';
      box.setAttribute('role', 'status');
      box.innerHTML =
        '<button type="button" class="wp-close" aria-label="Zavřít">✕</button>' +
        '<span class="wp-badge">Úspěch komunity</span>' +
        '<p class="wp-text"><strong>' + esc(win.n) + '</strong> ' + esc(win.t) + '</p>' +
        '<a class="wp-add" href="' + ROOT + 'index.html?addwin=1">＋ Zapiš svůj úspěch</a>';
      document.body.appendChild(box);
      requestAnimationFrame(function () { box.classList.add('show'); });
      let hideT = setTimeout(dismiss, 8000);
      function dismiss() { clearTimeout(hideT); box.classList.remove('show'); setTimeout(function () { box.remove(); }, 500); }
      box.querySelector('.wp-close').addEventListener('click', dismiss);
    }, delay);
  }

  // Nastavení — vždy dole v liště (sticky), na všech zařízeních
  function renderSidebarSettings() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar || sidebar.querySelector('.sidebar-settings')) return;
    const active = currentFile === 'nastaveni.html' ? ' active' : '';
    sidebar.insertAdjacentHTML('beforeend',
      `<a href="${ROOT}nastaveni.html" class="sidebar-settings${active}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15z"/></svg>
        <span>Nastavení</span>
      </a>`);
  }

  // --- Glass přepínač: klouzavá pilulka (hover follow + slide-then-navigate) ---
  function initSwitchPill() {
    const box = document.querySelector('.sidebar-switch');
    if (!box) return;
    const pill = box.querySelector('.switch-pill');
    const btns = Array.prototype.slice.call(box.querySelectorAll('.switch-btn'));
    if (!pill || !btns.length) return;
    const active = box.querySelector('.switch-btn.active') || btns[0];

    function moveTo(btn, animate) {
      if (!btn) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.height = btn.offsetHeight + 'px';
      pill.style.transform = 'translate(' + btn.offsetLeft + 'px,' + btn.offsetTop + 'px)';
      btns.forEach((b) => b.classList.toggle('is-hot', b === btn));
      if (!animate) { void pill.offsetWidth; pill.style.transition = ''; }
    }

    // Výchozí pozice bez animace, pak zviditelnit. Synchronně (čtení offsetWidth
    // si vynutí layout) + rAF jako pojistka, kdyby ještě nebyl hotový layout.
    function place() { moveTo(active, false); pill.classList.add('ready'); }
    place();
    requestAnimationFrame(place);

    btns.forEach((b) => {
      b.addEventListener('mouseenter', () => moveTo(b, true));
      b.addEventListener('click', (e) => {
        if (b.classList.contains('active')) return;
        e.preventDefault();
        moveTo(b, true);
        const href = b.getAttribute('href');
        setTimeout(() => { window.location.href = href; }, 300);
      });
    });
    box.addEventListener('mouseleave', () => moveTo(active, true));
    window.addEventListener('resize', () => moveTo(active, false));
  }

  // =========================================================
  //  PŘEPÍNAČ MOTIVU (☾/☀) — vpravo nahoře, výchozí tmavý
  // =========================================================
  function renderThemeToggle() {
    const bar = document.querySelector('.header-actions');
    if (!bar || bar.querySelector('.theme-toggle')) return;
    // Přihlášený uživatel má přepínač schovaný v profilovém menu (auth.js). Tam ho neduplikuj.
    if (bar.querySelector('.auth-acct')) return;
    const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
    const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    const btn = document.createElement('button');
    btn.className = 'theme-toggle'; btn.type = 'button';
    const cur = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const paint = () => {
      const light = cur() === 'light';
      btn.innerHTML = light ? sun : moon;
      btn.setAttribute('aria-label', light ? 'Přepnout na tmavý režim' : 'Přepnout na světlý režim');
      btn.title = light ? 'Světlý režim' : 'Tmavý režim';
    };
    paint();
    btn.addEventListener('click', function () {
      const next = cur() === 'light' ? 'dark' : 'light';
      if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
      else document.documentElement.removeAttribute('data-theme');
      try { localStorage.setItem('kenji_theme', next); } catch (e) {}
      paint();
    });
    bar.insertBefore(btn, bar.firstChild); // vlevo od účtu
  }

  // =========================================================
  //  KOMUNITNÍ CHAT (WhatsApp) — modal s nástěnným designem
  // =========================================================
  const COMMUNITY_CHAT_URL = 'https://chat.whatsapp.com/FgOU0aJ2nZk1U6GvTsaQLD?mode=gi_t';
  function openCommunityChatModal() {
    if (document.querySelector('.wa-modal')) return;
    const isMember = navTier() === 'academy';
    const waLogo = '<svg class="wa-logo" viewBox="0 0 32 32" aria-hidden="true"><path fill="#25D366" d="M16 .5C7.5.5.6 7.4.6 15.9c0 2.8.7 5.4 2 7.8L.5 31.5l8-2.1a15.3 15.3 0 0 0 7.5 1.9h.1c8.5 0 15.4-6.9 15.4-15.4C31.5 7.4 24.6.5 16 .5z"/><path fill="#fff" d="M16.1 28.5h-.1a12.7 12.7 0 0 1-6.5-1.8l-.5-.3-4.8 1.3 1.3-4.7-.3-.5a12.7 12.7 0 0 1 19.7-15.7 12.6 12.6 0 0 1 3.7 9c0 7-5.7 12.7-12.7 12.7z"/><path fill="#25D366" d="M22.9 19c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.4-.2.2-.4.3-.8.1a10.5 10.5 0 0 1-3.1-1.9 11.6 11.6 0 0 1-2.1-2.7c-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.2.1-.5 0-.7-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-1 .5-.3.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.3.1.7-.1 2.2-.9 2.5-1.7.3-.9.3-1.6.2-1.7-.1-.2-.3-.3-.7-.4z"/></svg>';
    const btn = isMember
      ? '<a class="wa-cta" href="' + COMMUNITY_CHAT_URL + '" target="_blank" rel="noopener">Otevřít chat</a>'
      : '<a class="wa-cta" href="#" data-checkout-product="academy">Koupit přístup do komunity</a>';
    const body = isMember
      ? '<p class="wa-text">Naše komunita žije na WhatsAppu — sdílíme zakázky, feedback, spolupráce i zákulisí. Klikni a jsi uvnitř.</p>'
      : '<p class="wa-text">Tento chat je přístupný <strong>pouze pro členy Kenji Academy</strong>. Přístup do komunity a všeho ostatního získáš zde 👇</p>';
    const ov = document.createElement('div');
    ov.className = 'wa-modal';
    ov.innerHTML =
      '<div class="wa-card" role="dialog" aria-modal="true" aria-label="Komunitní chat">' +
        '<button class="wa-close" type="button" aria-label="Zavřít">✕</button>' +
        '<div class="wa-icon">' + waLogo + '</div>' +
        '<span class="wa-kicker">KENJI ACADEMY · KOMUNITA</span>' +
        '<h3 class="wa-title">Komunitní chat</h3>' +
        body +
        btn +
        (isMember ? '<span class="wa-note">Otevře se WhatsApp v novém okně.</span>' : '<span class="wa-note">Už jsi člen? Přihlas se přes profil vpravo nahoře.</span>') +
      '</div>';
    document.body.appendChild(ov);
    document.body.classList.add('wa-modal-open');
    requestAnimationFrame(() => ov.classList.add('show'));
    function close() {
      ov.classList.remove('show');
      document.body.classList.remove('wa-modal-open');
      setTimeout(() => { if (ov.parentNode) ov.remove(); }, 200);
    }
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.closest('.wa-close')) close(); });
    // Po kliknutí na CTA (odkaz i checkout) modal zavři.
    ov.querySelector('.wa-cta').addEventListener('click', () => setTimeout(close, 50));
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  }
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-community-chat]');
    if (!t) return;
    e.preventDefault();
    // Člen otevře WhatsApp, nečlen dostane nákupní modal (kontext = chat).
    if (navTier() === 'academy') openCommunityChatModal();
    else openUpgradeModal('chat');
  });

  // =========================================================
  //  NÁKUPNÍ MODAL — jeden univerzální prodej (tier-aware)
  //  Nahrazuje skok na academy.html u přihlášených. Rozmazané pozadí.
  // =========================================================
  const UPG_CTX = {
    video: 'Tohle video je součást Kenji Academy.',
    clanek: 'Tenhle obsah je součást plného přístupu.',
    chat: 'Komunitní chat je součást Kenji Academy.',
    prispevky: 'Tahle část komunity je pro členy.',
    sablony: 'Šablony a smlouvy jsou součást Kenji Academy.',
    kurz: 'Kurzy jsou součást Kenji Academy.'
  };
  function upgFeats(items) {
    return '<ul class="upg-feats">' + items.map(function (it) {
      return '<li class="' + (it[0] ? 'ok' : 'no') + '"><span class="upg-fi" aria-hidden="true">' + (it[0] ? '✓' : '✕') + '</span>' + esc(it[1]) + '</li>';
    }).join('') + '</ul>';
  }
  function upgFreeCol(isCurrent) {
    return '<div class="upg-col' + (isCurrent ? ' is-current' : '') + '">' +
      (isCurrent ? '<span class="upg-col-tag">Tvůj plán teď</span>' : '') +
      '<h4 class="upg-plan">Zdarma</h4>' +
      '<div class="upg-price"><strong>0 Kč</strong></div>' +
      upgFeats([
        [true, 'Vybrané články zdarma'],
        [true, 'Kvíz & odměna, Audit, Dashboard'],
        [true, 'Foto feedback & Týdenní výzva'],
        [true, 'Kenji AI (omezené generování)'],
        [false, 'Celá databáze (80+ článků)'],
        [false, '5 videokurzů a živé webináře'],
        [false, 'Prémiová komunita + chat'],
        [false, 'Šablony a smlouvy']
      ]) +
      (isCurrent ? '<span class="upg-col-note">To, co máš teď — a co ti uniká.</span>' : '') +
    '</div>';
  }
  function upgDatabazeCol(isCurrent, overview) {
    return '<div class="upg-col' + (isCurrent ? ' is-current' : '') + '">' +
      (isCurrent ? '<span class="upg-col-tag">Tvůj plán teď</span>' : '') +
      '<h4 class="upg-plan">Databáze</h4>' +
      '<div class="upg-price"><strong>1 497 Kč</strong><span>jednorázově</span></div>' +
      upgFeats([
        [true, 'Celá databáze — 80+ článků'],
        [true, 'Kenji AI'],
        [true, 'Vše z Free plánu'],
        [false, '5 videokurzů a webináře'],
        [false, 'Prémiová komunita + chat'],
        [false, 'Šablony a smlouvy']
      ]) +
      (overview ? ''
        : (isCurrent
          ? '<div class="upg-owned">✓ Tohle už máš</div>'
          : '<a class="upg-cta upg-cta-sec" href="#" data-checkout-product="databaze">Odemknout databázi</a>' + dbGraphic())) +
    '</div>';
  }
  function dbGraphic() {
    // 16:9 ilustrace „nabité databáze" — mřížka článkových karet. Theme-aware (currentColor).
    let cards = '';
    const cx = [16, 116, 216], cy = [50, 108];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const x = cx[c], y = cy[r];
      cards += '<rect x="' + x + '" y="' + y + '" width="88" height="44" rx="6" fill="currentColor" fill-opacity=".05" stroke="currentColor" stroke-opacity=".14"/>' +
        '<rect x="' + (x + 8) + '" y="' + (y + 9) + '" width="26" height="6" rx="3" fill="#ff6b1a" fill-opacity=".8"/>' +
        '<rect x="' + (x + 8) + '" y="' + (y + 22) + '" width="72" height="4" rx="2" fill="currentColor" fill-opacity=".28"/>' +
        '<rect x="' + (x + 8) + '" y="' + (y + 31) + '" width="56" height="4" rx="2" fill="currentColor" fill-opacity=".16"/>';
    }
    return '<div class="upg-db-graphic">' +
      '<svg class="upg-db-svg" viewBox="0 0 320 180" role="img" aria-label="Databáze článků pro tvůrce">' +
        '<rect x="16" y="16" width="288" height="20" rx="6" fill="currentColor" fill-opacity=".04" stroke="currentColor" stroke-opacity=".12"/>' +
        '<circle cx="30" cy="26" r="4.5" fill="none" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>' +
        '<line x1="33.5" y1="29.5" x2="37" y2="33" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="44" y="23" width="120" height="5" rx="2.5" fill="currentColor" fill-opacity=".2"/>' +
        cards +
      '</svg>' +
      '<span class="upg-db-cap">80+ článků · byznys, technika, právo, mindset</span>' +
    '</div>';
  }
  // Value stack seskupený do 4 rozklikávacích kategorií (souhrn hodnoty = 49 997 Kč).
  const ACADEMY_CATS = [
    { name: 'Videokurzy a programy', count: '5 kurzů', val: '25 000', items: [
      ['Kurz Svatební fotografie', '7 500'],
      ['Business strategie', '7 500'],
      ['Masterclass postprocesu (LR &amp; PS)', '3 500'],
      ['Kurz Portrétní fotografie', '3 000'],
      ['90denní výzva', '3 500']
    ] },
    { name: 'Komunita a živá výuka', count: 'neomezeně', val: '9 997', items: [
      ['Komunita tvůrců — feedback a rady', '5 997'],
      ['Měsíční live webináře naživo', '4 000']
    ] },
    { name: 'Právo, daně a smlouvy', count: '3 v ceně', val: '10 000', items: [
      ['Kompletní právo pro tvůrce', '4 500'],
      ['Účetnictví a daně pro tvůrce', '3 000'],
      ['Neprůstřelné šablony smluv', '2 500']
    ] },
    { name: 'Databáze a nástroje', count: '80+ článků + AI', val: '5 000', items: [
      ['Celá databáze — 80+ článků', '3 000'],
      ['Kenji AI bez limitu', '2 000']
    ] }
  ];
  function upgAcademyCol(owned) {
    if (owned) {
      // Minimalistický přehled — „tohle je tvůj plán", bez value-stacku a bez ceny.
      return '<div class="upg-col is-hero is-owned">' +
        '<span class="upg-col-tag">Tvůj plán teď</span>' +
        '<h4 class="upg-plan">Kenji Academy</h4>' +
        upgFeats([
          [true, '5 videokurzů — 20+ hodin praxe'],
          [true, 'Živé webináře a rozbory'],
          [true, 'Prémiová komunita + chat'],
          [true, 'Celá databáze (80+ článků)'],
          [true, 'Kenji AI bez limitu'],
          [true, 'Šablony a smlouvy']
        ]) +
        '<div class="upg-owned">✓ Tohle máš</div>' +
      '</div>';
    }
    const cats = ACADEMY_CATS.map(function (c) {
      const items = c.items.map(function (it) {
        return '<li><span>' + it[0] + '</span><b>' + it[1] + ' Kč</b></li>';
      }).join('');
      return '<li class="upg-cat">' +
        '<button class="upg-cat-head" type="button" aria-expanded="false">' +
          '<span class="upg-cat-info"><span class="upg-cat-name">' + c.name + '</span><span class="upg-cat-count">' + c.count + '</span></span>' +
          '<span class="upg-cat-meta"><b class="upg-cat-val">' + c.val + ' Kč</b><span class="upg-cat-chev" aria-hidden="true">⌄</span></span>' +
        '</button>' +
        '<div class="upg-cat-body" hidden><ul>' + items + '</ul></div>' +
      '</li>';
    }).join('');
    return '<div class="upg-col is-hero">' +
      '<span class="upg-col-badge">NEJVÍC HODNOTY</span>' +
      '<h4 class="upg-plan">Kenji Academy</h4>' +
      '<p class="upg-hero-sub">Všechno na jednom místě. Rozklikni si, co je uvnitř.</p>' +
      '<ul class="upg-cats">' + cats + '</ul>' +
      '<div class="upg-pricebox">' +
        '<span class="upg-price-old">Celková hodnota <s>49 997 Kč</s></span>' +
        '<a class="upg-cta upg-cta-main" href="#" data-checkout-product="academy">Zakoupit teď · 24 997 Kč</a>' +
      '</div>' +
      '<span class="upg-roi">Jedna zakázka ti to celé vrátí.</span>' +
    '</div>';
  }
  function openUpgradeModal(ctx, forceTier) {
    if (document.querySelector('.upg-modal')) return;
    // forceTier = jen pro náhled (member si prohlédne free/knihovna/academy verzi).
    const tier = (forceTier && /^(free|knihovna|academy)$/.test(forceTier)) ? forceTier : navTier();
    const ov = document.createElement('div');
    ov.className = 'upg-modal';
    let inner;
    if (tier === 'academy') {
      // Přehled členství — stejné tři sloupce, minimalisticky, s vyznačením tvého plánu.
      inner = '<div class="upg-card" role="dialog" aria-modal="true" aria-label="Moje členství">' +
        '<button class="upg-close" type="button" aria-label="Zavřít">✕</button>' +
        '<div class="upg-head">' +
          '<h3 class="upg-title">Tvoje členství</h3>' +
          '<div class="upg-proof">Máš <strong>Kenji Academy</strong> — plný přístup ke všemu.</div>' +
        '</div>' +
        '<div class="upg-cols">' + upgFreeCol(false) + upgAcademyCol(true) + upgDatabazeCol(false, true) + '</div>' +
      '</div>';
    } else {
      const ctxLine = UPG_CTX[ctx] ? '<p class="upg-ctx">' + esc(UPG_CTX[ctx]) + '</p>' : '';
      const cols = tier === 'knihovna'
        ? (upgDatabazeCol(true) + upgAcademyCol())
        : (upgFreeCol(true) + upgAcademyCol() + upgDatabazeCol(false));
      inner = '<div class="upg-card" role="dialog" aria-modal="true" aria-label="Odemknout přístup">' +
        '<button class="upg-close" type="button" aria-label="Zavřít">✕</button>' +
        ctxLine +
        '<div class="upg-head">' +
          '<h3 class="upg-title">Odemkni si víc z Kenji Academy</h3>' +
          '<div class="upg-proof"><span class="upg-stars">★★★★★</span> 4,65 · 150+ hodnocení · stovky členů</div>' +
        '</div>' +
        '<div class="upg-cols' + (tier === 'knihovna' ? ' upg-cols-2' : '') + '">' + cols + '</div>' +
        '<div class="upg-foot">Bezpečná jednorázová platba přes Stripe · přístup napořád</div>' +
      '</div>';
    }
    ov.innerHTML = inner;
    document.body.appendChild(ov);
    document.body.classList.add('upg-modal-open');
    requestAnimationFrame(function () { ov.classList.add('show'); });
    function close() {
      ov.classList.remove('show');
      document.body.classList.remove('upg-modal-open');
      setTimeout(function () { if (ov.parentNode) ov.remove(); }, 200);
    }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.upg-close')) close(); });
    // Rozklikávací kategorie (value stack)
    ov.addEventListener('click', function (e) {
      const h = e.target.closest('.upg-cat-head');
      if (!h) return;
      const open = h.getAttribute('aria-expanded') === 'true';
      h.setAttribute('aria-expanded', open ? 'false' : 'true');
      const body = h.nextElementSibling;
      if (body) body.hidden = open;
    });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } });
  }
  window.KenjiUpgrade = { open: openUpgradeModal };

  // Náhled: ?upgrade=free|knihovna|academy (nebo ?upgrade=1 = tvůj aktuální tier)
  // otevře nákupní modal i členovi, aby si prohlédl, jak ho vidí ostatní.
  (function () {
    var p = new URLSearchParams(location.search).get('upgrade');
    if (!p) return;
    var forced = /^(free|knihovna|academy)$/.test(p) ? p : '';
    setTimeout(function () { openUpgradeModal('', forced); }, 350);
  })();

  // Globální interceptor: každý „koupit / do Academy" spouštěč → místo skoku na
  // prodejní stránku otevři modal. Běží v capture fázi, ať předběhne checkout v script.js.
  document.addEventListener('click', function (e) {
    if (currentFile === 'academy.html' || currentFile === 'pristup.html') return; // prodejní stránka: rovnou Stripe
    const t = e.target.closest('[data-checkout-product], a[href$="academy.html"], [data-upgrade]');
    if (!t) return;
    if (t.closest('.upg-modal')) return; // tlačítka uvnitř modalu → nech projít na Stripe (script.js)
    e.preventDefault();
    e.stopPropagation();
    openUpgradeModal(t.getAttribute('data-upgrade') || '');
  }, true);

  // --- Spodní glass navigace (Kurzy / Databáze / Komunita / Kenji AI) ---
  function renderBottomNav() {
    if (document.querySelector('.bottom-nav')) return;
    var cf = currentFile;
    var isHome = cf === 'index.html' || cf === '';
    var icoK = '<svg class="bnav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.6 8.2 12 12.4l9.4-4.2z"/><path d="M6.2 10.3v4.1c0 1.4 2.6 2.6 5.8 2.6s5.8-1.2 5.8-2.6v-4.1"/><path d="M21.4 8.2v4.6"/></svg>';
    var icoD = '<svg class="bnav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6.6C10.3 5.3 8 4.8 4 4.8v13.4c4 0 6.3.5 8 1.9 1.7-1.4 4-1.9 8-1.9V4.8c-4 0-6.3.5-8 1.8z"/><path d="M12 6.6v13.5"/></svg>';
    var icoC = '<svg class="bnav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.6 18.5v-1.3a3.4 3.4 0 0 0-3.4-3.4H6.9a3.4 3.4 0 0 0-3.4 3.4v1.3"/><circle cx="9.55" cy="7.4" r="3.15"/><path d="M20.5 18.5v-1.3a3.4 3.4 0 0 0-2.55-3.29"/><path d="M15.6 4.45a3.15 3.15 0 0 1 0 6.05"/></svg>';
    var icoAI = '<span class="bnav-ai" aria-hidden="true">AI</span>';
    var items = [
      { href: ROOT + 'kurzy.html', label: 'Kurzy', active: (cf === 'kurzy.html' || cf === 'kurz.html'), ico: icoK },
      { href: ROOT + 'index.html', label: 'Databáze', active: isHome, ico: icoD },
      { href: ROOT + 'prispevky.html', label: 'Komunita', active: (cf === 'prispevky.html'), ico: icoC },
      { href: ROOT + 'kenji-ai.html', label: 'Kenji AI', active: (cf === 'kenji-ai.html'), ico: icoAI }
    ];
    var nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Hlavní navigace');
    nav.innerHTML = '<div class="bottom-nav-inner">' + items.map(function (it) {
      return '<a href="' + it.href + '" class="bnav-item' + (it.active ? ' active' : '') + '" aria-label="' + it.label + '" title="' + it.label + '"' + (it.active ? ' aria-current="page"' : '') + '>' + it.ico + '</a>';
    }).join('') + '</div>';
    document.body.appendChild(nav);
    document.body.classList.add('has-bottom-nav');
  }

  // Scroll: dolů → schovej hlavičku + zmenši lištu; nahoru → ukaž + zvětši.
  function initNavScroll() {
    var lastY = window.scrollY || 0, ticking = false;
    function apply() {
      var y = window.scrollY || 0;
      if (y > 80 && y > lastY + 4) document.body.classList.add('nav-hidden');
      else if (y < lastY - 4 || y < 60) document.body.classList.remove('nav-hidden');
      lastY = y; ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(apply); ticking = true; }
    }, { passive: true });
  }

  // --- Spustit ---
  renderBottomNav();
  initNavScroll();
  renderThemeToggle();
  document.addEventListener('kenji-auth-ready', renderThemeToggle); // auth.js přepíše header-actions → přidej zpět
  renderSidebar();
  renderSidebarSettings();
  initSwitchPill();
  renderHome();
  initArticleTracking();
  initActionChecklists();
  renderReadToggle();
  renderVideoLock();
  document.addEventListener('kenji-auth-ready', renderVideoLock); // po server-syncu tieru překreslí zámek
  renderPresetPromo();
  renderSiteFooter();
  renderCookieNotice();
  renderWinAnnouncement();
  // renderHelpButton(); // FAB nahrazen glass tlačítkem „Kenji AI" v postranním menu
  initSearch();

  // API pro auth.js (po server-syncu obnoví zaškrtnutí přečtených)
  window.KenjiNav = { refreshReadUI: refreshReadUI };
})();
