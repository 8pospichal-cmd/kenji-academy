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

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(s) {
    var h = esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/^[\-\*]\s+/gm, '• ');
    return h.replace(/\n/g, '<br>');
  }
  // Ověří, že URL tlačítka je bezpečná: interní *.html odkaz, nebo náš Instagram.
  function validBtnUrl(u) {
    if (!u) return false;
    if (/^https?:\/\//i.test(u)) return /^https?:\/\/(www\.)?instagram\.com\/kenjiacademycz\/?$/i.test(u);
    return /^[\w./?=&#-]+\.html(\?[\w./?=&#-]*)?$/i.test(u) && !/[<>"'\s]/.test(u);
  }
  // Rozparsuje odpověď na text + tlačítka + 3 návazné otázky (značky z promptu).
  function parseReply(raw) {
    var buttons = [], asks = [], textLines = [];
    String(raw == null ? '' : raw).split('\n').forEach(function (line) {
      var b = line.match(/^\s*\[\[\s*button\s*\]\]\s*(.+?)\s*::\s*(\S.*?)\s*$/i);
      var a = line.match(/^\s*\[\[\s*ask\s*\]\]\s*(.+?)\s*$/i);
      if (b) { buttons.push({ label: b[1], url: b[2] }); return; }
      if (a) { asks.push(a[1]); return; }
      textLines.push(line);
    });
    return {
      text: textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      buttons: buttons.filter(function (x) { return validBtnUrl(x.url); }).slice(0, 3),
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

  // Sestaví skrytý kontext o uživateli, aby AI odpovídala na míru (v UI se nezobrazuje).
  function userContext() {
    try {
      var b = JSON.parse(localStorage.getItem('kenji_biz_v1') || 'null') || {};
      if (!b.industry) return '';
      var IND = { svatby: 'Svatební foto/video', portret: 'Portrét', produkt: 'Produktové/e-shop', video: 'Video/film', obsah: 'Obsah/sociální sítě', event: 'Event', jine: 'Jiné' };
      var BLK = { klienti: 'málo poptávek/klientů', cena: 'nízké ceny', portfolio: 'slabé portfolio/positioning', cas: 'chaos/nemá systém', zacatek: 'úplný začátek' };
      var parts = [];
      parts.push('obor=' + (IND[b.industry] || b.industry));
      if (b.income) parts.push('aktuální příjem=' + b.income + 'k/měsíc');
      if (b.goal) parts.push('cíl=' + b.goal + ' Kč/měsíc');
      if (b.blocker) parts.push('hlavní problém=' + (BLK[b.blocker] || b.blocker));
      if (b.portfolio != null) parts.push('portfolio=' + (b.portfolio ? 'ano' : 'ne'));
      if (b.web != null) parts.push('web=' + (b.web ? 'ano' : 'ne'));
      var x = JSON.parse(localStorage.getItem('kenji_xp_v1') || 'null');
      if (x && typeof x.xp === 'number') parts.push('XP=' + x.xp + ' (level ' + (Math.floor(x.xp / 100) + 1) + ')');
      var todos = JSON.parse(localStorage.getItem('kenji_todos_v1') || '[]');
      if (Array.isArray(todos)) {
        var act = todos.filter(function (t) { return !t.done; }).map(function (t) { return t.text; }).slice(0, 5);
        if (act.length) parts.push('aktivní úkoly: ' + act.join('; '));
      }
      return '[Kontext o uživateli (neodpovídej na něj přímo, jen ho zohledni v radě): ' + parts.join('; ') + ']';
    } catch (e) { return ''; }
  }

  var store = load();
  function activeConvo() { return store.convos.find(function (c) { return c.id === store.activeId; }) || null; }
  function newConvo() { var c = { id: uid(), title: 'Nový chat', msgs: [], ts: Date.now() }; store.convos.unshift(c); store.activeId = c.id; save(); return c; }
  if (!activeConvo()) newConvo();

  // ---------- HLAVNÍ OBSAH (jen chat) ----------
  ROOT.innerHTML =
    '<div class="ai-chat">' +
      '<div class="ai-messages" id="ai-messages"></div>' +
      '<form class="ai-inputbar" id="ai-form">' +
        '<textarea class="ai-input" id="ai-input" rows="1" placeholder="Zeptej se Kenji AI…" autocomplete="off"></textarea>' +
        '<button class="ai-send" id="ai-send" type="submit" aria-label="Odeslat">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
        '</button>' +
      '</form>' +
      '<div class="ai-disclaimer">Kenji AI umí chybovat. U důležitých věcí (daně, právo) si to ověř.</div>' +
    '</div>';

  var msgsEl = document.getElementById('ai-messages');
  var inputEl = document.getElementById('ai-input');
  var formEl = document.getElementById('ai-form');
  var busy = false;

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
          '<div class="ai-empty-mark">✦</div>' +
          '<div class="ai-empty-title">Čau, jsem Kenji AI.</div>' +
          '<div class="ai-empty-sub">Zeptej se na cokoliv okolo focení, techniky, editace nebo byznysu tvůrce. Odpovím ti po lopatě.</div>' +
          '<div class="ai-chips">' + CHIPS.map(function (t) { return '<button class="ai-chip" type="button">' + esc(t) + '</button>'; }).join('') + '</div>' +
        '</div>';
      msgsEl.querySelectorAll('.ai-chip').forEach(function (b) { b.addEventListener('click', function () { inputEl.value = b.textContent; send(); }); });
      return;
    }
    var lastBot = -1;
    c.msgs.forEach(function (m, i) { if (m.role === 'assistant') lastBot = i; });
    msgsEl.innerHTML = c.msgs.map(function (m, i) {
      if (m.role === 'user') return '<div class="ai-msg user"><div class="ai-bubble">' + fmt(m.content) + '</div></div>';
      var p = parseReply(m.content);
      return '<div class="ai-msg bot"><div class="ai-bot-name"><span class="ai-k">K</span>enji AI</div><div class="ai-bot-text">' + fmt(p.text) + '</div>' +
        renderButtons(p.buttons) +
        (i === lastBot ? renderAsks(p.asks) : '') +
        '</div>';
    }).join('');
    msgsEl.querySelectorAll('.ai-suggest').forEach(function (b) {
      b.addEventListener('click', function () { if (busy) return; inputEl.value = b.getAttribute('data-q'); send(); });
    });
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function showTyping() {
    var d = document.createElement('div');
    d.className = 'ai-msg bot'; d.id = 'ai-typing';
    d.innerHTML = '<div class="ai-bot-name"><span class="ai-k">K</span>enji AI</div><div class="ai-bot-text"><span class="ai-dots"><i></i><i></i><i></i></span></div>';
    msgsEl.appendChild(d); msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function hideTyping() { var t = document.getElementById('ai-typing'); if (t) t.remove(); }

  // ---------- ODESLÁNÍ ----------
  async function send() {
    if (busy) return;
    var text = (inputEl.value || '').trim();
    if (!text) return;
    var c = activeConvo(); if (!c) c = newConvo();
    var firstMsg = !c.msgs.length;
    if (firstMsg) c.title = text.slice(0, 42);
    c.msgs.push({ role: 'user', content: text }); c.ts = Date.now(); save();
    inputEl.value = ''; autosize();
    renderMessages(); if (firstMsg) renderSide();
    busy = true; document.getElementById('ai-send').disabled = true;
    showTyping();

    var history = c.msgs.slice(0, -1).map(function (m) { return { role: m.role, content: m.content }; });
    var reply = '';
    try {
      var sb = A.getSupabase ? await A.getSupabase() : null;
      if (!sb) throw new Error('offline');
      var ctx = userContext();
      var outMsg = ctx ? (ctx + '\n\n' + text) : text;
      var res = await sb.functions.invoke('kenji-ai', { body: { message: outMsg, history: history } });
      if (res.error) throw res.error;
      reply = (res.data && res.data.reply) ? res.data.reply : 'Hmm, nic mě nenapadlo. Zkus to jinak?';
    } catch (e) {
      console.warn('kenji-ai', e);
      reply = 'Kenji AI se teď neozval — buď se ještě dopřipravuje, nebo je krátký výpadek. Zkus to prosím za chvíli. Mezitím mrkni do databáze, tam toho je spousta. 🙌';
    }
    hideTyping();
    c.msgs.push({ role: 'assistant', content: reply }); c.ts = Date.now(); save();
    busy = false; document.getElementById('ai-send').disabled = false;
    renderMessages(); inputEl.focus();
  }

  // ---------- EVENTY ----------
  function autosize() { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px'; }
  inputEl.addEventListener('input', autosize);
  inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  formEl.addEventListener('submit', function (e) { e.preventDefault(); send(); });

  renderSide();
  renderMessages();
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
