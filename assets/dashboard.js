// ============================================================
// KENJI ACADEMY — OSOBNÍ KOUČ (index.html → #dash-modules)
// ------------------------------------------------------------
// Ne "přehled databáze", ale operační systém:
//   Kde jsem → Kam jdu → Co udělat dnes → Co potom.
// Vše client-side (localStorage). AI napojení přes kenji-ai.html?q=.
// Leaderboard je zatím seedovaný; účast ve výzvě potvrzuje publikování v komunitě.
// ============================================================
(function () {
  var MOUNT = document.getElementById('dash-modules');
  if (!MOUNT) return;

  var BIZ = 'kenji_biz_v1', TODO = 'kenji_todos_v1', XP = 'kenji_xp_v1',
      DAYS = 'kenji_days_v1', CHAL = 'kenji_challenge_v1', MYWINS = 'kenji_mywins_v1',
      READ = 'kenji_read_v1', HISTORY = 'kenji_article_history_v1',
      ONB_DRAFT = 'kenji_onboarding_draft_v2', ONB_DONE = 'kenji_onboarding_done_v2';
  var ARTICLES = window.KENJI_ARTICLES || [];

  // ---------- localStorage ----------
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function aiUrl(q) { return 'kenji-ai.html?q=' + encodeURIComponent(q); }
  function track(name, data) {
    try { window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: name }, data || {})); } catch (e) {}
  }
  var ICONS = {
    camera: '<path d="M4 8h3l1.4-2h7.2L17 8h3v10H4z"/><circle cx="12" cy="13" r="3.3"/>',
    briefcase: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5h6v2M3 12h18M10 12v2h4v-2"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.4a1.8 1.8 0 0 0 0-3.6h-.7a1.7 1.7 0 0 1 0-3.4H16a5 5 0 0 0 5-5c0-3.3-4-6-9-6z"/><circle cx="7.5" cy="10" r=".7" fill="currentColor"/><circle cx="10" cy="6.8" r=".7" fill="currentColor"/><circle cx="15" cy="7" r=".7" fill="currentColor"/>',
    video: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2z"/>',
    brain: '<path d="M9.5 5.2A3 3 0 0 0 4.8 8a3.2 3.2 0 0 0 .4 5.8A3 3 0 0 0 9.5 18M14.5 5.2A3 3 0 0 1 19.2 8a3.2 3.2 0 0 1-.4 5.8 3 3 0 0 1-4.3 4.2M9.5 4v16M14.5 4v16M7 10h2.5M14.5 14H17"/>',
    scale: '<path d="M12 3v18M5 6h14M7 6l-4 7h8L7 6zM17 6l-4 7h8l-4-7zM8 21h8"/>',
    file: '<path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 17 5-4 3 2 3-3 5 5"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1M16 5.5a3 3 0 0 1 0 5.8M16 14a4.5 4.5 0 0 1 4.5 4.5V19"/>',
    sparkles: '<path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>'
  };
  function uiIcon(name, cls) { return '<svg class="ui-icon ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkles) + '</svg>'; }
  function tactile(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) {} }
  function emptyArt() {
    return '<svg class="kenji-empty-art" viewBox="0 0 180 110" fill="none" aria-hidden="true"><path class="kea-soft" d="M26 78c15-40 39-57 70-49 25 6 42 28 59 51"/><rect x="42" y="33" width="96" height="58" rx="13"/><path d="M61 33l8-12h42l8 12"/><circle cx="90" cy="62" r="20"/><circle class="kea-accent" cx="90" cy="62" r="10"/><path class="kea-accent" d="m85 62 4 4 8-9"/></svg>';
  }

  // ---------- Obory ----------
  var INDUSTRIES = [
    { id: 'svatby', label: 'Svatební foto/video', emoji: '💍' },
    { id: 'portret', label: 'Portrét / lidé', emoji: '📸' },
    { id: 'produkt', label: 'Produktové / e-shop', emoji: '📦' },
    { id: 'video', label: 'Video / film', emoji: '🎬' },
    { id: 'obsah', label: 'Obsah / sociální sítě', emoji: '📱' },
    { id: 'event', label: 'Event / reportáž', emoji: '🎤' },
    { id: 'nemovitosti', label: 'Nemovitosti / interiéry', emoji: '⌂' },
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

  var EXPERIENCES = [
    { id: 'start', label: 'Začínám' },
    { id: 'practice', label: 'Tvořím pro sebe' },
    { id: 'clients', label: 'Mám zakázky' },
    { id: 'fulltime', label: 'Živím se tím' }
  ];
  function experienceLabel(id) { for (var i = 0; i < EXPERIENCES.length; i++) if (EXPERIENCES[i].id === id) return EXPERIENCES[i].label; return EXPERIENCES[0].label; }

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

  // ---------- Seed komunitních úspěchů (do backendu) ----------
  var WINS_SEED = [
    { n: 'Martin', t: 'získal první svatbu za 18 000 Kč' },
    { n: 'Klára', t: 'dokončila nové portfolio' },
    { n: 'Jakub', t: 'získal klienta přes cold outreach' },
    { n: 'Eliška', t: 'zvedla ceny o 30 % a klienti zůstali' }
  ];

  // ---------- Profil ----------
  function bizGet() { return jget(BIZ, {}) || {}; }
  function bizSet(b) { jset(BIZ, b); }
  function profileComplete() {
    var b = bizGet();
    var hasIndustry = (Array.isArray(b.industries) && b.industries.length) || b.industry;
    return !!(hasIndustry && b.experience && b.blocker);
  }

  // ---------- Personalizovaný obsah a vzdělávací cesty ----------
  var FOCUS_ARTICLES = {
    klienti: ['prvni-klienti', 'cold-outreach', 'portfolio'],
    cena: ['cenik-ktery-prodava', 'hodina-vs-balicky', 'prezentace-ceniku'],
    portfolio: ['konkurence-pozice', 'portfolio', 'storytelling'],
    cas: ['onboarding', 'follow-up', 'planovani-roku'],
    zacatek: ['expozice', 'jak-vybrat-fotak', 'prehled-oboru']
  };
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
    var primary = last || recommended || article('expozice');
    var primaryProgress = last ? Math.max(4, Math.min(100, Number(lastEntry.progress) || 4)) : 0;
    var member = isMember();
    var stages = [
      { slug: 'expozice', label: 'Základy', icon: 'camera' },
      { slug: 'prehled-oboru', label: 'Směr', icon: 'compass' },
      { slug: 'portfolio', label: 'Portfolio', icon: 'image' },
      { slug: 'prvni-klienti', label: 'První klienti', icon: 'users' },
      { slug: 'cenik-ktery-prodava', label: 'Stabilní byznys', icon: 'briefcase' }
    ].map(function (stage) { stage.article = article(stage.slug); return stage; }).filter(function (stage) { return stage.article; });
    var current = stages.findIndex(function (stage) { return read.indexOf(stage.slug) === -1; });
    if (current < 0) current = stages.length - 1;
    var completed = stages.filter(function (stage) { return read.indexOf(stage.slug) !== -1; }).length;
    var fill = stages.length > 1 ? Math.min(100, Math.max(0, current / (stages.length - 1) * 100)) : 0;
    var nodes = stages.map(function (stage, index) {
      var done = read.indexOf(stage.slug) !== -1;
      var active = !done && index === current;
      var locked = !member && !isFree(stage.slug);
      return '<a class="co-learning-stage' + (done ? ' is-done' : '') + (active ? ' is-current' : '') + (locked ? ' is-locked' : '') + '" href="' + esc(articleUrl(stage.article)) + '"><span>' + (done ? '✓' : (index + 1)) + '</span><strong>' + esc(stage.label) + '</strong></a>';
    }).join('');
    return '<section class="co-card co-learning-hub" data-tour="database">' +
      '<div class="co-card-head"><div><span class="co-learning-kicker">DATABÁZE PRO TEBE</span><h2 class="co-card-title">' + (last ? 'Pokračuj, kde jsi skončil' : 'Začni jedním správným krokem') + '</h2></div><span class="co-count">' + read.length + ' / ' + total + '</span></div>' +
      '<div class="co-learning-main">' +
        '<div class="co-learning-reason"><span>' + (last ? 'ROZDĚLANÝ ČLÁNEK' : 'DOPORUČENO PRO TVŮJ CÍL') + '</span><p>' + (last ? 'Nemusíš znovu hledat. Navážeme přesně tam, kde jsi přestal.' : 'Teď řešíš <strong>' + esc(blocker(b.blocker).focus) + '</strong>. Tohle je nejkratší cesta k dalšímu posunu.') + '</p></div>' +
        (primary ? '<a class="co-learning-primary" href="' + esc(articleUrl(primary, !!last)) + '"><span class="co-content-icon">' + esc(primary.icon) + '</span><span class="co-content-main"><strong>' + esc(primary.title) + '</strong><span>' + esc(primary.desc) + '</span></span><span class="co-content-arrow">→</span></a>' : '') +
      '</div>' +
      (last ? '<div class="co-content-progress"><i style="width:' + primaryProgress + '%"></i></div>' : '') +
      '<div class="co-learning-progress"><span><i style="width:' + Math.max(2, pct) + '%"></i></span><small>' + pct + ' % databáze</small></div>' +
      '<div class="co-learning-path"><div class="co-learning-path-head"><strong>Tvoje cesta</strong><span>' + completed + ' / ' + stages.length + '</span></div><div class="co-learning-stages"><i class="co-learning-line"><b style="width:' + fill + '%"></b></i>' + nodes + '</div></div>' +
    '</section>';
  }

  // ---------- Úkoly ----------
  function todosGet() { var t = jget(TODO, []); return Array.isArray(t) ? t : []; }
  function todosSet(t) { jset(TODO, t); }
  function seedTasks(blk) {
    var list = REC[blk] || REC.klienti;
    var tasks = [];
    list.forEach(function (r) { tasks.push({ id: uid(), text: r.text, why: r.why, mins: r.mins, cat: r.cat, aiQ: r.aiQ || '', done: false, rec: true }); });
    todosSet(tasks);
  }

  // ---------- XP ----------
  function xpGet() { var x = jget(XP, null); if (!x || typeof x.xp !== 'number') x = { xp: 0, log: [] }; if (!Array.isArray(x.log)) x.log = []; return x; }
  function xpSet(x) { jset(XP, x); }
  function hasXpKey(x, key) { return x.log.some(function (e) { return e.k === key; }); }
  function xpUid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function addXp(amount, reason, onceKey) {
    var x = xpGet();
    if (onceKey && hasXpKey(x, onceKey)) return 0;
    // `u` = jedinečné id neklíčovaných odměn, ať se při synchronizaci účtu mezi zařízeními nezdvojí.
    x.xp += amount; x.log.push({ k: onceKey || null, u: onceKey ? null : xpUid(), a: amount, r: reason, t: Date.now() });
    if (x.log.length > 300) x.log = x.log.slice(-300);
    xpSet(x);
    try { if (window.KenjiXP && window.KenjiXP.push) window.KenjiXP.push(); } catch (e) {}
    return amount;
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
  function weekKey() { return window.KenjiWeeklyChallenge ? window.KenjiWeeklyChallenge.weekKey() : (new Date().getFullYear() + '-W' + isoWeek(new Date())); }
  function currentChallenge() {
    if (window.KenjiWeeklyChallenge) return window.KenjiWeeklyChallenge.current();
    return { key: weekKey(), title: 'Sdílej svůj posun z tohoto týdne', description: 'Napiš, co se povedlo nebo co ses naučil.' };
  }
  function daysLeftInWeek() { var now = new Date(); return 7 - ((now.getDay() + 6) % 7) - 1 + (now.getHours() < 23 ? 1 : 0); }
  function daysLeftText(n) { if (n <= 0) return 'poslední den'; if (n === 1) return 'zbývá 1 den'; if (n >= 2 && n <= 4) return 'zbývají ' + n + ' dny'; return 'zbývá ' + n + ' dní'; }
  function challengeJoined() { var c = jget(CHAL, {}); return !!(c && c[weekKey()]); }

  // ---------- Jméno ----------
  function firstName() {
    try { var u = jget('kenji_user', null); var n = u && (u.name || (u.email ? u.email.split('@')[0] : '')); if (!n) return ''; n = String(n).split(/[\s.@]/)[0]; return n.charAt(0).toUpperCase() + n.slice(1); } catch (e) { return ''; }
  }
  function profileCache() { try { return JSON.parse(localStorage.getItem('kenji_profile_v1') || '{}') || {}; } catch (e) { return {}; } }
  // Vybere se jednou za načtení stránky → mění se při každém reloadu, ale nebliká při re-renderu.
  var GREETING_SEED = Math.floor(Math.random() * 100000);
  function daysSinceLast(days) {
    if (!Array.isArray(days) || !days.length) return null;
    var today = dstr(new Date());
    var prev = days.filter(function (d) { return d !== today; }).sort();
    if (!prev.length) return null;
    return Math.round((new Date(today + 'T00:00:00') - new Date(prev[prev.length - 1] + 'T00:00:00')) / 86400000);
  }
  function greetingFor(days) {
    var gap = daysSinceLast(days);
    var away = [
      'No konečně! Už jsem myslel, že fotíš na mobil. 😅',
      'Dlouho jsme se neviděli — ať to za to stojí. 👊'
    ];
    if (gap === null || gap >= 7) return away[GREETING_SEED % away.length];
    var reg = [
      'Nezapomněl jsi na odrazovou desku? 🪞',
      'Už jsi tady měl bejt před čtyřma minutama, ty magore. ⏱️',
      'Je čas tvořit. 🎬',
      'Světlo nepočká — makej. ☀️',
      'Míň scrollování, víc mačkání spouště. 📸',
      'Baterka nabitá, karta v foťáku? Tak šup. 🔋',
      'Dneska bez výmluv — jen ty a objektiv. 🔥',
      'Zaostři. Na práci i na sebe. 🎯',
      'Tvoje portfolio se samo neudělá. 💪',
      'Klapka, jede se. 🎬'
    ];
    return reg[GREETING_SEED % reg.length];
  }

  function industryNames(b) {
    var ids = Array.isArray(b.industries) && b.industries.length ? b.industries : [b.industry];
    var names = ids.filter(Boolean).map(function (id) { return id === 'jine' && b.industryOther ? b.industryOther : industry(id).label; });
    return names.join(', ');
  }

  function tourCheckpointDone(name) {
    try {
      var state = JSON.parse(localStorage.getItem('kenji_guided_onboarding_v3') || '{}');
      return !!(state.checkpoints && state.checkpoints[name]);
    } catch (e) { return false; }
  }

  function activationTasks(b) {
    var aiPrompt = 'Jsem ' + (industryNames(b) || 'vizuální tvůrce') + ', jsem ve fázi „' + experienceLabel(b.experience) + '“ a teď řeším ' + blocker(b.blocker).focus + '. Pomoz mi vybrat jeden konkrétní krok, který zvládnu tento týden.';
    var rec = (FOCUS_ARTICLES[b.blocker] || []).map(article).filter(function (item) { return item && isFree(item.slug); })[0] || article('expozice');
    var ai = jget('kenji_ai_v1', {}) || {};
    var aiDone = !!(ai.convos && ai.convos.some(function (c) { return c.msgs && c.msgs.some(function (m) { return m.role === 'user'; }); }));
    return [
      { key: 'profile', title: 'Doplň svůj profil', sub: 'Přidej fotku, jméno, Instagram a dvě věty o sobě.', href: 'nastaveni.html', xp: 20, done: localStorage.getItem('kenji_task_profile') === '1', icon: 'camera' },
      { key: 'read', title: 'Projdi první článek', sub: rec ? rec.title : 'Otevři doporučený článek.', href: rec ? rec.url : 'clanky/expozice.html', xp: 20, done: readSlugs().length > 0, icon: 'file' },
      { key: 'ai', title: 'Polož první dotaz Kenji AI', sub: 'Dostaneš konkrétní krok pro tento týden.', href: aiUrl(aiPrompt), xp: 20, done: aiDone || tourCheckpointDone('ai'), icon: 'sparkles' },
      { key: 'intro', title: 'Představ se komunitě', sub: 'Nahraj fotku a napiš, kdo jsi, jak dlouho tvoříš, co fotíš/natáčíš a co čekáš od Academy.', href: 'prispevky.html?category=predstav-se&intro=1', xp: 350, done: localStorage.getItem('kenji_task_intro') === '1', icon: 'user' },
      { key: 'feedback', title: 'Nahraj práci na Foto feedback', sub: 'Sdílej fotku nebo video své tvorby a řekni, s čím chceš poradit — komunita ti dá zpětnou vazbu.', href: 'prispevky.html?category=foto-feedback&onboarding=1', xp: 100, done: localStorage.getItem('kenji_task_community') === '1', icon: 'camera' }
    ];
  }

  function reconcileActivationXp(b) {
    activationTasks(b).forEach(function (task) { if (task.done) addXp(task.xp, task.title, 'activation:' + task.key); });
  }

  function activationPanel(b) {
    var tasks = activationTasks(b), doneCount = tasks.filter(function (t) { return t.done; }).length;
    var next = tasks.find(function (t) { return !t.done; });
    var currentIndex = next ? tasks.indexOf(next) : tasks.length - 1;
    var focus = next || { key: 'complete', title: 'Start máš hotový', sub: 'Máš připravený základ a můžeš pokračovat vlastním tempem.', href: '', xp: 0, done: true, icon: 'target' };
    var focusTag = focus.href ? 'a' : 'div';
    var focusHref = focus.href ? ' href="' + esc(focus.href) + '"' : '';
    var focusCard = '<' + focusTag + ' class="co-activation-focus' + (!next ? ' is-complete' : '') + '"' + focusHref + '>' +
      '<span class="co-activation-focus-icon">' + (next ? uiIcon(focus.icon) : '✓') + '</span>' +
      '<span class="co-activation-focus-copy"><small>' + (next ? 'DALŠÍ KROK · ' + (currentIndex + 1) + ' / ' + tasks.length : 'START DOKONČEN') + '</small><strong>' + esc(focus.title) + '</strong><span>' + esc(focus.sub) + '</span></span>' +
      (next ? '<span class="co-activation-focus-action"><b>+' + focus.xp + ' KP</b><em>Začít <span aria-hidden="true">→</span></em></span>' : '<span class="co-activation-focus-done">' + tasks.length + ' / ' + tasks.length + '</span>') +
    '</' + focusTag + '>';
    var steps = tasks.map(function (t, index) {
      var isCurrent = !!(next && next.key === t.key);
      return '<span class="co-activation-step' + (t.done ? ' is-done' : '') + (isCurrent ? ' is-current' : '') + '"' + (isCurrent ? ' aria-current="step"' : '') + '>' +
        '<span class="co-activation-step-dot">' + (t.done ? '✓' : (index + 1)) + '</span>' +
        '<span class="co-activation-step-copy"><small>' + (t.done ? 'Hotovo' : (isCurrent ? 'Teď' : 'Potom')) + '</small><strong>' + esc(t.title) + '</strong></span>' +
      '</span>';
    }).join('');
    return '<section class="co-activation' + (doneCount === tasks.length ? ' is-complete' : '') + '" data-tour="plan">' +
      '<div class="co-activation-head"><div><span class="co-activation-kicker">TVŮJ START</span><h2>' + (doneCount === tasks.length ? 'Základ máš hotový.' : 'Jeden krok. Potom další.') + '</h2></div><strong><span>' + doneCount + '</span> / ' + tasks.length + '</strong><button class="co-activation-close" type="button" data-act="activation-dismiss" aria-label="Skrýt úvodní průvodce" title="Skrýt úvodní průvodce">✕</button></div>' +
      '<div class="co-activation-progress"><i style="width:' + (doneCount / tasks.length * 100) + '%"></i></div>' +
      focusCard +
      '<div class="co-activation-steps" aria-label="Postup prvními kroky">' + steps + '</div>' +
    '</section>';
  }

  // ============================================================
  //  RENDER
  // ============================================================
  var editingProfile = false, showDone = false, onbStep = 1;
  var pendOnb = jget(ONB_DRAFT, null) || { industries: [], industryOther: '', income: '', experience: '', blocker: '' };
  if (pendOnb._step) onbStep = Math.max(1, Math.min(3, Number(pendOnb._step) || 1));

  function render() {
    recordDay();
    var days = jget(DAYS, []);
    var b = bizGet();

    // Onboarding nikdy nepřekrývá přihlašovací okno: dokud je gate nahoře (blur + login),
    // nespouštíme celoobrazovkový onboarding. Po přihlášení se gate sundá a dashboard
    // se překreslí (kenji-auth-ready) — pak se onboarding případně ukáže čistě.
    var gated = document.body.classList.contains('kenji-gated');
    // Kvíz zaměření (výběr oboru/fáze/priority) ukazujeme jen dvěma lidem:
    //  • hostovi z „Vyzkoušet zdarma" — build-before-register trychtýř (vybere zaměření → pak e-mail),
    //  • komukoliv, kdo si ho VĚDOMĚ otevře z profilu („Upravit zaměření").
    // Přihlášený nový/platící uživatel kvíz NEDOSTÁVÁ — přistane rovnou na informačním dashboardu.
    var isGuestUser = !!(window.KenjiAuth && window.KenjiAuth.isLoggedIn && !window.KenjiAuth.isLoggedIn());
    var showQuiz = editingProfile || (isGuestUser && !profileComplete());
    if (!gated && showQuiz) {
      document.body.classList.add('kenji-onboarding-active');
      MOUNT.innerHTML = onboardingCard(b);
      document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
      return;
    }
    if (gated) { document.body.classList.remove('kenji-onboarding-active'); return; }
    document.body.classList.remove('kenji-onboarding-active');
    reconcileActivationXp(b);

    var x = xpGet(), lvl = levelOf(x.xp), streak = streakOf(days);
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
    var isGuest = !!(window.KenjiAuth && window.KenjiAuth.isLoggedIn && !window.KenjiAuth.isLoggedIn());
    var pc = profileCache();
    var fullName = (pc.displayName || '').trim();
    var fname = fullName ? fullName.split(/\s+/)[0] : name;
    var avatarSrc = (pc.avatar || '').trim();
    var greeting = isGuest ? 'Tvůj plán je připravený.' : greetingFor(days);
    var whoAvatar = avatarSrc
      ? '<span class="co-whoami-av has-image"><img src="' + esc(avatarSrc) + '" alt="" onerror="this.parentNode.classList.remove(\'has-image\');this.remove()"><b>' + esc((fullName || fname || '?').charAt(0).toUpperCase()) + '</b></span>'
      : '<span class="co-whoami-av">' + esc((fullName || fname || '?').charAt(0).toUpperCase()) + '</span>';

    h += '<div class="co-head">';
    h += '<div class="co-head-main">';
    h += '<div class="co-whoami co-whoami-top">' + whoAvatar +
      '<span class="co-whoami-name">' + esc(fullName || fname || 'Tvůj profil') + '</span>' +
      (isGuest ? '<button class="co-saveplan-link" data-act="save-plan">💾 Ulož si plán</button>' : '') + '</div>';
    h += '<h1 class="co-hi">' + esc(greeting) + '</h1>';
    if (b.goal) h += '<p class="co-goal"><span class="co-goal-amt">Cíl: ' + esc(fmtCzk(b.goal)) + ' / měsíc</span></p>';
    h += '</div>';
    h += '<div class="co-badges">';
    var wk = weekStrip(days);
    h += '<div class="co-streak-badge"><div class="co-badge-num"><strong>' + streak + '</strong><span>' + (streak === 1 ? 'den v kuse' : 'dní v kuse') + '</span></div>' +
      '<div class="co-week" aria-label="Aktivita tento týden">' + wk.map(function (d) {
        return '<span class="co-week-day' + (d.on ? ' on' : '') + (d.today ? ' today' : '') + (d.future ? ' future' : '') + '" title="' + d.name + (d.on ? ' · aktivní' : '') + '"><i></i><b>' + esc(d.name) + '</b></span>';
      }).join('') + '</div></div>';
    h += '<div class="co-xp-badge"><div class="co-badge-num"><strong>' + x.xp + '</strong><span>KP · Level ' + lvl + '</span></div>' +
      '<span class="co-xpbar"><i style="width:' + levelPct + '%"></i></span>' +
      '<span class="co-kp-todo">ještě ' + toNext + ' KP do levelu ' + (lvl + 1) + '</span></div>';
    h += '</div>';
    h += '</div>';

    if (!jget('kenji_kp_intro_v1', false)) {
      h += '<div class="co-kpintro"><span class="co-kpintro-ico">⚡</span>' +
        '<div class="co-kpintro-body"><strong>Co jsou Kenji Points (KP)?</strong>' +
        '<p>Sbíráš je za všechno, co tady děláš — čtení, splněné úkoly, kvíz i komunitu. Každých 100 KP = nový level. Čím víc KP, tím výš v žebříčku a tím blíž k odměnám, slevám a speciálním věcem pro nejaktivnější.</p></div>' +
        '<button class="co-kpintro-x" type="button" data-act="kpintro-dismiss" aria-label="Rozumím">Rozumím</button></div>';
    }

    if (!jget('kenji_activation_hidden_v1', false)) h += activationPanel(b);

    // LOSS FRAMING: pobídka udržet sérii — NAD webinářem. Jen když dnes ještě nezískal KP
    // a nezavřel ji dnes křížkem (sama zmizí po prvním získaném KP i další den).
    if (!earnedToday && streak >= 1 && jget('kenji_kpnudge_dismiss_v1', '') !== new Date().toDateString()) {
      h += '<div class="co-streaknudge">' +
        '<span class="co-fire">🔥</span>' +
        '<span class="co-streaknudge-txt">Dnes jsi ještě nezískal žádné KP — <a href="#co-plan">splň jeden úkol</a> a udrž svou ' + streak + 'denní sérii, ať o ni nepřijdeš.</span>' +
        '<button class="co-streaknudge-x" type="button" data-act="kpnudge-dismiss" aria-label="Skrýt upozornění">✕</button>' +
        '</div>';
    }

    h += webinarCard();

    // Obsah se mění podle historie čtení a aktuálního problému uživatele.
    h += learningOverview(b);
    h += workPanel(b, active, done);
    h += communityPulseCard();

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
        '<div class="co-task-meta">' + chips + (t.done ? '' : ai) + '</div>' +
      '</div>' +
    '</li>';
  }

  // ---------- Úkoly a AI v jednom pracovním bloku ----------
  function workPanel(b, active, done) {
    var reasonMap = {
      klienti: (b.portfolio ? 'Portfolio už z velké části máš, takže teď neřeš další techniku. ' : '') + 'Tvůj největší problém je teď získávání klientů — na to soustřeď energii.',
      cena: 'Necháváš peníze na stole. Než sháníš víc klientů, zvedni hodnotu jedné zakázky.',
      portfolio: 'Bez silného portfolia je všechno ostatní těžší. Teď je tvůj základ portfolio a positioning.',
      cas: 'Nemáš problém s tvorbou, ale se systémem. Uvolni si kapacitu a zbytek pojede sám.',
      zacatek: 'Jsi na startu — nejrychlejší posun je jedno jasné zaměření a první reálná práce.'
    };
    var reasoning = reasonMap[b.blocker] || reasonMap.klienti;
    var h = '<section id="co-plan" class="co-card co-work"><div class="co-card-head"><div><span class="co-work-kicker">TVŮJ PLÁN</span><h2 class="co-card-title">Na čem teď pracuješ</h2></div><span class="co-count">' + active.length + ' aktivní</span></div>';
    if (active && active.length) {
      var t = active[0];
      var aiQ = t.aiQ || ('Poraď mi konkrétně s úkolem: ' + t.text);
      h += '<div class="co-priority-task"><button class="co-task-check" data-act="task-toggle" data-id="' + t.id + '" aria-label="Označit jako hotové"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-11"/></svg></button>' +
        '<div class="co-priority-body"><span class="co-priority-label">DNEŠNÍ PRIORITA</span><h3>' + esc(t.text) + '</h3><p>' + esc(t.why || reasoning) + '</p><div class="co-priority-meta">' +
        (t.mins ? '<span>⏱ ' + esc(t.mins) + ' min</span>' : '') + (t.cat ? '<span>' + esc(t.cat) + '</span>' : '') +
        '<a href="' + esc(aiUrl(aiQ)) + '"><span aria-hidden="true">✦</span> Probrat s Kenji AI</a></div></div>' +
        '<button class="co-task-del" data-act="task-del" data-id="' + t.id + '" aria-label="Smazat">✕</button></div>';
      if (active.length > 1) h += '<div class="co-work-next"><span>Potom</span><ul class="co-tasklist">' + active.slice(1, 5).map(taskRow).join('') + '</ul></div>';
    } else {
      var fallback = (REC[b.blocker] || REC.klienti)[0];
      h += '<div class="co-work-empty"><div>' + emptyArt() + '</div><div><strong>Aktivní úkoly máš hotové.</strong><p>Kenji AI ti podle profilu pomůže vybrat další konkrétní krok.</p><a href="' + esc(aiUrl(fallback.aiQ || fallback.text)) + '">✦ Najít další krok s Kenji AI</a></div></div>';
    }
    h += '<form class="co-taskadd" data-act="task-add"><input class="co-taskadd-input" type="text" maxlength="120" placeholder="Přidej vlastní úkol…" aria-label="Nový úkol"><button class="co-taskadd-btn" type="submit" aria-label="Přidat úkol">＋</button></form>';
    if (done.length) {
      h += '<button class="co-donetoggle" data-act="toggle-done">' + (showDone ? '▾ Skrýt hotové' : '▸ Hotové (' + done.length + ')') + '</button>';
      if (showDone) h += '<ul class="co-tasklist co-tasklist-done">' + done.map(taskRow).join('') + '</ul>';
    }
    return h + '</section>';
  }

  // ---------- Výzva a úspěchy v jednom komunitním bloku ----------
  // ---------- Živý webinář ----------
  // Termín dalšího webináře uprav tady. `youtube` nech prázdné, dokud stream neběží
  // (po vyplnění a dosažení času se z tlačítka stane přímý odkaz na živý stream).
  // Výchozí (fallback) webinář. Reálně se přepíše z adminu přes next_webinar().
  var WEBINAR = {
    topic: 'Jak nacenit zakázku tak, aby klient řekl ano',
    at: '2026-09-02T20:00:00',
    youtube: '',
    info: ''
  };
  // Načte nejbližší webinář z adminu a překreslí kartu (fallback = výchozí výše).
  var webinarLoaded = false;
  async function loadWebinar() {
    if (webinarLoaded) return; webinarLoaded = true;
    try {
      var A = window.KenjiAuth;
      var sb = A && A.getSupabase ? await A.getSupabase() : null;
      if (!sb) return;
      var res = await sb.rpc('next_webinar');
      if (res.error || !res.data || !res.data.length) return;
      var w = res.data[0];
      if (w.title) WEBINAR.topic = w.title;
      if (w.starts_at) WEBINAR.at = w.starts_at;
      WEBINAR.youtube = w.link_url || '';
      WEBINAR.info = w.body || '';
      render();
    } catch (e) { console.warn('webinar', e); }
  }
  function webinarCard() {
    var start = new Date(WEBINAR.at).getTime();
    if (!start || isNaN(start)) return '';
    var now = Date.now(), diff = start - now, d = new Date(start);
    var mFull = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    var mShort = ['LED', 'ÚNO', 'BŘE', 'DUB', 'KVĚ', 'ČVN', 'ČVC', 'SRP', 'ZÁŘ', 'ŘÍJ', 'LIS', 'PRO'];
    var dateText = d.getDate() + '. ' + mFull[d.getMonth()] + ' ' + d.getFullYear();
    var timeText = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var isLive = now >= start && now <= start + 3 * 3600 * 1000 && !!WEBINAR.youtube;
    var countdown;
    if (isLive) countdown = '🔴 právě běží';
    else if (diff > 0) {
      var days = Math.floor(diff / 86400000), hrs = Math.floor((diff % 86400000) / 3600000);
      var dWord = days === 1 ? 'den' : (days >= 2 && days <= 4 ? 'dny' : 'dní');
      countdown = days > 0 ? ('zbývá ' + days + ' ' + dWord + (days < 3 ? ' ' + hrs + ' h' : '')) : ('zbývá ' + hrs + ' h ' + Math.floor((diff % 3600000) / 60000) + ' min');
    } else countdown = 'termín brzy potvrdíme';
    var ytLogo = '<svg class="co-webinar-yt" viewBox="0 0 28 20" aria-hidden="true"><rect width="28" height="20" rx="5" fill="#FF0000"/><path d="M11 6l8 4-8 4z" fill="#fff"/></svg>';
    var btn = isLive
      ? '<a class="co-webinar-btn is-live" href="' + esc(WEBINAR.youtube) + '" target="_blank" rel="noopener">' + ytLogo + '<span>Spustit stream</span></a>'
      : '<button class="co-webinar-btn" type="button" data-act="stream-notyet">' + ytLogo + '<span>Spustit stream</span></button>';
    return '<section class="co-card co-webinar' + (isLive ? ' is-live' : '') + '">' +
      '<div class="co-webinar-cal"><span class="co-webinar-cal-m">' + mShort[d.getMonth()] + '</span><span class="co-webinar-cal-d">' + d.getDate() + '</span></div>' +
      '<div class="co-webinar-body">' +
        '<span class="co-webinar-kicker">Živý webinář</span>' +
        '<h3>Doraž na další webinář, připrav si otázky</h3>' +
        '<p class="co-webinar-topic">Téma: ' + esc(WEBINAR.topic) + '</p>' +
        (WEBINAR.info ? '<p class="co-webinar-topic co-webinar-info">' + esc(WEBINAR.info) + '</p>' : '') +
        '<p class="co-webinar-when"><span>📅 ' + dateText + ' · ' + timeText + '</span><strong>⏱ ' + countdown + '</strong></p>' +
        '<div class="co-webinar-action">' + btn + '</div>' +
      '</div>' +
      '<div class="co-webinar-hero" aria-hidden="true"><img src="assets/kenjimen.webp" alt="" width="1025" height="576" loading="lazy" decoding="async"></div>' +
    '</section>';
  }

  function communityPulseCard() {
    var c = currentChallenge(), joined = challengeJoined(), left = daysLeftInWeek();
    var challengeUrl = 'prispevky.html?category=tydenni-vyzva&challenge=' + encodeURIComponent(c.key || weekKey());
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
    items = items.slice(0, 3);

    var winCooldown = winCooldownMs();
    var canAddWin = winCooldown <= 0;
    return '<section class="co-card co-community-pulse"><div class="co-card-head"><div><span class="co-community-kicker">TENTO TÝDEN</span><h2 class="co-card-title">Co se děje v komunitě</h2></div><a class="co-community-all" href="prispevky.html">Otevřít komunitu →</a></div>' +
      '<div class="co-community-pulse-grid"><div class="co-community-challenge"><div class="co-community-subhead"><strong>Týdenní výzva</strong><span>+250 KP</span></div><h3>' + esc(c.title) + '</h3><p>' + esc(c.description) + '</p><div class="co-chal-meta"><span>Pro všechny</span><span>⏱ ' + daysLeftText(left) + '</span></div>' +
      (joined ? '<a class="co-community-cta" href="' + challengeUrl + '">✓ Splněno · otevřít diskuzi</a>' : '<a class="co-community-cta" href="' + challengeUrl + '">Přidat svoji odpověď →</a>') + '</div>' +
      '<div class="co-community-wins"><div class="co-community-subhead"><strong>Poslední úspěchy</strong><span>+100 KP</span></div><ul class="co-winlist">' + items.map(function (w) {
        return '<li class="co-win' + (w.mine ? ' is-mine' : '') + '"><span class="co-win-dot">🎉</span><span class="co-win-txt"><strong>' + esc(w.n) + '</strong> ' + esc(w.t) + '</span>' + (w.fresh ? '<span class="co-win-fresh">právě teď</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<button class="co-community-cta is-button" data-act="win-add"' + (canAddWin ? '' : ' disabled') + '>' + (canAddWin ? '+ Přidat svůj úspěch' : 'Další za ' + fmtCooldown(winCooldown)) + '</button></div></div>' +
    '</section>';
  }

  // (Profil se needituje samostatnou kartou — z hlavičky přes „Upravit profil".)

  // ---------- Onboarding ----------
  function onboardingCard(b) {
    var p = editingProfile ? Object.assign({}, b) : pendOnb;
    if (!Array.isArray(p.industries)) p.industries = p.industry ? [p.industry] : [];
    var industryIcons = { svatby: 'users', portret: 'camera', produkt: 'image', video: 'video', obsah: 'sparkles', event: 'users', nemovitosti: 'briefcase', jine: 'compass' };
    var blockerIcons = { klienti: 'users', cena: 'briefcase', portfolio: 'image', cas: 'target', zacatek: 'compass' };
    var progress = Math.min(onbStep, 3);
    var h = '<section class="co-onb co-onb-v2" aria-live="polite">' +
      '<div class="onb-top"><span>KROK ' + progress + ' ZE 3</span><span>Za minutu máš jasno.</span></div>' +
      '<div class="onb-progress" aria-label="Krok ' + progress + ' ze 3"><i style="width:' + (progress / 3 * 100) + '%"></i></div>';

    if (onbStep === 1) {
      h += '<div class="onb-screen"><p class="onb-step">01 · TVŮJ OBOR</p><h1>Co tvoříš nejčastěji?</h1><p class="onb-lead">Vyber klidně víc možností. Plán se přizpůsobí tomu, co skutečně děláš.</p>';
      h += '<div class="onb-industry-grid">' + INDUSTRIES.map(function (x) {
        return '<button type="button" class="onb-choice' + (p.industries.indexOf(x.id) >= 0 ? ' active' : '') + '" data-onb="industries" data-id="' + x.id + '">' + uiIcon(industryIcons[x.id]) + '<span>' + esc(x.label) + '</span><b>✓</b></button>';
      }).join('') + '</div>';
      if (p.industries.indexOf('jine') >= 0) h += '<label class="onb-other"><span>Napiš svůj obor</span><input type="text" class="onb-other-input" maxlength="80" value="' + esc(p.industryOther || '') + '" placeholder="Např. dron, dokument, architektura…"></label>';
      h += '</div>';
    } else if (onbStep === 2) {
      var expDesc = {
        start: 'Sbírám základ a první práce do portfolia.',
        practice: 'Řemeslo roste — chci ho proměnit v nabídku.',
        clients: 'Zakázky mám, chci stabilnější systém a lepší obchod.',
        fulltime: 'Tvorba mě živí. Řeším cenu, proces a další růst.'
      };
      h += '<div class="onb-screen"><p class="onb-step">02 · TVOJE FÁZE</p><h1>Kde jsi dnes?</h1><p class="onb-lead">Nejde o hodnocení. Podle toho zvolím správný začátek tvého plánu.</p>' +
        '<div class="onb-levels" role="radiogroup" aria-label="Tvoje fáze">' + EXPERIENCES.map(function (x, i) {
          var on = p.experience === x.id, bars = '';
          for (var bi = 0; bi < 4; bi++) bars += '<i class="' + (bi <= i ? 'on' : '') + '"></i>';
          return '<button type="button" class="onb-level' + (on ? ' active' : '') + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" data-onb="experience" data-id="' + x.id + '">' +
            '<span class="onb-level-bars" aria-hidden="true">' + bars + '</span>' +
            '<span class="onb-level-main"><b>LEVEL 0' + (i + 1) + '</b><strong>' + esc(x.label) + '</strong><small>' + esc(expDesc[x.id]) + '</small></span>' +
            '<span class="onb-level-check" aria-hidden="true">✓</span></button>';
        }).join('') + '</div></div>';
    } else if (onbStep === 3) {
      var incomeShort = { '0-10': 'do 10k', '10-30': '10–30k', '30-60': '30–60k', '60-100': '60–100k', '100+': '100k+' };
      h += '<div class="onb-screen"><p class="onb-step">03 · PRVNÍ PRIORITA</p><h1>Co by ti teď nejvíc pomohlo?</h1><p class="onb-lead">Vyber jednu věc. Podle ní dostaneš první konkrétní kroky.</p>' +
        '<div class="onb-blocker-grid">' + BLOCKERS.map(function (x) { return '<button type="button" class="onb-choice' + (p.blocker === x.id ? ' active' : '') + '" data-onb="blocker" data-id="' + x.id + '">' + uiIcon(blockerIcons[x.id]) + '<span>' + esc(x.label) + '</span><b>✓</b></button>'; }).join('') + '</div>' +
        '<div class="onb-income-v2"><div class="onb-income-head"><strong>Kolik ti tvorba běžně přinese za měsíc?</strong><span>Nepovinné · zpřesní doporučení</span></div>' +
        '<div class="onb-income-pills" role="radiogroup" aria-label="Měsíční příjem z tvorby">' +
        '<button type="button" class="onb-pill' + (!p.income ? ' active' : '') + '" data-onb="income" data-id="">Neuvádět</button>' +
        INCOMES.map(function (x) { return '<button type="button" class="onb-pill' + (p.income === x.id ? ' active' : '') + '" data-onb="income" data-id="' + x.id + '">' + esc(incomeShort[x.id] || x.label) + '</button>'; }).join('') +
        '</div></div></div>';
    }

    h += '<div class="onb-actions">' + (onbStep > 1 ? '<button type="button" class="onb-back" data-act="onb-back">Zpět</button>' : '<span></span>') +
      (onbStep < 3 ? '<button type="button" class="onb-next" data-act="onb-next">Pokračovat →</button>' : '<button type="button" class="onb-next" data-act="onb-save">' + (editingProfile ? 'Uložit změny' : 'Vytvořit profil zdarma →') + '</button>') + '</div>' +
      (editingProfile ? '<button type="button" class="onb-cancel" data-act="onb-cancel">Zrušit úpravy</button>' : '') + '</section>';
    return h;
  }

  // ---------- Utily ----------
  function fmtCzk(n) { return (Number(n) || 0).toLocaleString('cs-CZ') + ' Kč'; }

  // ---------- XP toast ----------
  function xpToast(amount, label) {
    var el = document.createElement('div');
    el.className = 'co-xptoast';
    el.innerHTML = '<strong>+' + amount + ' KP</strong>' + (label ? '<span>' + esc(label) + '</span>' : '');
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

    // --- Onboarding výběry (plynule, bez překreslení celé stránky) ---
    if (el.hasAttribute('data-onb')) {
      var key = el.getAttribute('data-onb'), target = editingProfile ? bizGet() : pendOnb;
      var id = el.getAttribute('data-id');
      if (key === 'industries') {
        if (!Array.isArray(target.industries)) target.industries = target.industry ? [target.industry] : [];
        var at = target.industries.indexOf(id);
        if (at >= 0) target.industries.splice(at, 1); else target.industries.push(id);
        target.industry = target.industries[0] || '';
        var isActive = target.industries.indexOf(id) >= 0;
        el.classList.toggle('active', isActive);
        if (id === 'jine') {
          var scr = el.closest('.onb-screen'), other = scr && scr.querySelector('.onb-other');
          if (isActive && scr && !other) {
            var lbl = document.createElement('label');
            lbl.className = 'onb-other';
            lbl.innerHTML = '<span>Napiš svůj obor</span><input type="text" class="onb-other-input" maxlength="80" value="' + esc(target.industryOther || '') + '" placeholder="Např. dron, dokument, architektura…">';
            (scr.querySelector('.onb-industry-grid') || el.parentElement).after(lbl);
          } else if (!isActive && other) { other.remove(); }
        }
      } else {
        target[key] = id;
        MOUNT.querySelectorAll('[data-onb="' + key + '"]').forEach(function (b) {
          var on = b.getAttribute('data-id') === id;
          b.classList.toggle('active', on);
          if (b.hasAttribute('aria-checked')) b.setAttribute('aria-checked', on ? 'true' : 'false');
        });
      }
      if (editingProfile) bizSet(target); else { pendOnb = target; jset(ONB_DRAFT, pendOnb); }
      tactile(7);
      return;
    }

    var act = el.getAttribute('data-act');

    if (act === 'onb-next') {
      var navTarget = editingProfile ? bizGet() : pendOnb;
      if (onbStep === 1 && (!Array.isArray(navTarget.industries) || !navTarget.industries.length)) { flash('Vyber aspoň jeden obor.'); return; }
      if (onbStep === 1 && navTarget.industries.indexOf('jine') >= 0 && !(navTarget.industryOther || '').trim()) { flash('Napiš prosím, čemu se věnuješ.'); return; }
      if (onbStep === 2 && !navTarget.experience) { flash('Vyber, kde se právě nacházíš.'); return; }
      onbStep = Math.min(3, onbStep + 1); if (!editingProfile) { pendOnb._step = onbStep; jset(ONB_DRAFT, pendOnb); } track('onboarding_step_complete', { step: onbStep - 1 }); render(); return;
    }
    if (act === 'onb-back') { onbStep = Math.max(1, onbStep - 1); if (!editingProfile) { pendOnb._step = onbStep; jset(ONB_DRAFT, pendOnb); } render(); return; }

    // --- Onboarding uložení ---
    if (act === 'onb-save') {
      var target2 = editingProfile ? bizGet() : pendOnb;
      if (!Array.isArray(target2.industries) || !target2.industries.length) { flash('Vyber prosím obor.'); return; }
      target2.industry = target2.industries[0];
      if (!target2.experience) { flash('Vyber, kde se právě nacházíš.'); return; }
      if (!target2.blocker) { flash('Vyber, co tě nejvíc brzdí.'); return; }
      var firstTime = !editingProfile && !jget(ONB_DONE, false);
      bizSet(target2);
      jset(ONB_DONE, true);
      // Ulož profil i na server, ať se onboarding neopakuje na jiném zařízení (mobil vs. počítač).
      try { if (window.KenjiAuth && window.KenjiAuth.saveProfile) window.KenjiAuth.saveProfile(target2); } catch (eSP) {}
      try { localStorage.removeItem(ONB_DRAFT); } catch (e2) {}
      if (firstTime && !todosGet().length) seedTasks(target2.blocker);
      editingProfile = false; pendOnb = {}; onbStep = 1;
      reconcileContentXp();
      track('onboarding_plan_created', { experience: target2.experience, blocker: target2.blocker, industries: target2.industries });
      render();
      if (firstTime) {
        xpToast(10, 'Plán je připravený');
        var A = window.KenjiAuth;
        if (A && A.isLoggedIn && !A.isLoggedIn() && A.promptSavePlan) { setTimeout(function () { A.promptSavePlan(); }, 900); }
      }
      return;
    }
    if (act === 'onb-cancel') { editingProfile = false; onbStep = 1; render(); return; }
    if (act === 'prof-edit') { editingProfile = true; onbStep = 1; render(); return; }
    if (act === 'save-plan') { if (window.KenjiAuth && window.KenjiAuth.promptSavePlan) window.KenjiAuth.promptSavePlan(); return; }
    if (act === 'kpintro-dismiss') { jset('kenji_kp_intro_v1', true); render(); return; }
    if (act === 'activation-dismiss') { jset('kenji_activation_hidden_v1', true); render(); return; }
    if (act === 'kpnudge-dismiss') { jset('kenji_kpnudge_dismiss_v1', new Date().toDateString()); render(); return; }
    if (act === 'stream-notyet') { flash('Stream nebo webinář ještě nezačal 🔴 Dej vědět mailem, ať ti nic neuteče.'); return; }

    // --- Úkoly ---
    if (act === 'task-toggle') {
      var id = el.getAttribute('data-id'), t = todosGet(), justDone = false;
      t.forEach(function (x) { if (x.id === id) { x.done = !x.done; justDone = x.done; } });
      todosSet(t);
      if (justDone) { tactile(16); addXp(20, 'Splněný úkol'); render(); xpToast(20, 'Úkol splněn'); }
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

    // --- Úspěch (max 1× denně, +100 XP) ---
    if (act === 'win-add') { promptAddWin(); return; }
  });

  // 24h cooldown pro zápis úspěchu.
  function winCooldownMs() { var last = Number(jget('kenji_mywin_ts_v1', 0)) || 0; return Math.max(0, 24 * 3600 * 1000 - (Date.now() - last)); }
  function fmtCooldown(ms) { var h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h > 0 ? (h + ' h ' + m + ' min') : (Math.max(1, m) + ' min'); }

  // Zápis vlastního úspěchu (z karty i z pop-upu přes ?addwin=1). Max 1× za 24 h, +100 KP.
  function promptAddWin() {
    var cd = winCooldownMs();
    if (cd > 0) { flash('Úspěch přidáš zas za ' + fmtCooldown(cd) + ' 💪'); return; }
    if (document.querySelector('.win-modal')) return;
    var MAX = 120;
    var wrap = document.createElement('div');
    wrap.className = 'win-modal';
    wrap.innerHTML =
      '<div class="win-card" role="dialog" aria-modal="true" aria-label="Zapsat úspěch">' +
        '<button class="win-close" type="button" aria-label="Zavřít">✕</button>' +
        '<div class="win-kicker">Tvůj úspěch · +100 KP</div>' +
        '<h2 class="win-title">Co se ti povedlo?</h2>' +
        '<p class="win-sub">Zakázka, nový klient, pochvala, milník — cokoli, co tě posunulo.</p>' +
        '<textarea class="win-input" maxlength="' + MAX + '" rows="3" placeholder="Např. Získal jsem první svatební zakázku 🎉"></textarea>' +
        '<div class="win-foot"><span class="win-count">0/' + MAX + '</span><button class="win-save" type="button" disabled>Zapsat úspěch →</button></div>' +
      '</div>';
    document.body.appendChild(wrap);
    var input = wrap.querySelector('.win-input');
    var saveBtn = wrap.querySelector('.win-save');
    var count = wrap.querySelector('.win-count');
    function close() { wrap.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(ev) {
      if (ev.key === 'Escape') close();
      else if ((ev.metaKey || ev.ctrlKey) && ev.key === 'Enter') save();
    }
    function sync() { var v = input.value.trim(); count.textContent = input.value.length + '/' + MAX; saveBtn.disabled = !v; }
    function save() {
      var v = input.value.trim(); if (!v) { input.focus(); return; }
      var mine = jget(MYWINS, []); if (!Array.isArray(mine)) mine = []; mine.unshift(v.slice(0, MAX)); jset(MYWINS, mine);
      jset('kenji_mywin_ts_v1', Date.now());
      close();
      addXp(100, 'Zaznamenaný úspěch'); render(); xpToast(100, 'Úspěch zapsán');
    }
    input.addEventListener('input', sync);
    saveBtn.addEventListener('click', save);
    wrap.addEventListener('click', function (ev) { if (ev.target === wrap || ev.target.closest('.win-close')) close(); });
    document.addEventListener('keydown', onKey);
    setTimeout(function () { input.focus(); }, 40);
  }

  MOUNT.addEventListener('input', function (e) {
    var other = e.target.closest('.onb-other-input');
    if (!other) return;
    var target = editingProfile ? bizGet() : pendOnb;
    target.industryOther = other.value;
    if (editingProfile) bizSet(target); else { pendOnb = target; jset(ONB_DRAFT, pendOnb); }
  });

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
  document.addEventListener('kenji-xp-synced', render);
  document.addEventListener('kenji:challenge-updated', render);
  document.addEventListener('kenji-auth-ready', loadWebinar, { once: true });
  setTimeout(loadWebinar, 1500);

  // Zápis úspěchu spuštěný z pop-upu (odkaz index.html?addwin=1)
  try {
    if (new URLSearchParams(location.search).get('addwin')) {
      history.replaceState(null, '', location.pathname);
      if (profileComplete()) setTimeout(promptAddWin, 350);
    }
  } catch (e) {}
})();
