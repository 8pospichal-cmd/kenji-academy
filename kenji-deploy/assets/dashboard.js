// ============================================================
// KENJI ACADEMY — OSOBNÍ KOUČ (index.html → #dash-modules)
// ------------------------------------------------------------
// Ne "přehled databáze", ale operační systém:
//   Kde jsem → Kam jdu → Co udělat dnes → Co potom.
// Vše client-side (localStorage). AI napojení přes kenji-ai.html?q=.
// Leaderboard/účast ve výzvě jsou zatím seedované (do backendu XP).
// ============================================================
(function () {
  var MOUNT = document.getElementById('dash-modules');
  if (!MOUNT) return;

  var BIZ = 'kenji_biz_v1', TODO = 'kenji_todos_v1', XP = 'kenji_xp_v1',
      DAYS = 'kenji_days_v1', CHAL = 'kenji_challenge_v1', MYWINS = 'kenji_mywins_v1',
      READ = 'kenji_read_v1', HISTORY = 'kenji_article_history_v1';
  var ARTICLES = window.KENJI_ARTICLES || [], CATEGORIES = window.KENJI_CATEGORIES || [];

  // ---------- localStorage ----------
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function aiUrl(q) { return 'kenji-ai.html?q=' + encodeURIComponent(q); }

  // ---------- Obory ----------
  var INDUSTRIES = [
    { id: 'svatby', label: 'Svatební foto/video', emoji: '💍' },
    { id: 'portret', label: 'Portrét / lidé', emoji: '📸' },
    { id: 'produkt', label: 'Produktové / e-shop', emoji: '📦' },
    { id: 'video', label: 'Video / film', emoji: '🎬' },
    { id: 'obsah', label: 'Obsah / sociální sítě', emoji: '📱' },
    { id: 'event', label: 'Event / reportáž', emoji: '🎤' },
    { id: 'jine', label: 'Něco jiného', emoji: '✨' }
  ];
  function industry(id) { for (var i = 0; i < INDUSTRIES.length; i++) if (INDUSTRIES[i].id === id) return INDUSTRIES[i]; return INDUSTRIES[INDUSTRIES.length - 1]; }

  var INCOMES = [
    { id: '0-10', label: 'Do 10k / měsíc' },
    { id: '10-30', label: '10–30k / měsíc' },
    { id: '30-60', label: '30–60k / měsíc' },
    { id: '60-100', label: '60–100k / měsíc' },
    { id: '100+', label: '100k+ / měsíc' }
  ];
  function incomeLabel(id) { for (var i = 0; i < INCOMES.length; i++) if (INCOMES[i].id === id) return INCOMES[i].label; return '—'; }

  var BLOCKERS = [
    { id: 'klienti', label: 'Málo poptávek / klientů', focus: 'získávání klientů' },
    { id: 'cena', label: 'Nízké ceny / neumím říct o víc', focus: 'ceny a nabídka' },
    { id: 'portfolio', label: 'Slabé portfolio / positioning', focus: 'portfolio a positioning' },
    { id: 'cas', label: 'Chaos / nemám systém', focus: 'systém a čas' },
    { id: 'zacatek', label: 'Úplný začátek, nevím kde začít', focus: 'rozjezd' }
  ];
  function blocker(id) { for (var i = 0; i < BLOCKERS.length; i++) if (BLOCKERS[i].id === id) return BLOCKERS[i]; return BLOCKERS[0]; }

  // ---------- Doporučené úkoly podle hlavního problému ----------
  var REC = {
    klienti: [
      { text: 'Oslov 5 potenciálních klientů', why: 'Přímý outreach je nejrychlejší cesta k prvním zakázkám.', mins: 15, cat: 'Klienti', aiQ: 'Jak mám oslovit prvních 5 potenciálních klientů? Dej mi konkrétní postup a co jim napsat.' },
      { text: 'Vytvoř nabídku jednoho konkrétního balíčku', why: 'Konkrétní nabídka se prodává líp než obecné „focení od…".', mins: 20, cat: 'Business', aiQ: 'Pomoz mi sestavit nabídku jednoho konkrétního balíčku pro mé klienty. Zeptej se na detaily.' },
      { text: 'Aktualizuj Instagram BIO', why: 'BIO je vizitka — musí být jasné, co nabízíš a komu.', mins: 10, cat: 'Marketing', aiQ: 'Napiš mi silné Instagram BIO pro můj obor, ať je jasné co nabízím.' },
      { text: 'Nahraj jednu novou práci do komunity', why: 'Aktivita a portfolio na očích přitahují poptávky.', mins: 5, cat: 'Portfolio' },
      { text: 'Zablokuj si 30 min denně na oslovování', why: 'Klienti chodí z konzistence, ne z jednorázové akce.', mins: 5, cat: 'Systém' }
    ],
    cena: [
      { text: 'Spočítej si férovou hodinovku', why: 'Bez čísla střílíš ceny od boku. Kalkulačka to udělá za tebe.', mins: 15, cat: 'Business', aiQ: 'Proveď mě výpočtem férové hodinovky a ceny zakázky krok po kroku.' },
      { text: 'Nastav cenu hlavního balíčku', why: 'Vyjdi z hodinovky a vlastních nákladů, ne z cen konkurence.', mins: 20, cat: 'Business', aiQ: 'Pomoz mi nastavit cenu mého hlavního balíčku. Zeptej se na náklady a čas.' },
      { text: 'Přidej prémiový balíček (kotva)', why: 'Dražší varianta zvedne vnímanou hodnotu i průměrnou objednávku.', mins: 15, cat: 'Business', aiQ: 'Jak sestavím prémiový balíček jako cenovou kotvu?' },
      { text: 'Zkus říct o vyšší cenu u příští poptávky', why: 'Cena roste jen tím, že si o ni řekneš.', mins: 5, cat: 'Mindset', aiQ: 'Jak mám klientovi říct o vyšší cenu, aby to prošlo?' },
      { text: 'Sepiš, co všechno v ceně dostávají', why: 'Když vidí hodnotu, cena přestane být problém.', mins: 15, cat: 'Marketing' }
    ],
    portfolio: [
      { text: 'Vyber 12 nejlepších prací do portfolia', why: 'Kvalita nad kvantitou — 12 top prací prodává líp než 50 průměrných.', mins: 30, cat: 'Portfolio', aiQ: 'Jak vybrat nejsilnější fotky do portfolia a čím se řídit?' },
      { text: 'Ujasni si, pro koho jsi (positioning)', why: '„Fotím všechno" neprodává. Konkrétní zaměření ano.', mins: 20, cat: 'Positioning', aiQ: 'Pomoz mi vyladit positioning — pro koho jsem a čím se liším.' },
      { text: 'Sjednoť styl úprav napříč portfoliem', why: 'Konzistentní styl působí profesionálně a zapamatovatelně.', mins: 25, cat: 'Editace' },
      { text: 'Aktualizuj web / hlavní odkaz', why: 'Portfolio musí být tam, kam pošleš klienta.', mins: 20, cat: 'Web' },
      { text: 'Nahraj jednu novou práci do komunity', why: 'Zpětná vazba tě posune rychleji než domýšlení.', mins: 5, cat: 'Portfolio' }
    ],
    cas: [
      { text: 'Sepiš svůj proces od poptávky po předání', why: 'Co je sepsané, to jde zautomatizovat a delegovat.', mins: 25, cat: 'Systém', aiQ: 'Pomoz mi sepsat proces od poptávky po předání zakázky.' },
      { text: 'Připrav si šablonu odpovědi na poptávku', why: 'Ušetří hodiny a zrychlí reakci — kdo odpoví první, často bere.', mins: 20, cat: 'Systém', aiQ: 'Napiš mi šablonu profi odpovědi na poptávku.' },
      { text: 'Zaveď jeden nástroj na kalendář/úkoly', why: 'Hlava není úložiště. Systém uvolní kapacitu na tvorbu.', mins: 15, cat: 'Systém' },
      { text: 'Vyber si 2 hlavní kanály a zbytek pusť', why: 'Roztříštěnost žere čas. Míň kanálů, víc dopadu.', mins: 10, cat: 'Marketing' },
      { text: 'Naplánuj obsah na příští týden dopředu', why: 'Předpřipravený obsah = konzistence bez stresu.', mins: 20, cat: 'Marketing' }
    ],
    zacatek: [
      { text: 'Vyber si, na co se zaměříš', why: 'Jedno jasné zaměření tě rozjede rychleji než „umím všechno".', mins: 15, cat: 'Start', aiQ: 'Jsem úplně na začátku. Pomoz mi vybrat, na co se zaměřit.' },
      { text: 'Nafoť 3 cvičné práce do portfolia', why: 'Portfolio nevzniká čekáním na klienty — vytvoř ho sám.', mins: 30, cat: 'Portfolio' },
      { text: 'Založ/uprav Instagram profil', why: 'Potřebuješ místo, kam poslat lidi a ukázat, co umíš.', mins: 20, cat: 'Marketing', aiQ: 'Jak si mám nastavit Instagram profil jako začínající tvůrce?' },
      { text: 'Oslov 3 lidi z okolí na cvičné focení', why: 'První zakázky bývají od lidí, které znáš.', mins: 15, cat: 'Klienti' },
      { text: 'Přečti si článek Začátečník', why: 'Rychlý základ, ať nevynalézáš kolo.', mins: 10, cat: 'Vzdělání' }
    ]
  };

  // ---------- Týdenní výzvy (rotují po ISO týdnech) ----------
  var CHALLENGES = [
    { t: 'Ukaž svoji nejlepší fotku tohoto týdne', d: 'Nahraj práci, na kterou jsi tento týden nejvíc hrdý.' },
    { t: 'Nejlepší portrét', d: 'Vyber a nahraj svůj nejsilnější portrét.' },
    { t: 'Before / After edit', d: 'Ukaž originál i výslednou úpravu vedle sebe.' },
    { t: 'Natoč 30sekundové video', d: 'Krátké video z tvojí tvorby nebo zákulisí.' },
    { t: 'Oslov 10 klientů', d: 'Pošli 10 nabídek a dej vědět, jak to dopadlo.' },
    { t: 'Redesignuj svoje portfolio', d: 'Vyber 12 top prací a ukaž nový výběr.' },
    { t: 'Vytvoř nabídku balíčku', d: 'Sestav a ukaž nabídku jednoho konkrétního balíčku.' },
    { t: 'Ukaž svůj největší fail', d: 'Co se nepovedlo a co ses z toho naučil.' },
    { t: 'Ukaž svoji nejlépe placenou práci', d: 'Zakázka, za kterou ses nemusel stydět ani na faktuře.' }
  ];

  // ---------- Seed komunitních úspěchů (do backendu) ----------
  var WINS_SEED = [
    { n: 'Martin', t: 'získal první svatbu za 18 000 Kč' },
    { n: 'Klára', t: 'dokončila nové portfolio' },
    { n: 'Jakub', t: 'získal klienta přes cold outreach' },
    { n: 'Eliška', t: 'zvedla ceny o 30 % a klienti zůstali' }
  ];

  // ---------- Seed leaderboard (do backendu XP) ----------
  var LB_SEED = [
    { n: 'Tomáš', xp: 740 }, { n: 'Klára', xp: 690 }, { n: 'David', xp: 620 },
    { n: 'Martin', xp: 570 }, { n: 'Lucie', xp: 510 }, { n: 'Petr', xp: 450 },
    { n: 'Eva', xp: 410 }, { n: 'Jakub', xp: 360 }, { n: 'Nikola', xp: 300 },
    { n: 'Adam', xp: 240 }, { n: 'Bára', xp: 180 }
  ];
  var LB_TOTAL = 286;

  // ---------- Profil ----------
  function bizGet() { return jget(BIZ, {}) || {}; }
  function bizSet(b) { jset(BIZ, b); }
  function profileComplete() { var b = bizGet(); return !!(b.industry && b.blocker && b.goal); }

  // ---------- Personalizovaný obsah a vzdělávací cesty ----------
  var FOCUS_ARTICLES = {
    klienti: ['prvni-klienti', 'cold-outreach', 'portfolio'],
    cena: ['cenik-ktery-prodava', 'hodina-vs-balicky', 'prezentace-ceniku'],
    portfolio: ['konkurence-pozice', 'portfolio', 'storytelling'],
    cas: ['onboarding', 'follow-up', 'planovani-roku'],
    zacatek: ['expozice', 'jak-vybrat-fotak', 'prehled-oboru']
  };
  var FOCUS_CATEGORY = { klienti: 'byznys', cena: 'byznys', portfolio: 'byznys', cas: 'byznys', zacatek: 'zacatecnik' };
  function article(slug) { return ARTICLES.find(function (item) { return item.slug === slug; }); }
  function readSlugs() { var value = jget(READ, []); return Array.isArray(value) ? value : []; }
  function historyItems() { var value = jget(HISTORY, []); return Array.isArray(value) ? value : []; }
  function articleUrl(item, resume) { return item ? item.url + (resume ? '?continue=1' : '') : '#'; }
  function isMember() {
    var A = window.KenjiAuth;
    return !!(A && typeof A.isMember === 'function' && A.isMember());
  }
  function isFree(slug) { return (window.KENJI_FREE_SLUGS || []).indexOf(slug) !== -1; }

  function learningOverview(b) {
    var read = readSlugs();
    var history = historyItems();
    var lastEntry = history.find(function (entry) { return article(entry.slug); });
    var last = lastEntry && article(lastEntry.slug);
    var recList = (FOCUS_ARTICLES[b.blocker] || FOCUS_ARTICLES.klienti).map(article).filter(Boolean);
    var recommended = recList.find(function (item) { return read.indexOf(item.slug) === -1 && (!last || item.slug !== last.slug); }) || recList[0];
    var total = ARTICLES.filter(function (item) { return item.status === 'published'; }).length;
    var pct = total ? Math.round(read.length / total * 100) : 0;
    var h = '<div class="co-grid co-learning">';

    if (last) {
      var lp = Math.max(4, Math.min(100, Number(lastEntry.progress) || 4));
      h += '<section class="co-card co-continue"><div class="co-card-head"><h2 class="co-card-title">Pokračovat v databázi</h2><span class="co-count">' + lp + ' %</span></div>' +
        '<a class="co-content-link" href="' + esc(articleUrl(last, true)) + '"><span class="co-content-icon">' + esc(last.icon) + '</span><span class="co-content-main"><strong>' + esc(last.title) + '</strong><span>' + esc(last.desc) + '</span></span><span class="co-content-arrow">→</span></a>' +
        '<div class="co-content-progress"><i style="width:' + lp + '%"></i></div></section>';
    } else {
      var start = recommended || article('expozice');
      h += '<section class="co-card co-continue"><div class="co-card-head"><h2 class="co-card-title">Začni tady</h2><span class="co-count">První krok</span></div>' +
        '<a class="co-content-link" href="' + esc(articleUrl(start)) + '"><span class="co-content-icon">' + esc(start.icon) + '</span><span class="co-content-main"><strong>' + esc(start.title) + '</strong><span>' + esc(start.desc) + '</span></span><span class="co-content-arrow">→</span></a></section>';
    }

    h += '<section class="co-card co-for-you"><div class="co-card-head"><h2 class="co-card-title"><span class="co-ask-mark">✦</span> Obsah pro tvůj focus</h2><span class="co-count">' + read.length + ' / ' + total + '</span></div>' +
      '<p class="co-for-you-reason">Podle toho, že teď řešíš <strong>' + esc(blocker(b.blocker).focus) + '</strong>, je pro tebe nejhodnotnější tento další krok.</p>' +
      (recommended ? '<a class="co-content-link" href="' + esc(articleUrl(recommended)) + '"><span class="co-content-icon">' + esc(recommended.icon) + '</span><span class="co-content-main"><strong>' + esc(recommended.title) + '</strong><span>' + esc(recommended.desc) + '</span></span><span class="co-content-arrow">→</span></a>' : '') +
      '<div class="co-total-progress"><span><i style="width:' + Math.max(2, pct) + '%"></i></span><small>' + pct + ' % databáze přečteno</small></div></section>';
    h += '</div>';
    return h;
  }

  function categoryPaths(b) {
    var read = readSlugs(), member = isMember(), focusCat = FOCUS_CATEGORY[b.blocker];
    var cats = CATEGORIES.filter(function (cat) { return Array.isArray(cat.path) && cat.path.length; });
    cats.sort(function (a, z) { return (z.id === focusCat) - (a.id === focusCat); });
    var cards = cats.map(function (cat) {
      var items = cat.path.map(article).filter(Boolean);
      var done = items.filter(function (item) { return read.indexOf(item.slug) !== -1; }).length;
      var next = items.find(function (item) { return read.indexOf(item.slug) === -1; }) || items[items.length - 1];
      var steps = items.map(function (item, index) {
        var finished = read.indexOf(item.slug) !== -1;
        var locked = !member && !isFree(item.slug);
        return '<li class="co-path-step' + (finished ? ' is-done' : '') + '"><span class="co-path-num">' + (finished ? '✓' : (index + 1)) + '</span><span>' + esc(item.title) + '</span>' + (locked ? '<span class="co-path-lock" title="Plný přístup">🔒</span>' : '') + '</li>';
      }).join('');
      return '<article class="co-path-card' + (cat.id === focusCat ? ' is-focus' : '') + '"><div class="co-path-head"><span class="co-path-icon">' + esc(cat.icon) + '</span><div><h3>' + esc(cat.name) + '</h3><p>' + esc(cat.desc) + '</p></div>' + (cat.id === focusCat ? '<span class="co-path-badge">Pro tebe</span>' : '') + '</div>' +
        '<ol class="co-path-list">' + steps + '</ol><div class="co-path-foot"><span>' + done + ' / ' + items.length + ' hotovo</span><a href="' + esc(articleUrl(next)) + '">' + (done ? 'Pokračovat' : 'Začít') + ' →</a></div></article>';
    }).join('');
    return '<section class="co-paths"><div class="co-section-head"><div><h2>Procházej podle cíle</h2><p>Každá cesta má doporučené pořadí. Nemusíš hádat, čím začít.</p></div></div><div class="co-path-grid">' + cards + '</div></section>';
  }

  // ---------- Úkoly ----------
  function todosGet() { var t = jget(TODO, []); return Array.isArray(t) ? t : []; }
  function todosSet(t) { jset(TODO, t); }
  function seedTasks(blk) {
    var list = REC[blk] || REC.klienti;
    // Goal gradient: první krok (profil + cíl) je hotový hned — start na 1/6, ne na nule.
    var tasks = [{ id: uid(), text: 'Nastav si profil a cíl na měsíc', why: '', mins: null, cat: 'Start', aiQ: '', done: true, rec: true }];
    list.forEach(function (r) { tasks.push({ id: uid(), text: r.text, why: r.why, mins: r.mins, cat: r.cat, aiQ: r.aiQ || '', done: false, rec: true }); });
    todosSet(tasks);
  }

  // ---------- XP ----------
  function xpGet() { var x = jget(XP, null); if (!x || typeof x.xp !== 'number') x = { xp: 0, log: [] }; if (!Array.isArray(x.log)) x.log = []; return x; }
  function xpSet(x) { jset(XP, x); }
  function hasXpKey(x, key) { return x.log.some(function (e) { return e.k === key; }); }
  function addXp(amount, reason, onceKey) {
    var x = xpGet();
    if (onceKey && hasXpKey(x, onceKey)) return 0;
    x.xp += amount; x.log.push({ k: onceKey || null, a: amount, r: reason, t: Date.now() });
    if (x.log.length > 300) x.log = x.log.slice(-300);
    xpSet(x); return amount;
  }
  // Dorovnání XP z obsahu (čtení/kvíz se zaznamenává jinde) — jednorázově per položka
  function reconcileContentXp() {
    var read = jget('kenji_read_v1', []); if (Array.isArray(read)) read.forEach(function (slug) { addXp(5, 'Přečtený článek', 'read:' + slug); });
    var q = jget('kenji_quiz_v1', null); if (q && Array.isArray(q.passed)) q.passed.forEach(function (b) { addXp(15, 'Získaný pásek', 'quiz:' + b); });
  }
  function levelOf(xp) { return Math.floor(xp / 100) + 1; }
  function levelFloor(lvl) { return (lvl - 1) * 100; }

  // ---------- Streak ----------
  function dstr(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function recordDay() {
    var days = jget(DAYS, []); if (!Array.isArray(days)) days = [];
    var t = dstr(new Date());
    if (days.indexOf(t) === -1) { days.push(t); days = days.slice(-120); jset(DAYS, days); }
    return days;
  }
  function streakOf(days) {
    var set = {}; days.forEach(function (d) { set[d] = 1; });
    var s = 0, cur = new Date();
    for (;;) { if (set[dstr(cur)]) { s++; cur.setDate(cur.getDate() - 1); } else break; }
    return s;
  }
  function weekStrip(days) {
    var set = {}; days.forEach(function (d) { set[d] = 1; });
    var now = new Date(); var dow = (now.getDay() + 6) % 7; // 0=Po
    var monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0, 0, 0, 0);
    var names = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'], out = [];
    for (var i = 0; i < 7; i++) { var d = new Date(monday); d.setDate(monday.getDate() + i); out.push({ name: names[i], on: !!set[dstr(d)], today: i === dow, future: i > dow }); }
    return out;
  }

  // ---------- Týden / výzva ----------
  function isoWeek(d) { var t = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day + 3); var first = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7); }
  function weekKey() { var d = new Date(); return d.getFullYear() + '-W' + isoWeek(d); }
  function currentChallenge() { return CHALLENGES[isoWeek(new Date()) % CHALLENGES.length]; }
  function daysLeftInWeek() { var now = new Date(); return 7 - ((now.getDay() + 6) % 7) - 1 + (now.getHours() < 23 ? 1 : 0); }
  function daysLeftText(n) { if (n <= 0) return 'poslední den'; if (n === 1) return 'zbývá 1 den'; if (n >= 2 && n <= 4) return 'zbývají ' + n + ' dny'; return 'zbývá ' + n + ' dní'; }
  function challengeJoined() { var c = jget(CHAL, {}); return !!(c && c[weekKey()]); }
  function joinChallenge() { var c = jget(CHAL, {}) || {}; if (!c[weekKey()]) { c[weekKey()] = true; jset(CHAL, c); addXp(50, 'Týdenní výzva', 'chal:' + weekKey()); } }

  // ---------- Jméno ----------
  function firstName() {
    try { var u = jget('kenji_user', null); var n = u && (u.name || (u.email ? u.email.split('@')[0] : '')); if (!n) return ''; n = String(n).split(/[\s.@]/)[0]; return n.charAt(0).toUpperCase() + n.slice(1); } catch (e) { return ''; }
  }

  // ============================================================
  //  RENDER
  // ============================================================
  // Smart defaults — nováček jen skenuje a upravuje (méně rozhodovací únavy).
  var editingProfile = false, showDone = false;
  var pendOnb = { industry: 'svatby', income: '10-30', goal: 100000, blocker: 'klienti', portfolio: true, web: false };

  function render() {
    recordDay();
    var days = jget(DAYS, []);
    var b = bizGet();

    if (!profileComplete() || editingProfile) { MOUNT.innerHTML = onboardingCard(b); return; }

    var x = xpGet(), lvl = levelOf(x.xp), streak = streakOf(days), ind = industry(b.industry), blk = blocker(b.blocker);
    var levelPct = Math.max(6, x.xp % 100);            // nikdy prázdný pruh (goal gradient)
    var toNext = 100 - (x.xp % 100);
    var todos = todosGet();
    var active = todos.filter(function (t) { return !t.done; });
    var done = todos.filter(function (t) { return t.done; });
    var name = firstName();
    // Získal dnes nějaké XP? (pro loss-framing nudge)
    var startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    var earnedToday = (x.log || []).some(function (e) { return e.t >= startToday.getTime(); });

    var h = '';

    // 1) HLAVIČKA
    h += '<div class="co-head">';
    h += '<div class="co-head-main">';
    h += '<h1 class="co-hi">Vítej zpátky' + (name ? ', ' + esc(name) : '') + ' 👋</h1>';
    h += '<p class="co-goal"><span class="co-goal-amt">🎯 Cíl: ' + esc(fmtCzk(b.goal)) + ' / měsíc</span></p>';
    var isGuest = !!(window.KenjiAuth && window.KenjiAuth.isLoggedIn && !window.KenjiAuth.isLoggedIn());
    h += '<p class="co-sub">' + ind.emoji + ' ' + esc(ind.label) + ' · Aktuální focus: <strong>' + esc(blk.focus) + '</strong> · <button class="co-editprofile" data-act="prof-edit">Upravit profil</button>' +
      (isGuest ? ' · <button class="co-editprofile co-saveplan-link" data-act="save-plan">💾 Ulož si plán</button>' : '') + '</p>';
    h += '</div>';
    h += '<div class="co-badges">';
    h += '<div class="co-streak-badge"><span class="co-fire">🔥</span><strong>' + streak + '</strong><span>' + (streak === 1 ? 'den v kuse' : 'dní v kuse') + '</span></div>';
    h += '<div class="co-xp-badge"><strong>' + x.xp + ' XP</strong><span>Level ' + lvl + '</span>' +
      '<span class="co-xpbar" title="' + toNext + ' XP do levelu ' + (lvl + 1) + '"><i style="width:' + levelPct + '%"></i></span></div>';
    h += '</div>';
    h += '</div>';

    // 5) LOSS FRAMING: pobídka udržet sérii (jen když dnes ještě nezískal XP)
    if (!earnedToday && streak >= 1) {
      h += '<div class="co-streaknudge"><span class="co-fire">🔥</span> Dnes jsi ještě nezískal žádné XP — <strong>splň jeden úkol</strong> a udrž svou ' + streak + 'denní sérii, ať o ni nepřijdeš.</div>';
    }

    // Obsah se mění podle historie čtení a aktuálního problému uživatele.
    h += learningOverview(b);

    // 2) NA ČEM TEĎ PRACUJEŠ + 3) AI DOPORUČUJE (2 sloupce)
    h += '<div class="co-grid co-grid-tasks">';

    // Úkoly
    h += '<section class="co-card co-tasks">';
    h += '<div class="co-card-head"><h2 class="co-card-title">Na čem teď pracuješ</h2><span class="co-count">' + active.length + ' aktivní</span></div>';
    if (!active.length) {
      h += '<div class="co-empty">Všechno hotovo! 🎉 Přidej si další úkol nebo mrkni, co doporučuje Kenji AI.</div>';
    } else {
      h += '<ul class="co-tasklist">' + active.slice(0, 5).map(taskRow).join('') + '</ul>';
    }
    // přidat vlastní
    h += '<form class="co-taskadd" data-act="task-add"><input class="co-taskadd-input" type="text" maxlength="120" placeholder="Přidej vlastní úkol…" aria-label="Nový úkol"><button class="co-taskadd-btn" type="submit">＋</button></form>';
    if (done.length) {
      h += '<button class="co-donetoggle" data-act="toggle-done">' + (showDone ? '▾ Skrýt hotové' : '▸ Hotové (' + done.length + ')') + '</button>';
      if (showDone) h += '<ul class="co-tasklist co-tasklist-done">' + done.map(taskRow).join('') + '</ul>';
    }
    h += '</section>';

    // AI doporučuje (prioritizér nad úkoly)
    h += aiRecommendCard(b, blk, active);

    h += '</div>'; // /co-grid-tasks

    // 4) ZEPTEJ SE KENJI AI
    var qp = quickPrompts(blk);
    h += '<section class="co-card co-ask">';
    h += '<div class="co-ask-head"><span class="co-ask-mark">✦</span><div><h2 class="co-card-title">Zeptej se Kenji AI</h2><p class="co-ask-sub">S čím ti dnes můžu pomoct?</p></div></div>';
    h += '<form class="co-ask-form" data-act="ai-ask"><input class="co-ask-input" type="text" maxlength="300" placeholder="Napiš cokoliv… třeba „Co mám dělat tento týden?"" aria-label="Dotaz na Kenji AI"><button class="co-ask-btn" type="submit">Zeptat se →</button></form>';
    h += '<div class="co-quick">' + qp.map(function (q) { return '<a class="co-quick-chip" href="' + esc(aiUrl(q)) + '">' + esc(q) + '</a>'; }).join('') + '</div>';
    h += '</section>';

    // Kategorie jako vedené cesty, ne jako plochý seznam desítek článků.
    h += categoryPaths(b);

    // 5) TÝDENNÍ VÝZVA + 6) ÚSPĚCHY KOMUNITY
    h += '<div class="co-grid">';
    h += challengeCard();
    h += winsCard();
    h += '</div>';

    // 7) LEADERBOARD (profil se edituje z hlavičky)
    h += leaderboardCard(x.xp, name);

    MOUNT.innerHTML = h;
  }

  // ---------- Úkol (řádek) ----------
  function taskRow(t) {
    var chips = '';
    if (t.mins) chips += '<span class="co-task-chip co-task-time">⏱ ' + esc(t.mins) + ' min</span>';
    if (t.cat) chips += '<span class="co-task-chip">' + esc(t.cat) + '</span>';
    var ai = (t.aiQ || t.text) ? '<a class="co-task-ai" href="' + esc(aiUrl(t.aiQ || ('Poraď mi s úkolem: ' + t.text))) + '">Zeptat se Kenji AI</a>' : '';
    return '<li class="co-task' + (t.done ? ' is-done' : '') + '" data-id="' + t.id + '">' +
      '<button class="co-task-check" data-act="task-toggle" data-id="' + t.id + '" aria-label="Hotovo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11"/></svg></button>' +
      '<div class="co-task-body">' +
        '<div class="co-task-top"><span class="co-task-title">' + esc(t.text) + '</span>' +
          '<button class="co-task-del" data-act="task-del" data-id="' + t.id + '" aria-label="Smazat">✕</button></div>' +
        (t.why ? '<p class="co-task-why">' + esc(t.why) + '</p>' : '') +
        '<div class="co-task-meta">' + chips + '</div>' +
        (t.done ? '' : '<div class="co-task-cta"><button class="co-task-done" data-act="task-toggle" data-id="' + t.id + '">Dokončit</button>' + ai + '</div>') +
      '</div>' +
    '</li>';
  }

  // ---------- AI doporučuje (rozhoduje prioritu, neduplikuje úkoly) ----------
  function aiRecommendCard(b, blk, active) {
    // Zdůvodnění podle hlavního problému
    var reasonMap = {
      klienti: (b.portfolio ? 'Portfolio už z velké části máš, takže teď neřeš další techniku. ' : '') + 'Tvůj největší problém je teď získávání klientů — na to soustřeď energii.',
      cena: 'Necháváš peníze na stole. Než sháníš víc klientů, zvedni hodnotu jedné zakázky.',
      portfolio: 'Bez silného portfolia je všechno ostatní těžší. Teď je tvůj základ portfolio a positioning.',
      cas: 'Nemáš problém s tvorbou, ale se systémem. Uvolni si kapacitu a zbytek pojede sám.',
      zacatek: 'Jsi na startu — nejrychlejší posun je jedno jasné zaměření a první reálná práce.'
    };
    var reasoning = reasonMap[b.blocker] || reasonMap.klienti;

    var head = '<div class="co-card-head"><h2 class="co-card-title"><span class="co-ask-mark">✦</span> Kenji AI doporučuje</h2></div>';

    // Pokud má aktivní úkoly → urči prioritu #1 z nich (žádná duplicita)
    if (active && active.length) {
      var t = active[0];
      var aiQ = t.aiQ || ('Poraď mi konkrétně s úkolem: ' + t.text);
      return '<section class="co-card co-airec">' + head +
        '<p class="co-airec-reason">' + esc(reasoning) + '</p>' +
        '<div class="co-airec-step"><span class="co-airec-label">Začni tímhle · priorita č. 1</span><p>' + esc(t.text) + '</p></div>' +
        '<div class="co-airec-meta">' + (t.mins ? '<span>⏱ ' + esc(t.mins) + ' min</span>' : '') + '<span>🎯 Dopad: <strong>vysoký</strong></span></div>' +
        '<div class="co-airec-cta">' +
          '<button class="co-btn-primary" data-act="task-toggle" data-id="' + t.id + '">Hotovo ✓</button>' +
          '<a class="co-btn-ghost" href="' + esc(aiUrl(aiQ)) + '">Zeptat se Kenji AI</a>' +
        '</div>' +
      '</section>';
    }

    // Žádné aktivní úkoly → navrhni nový další krok
    var stepMap = {
      klienti: { s: 'Vytvoř nabídku jednoho konkrétního balíčku pro tvoje klienty.', q: 'Pomoz mi vytvořit nabídku jednoho konkrétního balíčku pro mé klienty. Zeptej se na detaily.', m: 20 },
      cena: { s: 'Spočítej si férovou hodinovku a nastav podle ní cenu hlavního balíčku.', q: 'Proveď mě výpočtem férové hodinovky a nastavením ceny hlavního balíčku.', m: 20 },
      portfolio: { s: 'Vyber 12 nejsilnějších prací a sjednoť jejich styl.', q: 'Jak vybrat 12 nejsilnějších prací do portfolia a sjednotit styl?', m: 30 },
      cas: { s: 'Sepiš proces od poptávky po předání a připrav šablonu odpovědi.', q: 'Pomoz mi sepsat proces od poptávky po předání a šablonu odpovědi na poptávku.', m: 25 },
      zacatek: { s: 'Vyber si zaměření a naplánuj 3 cvičné práce do portfolia.', q: 'Jsem na začátku. Pomoz mi vybrat zaměření a naplánovat první 3 cvičné práce.', m: 30 }
    };
    var nx = stepMap[b.blocker] || stepMap.klienti;
    return '<section class="co-card co-airec">' + head +
      '<p class="co-airec-reason">Úkoly máš splněné — pěkný! ' + esc(reasoning) + '</p>' +
      '<div class="co-airec-step"><span class="co-airec-label">Další krok</span><p>' + esc(nx.s) + '</p></div>' +
      '<div class="co-airec-meta"><span>⏱ ' + nx.m + ' min</span><span>🎯 Dopad: <strong>vysoký</strong></span></div>' +
      '<div class="co-airec-cta">' +
        '<button class="co-btn-primary" data-act="rec-add" data-text="' + esc(nx.s) + '" data-mins="' + nx.m + '" data-aiq="' + esc(nx.q) + '">Přidat mezi moje úkoly</button>' +
        '<a class="co-btn-ghost" href="' + esc(aiUrl(nx.q)) + '">Zeptat se Kenji AI</a>' +
      '</div>' +
    '</section>';
  }

  function quickPrompts(blk) {
    var map = {
      klienti: ['Jak získám prvních 5 klientů?', 'Co mám dělat tento týden?', 'Zhodnoť moje ceny'],
      cena: ['Zhodnoť moje ceny', 'Jak říct o vyšší cenu?', 'Co mám dělat tento týden?'],
      portfolio: ['Jak vylepším portfolio?', 'Pro koho bych měl fotit?', 'Co mám dělat tento týden?'],
      cas: ['Jak si udělám v byznysu systém?', 'Co mám delegovat první?', 'Co mám dělat tento týden?'],
      zacatek: ['Kde mám úplně začít?', 'Jak získám první klienty?', 'Co mám dělat tento týden?']
    };
    return map[blk.id] || map.klienti;
  }

  // ---------- Výzva ----------
  function challengeCard() {
    var c = currentChallenge(), joined = challengeJoined(), left = daysLeftInWeek();
    var base = 120 + (isoWeek(new Date()) % 40); if (joined) base += 1;
    return '<section class="co-card co-chal">' +
      '<div class="co-card-head"><h2 class="co-card-title">🏆 Týdenní výzva</h2><span class="co-chal-xp">+50 XP</span></div>' +
      '<h3 class="co-chal-title">' + esc(c.t) + '</h3>' +
      '<p class="co-chal-desc">' + esc(c.d) + '</p>' +
      '<div class="co-chal-meta"><span>👥 ' + base + ' zapojených</span><span>⏱ ' + daysLeftText(left) + '</span></div>' +
      (joined
        ? '<div class="co-chal-joined">✓ Jsi zapojený — díky! Nahraj práci do komunity.</div><a class="co-btn-ghost co-btn-block" href="prispevky.html">Otevřít komunitu →</a>'
        : '<button class="co-btn-primary co-btn-block" data-act="chal-join">Přidat svoji práci</button>') +
    '</section>';
  }

  // ---------- Úspěchy ----------
  function winsCard() {
    // Sdílený pool s pop-upem (nav.js). Fallback na lokální seed.
    var pool = (window.KENJI_COMMUNITY_WINS && window.KENJI_COMMUNITY_WINS.length) ? window.KENJI_COMMUNITY_WINS : WINS_SEED;
    var mine = jget(MYWINS, []); if (!Array.isArray(mine)) mine = [];

    // Úspěch, který se dnes ukázal v pop-upu → dej ho navrch se štítkem „právě teď".
    var featured = null;
    var st = jget('kenji_winannounce_v1', null);
    if (st && st.last && typeof st.idx === 'number' && pool.length) {
      featured = pool[(st.idx - 1 + pool.length) % pool.length];
    }
    var seed = pool.filter(function (w) { return !(featured && w.n === featured.n && w.t === featured.t); });

    var items = [];
    if (featured) items.push({ n: featured.n, t: featured.t, fresh: true });
    mine.forEach(function (w) { items.push({ n: 'Ty', t: w, mine: true }); });
    seed.forEach(function (w) { items.push({ n: w.n, t: w.t }); });
    items = items.slice(0, 5);

    var addedToday = jget('kenji_mywin_day_v1', '') === dstr(new Date());
    return '<section class="co-card co-wins">' +
      '<div class="co-card-head"><h2 class="co-card-title">🏅 Úspěchy komunity</h2><span class="co-chal-xp">+100 XP</span></div>' +
      '<ul class="co-winlist">' + items.map(function (w) {
        return '<li class="co-win' + (w.mine ? ' is-mine' : '') + '"><span class="co-win-dot">🎉</span><span class="co-win-txt"><strong>' + esc(w.n) + '</strong> ' + esc(w.t) + '</span>' + (w.fresh ? '<span class="co-win-fresh">právě teď</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<button class="co-btn-ghost co-btn-block" data-act="win-add"' + (addedToday ? ' disabled' : '') + '>' + (addedToday ? 'Dnes přidáno ✓ — zítra zas' : '+ Přidat svůj úspěch') + '</button>' +
    '</section>';
  }

  // (Profil se needituje samostatnou kartou — z hlavičky přes „Upravit profil".)

  // ---------- Leaderboard ----------
  function leaderboardCard(myXp, name) {
    var rows = LB_SEED.map(function (r) { return { n: r.n, xp: r.xp, me: false }; });
    rows.push({ n: (name || 'Ty'), xp: myXp, me: true });
    rows.sort(function (a, b) { return b.xp - a.xp; });
    var myIdx = rows.findIndex(function (r) { return r.me; });
    var myRank = myIdx + 1;
    var top = rows.slice(0, 5);
    var medals = ['🥇', '🥈', '🥉'];
    var h = '<section class="co-card co-lb">' +
      '<div class="co-card-head"><h2 class="co-card-title">Leaderboard — tento týden</h2></div>' +
      '<ol class="co-lblist">';
    top.forEach(function (r, i) {
      h += '<li class="co-lbrow' + (r.me ? ' is-me' : '') + '"><span class="co-lbrank">' + (medals[i] || (i + 1) + '.') + '</span><span class="co-lbname">' + esc(r.n) + (r.me ? ' <span class="co-lbyou">(ty)</span>' : '') + '</span><span class="co-lbxp">' + r.xp + ' XP</span></li>';
    });
    h += '</ol>';
    if (myRank > 5) {
      var above = rows[myIdx - 1];
      h += '<div class="co-lbme"><span>' + myRank + '. <strong>' + esc(name || 'Ty') + '</strong></span><span>' + myXp + ' XP</span></div>';
      if (above) h += '<p class="co-lbhint">Ještě ' + (above.xp - myXp + 1) + ' XP a předběhneš #' + (myIdx) + '.</p>';
    } else {
      h += '<p class="co-lbhint">Jsi v TOP 5 z ' + LB_TOTAL + ' tvůrců. Drž tempo 🔥</p>';
    }
    h += '<p class="co-lbnote">Jsi #' + myRank + ' z ' + LB_TOTAL + ' tvůrců.</p>';
    h += '</section>';
    return h;
  }

  // ---------- Onboarding ----------
  function onboardingCard(b) {
    var p = editingProfile ? b : pendOnb;
    function chips(list, key, keyField) {
      return list.map(function (x) {
        var id = x.id, lab = (x.emoji ? x.emoji + ' ' : '') + x.label;
        return '<button type="button" class="onb-chip' + (p[key] === id ? ' active' : '') + '" data-onb="' + key + '" data-id="' + id + '">' + esc(lab) + '</button>';
      }).join('');
    }
    var goalVal = p.goal ? p.goal : '';
    var h = '<section class="co-card co-onb">';
    h += '<div class="co-onb-head"><span class="co-onb-mark">✦</span><div><h2 class="co-card-title">' + (editingProfile ? 'Uprav svůj profil' : 'Pojďme ti sestavit plán') + '</h2><p class="co-ask-sub">Řekni nám, kde jsi a kam chceš dojít. Zbytek dořešíme za tebe.</p></div></div>';
    h += '<label class="onb-q">V čem podnikáš?</label><div class="onb-chips">' + chips(INDUSTRIES, 'industry') + '</div>';
    h += '<label class="onb-q">Kolik teď měsíčně vyděláváš focením?</label><div class="onb-chips">' + chips(INCOMES, 'income') + '</div>';
    h += '<label class="onb-q">Kam se chceš dostat? <span class="dm-opt">(cíl / měsíc v Kč)</span></label><input class="onb-goal" type="text" inputmode="numeric" placeholder="např. 100000" value="' + esc(goalVal) + '">';
    h += '<label class="onb-q">Co tě teď nejvíc brzdí?</label><div class="onb-chips">' + chips(BLOCKERS, 'blocker') + '</div>';
    h += '<div class="onb-yesno"><span class="onb-q onb-q-inline">Máš portfolio?</span>' + yesno('portfolio', p) + '</div>';
    h += '<div class="onb-yesno"><span class="onb-q onb-q-inline">Máš web?</span>' + yesno('web', p) + '</div>';
    h += '<div class="co-onb-actions"><button class="co-btn-primary" data-act="onb-save">' + (editingProfile ? 'Uložit profil' : 'Vytvoř můj plán → čeká 5 úkolů') + '</button>' + (editingProfile ? '<button class="co-link" data-act="onb-cancel">Zrušit</button>' : '') + '</div>';
    h += '</section>';
    return h;
  }
  function yesno(key, p) {
    return '<span class="onb-yn">' +
      '<button type="button" class="onb-chip onb-chip-sm' + (p[key] === true ? ' active' : '') + '" data-onb="' + key + '" data-bool="1">Ano</button>' +
      '<button type="button" class="onb-chip onb-chip-sm' + (p[key] === false ? ' active' : '') + '" data-onb="' + key + '" data-bool="0">Ne</button>' +
    '</span>';
  }

  // ---------- Utily ----------
  function fmtCzk(n) { return (Number(n) || 0).toLocaleString('cs-CZ') + ' Kč'; }

  // ---------- XP toast ----------
  function xpToast(amount, label) {
    var el = document.createElement('div');
    el.className = 'co-xptoast';
    el.innerHTML = '<strong>+' + amount + ' XP</strong>' + (label ? '<span>' + esc(label) + '</span>' : '');
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { el.classList.remove('show'); setTimeout(function () { el.remove(); }, 400); }, 1600);
  }

  // ============================================================
  //  EVENTY
  // ============================================================
  MOUNT.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act], [data-onb]');
    if (!el) return;

    // --- Onboarding výběry ---
    if (el.hasAttribute('data-onb')) {
      var key = el.getAttribute('data-onb'), target = editingProfile ? bizGet() : pendOnb;
      if (el.hasAttribute('data-bool')) { target[key] = el.getAttribute('data-bool') === '1'; }
      else { target[key] = el.getAttribute('data-id'); }
      if (editingProfile) bizSet(target); else pendOnb = target;
      // vizuální stav ve skupině
      var grp = el.parentElement;
      grp.querySelectorAll('[data-onb="' + key + '"]').forEach(function (c) { c.classList.remove('active'); });
      el.classList.add('active');
      return;
    }

    var act = el.getAttribute('data-act');

    // --- Onboarding uložení ---
    if (act === 'onb-save') {
      var goalEl = MOUNT.querySelector('.onb-goal');
      var target2 = editingProfile ? bizGet() : pendOnb;
      var goalNum = goalEl ? parseInt((goalEl.value || '').replace(/[^\d]/g, ''), 10) : 0;
      if (goalNum) target2.goal = goalNum;
      if (!target2.industry) { flash('Vyber prosím obor.'); return; }
      if (!target2.blocker) { flash('Vyber, co tě nejvíc brzdí.'); return; }
      if (!target2.goal) { flash('Napiš svůj měsíční cíl.'); return; }
      var firstTime = !editingProfile && !todosGet().length;
      bizSet(target2);
      try { localStorage.setItem('kenji_task_profile', '1'); } catch (e2) {}
      if (firstTime) { seedTasks(target2.blocker); addXp(20, 'Sestavený plán', 'onboard'); }
      editingProfile = false; pendOnb = {};
      reconcileContentXp();
      render();
      if (firstTime) {
        xpToast(20, 'Plán je hotový');
        // Build-before-register: host právě postavil SVŮJ plán → teď nabídni uložení (IKEA/endowment).
        var A = window.KenjiAuth;
        if (A && A.isLoggedIn && !A.isLoggedIn() && A.promptSavePlan) { setTimeout(function () { A.promptSavePlan(); }, 900); }
      }
      return;
    }
    if (act === 'onb-cancel') { editingProfile = false; render(); return; }
    if (act === 'prof-edit') { editingProfile = true; render(); return; }
    if (act === 'save-plan') { if (window.KenjiAuth && window.KenjiAuth.promptSavePlan) window.KenjiAuth.promptSavePlan(); return; }

    // --- Úkoly ---
    if (act === 'task-toggle') {
      var id = el.getAttribute('data-id'), t = todosGet(), justDone = false;
      t.forEach(function (x) { if (x.id === id) { x.done = !x.done; justDone = x.done; } });
      todosSet(t);
      if (justDone) { addXp(20, 'Splněný úkol'); render(); xpToast(20, 'Úkol splněn'); }
      else render();
      return;
    }
    if (act === 'task-del') {
      var id2 = el.getAttribute('data-id');
      todosSet(todosGet().filter(function (x) { return x.id !== id2; })); render(); return;
    }
    if (act === 'toggle-done') { showDone = !showDone; render(); return; }
    if (act === 'rec-add') {
      var t2 = todosGet();
      if (t2.filter(function (x) { return !x.done; }).length >= 5) { flash('Máš plno (max 5 aktivních). Nejdřív něco dokonči.'); return; }
      t2.unshift({ id: uid(), text: el.getAttribute('data-text'), mins: parseInt(el.getAttribute('data-mins'), 10) || null, cat: 'Doporučeno', aiQ: el.getAttribute('data-aiq') || '', done: false, rec: true });
      todosSet(t2); render(); flash('Přidáno mezi úkoly ✓'); return;
    }

    // --- Výzva ---
    if (act === 'chal-join') { joinChallenge(); render(); xpToast(50, 'Zapojen do výzvy'); return; }

    // --- Úspěch (max 1× denně, +100 XP) ---
    if (act === 'win-add') { promptAddWin(); return; }
  });

  // Zápis vlastního úspěchu (z karty i z pop-upu přes ?addwin=1). Max 1× denně, +100 XP.
  function promptAddWin() {
    if (jget('kenji_mywin_day_v1', '') === dstr(new Date())) { flash('Dnes už jsi úspěch přidal — zítra zas 💪'); return; }
    var w = prompt('Jaký úspěch chceš zapsat? (např. „získal jsem první svatbu")', '');
    if (w == null) return; w = w.trim(); if (!w) return;
    var mine = jget(MYWINS, []); if (!Array.isArray(mine)) mine = []; mine.unshift(w.slice(0, 120)); jset(MYWINS, mine);
    jset('kenji_mywin_day_v1', dstr(new Date()));
    addXp(100, 'Zaznamenaný úspěch'); render(); xpToast(100, 'Úspěch zapsán');
  }

  MOUNT.addEventListener('submit', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'task-add') {
      e.preventDefault();
      var input = el.querySelector('.co-taskadd-input'), text = (input.value || '').trim();
      if (!text) return;
      var t = todosGet();
      if (t.filter(function (x) { return !x.done; }).length >= 5) { flash('Máš plno (max 5 aktivních).'); return; }
      t.unshift({ id: uid(), text: text.slice(0, 120), cat: 'Moje', done: false, rec: false });
      todosSet(t); render();
      var ni = MOUNT.querySelector('.co-taskadd-input'); if (ni) ni.focus();
      return;
    }
    if (act === 'ai-ask') {
      e.preventDefault();
      var q = (el.querySelector('.co-ask-input').value || '').trim(); if (!q) return;
      location.href = aiUrl(q); return;
    }
  });

  // drobná hláška
  var flashEl = null;
  function flash(msg) {
    if (flashEl) flashEl.remove();
    flashEl = document.createElement('div'); flashEl.className = 'co-flash'; flashEl.textContent = msg;
    document.body.appendChild(flashEl);
    requestAnimationFrame(function () { flashEl.classList.add('show'); });
    setTimeout(function () { if (flashEl) { flashEl.classList.remove('show'); var f = flashEl; setTimeout(function () { f.remove(); }, 300); flashEl = null; } }, 1800);
  }

  // ---------- Start ----------
  reconcileContentXp();
  render();
  document.addEventListener('kenji-auth-ready', render);

  // Zápis úspěchu spuštěný z pop-upu (odkaz index.html?addwin=1)
  try {
    if (new URLSearchParams(location.search).get('addwin')) {
      history.replaceState(null, '', location.pathname);
      if (profileComplete()) setTimeout(promptAddWin, 350);
    }
  } catch (e) {}
})();
