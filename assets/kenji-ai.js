// ============================================
// KENJI AI — chat rozhraní (frontend, GPT layout)
// ============================================
// Volá Supabase Edge Function 'kenji-ai' (klíče jsou jen na serveru).
// Historie konverzací v localStorage. Levý sloupec (v liště) = Nový chat + historie.
// Viz KENJI_AI_SETUP.md pro nasazení funkce.
// ============================================
(function () {
  var ROOT = document.getElementById('ai-root');
  if (!ROOT) return;
  var KEY = 'kenji_ai_v1';
  var A = window.KenjiAuth || {};
  var quotaState = { loading: true, unlimited: false, limit: 5, used: 0, remaining: 5, resetAt: null };
  var quotaReady = null;

  function anonymousId() { return A.anonymousId ? A.anonymousId() : ''; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // Inline formátování: **tučně**. (esc předchází XSS, značky se aplikují až potom.)
  function inlineFmt(s) { return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); }
  // Blokový renderer: skutečné odstavce, odrážky (- * •) a číslované seznamy (1. 2.),
  // aby odpovědi měly přehlednou strukturu místo jedné slepené zdi textu.
  function fmt(s) {
    var src = String(s == null ? '' : s).replace(/\r\n/g, '\n').trim();
    if (!src) return '';
    var lines = src.split('\n'), html = '', para = [], list = null, listTag = '';
    function flushPara() { if (para.length) { html += '<p>' + para.map(inlineFmt).join('<br>') + '</p>'; para = []; } }
    function flushList() { if (list) { html += '<' + listTag + ' class="ai-' + listTag + '">' + list.join('') + '</' + listTag + '>'; list = null; listTag = ''; } }
    lines.forEach(function (raw) {
      var line = raw.replace(/\s+$/, '');
      if (!line.trim()) { flushPara(); flushList(); return; }
      var mUl = line.match(/^\s*[-*•]\s+(.*)$/);
      var mOl = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (mUl) { flushPara(); if (listTag !== 'ul') { flushList(); listTag = 'ul'; list = []; } list.push('<li>' + inlineFmt(mUl[1]) + '</li>'); return; }
      if (mOl) { flushPara(); if (listTag !== 'ol') { flushList(); listTag = 'ol'; list = []; } list.push('<li>' + inlineFmt(mOl[1]) + '</li>'); return; }
      flushList(); para.push(line);
    });
    flushPara(); flushList();
    return html;
  }
  var SAFE_BUTTON_URLS = [
    'index.html', 'hodinovka.html', 'audit.html', 'kurzy.html', 'sablony.html',
    'kurz.html?slug=zaklady-technika', 'kurz.html?slug=foceni-jako-byznys',
    'kurz.html?slug=svatebni-masterclass', 'kurz.html?slug=90denni-vyzva', 'kurz.html?slug=kenji-v-akci',
    'clanky/expozice.html', 'clanky/raw-vs-jpeg.html', 'clanky/hloubka-ostrosti.html',
    'clanky/jaky-objektiv.html', 'clanky/jak-vybrat-fotak.html', 'clanky/ai-pro-tvurce.html',
    'clanky/cenik-ktery-prodava.html', 'clanky/hodina-vs-balicky.html',
    'https://www.instagram.com/kenjiacademycz'
  ];
  function normalizeBtnUrl(u) {
    u = String(u || '').trim().replace(/\/$/, '');
    // Častá modelová odchylka: katalog `kurzy` místo detailu `kurz`.
    if (/^kurzy\.html\?slug=/i.test(u)) u = u.replace(/^kurzy\.html/i, 'kurz.html');
    return SAFE_BUTTON_URLS.indexOf(u) >= 0 ? u : '';
  }
  // Rozparsuje odpověď na text + tlačítka + 3 návazné otázky (značky z promptu).
  function parseReply(raw) {
    var buttons = [], asks = [], textLines = [];
    String(raw == null ? '' : raw).split('\n').forEach(function (line) {
      var b = line.match(/^\s*\[\[\s*button\s*\]\]\s*(.+?)\s*::\s*(\S.*?)\s*$/i);
      var a = line.match(/^\s*\[\[\s*ask\s*\]\]\s*(.+?)\s*$/i);
      if (b) { buttons.push({ label: b[1], url: normalizeBtnUrl(b[2]) }); return; }
      if (a) { asks.push(a[1]); return; }
      textLines.push(line);
    });
    return {
      text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      buttons: buttons.filter(function (x) { return !!x.url; }).slice(0, 3),
      asks: asks.slice(0, 3)
    };
  }
  function renderButtons(btns) {
    if (!btns.length) return '';
    var arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    return '<div class="ai-actions">' + btns.map(function (b) {
      var ext = /^https?:/i.test(b.url);
      return '<a class="ai-action" href="' + esc(b.url) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span>' + esc(b.label) + '</span>' + arrow + '</a>';
    }).join('') + '</div>';
  }
  function renderAsks(asks) {
    if (!asks.length) return '';
    return '<div class="ai-suggests">' + asks.map(function (q) {
      return '<button class="ai-suggest" type="button" data-q="' + esc(q) + '"><span class="ai-suggest-q">' + esc(q) + '</span></button>';
    }).join('') + '</div>';
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || { convos: [], activeId: null }; } catch (e) { return { convos: [], activeId: null }; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  function uid() { return 'c' + Date.now() + Math.random().toString(36).slice(2, 6); }

  function readJson(key, fallback) {
    try { var value = JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; }
    catch (e) { return fallback; }
  }

  // Strukturovaný kontext se posílá odděleně od dotazu. Server ho sanitizuje,
  // sloučí s ověřeným profilem a použije pouze jako data pro personalizaci.
  function userContext() {
    try {
      var b = readJson('kenji_biz_v1', {}) || {};
      var profile = readJson('kenji_profile_v1', {}) || {};
      var authUser = A.getUser ? A.getUser() : null;
      var industries = Array.isArray(b.industries) ? b.industries : (b.industry ? [b.industry] : []);
      var todos = readJson('kenji_todos_v1', []);
      var activeTasks = Array.isArray(todos) ? todos.filter(function (t) { return t && !t.done && t.text; }).map(function (t) { return t.text; }).slice(0, 5) : [];
      var reads = readJson('kenji_read_v1', []);
      return {
        version: 1,
        profile: {
          name: profile.displayName || profile.name || (authUser && authUser.name) || '',
          bio: profile.bio || '',
          instagram: profile.instagram || (authUser && authUser.instagram) || ''
        },
        business: {
          industries: industries,
          industryOther: b.industryOther || '',
          experience: b.experience || '',
          experienceOther: b.experienceOther || '',
          income: b.income || '',
          monthlyGoal: Number(b.goal) > 0 ? Number(b.goal) : null,
          blocker: b.blocker || '',
          blockerOther: b.blockerOther || '',
          hasPortfolio: typeof b.portfolio === 'boolean' ? b.portfolio : null,
          hasWebsite: typeof b.web === 'boolean' ? b.web : null
        },
        progress: {
          activeTasks: activeTasks,
          recentlyRead: Array.isArray(reads) ? reads.slice(-8) : []
        }
      };
    } catch (e) { return { version: 1 }; }
  }

  var store = load();
  function activeConvo() { return store.convos.find(function (c) { return c.id === store.activeId; }) || null; }
  function newConvo() { var c = { id: uid(), title: 'Nový chat', msgs: [], ts: Date.now() }; store.convos.unshift(c); store.activeId = c.id; save(); return c; }
  if (!activeConvo()) newConvo();

  // ---------- HLAVNÍ OBSAH (jen chat) ----------
  ROOT.innerHTML =
    '<div class="ai-chat">' +
      '<div class="ai-mobile-quota" id="ai-mobile-quota" aria-live="polite"></div>' +
      '<div class="ai-messages" id="ai-messages"></div>' +
      '<div class="ai-limit-panel" id="ai-limit-panel" hidden>' +
        '<div><strong>Teď máš 5 z 5 dotazů vyčerpaných.</strong><span>Hele, jestli chceš Kenji AI pro tvůrce používat bez omezení, přidej se do Kenji Academy.</span><small class="ai-limit-reset"></small></div>' +
        '<a href="academy.html">Přidat se do Academy <span aria-hidden="true">→</span></a>' +
      '</div>' +
      '<form class="ai-inputbar" id="ai-form" data-tour="ai-input">' +
        '<textarea class="ai-input" id="ai-input" rows="1" placeholder="Zeptej se Kenji AI…" autocomplete="off"></textarea>' +
        '<button class="ai-send" id="ai-send" type="submit" aria-label="Odeslat">' +
          '<span class="ai-send-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' +
          '<span class="ai-send-loader" aria-hidden="true"></span>' +
          '<span class="ai-send-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12 4 4 8-9"/></svg></span>' +
        '</button>' +
      '</form>' +
      '<div class="ai-disclaimer">Kenji AI umí chybovat. U důležitých věcí (daně, právo) si to ověř.</div>' +
    '</div>';

  var msgsEl = document.getElementById('ai-messages');
  var inputEl = document.getElementById('ai-input');
  var formEl = document.getElementById('ai-form');
  var sendBtn = document.getElementById('ai-send');
  var mobileQuotaEl = document.getElementById('ai-mobile-quota');
  var limitPanelEl = document.getElementById('ai-limit-panel');
  var busy = false;

  function inferredQuota() {
    var academy = A.isAcademy ? A.isAcademy() : false;
    var state = academy
      ? { loading: false, unlimited: true, limit: null, used: null, remaining: null, resetAt: null }
      : { loading: false, unlimited: false, limit: 5, used: 0, remaining: 5, resetAt: null };
    try {
      if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
        var params = new URLSearchParams(location.search);
        var preview = Number(params.get('aiQuota'));
        if (params.has('aiQuota') && Number.isFinite(preview) && preview >= 0 && preview <= 5 && !academy) {
          state.remaining = Math.round(preview);
          state.used = 5 - state.remaining;
        }
      }
    } catch (e) {}
    return state;
  }

  function normalizeQuota(raw) {
    if (!raw || typeof raw !== 'object') return inferredQuota();
    if (raw.unlimited) return { loading: false, unlimited: true, limit: null, used: null, remaining: null, resetAt: null };
    var limit = Number(raw.limit) || 5;
    var remaining = Math.max(0, Math.min(limit, Number(raw.remaining) || 0));
    return { loading: false, unlimited: false, limit: limit, used: Math.max(0, limit - remaining), remaining: remaining, resetAt: raw.resetAt || null };
  }

  function quotaMarkup() {
    if (quotaState.loading) return '<span class="ai-quota-label">Denní limit</span><strong>Načítám…</strong>';
    if (quotaState.unlimited) return '<span class="ai-quota-label">Kenji AI</span><strong>Neomezeně</strong>';
    return '<span class="ai-quota-label">Zbývá</span><strong>' + quotaState.remaining + ' z ' + quotaState.limit + ' dotazů</strong>';
  }

  function resetLabel() {
    if (!quotaState.resetAt) return '';
    var diff = Math.max(0, new Date(quotaState.resetAt).getTime() - Date.now());
    var hours = Math.floor(diff / 3600000);
    var mins = Math.max(1, Math.ceil((diff % 3600000) / 60000));
    return hours ? 'První dotaz se obnoví za ' + hours + ' h ' + mins + ' min.' : 'První dotaz se obnoví za ' + mins + ' min.';
  }

  function paintQuota() {
    if (mobileQuotaEl) mobileQuotaEl.innerHTML = quotaMarkup();
    var exhausted = !quotaState.loading && !quotaState.unlimited && quotaState.remaining <= 0;
    if (limitPanelEl) {
      limitPanelEl.hidden = !exhausted;
      var note = limitPanelEl.querySelector('.ai-limit-reset');
      if (note) note.textContent = resetLabel();
    }
    formEl.classList.toggle('is-locked', exhausted);
    inputEl.disabled = exhausted;
    sendBtn.disabled = exhausted || busy;
    inputEl.placeholder = exhausted ? 'Limit 5 dotazů za 24 hodin je vyčerpaný' : 'Zeptej se Kenji AI…';
  }

  async function loadQuota() {
    try {
      var sb = A.getSupabase ? await A.getSupabase() : null;
      if (!sb) throw new Error('offline');
      var res = await sb.functions.invoke('kenji-ai', { body: { action: 'quota', anonymousId: anonymousId() } });
      if (res.error || !res.data || !res.data.quota) throw (res.error || new Error('quota'));
      quotaState = normalizeQuota(res.data.quota);
    } catch (e) {
      quotaState = inferredQuota();
    }
    renderSide();
    paintQuota();
    return quotaState;
  }

  // ---------- LEVÝ SLOUPEC (historie) ----------
  function closeDrawer() {
    var sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    var ov = document.querySelector('.sidebar-overlay'); if (ov) ov.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  }
  function renderSide() {
    var side = document.getElementById('ai-side');
    if (!side) return;
    var items = store.convos.filter(function (c) { return c.msgs.length; });
    var list = items.length
      ? items.map(function (c) {
          return '<button class="ai-side-item' + (c.id === store.activeId ? ' active' : '') + '" data-id="' + c.id + '">' +
            '<span class="ai-side-title">' + esc(c.title || 'Chat') + '</span>' +
            '<span class="ai-side-del" data-del="' + c.id + '" title="Smazat">✕</span></button>';
        }).join('')
      : '<div class="ai-side-empty">Zatím žádná konverzace</div>';
    side.innerHTML =
      '<div class="ai-side-quota" aria-live="polite">' + quotaMarkup() + '</div>' +
      '<button class="ai-side-new" id="ai-side-new"><span>＋</span> Nový chat</button>' +
      '<div class="ai-side-label">Historie</div>' +
      '<div class="ai-side-list">' + list + '</div>';

    document.getElementById('ai-side-new').addEventListener('click', function () {
      var cur = activeConvo();
      if (!(cur && !cur.msgs.length)) { newConvo(); }
      renderMessages(); renderSide(); closeDrawer(); inputEl.focus();
    });
    side.querySelectorAll('.ai-side-item').forEach(function (b) {
      b.addEventListener('click', function (e) {
        if (e.target.closest('.ai-side-del')) return;
        store.activeId = b.getAttribute('data-id'); save();
        renderMessages(); renderSide(); closeDrawer();
      });
    });
    side.querySelectorAll('.ai-side-del').forEach(function (d) {
      d.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = d.getAttribute('data-del');
        store.convos = store.convos.filter(function (c) { return c.id !== id; });
        if (store.activeId === id) { store.activeId = store.convos[0] ? store.convos[0].id : null; if (!store.activeId) newConvo(); }
        save(); renderMessages(); renderSide();
      });
    });
  }

  // ---------- RENDER ZPRÁV ----------
  var CHIPS = ['Jak si mám říct o vyšší cenu?', 'Vysvětli mi expozici jednoduše', 'Jak najdu první platící klienty?', 'Co má být ve smlouvě na focení?'];
  function renderMessages() {
    var c = activeConvo();
    if (!c || !c.msgs.length) {
      msgsEl.innerHTML =
        '<div class="ai-empty">' +
          '<div class="ai-empty-title">Čau, rád ti poradím.</div>' +
          '<div class="ai-empty-sub">Zeptej se na cokoliv okolo focení, techniky, editace nebo byznysu tvůrce. Odpovím ti po lopatě.</div>' +
          '<div class="ai-chips">' + CHIPS.map(function (t) { return '<button class="ai-chip" type="button">' + esc(t) + '</button>'; }).join('') + '</div>' +
        '</div>';
      msgsEl.querySelectorAll('.ai-chip').forEach(function (b) { b.addEventListener('click', function () { inputEl.value = b.textContent; send(); }); });
      return;
    }
    var lastBot = -1;
    var lastUser = -1;
    c.msgs.forEach(function (m, i) { if (m.role === 'assistant') lastBot = i; });
    c.msgs.forEach(function (m, i) { if (m.role === 'user') lastUser = i; });
    msgsEl.innerHTML = c.msgs.map(function (m, i) {
      if (m.role === 'user') {
        var canRetry = i === lastUser && c.msgs[i + 1] && c.msgs[i + 1].role === 'assistant';
        var retry = canRetry
          ? '<button class="ai-retry" type="button" data-ai-retry="' + i + '" title="Zkusit odpověď znovu" aria-label="Zkusit odpověď znovu">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 4v5h5M4 13a8.1 8.1 0 0 0 15.5 2M20 20v-5h-5"/></svg>' +
            '</button>'
          : '';
        return '<div class="ai-msg user"><div class="ai-bubble">' + fmt(m.content) + '</div>' + retry + '</div>';
      }
      var p = parseReply(m.content);
      return '<div class="ai-msg bot"><div class="ai-bot-name"><span class="ai-k">K</span>enji AI</div><div class="ai-bot-text">' + fmt(p.text) + '</div>' +
        renderButtons(p.buttons) +
        (i === lastBot ? renderAsks(p.asks) : '') +
        '</div>';
    }).join('');
    msgsEl.querySelectorAll('.ai-suggest').forEach(function (b) {
      b.addEventListener('click', function () { if (busy) return; inputEl.value = b.getAttribute('data-q'); send(); });
    });
    msgsEl.querySelectorAll('.ai-retry').forEach(function (b) {
      b.addEventListener('click', function () {
        if (busy) return;
        send(Number(b.getAttribute('data-ai-retry')));
      });
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  var thinkingTimer = null;
  function thinkingSteps(question) {
    var q = String(question || '').toLowerCase();
    if (/smlouv|gdpr|práv|dan|faktur|živnost|licenc/.test(q)) return [
      ['Dohledávám související podklady', 'Procházím relevantní části databáze Kenji Academy.'],
      ['Kontroluji souvislosti a rizika', 'Odděluji praktické doporučení od bodů, které je potřeba ověřit.'],
      ['Sestavuji bezpečný postup', 'Řadím další kroky tak, aby byly jasné a použitelné.']
    ];
    if (/cen|klient|zakáz|prodej|nabídk|marketing|poptáv|podnik|cash|portfolio/.test(q)) return [
      ['Mapuji tvoji situaci', 'Propojuji dotaz s tvým cílem, oborem a aktuálními úkoly.'],
      ['Porovnávám funkční postupy', 'Vybírám kroky s největším obchodním dopadem.'],
      ['Skládám konkrétní plán', 'Řadím doporučení podle priority a náročnosti.']
    ];
    if (/foť|fot|objektiv|světl|expoz|iso|clon|video|kamera|edit|lightroom|ostř/.test(q)) return [
      ['Dohledávám technické souvislosti', 'Procházím relevantní návody a principy v databázi.'],
      ['Převádím teorii do praxe', 'Vybírám postup, který můžeš rovnou vyzkoušet.'],
      ['Připravuji srozumitelné vysvětlení', 'Skládám odpověď od nejdůležitějšího kroku.']
    ];
    return [
      ['Procházím relevantní obsah', 'Hledám nejbližší souvislosti v databázi Kenji Academy.'],
      ['Vyhodnocuji vhodný postup', 'Odděluji konkrétní kroky od obecných rad.'],
      ['Sestavuji odpověď pro tebe', 'Řadím doporučení podle dopadu a priority.']
    ];
  }
  function showTyping(question) {
    var steps = thinkingSteps(question);
    var d = document.createElement('div');
    d.className = 'ai-msg bot'; d.id = 'ai-typing';
    d.innerHTML = '<div class="ai-bot-name"><span class="ai-k">K</span>enji AI</div>' +
      '<div class="ai-thinking" role="status" aria-live="polite">' +
        '<div class="ai-thinking-symbol" aria-hidden="true"><span></span></div>' +
        '<div class="ai-thinking-copy"><strong></strong><span></span></div>' +
        '<div class="ai-thinking-steps" aria-hidden="true">' + steps.map(function (_, i) { return '<i' + (i === 0 ? ' class="active"' : '') + '></i>'; }).join('') + '</div>' +
      '</div>';
    msgsEl.appendChild(d); msgsEl.scrollTop = msgsEl.scrollHeight;
    var index = 0;
    function paintStep() {
      var box = d.querySelector('.ai-thinking');
      if (!box) return;
      box.classList.add('is-changing');
      window.setTimeout(function () {
        if (!d.parentNode) return;
        box.querySelector('strong').textContent = steps[index][0];
        box.querySelector('.ai-thinking-copy > span').textContent = steps[index][1];
        box.querySelectorAll('.ai-thinking-steps i').forEach(function (dot, i) {
          dot.classList.toggle('active', i <= index);
          dot.classList.toggle('current', i === index);
        });
        box.classList.remove('is-changing');
      }, index ? 150 : 0);
    }
    paintStep();
    thinkingTimer = window.setInterval(function () {
      if (index < steps.length - 1) { index += 1; paintStep(); }
    }, 1700);
  }
  function hideTyping() {
    if (thinkingTimer) { window.clearInterval(thinkingTimer); thinkingTimer = null; }
    var t = document.getElementById('ai-typing'); if (t) t.remove();
  }

  // ---------- ODESLÁNÍ ----------
  async function send(retryIndex) {
    if (busy) return;
    if (quotaState.loading && quotaReady) await quotaReady;
    if (!quotaState.unlimited && quotaState.remaining <= 0) { paintQuota(); return; }
    var c = activeConvo(); if (!c) c = newConvo();
    var retrying = Number.isInteger(retryIndex) && retryIndex >= 0 && c.msgs[retryIndex] && c.msgs[retryIndex].role === 'user';
    var text = retrying ? String(c.msgs[retryIndex].content || '').trim() : (inputEl.value || '').trim();
    if (!text) return;
    var firstMsg = !retrying && !c.msgs.length;
    if (!retrying) {
      if (firstMsg) c.title = text.slice(0, 42);
      c.msgs.push({ role: 'user', content: text }); c.ts = Date.now(); save();
      inputEl.value = ''; autosize();
      retryIndex = c.msgs.length - 1;
    }
    renderMessages(); if (firstMsg) renderSide();
    busy = true;
    sendBtn.disabled = true;
    sendBtn.classList.remove('is-success');
    sendBtn.classList.add('is-sending');
    sendBtn.setAttribute('aria-label', 'Kenji AI odpovídá');
    if (navigator.vibrate) navigator.vibrate(8);
    showTyping(text);

    var history = c.msgs.slice(0, retryIndex).map(function (m) { return { role: m.role, content: m.content }; });
    var reply = '';
    try {
      var sb = A.getSupabase ? await A.getSupabase() : null;
      if (!sb) throw new Error('offline');
      var ctx = userContext();
      var res = await sb.functions.invoke('kenji-ai', { body: { message: text, history: history, context: ctx, anonymousId: anonymousId() } });
      if (res.error) throw res.error;
      if (res.data && res.data.quota) {
        quotaState = normalizeQuota(res.data.quota);
        renderSide(); paintQuota();
      }
      if (res.data && res.data.limited) {
        if (!retrying) {
          c.msgs.pop();
          if (!c.msgs.length) c.title = 'Nový chat';
        }
        c.ts = Date.now(); save();
        hideTyping();
        busy = false;
        sendBtn.classList.remove('is-sending');
        sendBtn.setAttribute('aria-label', 'Odeslat');
        renderMessages(); renderSide(); paintQuota();
        return;
      }
      reply = (res.data && res.data.reply) ? res.data.reply : 'Hmm, nic mě nenapadlo. Zkus to jinak?';
      try { localStorage.setItem('kenji_task_ai', '1'); } catch (e0) {}
      try { document.dispatchEvent(new CustomEvent('kenji:ai-question-sent', { detail: { question: text } })); } catch (e1) {}
    } catch (e) {
      console.warn('kenji-ai', e);
      reply = 'Kenji AI se teď neozval — buď se ještě dopřipravuje, nebo je krátký výpadek. Zkus to prosím za chvíli. Mezitím mrkni do databáze, tam toho je spousta. 🙌';
    }
    hideTyping();
    if (retrying && c.msgs[retryIndex + 1] && c.msgs[retryIndex + 1].role === 'assistant') {
      c.msgs[retryIndex + 1] = { role: 'assistant', content: reply };
      c.msgs = c.msgs.slice(0, retryIndex + 2);
    } else {
      c.msgs.push({ role: 'assistant', content: reply });
    }
    c.ts = Date.now(); save();
    busy = false;
    sendBtn.classList.remove('is-sending');
    sendBtn.classList.add('is-success');
    sendBtn.disabled = false;
    sendBtn.setAttribute('aria-label', 'Odeslat');
    if (navigator.vibrate) navigator.vibrate(18);
    window.setTimeout(function () { sendBtn.classList.remove('is-success'); }, 520);
    renderMessages(); paintQuota(); if (!inputEl.disabled) inputEl.focus();
  }

  // ---------- EVENTY ----------
  function autosize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; }
  inputEl.addEventListener('input', autosize);
  inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  formEl.addEventListener('submit', function (e) { e.preventDefault(); send(); });

  renderSide();
  renderMessages();
  paintQuota();
  quotaReady = loadQuota();
  setTimeout(function () { inputEl.focus(); }, 100);

  // ---------- PŘEDNASTAVENÝ DOTAZ Z URL (?q=...) ----------
  // Umožní dlaždicím na dashboardu otevřít chat rovnou s otázkou.
  (function () {
    try {
      var q = new URLSearchParams(location.search).get('q');
      if (!q) return;
      q = q.slice(0, 400);
      var cur = activeConvo();
      if (cur && cur.msgs.length) { newConvo(); renderSide(); }  // čistý nový chat pro seed
      inputEl.value = q;
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      autosize();
      send();  // rovnou odešli — uživatel klikl s jasným záměrem
    } catch (e) {}
  })();
})();
