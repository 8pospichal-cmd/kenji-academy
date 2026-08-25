// ============================================
// KENJI KNIHOVNA — VSTUPNÍ GATE, LEADY A PROGRES (Supabase)
// ============================================
//
// CO TO DĚLÁ:
//  • Nikdo se nedostane na web zadarmo — nejdřív musí dát E-MAIL + INSTAGRAM.
//    (rozmazané pozadí + modal: vlevo „co to je", vpravo formulář)
//  • Lead (e-mail + IG) se uloží do Supabase (tabulka `users`).
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

  // ---------------- STAV ----------------
  let user = loadUser();

  // DEV BYPASS: na localhostu jsi vždycky přihlášený admin/člen — žádná brána,
  // vidíš všechno (kurzy, feed, admin rubriky). V produkci (Netlify) NEPLATÍ.
  const IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /\.local$/.test(location.hostname);
  if (IS_LOCAL) {
    user = { email: '8pospichal@gmail.com', instagram: 'kenjiacademy', tier: 'academy' }; // admin dev účet (jen lokálně, neukládá se)
  }

  // Dev: ?guest=1 vynutí odhlášeného návštěvníka (na localhostu jinak vždy admin) — pro test build-before-register.
  if (/[?&]guest=1/.test(location.search)) { user = null; }

  // Dev náhled placeného obsahu: ?tier=academy / ?tier=knihovna / ?tier=free
  // Když je override aktivní, server sync tier nepřepíše (jinak by se hned vrátil).
  const DEV_TIER = (location.search.match(/[?&]tier=(free|knihovna|academy)/) || [])[1] || null;
  (function devTierOverride() {
    if (DEV_TIER && user) { user.tier = DEV_TIER; saveUser(user); }
  })();

  function loadUser() { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch (e) { return null; } }
  function saveUser(u) { try { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); } catch (e) {} }

  const isLoggedIn = () => !!(user && user.email);
  const isMember = () => !!(user && user.tier && user.tier !== 'free');

  // ---------------- POMOCNÍCI ----------------
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function normEmail(s) { return String(s || '').trim().toLowerCase(); }
  function validEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function normIg(s) { return String(s || '').trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase(); }
  function articleForCurrentPage() { return inArticle ? (articles.find((a) => (a.url || '').split('/').pop() === currentFile) || null) : null; }
  function isFreeSlug(slug) { return freeSlugs.includes(slug); }
  function isPremiumArticle(a) { return a && !isFreeSlug(a.slug); }

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
    if (!DEV_TIER && server.tier && server.tier !== user.tier) { user.tier = server.tier; saveUser(user); renderHeaderUI(); applyGating(); markHomepagePlan(); try { document.dispatchEvent(new Event('kenji-auth-ready')); } catch (e) {} }
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
  //  VSTUPNÍ GATE (e-mail + Instagram)
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
        ${saveplan ? `<button type="button" class="kg-skip" id="kg-skip" aria-label="Zatím ne">Zatím ne ✕</button>` : ''}
        <div class="kg-intro">
          <div class="kg-logo">KENJI ACADEMY</div>
          <h2>${saveplan ? 'Ulož si svůj plán. 🥋' : 'Vědomostní databáze pro tvůrce.'}</h2>
          <p>${saveplan ? 'Právě sis postavil vlastní plán na míru. Nech si ho uložit, ať o něj nepřijdeš — načte se ti na každém zařízení a budeme ti hlídat postup.' : 'Praktické know-how, byznys a technika pro fotografy, kameramany i tvůrce obsahu. Žádný kecy, jen praxe.'}</p>
          <ul class="kg-bullets">
            ${saveplan
              ? `<li>Tvůj plán, úkoly a XP zůstanou uložené</li>
                 <li>Odemkne se ti databáze — ~77 článků, kvíz i audit</li>
                 <li>Zdarma — stačí e-mail a Instagram</li>`
              : `<li>~77 článků, kvíz s tajnou odměnou i byznys audit</li>
                 <li>Od základů přes techniku po cenotvorbu a právo</li>
                 <li>Vstup zdarma — odemkneš ho e-mailem a Instagramem</li>`}
          </ul>
        </div>
        <div class="kg-form">
          <!-- REŽIM 1: vstup zdarma (lead: e-mail + Instagram) -->
          <div class="kg-pane" id="kg-pane-lead">
            <div class="kg-form-head">${saveplan ? 'Ulož si postup' : 'Vstup do databáze'}</div>
            <p class="kg-form-sub">${saveplan ? 'Zadej e-mail a Instagram — plán ti zůstane a máš přístup do celé databáze.' : 'Zadej e-mail a Instagram a jsi uvnitř. Pamatujeme si tvůj postup.'}</p>
            <label class="kg-label" for="kg-email">E-mail</label>
            <input class="kg-input" id="kg-email" type="email" placeholder="tvuj@email.cz" autocomplete="email">
            <label class="kg-label" for="kg-ig">Instagram</label>
            <input class="kg-input" id="kg-ig" type="text" placeholder="@tvojeprofil" autocomplete="off">
            <label class="kg-consent"><input type="checkbox" id="kg-consent"> <span>Souhlasím se zpracováním e-mailu a zasíláním novinek. <a href="${ROOT}${escapeHtml(CONFIG.privacyUrl)}" target="_blank" rel="noopener">Zásady</a></span></label>
            <button class="kg-btn" id="kg-submit">${saveplan ? 'Uložit můj plán →' : 'Vstoupit do databáze →'}</button>
            <div class="kg-error" id="kg-error" hidden></div>
            <p class="kg-switch">Už jsi člen nebo jsi zaplatil? <button type="button" class="kg-link" id="kg-to-login">Přihlas se e-mailem →</button></p>
          </div>

          <!-- REŽIM 2: přihlášení člena (magic link — jakýkoli e-mail) -->
          <div class="kg-pane" id="kg-pane-login" hidden>
            <div class="kg-form-head">Přihlášení člena</div>
            <p class="kg-form-sub">Zadej e-mail, kterým jsi platil / se přihlašuješ. Pošleme ti přihlašovací odkaz — funguje se Seznamem i Gmailem.</p>
            <label class="kg-label" for="kg-login-email">E-mail</label>
            <input class="kg-input" id="kg-login-email" type="email" placeholder="tvuj@email.cz" autocomplete="email">
            <button class="kg-btn" id="kg-login-send">Poslat přihlašovací odkaz</button>
            <div class="kg-error" id="kg-login-error" hidden></div>
            <div class="kg-sent" id="kg-login-sent" hidden>
              <div class="kg-sent-ico">📩</div>
              <p>Poslali jsme ti přihlašovací odkaz na <strong id="kg-sent-email"></strong>. Otevři e-mail a klikni na tlačítko — pak už budeš uvnitř.</p>
            </div>
            <p class="kg-switch"><button type="button" class="kg-link" id="kg-to-lead">← Zpět na vstup zdarma</button></p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    // „Zatím ne" (jen v režimu ulož-plán) — zavře modal, host může pokračovat a uložit později.
    const skipEl = document.getElementById('kg-skip');
    if (skipEl) skipEl.addEventListener('click', function () { wrap.remove(); document.body.classList.remove('kenji-gated'); });

    const emailEl = document.getElementById('kg-email');
    const igEl = document.getElementById('kg-ig');
    const consentEl = document.getElementById('kg-consent');
    const errEl = document.getElementById('kg-error');
    const btn = document.getElementById('kg-submit');

    function err(msg) { errEl.textContent = msg; errEl.hidden = false; }

    async function submit() {
      const email = normEmail(emailEl.value);
      const ig = normIg(igEl.value);
      if (!validEmail(email)) { err('Zadej platný e-mail.'); emailEl.focus(); return; }
      if (ig.length < 2) { err('Zadej svůj Instagram.'); igEl.focus(); return; }
      if (!consentEl.checked) { err('Potřebujeme tvůj souhlas se zpracováním.'); return; }
      errEl.hidden = true;
      btn.disabled = true; btn.textContent = 'Vstupuju…';

      if (isLive) {
        const server = await registerLead(email, ig);
        if (server) {
          const merged = mergeProgress({ read: getLocalRead(), quiz: getLocalQuiz() }, { read: server.read, quiz: server.quiz });
          setLocalRead(merged.read); setLocalQuiz(merged.quiz);
          saveUser({ email: email, instagram: ig, tier: server.tier || 'free' });
        } else {
          // server nedostupný → ulož aspoň lokálně, ať uživatele nezablokujeme
          saveUser({ email: email, instagram: ig, tier: 'free' });
        }
      } else {
        saveUser({ email: email, instagram: ig, tier: 'free' });
      }
      location.reload();
    }

    btn.addEventListener('click', submit);
    // Enter odešle jen v aktivním panelu (lead)
    document.getElementById('kg-pane-lead').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    // --- přepínání panelů lead ⇄ přihlášení člena ---
    const paneLead = document.getElementById('kg-pane-lead');
    const paneLogin = document.getElementById('kg-pane-login');
    const loginEmailEl = document.getElementById('kg-login-email');
    const loginErr = document.getElementById('kg-login-error');
    const loginSent = document.getElementById('kg-login-sent');
    const loginBtn = document.getElementById('kg-login-send');
    function showPane(which) {
      const login = which === 'login';
      paneLead.hidden = login; paneLogin.hidden = !login;
      loginErr.hidden = true; loginSent.hidden = true;
      setTimeout(function () { (login ? loginEmailEl : emailEl).focus(); }, 40);
    }
    document.getElementById('kg-to-login').addEventListener('click', function () { showPane('login'); });
    document.getElementById('kg-to-lead').addEventListener('click', function () { showPane('lead'); });

    async function sendLogin() {
      const email = normEmail(loginEmailEl.value);
      if (!validEmail(email)) { loginErr.textContent = 'Zadej platný e-mail.'; loginErr.hidden = false; loginEmailEl.focus(); return; }
      if (!isLive) { loginErr.textContent = 'Přihlášení poběží až v ostrém režimu (mimo localhost).'; loginErr.hidden = false; return; }
      loginErr.hidden = true; loginBtn.disabled = true; loginBtn.textContent = 'Posílám…';
      const res = await sendMagicLink(email);
      if (res.ok) {
        document.getElementById('kg-sent-email').textContent = email;
        loginSent.hidden = false;
        loginBtn.textContent = 'Odkaz odeslán ✓';
      } else {
        loginBtn.disabled = false; loginBtn.textContent = 'Poslat přihlašovací odkaz';
        loginErr.textContent = 'E-mail se teď nepovedlo odeslat. Zkus to prosím za chvíli.';
        loginErr.hidden = false;
      }
    }
    loginBtn.addEventListener('click', sendLogin);
    loginEmailEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendLogin(); });

    setTimeout(function () { emailEl.focus(); }, 50);
  }

  function revealSite() { document.body.classList.remove('kenji-gated'); }

  // ===================================================
  //  UVÍTACÍ PRŮVODCE (jednou po prvním přihlášení)
  // ===================================================
  const ONBOARD_KEY = 'kenji_onboarded_v1';
  function maybeWelcome() {
    if (!isLoggedIn()) return;
    try { if (localStorage.getItem(ONBOARD_KEY)) return; } catch (e) { return; }
    renderWelcome();
  }
  function renderWelcome() {
    // 3 vizuální kroky — zakroužkuje reálný prvek + bublina se šipkou
    const steps = [
      { resolve: function () { var c = document.querySelector('#sidebar .sidebar-cat'); return c ? c.closest('.sidebar-section') : document.querySelector('#sidebar'); },
        text: '📚 Tady najdeš všechny články — kategorie od úplných základů přes techniku a editaci po byznys a právo.' },
      { resolve: function () { var k = document.querySelector('#sidebar a[href$="kviz.html"]'); return k ? k.closest('.sidebar-nav') : document.querySelector('#sidebar'); },
        text: '🥋 Tady se otestuješ v kvízu. Když zvládneš všechny levely, čekají tě pracovní listy k 90denní výzvě.' },
      { resolve: function () {
          var mid = document.querySelector('.access-card.featured'); if (mid) return mid;       // homepage: rovnou karta 1 497
          var pw = document.querySelector('.paywall'); if (pw) return pw;                        // premium článek: paywall box
          var locked = document.querySelector('#sidebar .sidebar-sublink.locked');               // jinde: zamčený článek v menu
          if (locked) { var c = locked.closest('.sidebar-cat'); if (c) c.classList.add('open'); return locked; }
          return document.querySelector('#sidebar');
        },
        text: '🔒 Část obsahu je zamčená. Plný přístup do celé databáze si odemkneš jednorázově balíčkem za 1 497 Kč — a máš všechny články i kvíz navždy.' }
    ];
    // Placení členové už mají přístup → upsell krok jim neukazuj
    if (isMember()) steps.pop();
    let i = 0;

    const catcher = document.createElement('div'); catcher.className = 'kt-catch';
    const ring = document.createElement('div'); ring.className = 'kt-ring';
    const tip = document.createElement('div'); tip.className = 'kt-tip';
    [catcher, ring, tip].forEach(function (e) { document.body.appendChild(e); });

    function isDrawer() { var t = document.querySelector('.menu-toggle'); return !!(t && getComputedStyle(t).display !== 'none'); }
    function setSidebar(open) {
      var sb = document.querySelector('.sidebar'), ov = document.querySelector('.sidebar-overlay');
      if (!sb) return;
      sb.classList.toggle('open', open);
      if (ov) ov.classList.toggle('show', open);
    }
    // vypni plynulý scroll po dobu průvodce (jinak scrollIntoView mine rect)
    const prevScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    function cleanup() {
      try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (e) {}
      if (isDrawer()) setSidebar(false);
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      [catcher, ring, tip].forEach(function (e) { e.remove(); });
      window.removeEventListener('resize', onResize);
    }
    function place(el, s, last) {
      const r = el.getBoundingClientRect(), pad = 8;
      ring.style.top = (r.top - pad) + 'px'; ring.style.left = (r.left - pad) + 'px';
      ring.style.width = (r.width + 2 * pad) + 'px'; ring.style.height = (r.height + 2 * pad) + 'px';
      tip.innerHTML =
        '<button class="kt-skip" id="kt-skip">Přeskočit</button>' +
        '<p class="kt-text">' + s.text + '</p>' +
        '<div class="kt-bar"><div class="kt-dots">' + steps.map(function (_, k) { return '<span class="' + (k === i ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
        '<div class="kt-btns">' + (i > 0 ? '<button class="kt-back" id="kt-back">Zpět</button>' : '') +
        '<button class="kt-next" id="kt-next">' + (last ? 'Hotovo' : 'Další →') + '</button></div></div>';
      const tw = Math.min(320, window.innerWidth - 24);
      tip.style.width = tw + 'px'; tip.style.visibility = 'hidden'; tip.style.display = 'block';
      const th = tip.offsetHeight;
      let top, up;
      if (r.bottom + th + 16 <= window.innerHeight) { top = r.bottom + 14; up = true; }
      else { top = Math.max(12, r.top - th - 14); up = false; }
      const left = Math.max(12, Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - 12));
      tip.style.top = top + 'px'; tip.style.left = left + 'px';
      tip.classList.toggle('arrow-up', up); tip.classList.toggle('arrow-down', !up);
      tip.style.setProperty('--ax', Math.max(18, Math.min(r.left + r.width / 2 - left, tw - 18)) + 'px');
      tip.style.visibility = 'visible';
      document.getElementById('kt-skip').onclick = cleanup;
      document.getElementById('kt-next').onclick = function () { if (last) cleanup(); else { i++; show(); } };
      var b = document.getElementById('kt-back'); if (b) b.onclick = function () { i--; show(); };
    }
    function show() {
      const s = steps[i], last = i === steps.length - 1;
      const el = s.resolve();
      if (!el) { if (last) cleanup(); else { i++; show(); } return; }
      // sidebar otevři jen když cíl leží uvnitř menu (jinak by drawer cíl zakryl)
      const inSidebar = !!el.closest('#sidebar');
      const needWait = isDrawer() && inSidebar;
      if (isDrawer()) setSidebar(inSidebar);
      setTimeout(function () {
        const el2 = s.resolve() || el;
        try { el2.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }); }
        catch (e) { try { el2.scrollIntoView(); } catch (e2) {} }
        setTimeout(function () { place(el2, s, last); }, 140);
      }, needWait ? 330 : 0);
    }
    function onResize() { const s = steps[i]; const el = s.resolve(); if (el) place(el, s, i === steps.length - 1); }
    window.addEventListener('resize', onResize);
    show();
  }

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
    var member = isMember();
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
    var unlock = member
      ? '<div class="sp-final done"><span class="sp-check">✓</span><span class="sp-ico">🔓</span><span class="sp-tt"><span class="sp-t-title">Máš plný přístup</span><span class="sp-t-sub">Užívej si všechno naplno</span></span></div>'
      : '<a class="sp-final' + (allDone ? ' hot' : '') + '" href="' + ROOT + 'pristup.html"><span class="sp-check">🔓</span><span class="sp-ico"></span><span class="sp-tt"><span class="sp-t-title">' + (allDone ? 'Jsi připravený růst naplno.' : 'Odemkni plný přístup') + '</span><span class="sp-t-sub">' + (allDone ? 'Odemkni celou databázi i kurzy →' : 'Celá databáze, kurzy a komunita') + '</span></span><span class="sp-arr">→</span></a>';

    var strategy = allDone
      ? (member ? 'Jsi v obraze. Teď už jen makat. 💪' : 'Ochutnal jsi, co tu je. Teď se rozhodni, jak daleko to chceš dotáhnout.')
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
  function renderHeaderUI() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    if (!isLoggedIn()) { actions.innerHTML = `<span class="header-tag">EXCLUSIVE • MEMBERS ONLY</span>`; return; }
    const tierLabel = isMember() ? (user.tier === 'academy' ? 'ACADEMY' : 'ČLEN') : 'FREE';
    const tierClass = isMember() ? 'member' : 'free';
    const handle = user.instagram ? '@' + user.instagram : user.email;
    actions.innerHTML = `
      <div class="auth-acct">
        <button class="acct-trigger" id="kenji-acct" aria-haspopup="true" aria-expanded="false" aria-label="Účet">
          <svg class="acct-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/></svg>
          <span class="acct-caret" aria-hidden="true">▾</span>
        </button>
        <div class="acct-menu" id="kenji-acct-menu" role="menu">
          <div class="acct-head">
            <div class="acct-name">${escapeHtml(handle)}</div>
            <div class="acct-tier"><span class="auth-badge ${tierClass}">${tierLabel}</span><span class="acct-sub">${isMember() ? 'Plný přístup' : 'Free přístup'}</span></div>
          </div>
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
  }

  // ===================================================
  //  PAYWALL (free vs premium) — beze změny logiky
  // ===================================================
  function applyGating() {
    if (isMember()) return;
    markFeatureLocks();
    gateLockedFeaturePage();
    markHomepageLocks();
    gateArticlePage();
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
    return currentFile === 'kviz.html' || currentFile === 'odmena.html';
  }
  function markFeatureLocks() {
    document.querySelectorAll('#sidebar a[href$="kviz.html"]').forEach((lnk) => {
      lnk.classList.add('locked');
      lnk.setAttribute('title', 'Kvíz a odměna jsou součástí plného přístupu');
      lnk.setAttribute('aria-label', 'Kvíz a odměna — zamčeno pro plný přístup');
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
        <h2 class="paywall-title">Kvíz a odměna jsou pro členy</h2>
        <p class="paywall-text">Kvíz se 4 levely a pracovní listy k 90denní výzvě jsou součástí plného přístupu do databáze.</p>
        <div class="paywall-actions">
          <a class="paywall-cta" href="#" data-checkout-product="databaze">Odemknout celou databázi</a>
          <span class="paywall-note">Databáze 1 497 Kč · nebo kompletní <a href="pristup.html">Kenji Academy</a></span>
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
  const hasSbToken = (function () { try { return !!localStorage.getItem('sb-' + projRef + '-auth-token'); } catch (e) { return false; } })();
  const mightHaveSession = isLive && !IS_LOCAL && !isLoggedIn() && (returningFromAuth || hasSbToken);

  function finishBoot() {
    const onHome = currentFile === 'index.html' || currentFile === '';
    if (!isLoggedIn() && !isPublicPage) {
      if (onHome) {
        // Build-before-register: host smí postavit svůj plán na domovské stránce.
        // Registraci si vyžádáme až PO onboardingu (dashboard.js → promptSavePlan).
        revealSite();
        document.body.classList.add('kenji-guest');
      } else {
        showGate();        // ostatní stránky (obsah/kurzy) → brána: e-mail + IG (nebo přihlášení)
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
    isMember: isMember,
    isLoggedIn: isLoggedIn,
    live: isLive,
    getSupabase: getSupabase,   // sdílený Supabase klient (pro feed apod.)
    logout: doLogout,
    promptSavePlan: function () { showGate('saveplan'); }  // build-before-register výzva po onboardingu
  };
})();
