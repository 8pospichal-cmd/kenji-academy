// ============================================
// KENJI KNIHOVNA — VSTUPNÍ GATE, LEADY A PROGRES (Supabase)
// ============================================
//
// CO TO DĚLÁ:
//  • Nikdo se nedostane na web zadarmo — nejdřív musí dát E-MAIL.
//    (rozmazané pozadí + modal: vlevo „co to je", vpravo formulář)
//  • Lead (e-mail) se uloží do Supabase (tabulka `users`). Instagram doplní v profilu.
//  • PROGRES (přečtené články + kvíz + odměna) se ukládá pod e-mail na server,
//    takže se uživateli načte i na jiném zařízení, když zadá ten samý e-mail.
//  • Po vstupu má FREE přístup; PREMIUM (Knihovna 1 497 / Academy) řeší paywall.
//
// ►► SPUŠTĚNÍ OSTRÉ VERZE (Supabase):
//    1) Vlož supabaseUrl + supabaseAnonKey do CONFIG níž.
//    2) V Supabase spusť SQL z /SUPABASE_SETUP.md (tabulka + 2 funkce).
//    Bez klíčů běží „lokální režim" — gate i progres fungují, jen se nic neukládá
//    na server (data zůstanou v prohlížeči). Design je tím pádem vidět hned.
// ============================================

(function () {
  'use strict';

  // ---------------- CONFIG ----------------
  const CONFIG = {
    supabaseUrl: 'https://qswhajynwsgnitoufgwc.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzd2hhanlud3Nnbml0b3VmZ3djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjExOTYsImV4cCI6MjA5NTgzNzE5Nn0.86PC6YrCy8mjOL4jqizDsgfwkv9ZXq7Qujmgj5zIDjc',
    academyName: 'Kenji Academy',
    privacyUrl: 'zasady-ochrany-udaju.html'
  };

  // Stránky přístupné BEZ přihlášení (gate je nezamkne) — ať si lze přečíst Zásady před souhlasem
  const PUBLIC_PAGES = ['zasady-ochrany-udaju.html', 'obchodni-podminky.html', 'cookies.html', '404.html'];

  const isLive = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

  const articles = window.KENJI_ARTICLES || [];
  const freeSlugs = window.KENJI_FREE_SLUGS || [];
  const inArticle = /\/clanky\//.test(location.pathname);
  const ROOT = inArticle ? '../' : '';
  const currentFile = location.pathname.split('/').pop() || 'index.html';

  const READ_KEY = 'kenji_read_v1';
  const QUIZ_KEY = 'kenji_quiz_v1';
  const USER_KEY = 'kenji_user'; // { email, instagram, tier }
  const ANON_KEY = 'kenji_anon_id_v1';

  // ---------------- STAV ----------------
  let user = loadUser();

  // DEV BYPASS: na localhostu jsi vždycky přihlášený admin/člen — žádná brána,
  // vidíš všechno (kurzy, feed, admin rubriky). V produkci (Netlify) NEPLATÍ.
  const IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /\.local$/.test(location.hostname);
  if (IS_LOCAL) {
    user = { email: '8pospichal@gmail.com', instagram: 'kenjiacademy', tier: 'academy' }; // admin dev účet (jen lokálně, neukládá se)
  }

  // Lokální náhled value-first vstupu. V produkci query parametr přihlášení nikdy nemění.
  if (IS_LOCAL) {
    var forceGuest = /[?&]guest=1/.test(location.search);
    var freshStart = /[?&]start=1/.test(location.search) && !(function () { try { return localStorage.getItem('kenji_onboarding_done_v2'); } catch (e) { return ''; } })();
    if (forceGuest || freshStart) user = null;
  }

  // Dev náhled placeného obsahu: ?tier=academy / ?tier=knihovna / ?tier=free
  // BEZPEČNOST: platí VÝHRADNĚ na localhostu. V produkci se query parametr ignoruje,
  // aby si nikdo nemohl přes URL sám odemknout placený obsah.
  const DEV_TIER = IS_LOCAL ? ((location.search.match(/[?&]tier=(free|knihovna|academy)/) || [])[1] || null) : null;
  (function devTierOverride() {
    if (DEV_TIER && user) { user.tier = DEV_TIER; saveUser(user); }
  })();

  function loadUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch (e) { return null; } }
  function saveUser(u) { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch (e) {} }
  function updateUserProfile(fields) {
    if (!user) return;
    user = Object.assign({}, user, fields || {});
    saveUser(user);
    renderHeaderUI();
  }

  const isLoggedIn = () => !!(user && user.email);
  const currentTier = () => (user && ['free', 'knihovna', 'academy'].includes(user.tier)) ? user.tier : 'free';
  const CAPABILITIES = {
    fullDatabase: ['knihovna', 'academy'],
    quiz: ['free', 'knihovna', 'academy'],
    reward: ['free', 'knihovna', 'academy'],
    audit: ['free', 'knihovna', 'academy'],
    dashboard: ['free', 'knihovna', 'academy'],
    communityFree: ['free', 'knihovna', 'academy'],
    communityPremium: ['academy'],
    courses: ['academy'],
    ai: ['free', 'knihovna', 'academy']
  };
  const can = (capability) => isLoggedIn() && !!(CAPABILITIES[capability] || []).includes(currentTier());
  const isMember = () => can('fullDatabase');
  const isAcademy = () => can('courses');

  // ---------------- POMOCNÍCI ----------------
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function normEmail(s) { return String(s || '').trim().toLowerCase(); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function normIg(s) { return String(s || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase(); }
  function articleForCurrentPage() { return inArticle ? (articles.find((a) => (a.url || '').split('/').pop() === currentFile) || null) : null; }
  function isFreeSlug(slug) { return freeSlugs.includes(slug); }
  function isPremiumArticle(a) { return a && !isFreeSlug(a.slug); }

  function anonymousId() {
    try {
      let value = localStorage.getItem(ANON_KEY);
      if (!value) {
        value = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'anon-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        localStorage.setItem(ANON_KEY, value);
      }
      return value;
    } catch (e) { return ''; }
  }

  async function trackEvent(eventName, source, properties, claimedEmail) {
    if (!isLive || IS_LOCAL) return null;
    try {
      const sb = await getSupabase();
      if (!sb) return null;
      const result = await sb.rpc('track_event', {
        p_event_name: eventName,
        p_source: source || currentFile,
        p_properties: properties || {},
        p_anonymous_id: anonymousId(),
        p_claimed_email: claimedEmail || null
      });
      if (result.error) throw result.error;
      return result.data;
    } catch (e) {
      console.warn('analytics event', e);
      return null;
    }
  }

  async function recordTool(tool, result, claimedEmail) {
    if (!isLive || IS_LOCAL) return null;
    try {
      const sb = await getSupabase();
      if (!sb) return null;
      const response = await sb.rpc('record_tool_submission', {
        p_tool: tool,
        p_result: result || {},
        p_anonymous_id: anonymousId(),
        p_claimed_email: claimedEmail || null
      });
      if (response.error) throw response.error;
      return response.data;
    } catch (e) {
      console.warn('tool analytics', e);
      return null;
    }
  }

  // ---------------- SUPABASE (lazy) ----------------
  let _sb = null;
  async function getSupabase() {
    if (!isLive) return null;
    if (_sb) return _sb;
    if (!window.supabase) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    _sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    return _sb;
  }

  // register_lead → upsert leadu + vrátí progres ze serveru
  async function registerLead(email, ig) {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.rpc('register_lead', { p_email: email, p_instagram: ig });
    if (error) { console.warn('register_lead', error); return null; }
    return Array.isArray(data) ? data[0] : data; // { tier, read, quiz }
  }
  // save_progress → uloží finální (zmergovaný) stav
  async function saveProgressRemote(email, read, quiz) {
    const sb = await getSupabase();
    if (!sb) return;
    const { error } = await sb.rpc('save_progress', { p_email: email, p_read: read, p_quiz: quiz });
    if (error) console.warn('save_progress', error);
  }

  // ---------------- PŘIHLÁŠENÍ E-MAILEM (Supabase Auth — magic link) ----------------
  // Pošle na e-mail přihlašovací odkaz. Po kliknutí se uživatel vrátí s tokeny
  // v URL, Supabase je zpracuje a naběhne session (viz getInitialSession).
  // Funguje s jakýmkoli providerem (Seznam, Gmail, Centrum…) a ověří vlastnictví e-mailu.
  async function sendMagicLink(email) {
    const sb = await getSupabase();
    if (!sb) return { ok: false, err: 'offline' };
    const { error } = await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true }
    });
    if (error) { console.warn('magic link', error); return { ok: false, err: error.message }; }
    return { ok: true };
  }

  // Počká na první auth stav (session ze storage nebo z URL po návratu z odkazu).
  function getInitialSession(sb) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (session) => { if (done) return; done = true; try { sub.subscription.unsubscribe(); } catch (e) {} resolve(session || null); };
      const { data: sub } = sb.auth.onAuthStateChange((_e, session) => { if (session) finish(session); });
      sb.auth.getSession().then(({ data }) => { if (data && data.session) finish(data.session); });
      setTimeout(() => finish(null), 4000);
    });
  }

  // Máme ověřenou session (magic link) → upsert leadu, načteme tier/progres z DB,
  // uložíme uživatele. Tier přišel do `users` z Stripe webhooku podle e-mailu.
  async function adoptSession(session) {
    const vEmail = normEmail(session.user && session.user.email);
    if (!validEmail(vEmail)) return false;
    const meta = (session.user && session.user.user_metadata) || {};
    const name = meta.full_name || meta.name || '';
    const prevIg = (user && user.instagram) || '';
    const server = await registerLead(vEmail, prevIg || null);
    let tier = 'free';
    if (server) {
      tier = server.tier || 'free';
      const merged = mergeProgress({ read: getLocalRead(), quiz: getLocalQuiz() }, { read: server.read, quiz: server.quiz });
      setLocalRead(merged.read); setLocalQuiz(merged.quiz);
    }
    saveUser({ email: vEmail, instagram: prevIg, tier: tier, auth: 'email', name: name });
    user = loadUser();
    return true;
  }

  // ---------------- PROGRES (local ⇄ server) ----------------
  function getLocalRead() { try { return JSON.parse(localStorage.getItem(READ_KEY)) || []; } catch (e) { return []; } }
  function getLocalQuiz() { try { return JSON.parse(localStorage.getItem(QUIZ_KEY)) || {}; } catch (e) { return {}; } }
  function setLocalRead(r) { try { localStorage.setItem(READ_KEY, JSON.stringify(r)); } catch (e) {} }
  function setLocalQuiz(q) { try { localStorage.setItem(QUIZ_KEY, JSON.stringify(q)); } catch (e) {} }

  function mergeProgress(local, server) {
    server = server || {};
    const lr = local.read || [], sr = server.read || [];
    const read = Array.from(new Set([].concat(lr, sr)));
    const lq = local.quiz || {}, sq = server.quiz || {};
    const passed = Array.from(new Set([].concat(lq.passed || [], sq.passed || [])));
    const best = Object.assign({}, sq.best || {});
    Object.keys(lq.best || {}).forEach((k) => { best[k] = Math.max(best[k] || 0, lq.best[k]); });
    const quiz = { passed: passed, best: best, name: lq.name || sq.name || '' };
    return { read: read, quiz: quiz };
  }

  // Stáhne progres ze serveru, zmerguje s lokálním, zapíše do localStorage i zpět na server
  async function syncOnLoad() {
    if (!isLive || !isLoggedIn()) return;
    const server = await registerLead(user.email, user.instagram); // vrací i progres
    if (!server) return;
    // Placený tier přijmeme jen u ověřené magic-link session (user.auth === 'email').
    // Neověřený lead zůstává 'free', i kdyby server pro e-mail vrátil vyšší tier.
    if (!DEV_TIER && user.auth === 'email' && server.tier && server.tier !== user.tier) { user.tier = server.tier; saveUser(user); renderHeaderUI(); applyGating(); markHomepagePlan(); try { document.dispatchEvent(new Event('kenji-auth-ready')); } catch (e) {} }
    const merged = mergeProgress({ read: getLocalRead(), quiz: getLocalQuiz() }, { read: server.read, quiz: server.quiz });
    setLocalRead(merged.read); setLocalQuiz(merged.quiz);
    if (window.KenjiNav && window.KenjiNav.refreshReadUI) window.KenjiNav.refreshReadUI();
    saveProgressRemote(user.email, merged.read, merged.quiz);
  }

  // Veřejné API pro nav.js / kvíz / odměnu — pošle aktuální progres na server (debounce)
  let _pushTimer = null;
  window.KenjiProgress = {
    push: function () {
      if (!isLive || !isLoggedIn()) return;
      clearTimeout(_pushTimer);
      _pushTimer = setTimeout(function () {
        saveProgressRemote(user.email, getLocalRead(), getLocalQuiz());
      }, 800);
    }
  };

  // ===================================================
  //  VSTUPNÍ GATE (e-mail)
  // ===================================================
  function showGate(mode) {
    const saveplan = mode === 'saveplan';
    document.body.classList.add('kenji-gated');
    if (document.getElementById('kenji-gate')) return;

    const wrap = document.createElement('div');
    wrap.className = 'kenji-gate' + (saveplan ? ' kg-saveplan' : '');
    wrap.id = 'kenji-gate';
    wrap.innerHTML = `
      <div class="kg-modal">
        <div class="kg-intro">
          <div class="kg-logo">KENJI ACADEMY</div>
          <h2>Tohle najdeš v Kenji Academy</h2>
          <p>Přihlašuješ se e-mailem přes odkaz — bez hesla. Část obsahu máš hned zdarma, zbytek odemkneš, až budeš chtít.</p>
          <ul class="kg-features">
            <li><strong>Videokurzy</strong><span>5 ucelených kurzů a 20+ hodin praxe od techniky po byznys.</span></li>
            <li><strong>Databáze článků</strong><span>75+ návodů na focení, cenotvorbu, marketing i právo.</span></li>
            <li><strong>Kenji AI</strong><span>Asistent, co ti poradí s konkrétní zakázkou 24/7.</span></li>
            <li><strong>Komunita tvůrců</strong><span>Sdílej práci, ptej se a inspiruj se od ostatních.</span></li>
            <li><strong>Živé webináře</strong><span>Rozbory a Q&amp;A na témata, co tě reálně pálí.</span></li>
            <li><strong>90denní výzva</strong><span>Jasný plán a akční kroky, ne jen sledování videí.</span></li>
            <li><strong>Foto feedback</strong><span>Nahraj práci a dostaneš konkrétní tipy na zlepšení.</span></li>
            <li><strong>Podpora</strong><span>Nezůstaneš na to sám — poradí Kenji i celá komunita.</span></li>
          </ul>
        </div>
        <div class="kg-form">
          <div class="kg-pane" id="kg-pane-lead">
            <div class="kg-form-head">Vstup do Kenji Academy</div>
            <p class="kg-form-sub">Zadej e-mail — pošleme ti přihlašovací odkaz. Klikneš a jsi uvnitř. Bez hesla, jeden krok.</p>
            <label class="kg-label" for="kg-email">E-mail</label>
            <input class="kg-input" id="kg-email" type="email" placeholder="tvuj@email.cz" autocomplete="email">
            <label class="kg-consent"><input type="checkbox" id="kg-consent"> <span>Souhlasím se zpracováním e-mailu pro vytvoření a správu profilu. <a href="${ROOT}${escapeHtml(CONFIG.privacyUrl)}" target="_blank" rel="noopener">Zásady</a></span></label>
            <button class="kg-btn" id="kg-submit">Poslat přihlašovací odkaz →</button>
            <div class="kg-error" id="kg-error" hidden></div>
            <div class="kg-sent" id="kg-sent" hidden>
              <div class="kg-sent-ico">📩</div>
              <p>Poslali jsme odkaz na <strong id="kg-sent-email"></strong>. Otevři e-mail a klikni na tlačítko — pak už budeš uvnitř. (Zkontroluj i spam.)</p>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const emailEl = document.getElementById('kg-email');
    const consentEl = document.getElementById('kg-consent');
    const errEl = document.getElementById('kg-error');
    const btn = document.getElementById('kg-submit');

    function err(msg) { errEl.textContent = msg; errEl.hidden = false; }

    const sentEl = document.getElementById('kg-sent');

    async function submit() {
      const email = normEmail(emailEl.value);
      if (!validEmail(email)) { err('Zadej platný e-mail.'); emailEl.focus(); return; }
      if (!consentEl.checked) { err('Potřebujeme tvůj souhlas se zpracováním.'); return; }
      errEl.hidden = true;
      btn.disabled = true; btn.textContent = 'Posílám…';

      // Localhost (vývoj): magic link nefunguje → okamžitý vstup jako free, ať jde testovat.
      if (!isLive || IS_LOCAL) {
        saveUser({ email: email, instagram: '', tier: 'free' });
        location.reload();
        return;
      }

      // Produkce: jediná cesta dovnitř je ověřený odkaz (magic link).
      const res = await sendMagicLink(email);
      if (res.ok) {
        document.getElementById('kg-sent-email').textContent = email;
        emailEl.style.display = 'none';
        consentEl.closest('.kg-consent').style.display = 'none';
        btn.style.display = 'none';
        var lbl = document.querySelector('#kg-pane-lead .kg-label'); if (lbl) lbl.style.display = 'none';
        sentEl.hidden = false;
      } else {
        btn.disabled = false; btn.textContent = 'Poslat přihlašovací odkaz →';
        err('E-mail s odkazem se teď nepovedlo odeslat. Zkus to prosím za chvíli.');
      }
    }

    btn.addEventListener('click', submit);
    document.getElementById('kg-pane-lead').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    // Vypršelý/neplatný odkaz → vysvětli a nech poslat nový.
    if (authLinkError) {
      err('Přihlašovací odkaz vypršel nebo už byl použitý. Pošli si prosím nový.');
    } else {
      setTimeout(function () { emailEl.focus(); }, 50);
    }
  }

  function revealSite() { document.body.classList.remove('kenji-gated'); }

  // ===================================================
  //  „PŘIDAT NA PLOCHU" — mini návod (iPhone / Android)
  // ===================================================
  function showAddToHome() {
    if (document.getElementById('kenji-a2hs')) return;
    const ua = navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let os = isIOS ? 'ios' : 'android';

    const share = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>';
    const dots = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    const plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

    const steps = {
      ios: [
        { ic: share, t: 'V <strong>Safari</strong> klepni dole na ikonu <strong>Sdílet</strong> (čtvereček se šipkou nahoru).' },
        { ic: plus, t: 'Sjeď v nabídce dolů a vyber <strong>„Přidat na plochu"</strong>.' },
        { ic: '🏠', t: 'Klepni na <strong>Přidat</strong> — databáze se objeví na ploše jako appka.' }
      ],
      android: [
        { ic: dots, t: 'V <strong>Chromu</strong> klepni vpravo nahoře na <strong>⋮</strong> (tři tečky).' },
        { ic: plus, t: 'Vyber <strong>„Přidat na plochu"</strong> (nebo „Instalovat aplikaci").' },
        { ic: '🏠', t: 'Potvrď <strong>Přidat</strong> — ikona se objeví na ploše.' }
      ]
    };

    const ov = document.createElement('div');
    ov.className = 'kenji-a2hs'; ov.id = 'kenji-a2hs';
    function stepsHtml() {
      return steps[os].map(function (s, i) {
        return '<div class="a2-step"><span class="a2-num">' + (i + 1) + '</span>' +
               '<span class="a2-ic">' + s.ic + '</span><span class="a2-txt">' + s.t + '</span></div>';
      }).join('');
    }
    function render() {
      ov.innerHTML =
        '<div class="a2-card">' +
          '<button class="a2-close" id="a2-close" aria-label="Zavřít">✕</button>' +
          '<div class="a2-emoji">📲</div>' +
          '<h2 class="a2-title">Měj databázi po ruce</h2>' +
          '<p class="a2-sub">Přidej si ji na plochu telefonu jako appku — pak ji otevřeš jedním klepnutím, bez hledání v prohlížeči.</p>' +
          '<div class="a2-tabs">' +
            '<button class="a2-tab' + (os === 'ios' ? ' on' : '') + '" data-os="ios">iPhone</button>' +
            '<button class="a2-tab' + (os === 'android' ? ' on' : '') + '" data-os="android">Android</button>' +
          '</div>' +
          '<div class="a2-steps">' + stepsHtml() + '</div>' +
        '</div>';
      ov.querySelector('#a2-close').onclick = function () { ov.remove(); };
      ov.querySelectorAll('.a2-tab').forEach(function (b) {
        b.onclick = function () { os = b.getAttribute('data-os'); render(); };
      });
    }
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    render();
  }

  // ===================================================
  //  „TVŮJ START" — gamifikovaný onboarding panel (homepage)
  // ===================================================
  function taskDone(key) {
    try {
      if (key === 'profile') return localStorage.getItem('kenji_task_profile') === '1';
      if (key === 'read') return getLocalRead().length >= 1;
      if (key === 'quiz') { var q = getLocalQuiz(); return !!(q && q.passed && q.passed.length >= 1); }
      if (key === 'ai') {
        var a = JSON.parse(localStorage.getItem('kenji_ai_v1') || '{}');
        return !!(a.convos && a.convos.some(function (c) { return c.msgs && c.msgs.some(function (m) { return m.role === 'user'; }); }));
      }
      if (key === 'hodinovka') return !!localStorage.getItem('kenji_hodinovka_v1');
    } catch (e) {}
    return false;
  }
  function renderStartPanel() {
    var onHome = currentFile === 'index.html' || currentFile === '';
    if (!onHome || !isLoggedIn()) return;
    // Osobní kouč (#dash-modules) nahrazuje onboarding panel na homepage.
    if (document.getElementById('dash-modules')) return;
    try { if (localStorage.getItem('kenji_start_hidden') === '1') return; } catch (e) {}
    var inner = document.querySelector('.main-inner');
    if (!inner || document.getElementById('kenji-start')) return;

    var tasks = [
      { key: 'profile',   ico: '🎯', title: 'Nastav si profil',        sub: 'Fotka a pár slov o sobě',  href: ROOT + 'nastaveni.html' },
      { key: 'read',      ico: '📖', title: 'Přečti si první článek',   sub: 'Ochutnej, jak to píšeme',  href: ROOT + 'clanky/expozice.html' },
      { key: 'quiz',      ico: '🥋', title: 'Získej bílý pásek v kvízu', sub: 'Otestuj, co už umíš',     href: ROOT + 'kviz.html' },
      { key: 'ai',        ico: '✦', title: 'Zeptej se Kenji AI',        sub: 'Máš ho zdarma, 24/7',      href: ROOT + 'kenji-ai.html' },
      { key: 'hodinovka', ico: '🧮', title: 'Spočítej si hodinovku',    sub: 'Kolik si máš reálně říct', href: ROOT + 'hodinovka.html' }
    ];
    var doneKeys = tasks.filter(function (t) { return taskDone(t.key); }).map(function (t) { return t.key; });
    var doneCount = doneKeys.length;
    var total = tasks.length;
    var pct = Math.round((doneCount / total) * 100);
    var allDone = doneCount === total;
    var academy = isAcademy();
    var database = can('fullDatabase');
    var name = (user && (user.name || user.instagram)) ? (user.name || '@' + user.instagram) : '';

    // snímek pro živé animace nově splněných úkolů + naplnění progress baru
    var prev = []; try { prev = JSON.parse(localStorage.getItem('kenji_start_snap') || '[]'); } catch (e) {}
    var prevPct = Math.round((Math.min(prev.length, total) / total) * 100);
    var newly = doneKeys.filter(function (k) { return prev.indexOf(k) < 0; });
    var justAll = allDone && prev.length < total;
    try { localStorage.setItem('kenji_start_snap', JSON.stringify(doneKeys)); } catch (e) {}

    var rows = tasks.map(function (t, i) {
      var d = taskDone(t.key);
      var fresh = newly.indexOf(t.key) >= 0;
      return '<a class="sp-task' + (d ? ' done' : '') + (fresh ? ' just-done' : '') + '" href="' + t.href + '" style="animation-delay:' + (i * 0.05).toFixed(2) + 's">' +
        '<span class="sp-check">' + (d ? '✓' : '') + '</span>' +
        '<span class="sp-ico">' + t.ico + '</span>' +
        '<span class="sp-tt"><span class="sp-t-title">' + t.title + '</span><span class="sp-t-sub">' + t.sub + '</span></span>' +
        '<span class="sp-arr">' + (d ? '' : '→') + '</span></a>';
    }).join('');

    // finální krok = konverze (odemčení)
    var unlock = academy
      ? '<div class="sp-final done"><span class="sp-check">✓</span><span class="sp-ico">🔓</span><span class="sp-tt"><span class="sp-t-title">Máš celou Academy</span><span class="sp-t-sub">Databáze, kurzy i prémiová komunita</span></span></div>'
      : '<a class="sp-final' + (allDone ? ' hot' : '') + '" href="' + ROOT + 'pristup.html"><span class="sp-check">🔓</span><span class="sp-ico"></span><span class="sp-tt"><span class="sp-t-title">' + (database ? 'Odemkni Kenji Academy' : (allDone ? 'Jsi připravený růst naplno.' : 'Odemkni plný přístup')) + '</span><span class="sp-t-sub">' + (database ? 'Videokurzy a prémiová komunita' : (allDone ? 'Odemkni celou databázi i kurzy →' : 'Celá databáze, kurzy a prémiová komunita')) + '</span></span><span class="sp-arr">→</span></a>';

    var strategy = allDone
      ? (academy ? 'Jsi v obraze. Teď už jen makat. 💪' : 'Ochutnal jsi, co tu je. Teď se rozhodni, jak daleko to chceš dotáhnout.')
      : 'Tvůj plán: ochutnej obsah → otestuj se → rozhodni se, jak daleko to dotáhneš.';
    var reward = allDone ? '<span class="sp-badge">🥋 Onboarding hotový</span>' : '';

    var panel = document.createElement('div');
    panel.className = 'start-panel';
    panel.id = 'kenji-start';
    panel.innerHTML =
      '<button class="sp-close" id="sp-close" title="Skrýt" aria-label="Skrýt">✕</button>' +
      '<div class="sp-hi">👋 Vítej' + (name ? ', ' + escapeHtml(name) : '') + '! ' + reward + '</div>' +
      '<div class="sp-strategy">' + strategy + '</div>' +
      '<div class="sp-progress"><div class="sp-bar" style="width:' + prevPct + '%"></div></div>' +
      '<div class="sp-count"><span class="sp-count-n">' + doneCount + '</span> / ' + total + ' splněno' + (allDone ? ' 🎉' : '') + '</div>' +
      '<div class="sp-tasks">' + rows + '</div>' +
      unlock;
    inner.insertBefore(panel, inner.firstElementChild);

    // progress bar se sám naplní z minula na aktuální hodnotu
    var bar = panel.querySelector('.sp-bar');
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (bar) bar.style.width = pct + '%'; }); });
    // oslava při prvním dokončení všeho
    if (justAll) setTimeout(function () { spConfetti(panel); }, 450);

    var close = document.getElementById('sp-close');
    if (close) close.addEventListener('click', function () {
      try { localStorage.setItem('kenji_start_hidden', '1'); } catch (e) {}
      panel.style.opacity = '0'; panel.style.transform = 'translateY(-8px)';
      setTimeout(function () { panel.remove(); }, 250);
    });
  }
  function spConfetti(anchor) {
    // konfety na body s fixed pozicí u horní hrany panelu → nic je neořízne
    var r = anchor.getBoundingClientRect();
    var colors = ['#ff9a3d', '#ff6b1a', '#ffd23f', '#4ec17f', '#ffffff', '#ff5e5e'];
    for (var i = 0; i < 46; i++) {
      var d = document.createElement('i');
      d.className = 'sp-conf';
      d.style.position = 'fixed';
      d.style.left = (r.left + r.width * (0.12 + Math.random() * 0.76)) + 'px';
      d.style.top = (r.top + 26) + 'px';
      d.style.background = colors[i % colors.length];
      d.style.setProperty('--dx', (Math.random() * 320 - 160) + 'px');
      d.style.setProperty('--dy', (180 + Math.random() * 260) + 'px');
      d.style.setProperty('--rot', (Math.random() * 900 - 450) + 'deg');
      d.style.animationDelay = (Math.random() * 0.2).toFixed(2) + 's';
      document.body.appendChild(d);
      (function (el) { setTimeout(function () { el.remove(); }, 2900); })(d);
    }
  }

  // ===================================================
  //  HLAVIČKA (přihlášený uživatel)
  // ===================================================
  // Náhled vlastního profilu (jak tě zhruba vidí komunita). Úpravy v nastavení.
  function openSelfProfile() {
    if (document.querySelector('.selfp-modal')) return;
    let pc = {}; try { pc = JSON.parse(localStorage.getItem('kenji_profile_v1') || '{}') || {}; } catch (e) {}
    let xp = 0; try { const x = JSON.parse(localStorage.getItem('kenji_xp_v1') || '{}'); if (x && typeof x.xp === 'number') xp = x.xp; } catch (e) {}
    const level = Math.floor(xp / 100) + 1;
    const ig = String(pc.instagram || (user && user.instagram) || '').replace(/^@+/, '');
    const name = String(pc.displayName || '').trim() || (ig ? '@' + ig : String((user && user.email) || '').split('@')[0]) || 'Tvůj profil';
    const avatar = String(pc.avatar || '').trim();
    const bio = String(pc.bio || '').trim();
    const tierLabel = currentTier() === 'academy' ? 'ACADEMY' : (currentTier() === 'knihovna' ? 'DATABÁZE' : 'FREE');
    const tierClass = currentTier() === 'free' ? 'free' : 'member';
    const initial = escapeHtml((name || '?').charAt(0).toUpperCase());
    const av = avatar
      ? `<span class="selfp-av has-image"><img src="${escapeHtml(avatar)}" alt="" onerror="this.parentNode.classList.remove('has-image');this.remove()"><b>${initial}</b></span>`
      : `<span class="selfp-av">${initial}</span>`;
    const ov = document.createElement('div');
    ov.className = 'selfp-modal';
    ov.innerHTML =
      `<div class="selfp-card" role="dialog" aria-modal="true" aria-label="Můj profil">
        <button class="selfp-close" type="button" aria-label="Zavřít">✕</button>
        ${av}
        <h3 class="selfp-name">${escapeHtml(name)}</h3>
        ${ig ? `<a class="selfp-ig" href="https://instagram.com/${escapeHtml(ig)}" target="_blank" rel="noopener">@${escapeHtml(ig)}</a>` : ''}
        <span class="auth-badge ${tierClass} selfp-badge">${tierLabel}</span>
        ${bio ? `<p class="selfp-bio">${escapeHtml(bio)}</p>` : `<p class="selfp-bio selfp-bio-empty">Zatím bez popisku — doplň pár slov o sobě v nastavení.</p>`}
        <div class="selfp-stats">
          <div class="selfp-stat"><strong>${xp}</strong><span>KP</span></div>
          <div class="selfp-stat"><strong>${level}</strong><span>Level</span></div>
        </div>
        <a class="selfp-edit" href="${ROOT}nastaveni.html">Upravit profil →</a>
      </div>`;
    document.body.appendChild(ov);
    document.body.classList.add('selfp-modal-open');
    requestAnimationFrame(function () { ov.classList.add('show'); });
    function close() {
      ov.classList.remove('show');
      document.body.classList.remove('selfp-modal-open');
      setTimeout(function () { if (ov.parentNode) ov.remove(); }, 200);
    }
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.closest('.selfp-close')) close(); });
    document.addEventListener('keydown', function esc3(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc3); } });
  }

  function renderHeaderUI() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    if (!isLoggedIn()) { actions.innerHTML = `<span class="header-tag">EXCLUSIVE • MEMBERS ONLY</span>`; return; }
    const tierLabel = currentTier() === 'academy' ? 'ACADEMY' : (currentTier() === 'knihovna' ? 'DATABÁZE' : 'FREE');
    const tierClass = currentTier() === 'free' ? 'free' : 'member';
    const tierSub = currentTier() === 'academy' ? 'Plný přístup' : (currentTier() === 'knihovna' ? 'Celá databáze' : 'Free přístup');
    const handle = user.instagram ? '@' + user.instagram : user.email;
    actions.innerHTML = `
      <div class="auth-acct">
        <button class="acct-trigger" id="kenji-acct" aria-haspopup="true" aria-expanded="false" aria-label="Účet">
          <svg class="acct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/></svg>
          <span class="acct-caret" aria-hidden="true">▾</span>
        </button>
        <div class="acct-menu" id="kenji-acct-menu" role="menu">
          <div class="acct-head">
            <button class="acct-name-btn" id="kenji-profile" type="button" title="Zobrazit můj profil">
              <span class="acct-name">${escapeHtml(handle)}</span>
              <span class="acct-name-hint">Můj profil ›</span>
            </button>
            <button class="acct-tier acct-tier-btn" id="kenji-membership" type="button" title="Zobrazit členství">
              <span class="auth-badge ${tierClass}">${tierLabel}</span><span class="acct-sub">${tierSub}</span>
            </button>
          </div>
          <a class="acct-item" id="kenji-settings" href="${ROOT}nastaveni.html" role="menuitem"><span>⚙️</span> Nastavení</a>
          <button class="acct-item" id="kenji-theme" role="menuitem"><span id="kenji-theme-ico">🌙</span> <span id="kenji-theme-lbl">Tmavý režim</span></button>
          <button class="acct-item" id="kenji-pwa" role="menuitem"><span>📲</span> Přidat na plochu</button>
          <button class="acct-item danger" id="kenji-logout" role="menuitem"><span>⎋</span> Odhlásit se</button>
        </div>
      </div>`;
    const acct = document.getElementById('kenji-acct');
    const menu = document.getElementById('kenji-acct-menu');
    const wrap = actions.querySelector('.auth-acct');
    function closeMenu() { menu.classList.remove('open'); acct.setAttribute('aria-expanded', 'false'); }
    acct.addEventListener('click', function (e) {
      e.stopPropagation();
      const open = menu.classList.toggle('open');
      acct.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) { if (wrap && !wrap.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    const pwa = document.getElementById('kenji-pwa');
    if (pwa) pwa.addEventListener('click', function () { closeMenu(); showAddToHome(); });
    const out = document.getElementById('kenji-logout');
    if (out) out.addEventListener('click', function () { doLogout(); });
    // Jméno → náhled vlastního profilu; badge → přehled členství.
    const profBtn = document.getElementById('kenji-profile');
    if (profBtn) profBtn.addEventListener('click', function () { closeMenu(); openSelfProfile(); });
    const memBtn = document.getElementById('kenji-membership');
    if (memBtn) memBtn.addEventListener('click', function () {
      closeMenu();
      if (window.KenjiUpgrade && window.KenjiUpgrade.open) window.KenjiUpgrade.open();
      else location.href = ROOT + 'academy.html';
    });
    // Přepínač světlého/tmavého režimu — schovaný v profilovém menu (není to častá akce).
    const themeBtn = document.getElementById('kenji-theme');
    if (themeBtn) {
      const isLight = () => document.documentElement.getAttribute('data-theme') === 'light';
      const paintTheme = () => {
        const light = isLight();
        const ico = document.getElementById('kenji-theme-ico');
        const lbl = document.getElementById('kenji-theme-lbl');
        // Popisek = akce po kliknutí (přepnout na opačný režim).
        if (ico) ico.textContent = light ? '🌙' : '☀️';
        if (lbl) lbl.textContent = light ? 'Tmavý režim' : 'Světlý režim';
      };
      paintTheme();
      themeBtn.addEventListener('click', function () {
        const next = isLight() ? 'dark' : 'light';
        if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('kenji_theme', next); } catch (e) {}
        paintTheme();
      });
    }
  }

  // ===================================================
  //  PAYWALL (oprávnění podle konkrétní funkce)
  // ===================================================
  function applyGating() {
    markFeatureLocks();
    gateLockedFeaturePage();
    if (!can('fullDatabase')) {
      markHomepageLocks();
      gateArticlePage();
    }
  }

  // Na úvodní stránce označí kartu členství podle reálného tieru uživatele.
  // Běží pro VŠECHNY (i členy), proto je mimo applyGating.
  function markHomepagePlan() {
    const onHome = currentFile === 'index.html' || currentFile === '' || currentFile === 'pristup.html';
    if (!onHome) return;
    const grid = document.querySelector('.access-grid');
    if (!grid) return;
    const rankOf = { free: 0, knihovna: 1, academy: 2 };
    let userRank = rankOf[(user && user.tier) || 'free'];
    if (userRank == null) userRank = 0;
    const cards = [
      { sel: '.access-card.free', rank: 0 },
      { sel: '.access-card.featured', rank: 1 },
      { sel: '.access-card.academy', rank: 2 }
    ];
    cards.forEach((def) => {
      const card = grid.querySelector(def.sel);
      if (!card) return;
      card.classList.remove('is-current', 'is-owned');
      const inj = card.querySelector('.access-current.js-plan'); if (inj) inj.remove();
      const buyCta = card.querySelector('a.access-cta');
      const hardBadge = card.querySelector('.access-cta.access-current:not(.js-plan)'); // jen FREE má natvrdo
      const urg = card.querySelector('.access-urgency');
      const tag = card.querySelector('.access-tag');
      const setBadge = (text) => {
        if (hardBadge) { hardBadge.style.display = ''; hardBadge.textContent = text; }
        else { const b = document.createElement('div'); b.className = 'access-cta access-current js-plan'; b.textContent = text; card.appendChild(b); }
      };
      if (def.rank === userRank) {
        card.classList.add('is-current');
        if (buyCta) buyCta.style.display = 'none';
        if (urg) urg.style.display = 'none';
        if (tag) tag.style.display = 'none';
        setBadge('✓ Tvůj aktuální plán');
      } else if (def.rank < userRank) {
        card.classList.add('is-owned');
        if (buyCta) buyCta.style.display = 'none';
        if (urg) urg.style.display = 'none';
        if (tag) tag.style.display = 'none';
        setBadge('✓ Součástí tvého plánu');
      } else {
        if (buyCta) buyCta.style.display = '';
        if (hardBadge) hardBadge.style.display = 'none';
        if (urg) urg.style.display = '';
        if (tag) tag.style.display = '';
      }
    });
  }
  function isLockedFeaturePage() {
    return (currentFile === 'kviz.html' && !can('quiz')) || (currentFile === 'odmena.html' && !can('reward'));
  }
  function markFeatureLocks() {
    document.querySelectorAll('#sidebar a[href$="kviz.html"]').forEach((lnk) => {
      const locked = !can('quiz');
      lnk.classList.toggle('locked', locked);
      if (locked) {
        lnk.setAttribute('title', 'Nejdřív se přihlas');
        lnk.setAttribute('aria-label', 'Kvíz a odměna — dostupné po přihlášení');
      } else {
        lnk.removeAttribute('title');
        lnk.removeAttribute('aria-label');
      }
    });
  }
  function gateLockedFeaturePage() {
    if (!isLockedFeaturePage()) return;
    const inner = document.querySelector('.main-inner');
    if (!inner || inner.querySelector('.feature-paywall')) return;
    inner.innerHTML = `
      <div class="breadcrumbs">
        <a href="${ROOT}index.html">Databáze</a>
        <span class="separator">/</span>
        <span class="current">Kvíz &amp; odměna</span>
      </div>
      <div class="paywall feature-paywall">
        <div class="paywall-lock">🔒</div>
        <h2 class="paywall-title">Kvíz a odměna jsou po přihlášení zdarma</h2>
        <p class="paywall-text">Přihlas se a dokonči 4 levely. Pak si zdarma odemkneš pracovní listy k 90denní výzvě.</p>
        <div class="paywall-actions">
          <a class="paywall-cta" href="index.html">Přihlásit se zdarma</a>
        </div>
      </div>`;
  }
  function markHomepageLocks() {
    document.querySelectorAll('#articles-list .article-row').forEach((row) => {
      const titleEl = row.querySelector('.article-row-title');
      if (!titleEl) return;
      const a = articles.find((x) => x.title === titleEl.textContent);
      if (a && isPremiumArticle(a) && a.status === 'published') {
        row.classList.add('locked');
        if (!row.querySelector('.lock-pill')) {
          const pill = document.createElement('div'); pill.className = 'lock-pill'; pill.textContent = '🔒 Členové'; row.appendChild(pill);
        }
      }
    });
    document.querySelectorAll('#sidebar .sidebar-sublink[data-slug]').forEach((lnk) => {
      const slug = lnk.getAttribute('data-slug');
      const a = articles.find((x) => x.slug === slug);
      if (a && isPremiumArticle(a)) {
        lnk.classList.add('locked');
        lnk.setAttribute('title', 'Zamčeno pro plný přístup');
        lnk.setAttribute('aria-label', (a.title || 'Článek') + ' — zamčeno pro plný přístup');
      } else {
        lnk.classList.remove('locked');
        lnk.removeAttribute('title');
        lnk.removeAttribute('aria-label');
      }
    });
  }
  function gateArticlePage() {
    const article = articleForCurrentPage();
    if (!article) return;
    const inner = document.querySelector('.main-inner');
    if (!inner) return;
    if (isPremiumArticle(article)) {
      let cutFrom = inner.querySelector('.section-title');
      if (cutFrom) { let el = cutFrom; while (el) { el.style.display = 'none'; el = el.nextElementSibling; } }
      insertPaywall(inner, cutFrom);
    } else {
      insertEndPromo(inner);
    }
  }
  function insertPaywall(inner, beforeEl) {
    const box = document.createElement('div');
    box.className = 'paywall';
    box.innerHTML = `
      <div class="paywall-lock">🔒</div>
      <h2 class="paywall-title">Zbytek je jen pro členy</h2>
      <p class="paywall-text">Tohle je prémiový obsah ${escapeHtml(CONFIG.academyName)}. Čteš teď jen úvod — celý článek a zbytek databáze se odemknou členům.</p>
      <div class="paywall-actions">
        <a class="paywall-cta" href="#" data-checkout-product="databaze">Chci plný přístup</a>
        <span class="paywall-note">Databáze 1 497 Kč · nebo kompletní <a href="pristup.html">Kenji Academy</a></span>
      </div>`;
    if (beforeEl) inner.insertBefore(box, beforeEl); else inner.appendChild(box);
  }
  function insertEndPromo(inner) {
    const signoff = inner.querySelector('.signoff');
    const promo = document.createElement('div');
    promo.className = 'promo-banner';
    promo.innerHTML = `
      <div class="promo-content">
        <div class="promo-kicker">KENJI ACADEMY</div>
        <h3 class="promo-title">Tohle byla jen ochutnávka.</h3>
        <p class="promo-text">Většina databáze je za zámkem — kompletní návody, byznys a technika pro tvůrce.</p>
        <a class="promo-cta" href="#" data-checkout-product="databaze">Odemknout celou databázi →</a>
      </div>`;
    if (signoff) inner.insertBefore(promo, signoff); else inner.appendChild(promo);
  }

  // Odhlášení — zruší i Supabase session (magic link), pak lokální stav.
  async function doLogout() {
    try { const sb = await getSupabase(); if (sb) await sb.auth.signOut(); } catch (e) {}
    saveUser(null);
    location.reload();
  }
  window._kenjiLogout = doLogout;

  // ---------------- START ----------------
  const isPublicPage = PUBLIC_PAGES.indexOf(currentFile) >= 0;
  const projRef = (CONFIG.supabaseUrl.match(/\/\/([^.]+)\./) || [])[1] || '';
  const returningFromAuth = /[#&?](access_token|refresh_token|token_hash)=|[?&]code=/.test(location.href) || /type=(magiclink|signup|recovery|email)/.test(location.href);
  // Vypršelý / neplatný přihlašovací odkaz → Supabase vrátí #error=...&error_code=otp_expired
  const authLinkError = /[#&?](error|error_code)=/.test(location.href) && /otp_expired|access_denied|expired|invalid/i.test(location.href);
  if (authLinkError) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  const hasSbToken = (function () { try { return !!localStorage.getItem('sb-' + projRef + '-auth-token'); } catch (e) { return false; } })();
  const mightHaveSession = isLive && !IS_LOCAL && !isLoggedIn() && (returningFromAuth || hasSbToken);

  function loadProductTour() {
    if (isPublicPage || currentFile === 'admin.html' || !isLoggedIn() || document.querySelector('script[data-kenji-tour]')) return;
    // Dokončený průvodce znovu nestahujeme na každé stránce. Explicitní
    // spuštění z Nastavení i rozpracovaný povinný průchod zůstávají beze změny.
    var tourRequested = /[?&](?:tour=1|onboarding=)/.test(location.search);
    if (!tourRequested) {
      try {
        var tourState = JSON.parse(localStorage.getItem('kenji_guided_onboarding_v3') || 'null');
        if (tourState && tourState.version === 3 && tourState.status === 'complete') return;
      } catch (e) {}
    }
    const tourScript = document.createElement('script');
    tourScript.src = ROOT + 'assets/tour.js?v=20260823-dashboard-v1';
    tourScript.dataset.kenjiTour = '1';
    document.body.appendChild(tourScript);
  }

  function finishBoot() {
    const onHome = currentFile === 'index.html' || currentFile === '';
    if (!isLoggedIn() && !isPublicPage) {
      var onbDone = false; try { onbDone = localStorage.getItem('kenji_onboarding_done_v2') === 'true'; } catch (e) {}
      var startOnb = /[?&]start=1(?:&|$)/.test(location.search);
      if (onHome) {
        if (!onbDone && !startOnb && !authLinkError) {
          // Nepřihlášený host na kořeni → hlavní stránkou je prodejní stránka.
          location.replace(ROOT + 'academy.html');
          return;
        }
        if (!onbDone && startOnb) {
          // Build-before-register: host si smí na domovské stránce postavit plán (onboarding).
          revealSite();
          document.body.classList.add('kenji-guest');
        } else {
          // Onboarding dokončen, ale nepřihlášen → povinná registrace (nejde obejít).
          showGate('saveplan');
        }
      } else {
        showGate('saveplan');   // obsah/kurzy → povinná brána (e-mail)
      }
    } else {
      revealSite();
    }
    renderHeaderUI();
    if (!isPublicPage) applyGating();
    markHomepagePlan();
    renderStartPanel();
    if (isLive && isLoggedIn() && !IS_LOCAL) syncOnLoad();  // na localhostu sync neběží (drží dev admina)
    try { document.dispatchEvent(new Event('kenji-auth-ready')); } catch (e) {}
    if (isLoggedIn()) trackEvent('page_view', currentFile, { path: location.pathname });
    setTimeout(loadProductTour, 0);
  }

  if (mightHaveSession) {
    // Drž web zamlžený, dokud nezjistíme, jestli existuje platná session (bez bliknutí gate).
    if (!isPublicPage) document.body.classList.add('kenji-gated');
    (async function () {
      try {
        const sb = await getSupabase();
        const session = sb ? await getInitialSession(sb) : null;
        if (session) {
          await adoptSession(session);
          if (returningFromAuth) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
        }
      } catch (e) { console.warn('auth boot', e); }
      finishBoot();
    })();
  } else {
    finishBoot();
  }

  // veřejné API
  window.KenjiAuth = {
    getUser: () => user,
    getTier: currentTier,
    can: can,
    isMember: isMember,
    isAcademy: isAcademy,
    isLoggedIn: isLoggedIn,
    live: isLive,
    getSupabase: getSupabase,   // sdílený Supabase klient (pro feed apod.)
    updateUserProfile: updateUserProfile,
    requestMagicLink: sendMagicLink,
    logout: doLogout,
    track: trackEvent,
    recordTool: recordTool,
    anonymousId: anonymousId,
    promptSavePlan: function () { showGate('saveplan'); }  // build-before-register výzva po onboardingu
  };

  // Synchronní přihlášení stihne načíst průvodce hned; magic link jej načte ve finishBoot().
  loadProductTour();
})();
