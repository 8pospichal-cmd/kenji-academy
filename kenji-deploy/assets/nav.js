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

  // --- Pomocníci ---
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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

    let html = `
      <div class="sidebar-section sidebar-switch">
        <span class="switch-pill" aria-hidden="true"></span>
        <a href="${ROOT}kurzy.html" class="switch-btn${section === 'kurzy' ? ' active' : ''}">${icoKurzy}<span class="sw-lbl">Kurzy</span></a>
        <a href="${ROOT}index.html" class="switch-btn${section === 'databaze' ? ' active' : ''}">${icoDatabaze}<span class="sw-lbl">Databáze</span></a>
        <a href="${ROOT}prispevky.html" class="switch-btn${section === 'prispevky' ? ' active' : ''}">${icoKomunita}<span class="sw-lbl">Komunita</span></a>
      </div>
      <a href="${ROOT}kenji-ai.html" class="sidebar-ai-btn${currentFile === 'kenji-ai.html' ? ' active' : ''}">
        <svg class="sai-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.5 4.2L17.7 8.7l-4.2 1.5L12 14.4l-1.5-4.2L6.3 8.7l4.2-1.5L12 3Z"/></svg>
        <span class="sai-txt"><strong>Kenji AI</strong> <span class="sai-beta">beta</span></span>
      </a>`;

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
        html += `
        <div class="sidebar-section">
          <div class="sidebar-label">Kurzy</div>
          <nav class="sidebar-nav">`;
        courses.forEach((c) => {
          html += `<a href="${ROOT}kurz.html?slug=${encodeURIComponent(c.slug)}" class="sidebar-link">
              <span class="icon">${c.icon}</span><span>${esc(c.title)}</span>
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
      const feedCats = [
        { id: '', label: 'Všechny příspěvky', emoji: '🗂' },
        { id: 'novinky', label: 'Novinky', emoji: '💎' },
        { id: 'slevy', label: 'Slevy', emoji: '🤑' },
        { id: 'dotazy', label: 'Dotazy', emoji: '❓' },
        { id: 'fotka-mesice', label: 'Fotka měsíce', emoji: '📸' },
        { id: 'predstav-se', label: 'Představ se', emoji: '👤' },
        { id: 'uspechy', label: 'Úspěchy', emoji: '🏆' },
        { id: 'second-shooting', label: 'Second shooting', emoji: '📷' }
      ];
      const activeFeedCat = new URLSearchParams(location.search).get('category') || '';
      html += `
        <div class="sidebar-section">
          <div class="sidebar-label">Kategorie</div>
          <nav class="sidebar-nav">`;
      feedCats.forEach((cat) => {
        const href = `${ROOT}prispevky.html${cat.id ? `?category=${encodeURIComponent(cat.id)}` : ''}`;
        html += `<a href="${href}" class="sidebar-link feed-category-link${cat.id === activeFeedCat ? ' active' : ''}" data-feed-cat="${cat.id}">
          <span class="icon">${cat.emoji}</span><span>${esc(cat.label)}</span><span class="feed-category-count" data-feed-count="${cat.id}"></span>
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
        <div class="sidebar-search">
          <span class="search-icon">🔍</span>
          <input type="text" id="kenji-search" class="search-input"
                 placeholder="Hledej článek…" autocomplete="off" aria-label="Hledat v databázi">
          <kbd class="search-kbd">/</kbd>
        </div>
        <div id="kenji-search-results" class="search-results" hidden></div>
        <div class="sidebar-label">Přehled</div>
        <nav class="sidebar-nav">
          <a href="${ROOT}index.html" class="sidebar-link${onHome ? ' active' : ''}">
            <span class="icon">🏠</span>
            <span>Hlavní stránka</span>
          </a>
          <a href="${ROOT}kviz.html" class="sidebar-link${(currentFile === 'kviz.html' || currentFile === 'odmena.html') ? ' active' : ''}">
            <span class="icon">🥋</span>
            <span>Kvíz &amp; odměna</span>
          </a>
          <a href="${ROOT}audit.html" class="sidebar-link${currentFile === 'audit.html' ? ' active' : ''}">
            <span class="icon">🔍</span>
            <span>Audit pro tvůrce</span>
          </a>
          <a href="${ROOT}hodinovka.html" class="sidebar-link${currentFile === 'hodinovka.html' ? ' active' : ''}">
            <span class="icon">🧮</span>
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
            <span class="icon">${cat.icon}</span>
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
            <span class="icon">${cat.icon}</span>
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
        box.innerHTML = `<div class="search-empty">Přesnou shodu pro „${esc(q.trim())}" nemáme.</div><a class="search-ai-fallback" href="${ROOT}kenji-ai.html?q=${encodeURIComponent(q.trim())}">Zeptat se Kenji AI →</a>`;
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
      toggleRead(slug);
      refreshReadUI();
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

  // --- Spustit ---
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
