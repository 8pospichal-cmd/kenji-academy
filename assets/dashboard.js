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
    try { if (window.KenjiAuth && window.KenjiAuth.track) window.KenjiAuth.track(name, 'dashboard', data || {}); } catch (e) {}
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
    { id: 'fulltime', label: 'Živím se tím' },
    { id: 'jine', label: 'Něco jiného' }
  ];
  function experienceLabel(id) { for (var i = 0; i < EXPERIENCES.length; i++) if (EXPERIENCES[i].id === id) return EXPERIENCES[i].label; return EXPERIENCES[0].label; }
  // Když si člověk zvolil „Něco jiného", pracujeme dál s tím, co sám napsal.
  function experienceText(b) {
    b = b || {};
    return (b.experience === 'jine' && (b.experienceOther || '').trim()) ? b.experienceOther.trim() : experienceLabel(b.experience);
  }
  function blockerText(b) {
    b = b || {};
    return (b.blocker === 'jine' && (b.blockerOther || '').trim()) ? b.blockerOther.trim() : blocker(b.blocker).focus;
  }

  var BLOCKERS = [
    { id: 'klienti', label: 'Málo poptávek / klientů', focus: 'získávání klientů' },
    { id: 'cena', label: 'Nízké ceny / neumím říct o víc', focus: 'ceny a nabídka' },
    { id: 'portfolio', label: 'Slabé portfolio / positioning', focus: 'portfolio a positioning' },
    { id: 'cas', label: 'Chaos / nemám systém', focus: 'systém a čas' },
    { id: 'zacatek', label: 'Úplný začátek, nevím kde začít', focus: 'rozjezd' },
    { id: 'jine', label: 'Něco jiného', focus: 'to, co tě zrovna brzdí' }
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



  // ---------- Úkoly ----------
  function todosGet() { var t = jget(TODO, []); return Array.isArray(t) ? t : []; }
  function todosSet(t) { jset(TODO, t); }
  function seedTasks(profileOrBlocker) {
    var profile = typeof profileOrBlocker === 'string' ? { blocker: profileOrBlocker } : (profileOrBlocker || {});
    var list = REC[profile.blocker] || REC.klienti;
    var tasks = [];
    list.slice(0, 3).forEach(function (r) {
      tasks.push({
        id: uid(),
        text: r.text,
        why: r.why,
        mins: r.mins,
        cat: r.cat,
        aiQ: contextualAiPrompt(r, profile),
        done: false,
        rec: true
      });
    });
    todosSet(tasks);
  }
  function contextualAiPrompt(task, b) {
    var intro = 'Jsem ' + (industryNames(b) || 'vizuální tvůrce') + ', jsem ve fázi „' + experienceText(b) + '“';
    var focus = b.blocker ? ' a teď řeším ' + blockerText(b) : '';
    var income = b.income ? '. Můj příjem z tvorby je ' + incomeLabel(b.income) : '';
    return intro + focus + income + '. Můj aktuální úkol je: „' + task.text + '“. Dej mi konkrétní postup na tento týden, stručně a prakticky.';
  }

  // ---------- XP ----------
  function xpGet() { var x = jget(XP, null); if (!x || typeof x.xp !== 'number') x = { xp: 0, log: [] }; if (!Array.isArray(x.log)) x.log = []; return x; }
  function xpSet(x) { jset(XP, x); }
  function hasXpKey(x, key) { return x.log.some(function (e) { return e.k === key; }); }
  function xpUid() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function addXp(amount, reason, onceKey, type) {
    var x = xpGet();
    if (onceKey && hasXpKey(x, onceKey)) return 0;
    // `u` = jedinečné id neklíčovaných odměn, ať se při synchronizaci účtu mezi zařízeními nezdvojí.
    x.xp += amount; x.log.push({ k: onceKey || null, u: onceKey ? null : xpUid(), a: amount, r: reason, type: type || '', t: Date.now() });
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
  var LEVEL_THRESHOLDS = [0, 100, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000];
  var MAX_LEVEL = LEVEL_THRESHOLDS.length;
  function levelOf(xp) {
    xp = Math.max(0, Number(xp) || 0);
    var lvl = 1;
    for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
    return Math.min(MAX_LEVEL, lvl);
  }
  function nextLevelAt(lvl) { return lvl >= MAX_LEVEL ? null : LEVEL_THRESHOLDS[lvl]; }
  function levelFloor(lvl) { return LEVEL_THRESHOLDS[Math.max(0, Math.min(MAX_LEVEL - 1, lvl - 1))] || 0; }
  function todayTaskXpCount(x) {
    var today = dstr(new Date());
    return (x.log || []).filter(function (entry) {
      return entry && entry.type === 'task' && dstr(new Date(entry.t || 0)) === today;
    }).length;
  }
  function awardTaskXp() {
    var x = xpGet();
    var used = todayTaskXpCount(x);
    if (used >= 5) return { awarded: 0, used: used, limit: 5 };
    return { awarded: addXp(20, 'Splněný úkol', null, 'task'), used: used + 1, limit: 5 };
  }
  function reconcileMemberBaseline() {
    var A = window.KenjiAuth;
    if (A && typeof A.isAcademy === 'function' && A.isAcademy()) addXp(100, 'Členský start Academy', 'baseline:academy');
  }

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
    try { var u = jget('kenji_user', null); var n = u && u.name; if (!n || /@/.test(n)) return ''; n = String(n).split(/[\s.]/)[0]; return n.charAt(0).toUpperCase() + n.slice(1); } catch (e) { return ''; }
  }
  function profileCache() { try { return JSON.parse(localStorage.getItem('kenji_profile_v1') || '{}') || {}; } catch (e) { return {}; } }
  // Cache profilu vzniká v Nastavení — na novém zařízení chybí, tak ji jednou načti ze serveru a překresli.
  var profileFetched = false;
  function ensureProfileCache() {
    if (profileFetched) return;
    var pc = profileCache(), A = window.KenjiAuth, u = A && A.getUser ? A.getUser() : null;
    if (pc.displayName || pc.avatar || !u || !u.email || !A.getSupabase) return;
    profileFetched = true;
    A.getSupabase().then(function (sb) {
      if (!sb) return null;
      return sb.rpc('get_profile', { p_email: u.email });
    }).then(function (res) {
      var p = res && !res.error ? (Array.isArray(res.data) ? res.data[0] : res.data) : null;
      if (!p || !(p.display_name || p.avatar_url)) return;
      jset('kenji_profile_v1', { displayName: p.display_name || '', bio: p.bio || '', instagram: p.instagram || '', avatar: p.avatar_url || '' });
      try { document.dispatchEvent(new CustomEvent('kenji-profile-updated')); } catch (e) {}
      render();
    }).catch(function () {});
  }
  // Kenjiho věta v bublině se mění jednou denně (stejná po celý den, i po reloadu).
  function dayNumber() { var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
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
    if (gap === null || gap >= 7) return away[dayNumber() % away.length];
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
    return reg[dayNumber() % reg.length];
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
    var aiPrompt = 'Jsem ' + (industryNames(b) || 'vizuální tvůrce') + ', jsem ve fázi „' + experienceText(b) + '“ a teď řeším ' + blockerText(b) + '. Pomoz mi vybrat jeden konkrétní krok, který zvládnu tento týden.';
    var rec = (FOCUS_ARTICLES[b.blocker] || []).map(article).filter(function (item) { return item && isFree(item.slug); })[0] || article('expozice');
    var ai = jget('kenji_ai_v1', {}) || {};
    var aiDone = !!(ai.convos && ai.convos.some(function (c) { return c.msgs && c.msgs.some(function (m) { return m.role === 'user'; }); }));
    return [
      { key: 'profile', title: 'Doplň svůj profil', sub: 'Přidej fotku, jméno, Instagram a dvě věty o sobě.', href: 'nastaveni.html', xp: 20, done: localStorage.getItem('kenji_task_profile') === '1', icon: 'camera' },
      { key: 'read', title: 'Projdi první článek', sub: rec ? rec.title : 'Otevři doporučený článek.', href: rec ? rec.url : 'clanky/expozice.html', xp: 20, done: readSlugs().length > 0, icon: 'file' },
      { key: 'ai', title: 'Polož první dotaz Kenji AI', sub: 'Dostaneš konkrétní krok pro tento týden.', href: aiUrl(aiPrompt), xp: 20, done: aiDone || tourCheckpointDone('ai'), icon: 'sparkles' },
      // „Představ se" je kanál Academy — Free členovi ho nenabízíme, server by ho odmítl.
      { key: 'intro', title: 'Představ se komunitě', sub: 'Nahraj fotku a napiš, kdo jsi, jak dlouho tvoříš, co fotíš/natáčíš a co čekáš od Academy.', href: 'prispevky.html?category=predstav-se&intro=1', xp: 350, done: localStorage.getItem('kenji_task_intro') === '1', icon: 'user', academyOnly: true },
      { key: 'feedback', title: 'Nahraj práci na Foto feedback', sub: 'Sdílej fotku nebo video své tvorby a řekni, s čím chceš poradit — komunita ti dá zpětnou vazbu.', href: 'prispevky.html?category=foto-feedback&onboarding=1', xp: 100, done: localStorage.getItem('kenji_task_community') === '1', icon: 'camera' }
    ].filter(function (task) { return !task.academyOnly || isAcademyMember(); });
  }

  function isAcademyMember() {
    var A = window.KenjiAuth;
    return !!(A && typeof A.isAcademy === 'function' && A.isAcademy());
  }

  function reconcileActivationXp(b) {
    activationTasks(b).forEach(function (task) { if (task.done) addXp(task.xp, task.title, 'activation:' + task.key); });
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
    reconcileMemberBaseline();
    reconcileActivationXp(b);
    ensureProfileCache();

    var x = xpGet(), lvl = levelOf(x.xp), streak = streakOf(days);
    var floor = levelFloor(lvl);
    var nextAt = nextLevelAt(lvl);
    var levelPct = nextAt == null ? 100 : Math.max(6, Math.min(100, Math.round((x.xp - floor) / Math.max(1, nextAt - floor) * 100)));
    var toNext = nextAt == null ? 0 : Math.max(0, nextAt - x.xp);
    var todos = todosGet();
    var active = todos.filter(function (t) { return !t.done; });
    var done = todos.filter(function (t) { return t.done; });
    var name = firstName();
    // Získal dnes nějaké XP? (pro loss-framing nudge)
    var startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    var earnedToday = (x.log || []).some(function (e) { return e.t >= startToday.getTime(); });

    var isGuest = !!(window.KenjiAuth && window.KenjiAuth.isLoggedIn && !window.KenjiAuth.isLoggedIn());
    var pc = profileCache();
    var fullName = (pc.displayName || '').trim();
    var fname = fullName ? fullName.split(/\s+/)[0] : name;
    var wk = weekStrip(days);
    var weekOn = wk.filter(function (d) { return d.on; }).length;
    var doneToday = todayTaskXpCount(x);
    var todayTotal = Math.max(1, doneToday + active.length);

    var h = '<div class="kc' + (kcAnimated ? '' : ' kc-anim') + '">';
    kcAnimated = true;

    // 1) HLAVIČKA — kdo jsem a kde jsem
    h += '<header class="kc-head"><div>' +
      '<h1 class="kc-hi">Ahoj' + (fname ? ' ' + esc(fname) : '') + ', <span class="kc-gold-text">jdeme na to.</span></h1>' +
      (b.goal ? '<p class="kc-goal">Cíl: ' + esc(fmtCzk(b.goal)) + ' / měsíc</p>' : '') +
      (isGuest ? '<button class="kc-me-save" type="button" data-act="save-plan">Ulož si plán</button>' : '') +
      '</div></header>';

    if (!jget('kenji_kp_intro_v1', false) && !profileComplete() && !readSlugs().length && !xpGet().xp) {
      h += '<div class="kc-note"><div><strong>Co jsou Kenji Points (KP)?</strong>' +
        '<p>Sbíráš je za čtení, splněné úkoly, kvíz i komunitu. Levely jsou postupně těžší a končí levelem 10. Za vlastní úkoly se počítá nejvýš 5 splnění denně.</p></div>' +
        '<button type="button" data-act="kpintro-dismiss">Rozumím</button></div>';
    }
    // Loss framing: pobídka udržet sérii — jen když dnes ještě nezískal KP a nezavřel ji.
    if (!earnedToday && streak >= 1 && jget('kenji_kpnudge_dismiss_v1', '') !== new Date().toDateString()) {
      h += '<div class="kc-note kc-note-streak"><p>Dnes ještě žádné KP. <a href="#kc-now">Splň jeden úkol</a> a udrž svou ' + streak + 'denní sérii.</p>' +
        '<button type="button" class="kc-note-x" data-act="kpnudge-dismiss" aria-label="Skrýt upozornění">✕</button></div>';
    }

    h += '<div class="kc-bento">';
    h += kcNow(b, active, isGuest ? 'Tvůj plán je připravený!' : greetingFor(days));
    h += kcRings(x.xp, lvl, levelPct, toNext, nextAt, streak, weekOn, doneToday, todayTotal);
    if (!jget('kenji_activation_hidden_v1', false)) h += kcStart(b);
    h += kcWebinar();
    h += kcChallenge();
    h += kcWins();
    h += kcNext(active, done);
    h += kcAi(b);
    h += '</div></div>';

    MOUNT.innerHTML = h;
    kcStartTicker();
  }

  // ============================================================
  //  DLAŽDICE DASHBOARDU „KOUČ"
  // ============================================================
  var kcAnimated = false;
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-11"/></svg>';
  function kcKicker(text, cls) { return '<span class="kc-k' + (cls ? ' ' + cls : '') + '"><i></i>' + esc(text) + '</span>'; }

  // Dnešní priorita — Kenji ukazuje na první aktivní úkol.
  function kcNow(b, active, line) {
    var reasonMap = {
      klienti: 'Nejrychlejší cesta k dalším zakázkám.',
      cena: 'Než sháníš víc klientů, zvedni hodnotu jedné zakázky.',
      portfolio: 'Bez silného portfolia je všechno ostatní těžší.',
      cas: 'Uvolni si kapacitu a zbytek pojede sám.',
      zacatek: 'Jedno jasné zaměření tě rozjede nejrychleji.'
    };
    var h = '<section id="kc-now" class="kc-tile kc-now">';
    if (active && active.length) {
      var t = active[0];
      var aiQ = t.aiQ || ('Poraď mi konkrétně s úkolem: ' + t.text);
      h += '<div class="kc-now-copy"><span class="kc-pill"><i></i>Tvůj krok na dnes</span>' +
        '<h2>' + esc(t.text) + '</h2><p>' + esc(t.why || reasonMap[b.blocker] || reasonMap.klienti) + '</p>' +
        '<div class="kc-meta">' + (t.mins ? '<span>' + uiIcon('target') + esc(t.mins) + ' min</span>' : '') + (t.cat ? '<span>' + uiIcon('compass') + esc(t.cat) + '</span>' : '') + '</div>' +
        '<div class="kc-actions"><button class="kc-btn-gold" type="button" data-act="task-toggle" data-id="' + t.id + '"><span class="kc-ck">' + CHECK_SVG + '</span>Hotovo<small>+20 KP</small></button>' +
        '<a class="kc-btn-ghost" href="' + esc(aiUrl(aiQ)) + '">' + uiIcon('sparkles') + 'Jak na to</a>' +
        '<button class="kc-now-del" type="button" data-act="task-del" data-id="' + t.id + '" aria-label="Smazat úkol" title="Smazat úkol">✕</button></div></div>';
    } else {
      var fallback = (REC[b.blocker] || REC.klienti)[0];
      h += '<div class="kc-now-copy"><span class="kc-pill"><i></i>Hotovo</span>' +
        '<h2>Aktivní úkoly máš splněné.</h2><p>Kenji AI ti podle profilu najde další konkrétní krok.</p>' +
        '<div class="kc-actions"><a class="kc-btn-gold" href="' + esc(aiUrl(fallback.aiQ || fallback.text)) + '"><span class="kc-ck">' + uiIcon('sparkles') + '</span>Najít další krok</a></div></div>';
    }
    return h + '<p class="kc-bubble">' + esc(line) + '</p>' +
      '<img class="kc-kenji" src="assets/kenji-cutout.webp" alt="" width="960" height="1350" decoding="async"></section>';
  }

  // Prstence: level · série v týdnu · dnešní úkoly.
  function kcRings(kp, lvl, levelPct, toNext, nextAt, streak, weekOn, doneToday, todayTotal) {
    function arc(r, pct, stroke) {
      var len = 2 * Math.PI * r;
      return '<circle cx="100" cy="100" r="' + r + '" class="kc-ring-bg"/>' +
        '<circle cx="100" cy="100" r="' + r + '" class="kc-ring-arc" stroke="' + stroke + '" style="--len:' + len.toFixed(1) + ';stroke-dasharray:' + len.toFixed(1) + ';stroke-dashoffset:' + (len * (1 - Math.max(0.02, Math.min(1, pct)))).toFixed(1) + '"/>';
    }
    return '<section class="kc-tile kc-rings">' +
      '<div class="kc-ring-wrap"><svg viewBox="0 0 200 200" role="img" aria-label="Level ' + lvl + ' na ' + levelPct + ' %, série ' + streak + ' dní, dnes ' + doneToday + ' z ' + todayTotal + ' úkolů">' +
        '<defs><linearGradient id="kcGold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" class="kc-g1"/><stop offset="1" class="kc-g2"/></linearGradient></defs>' +
        arc(92, levelPct / 100, 'url(#kcGold)') + arc(78, weekOn / 7, 'var(--kc-week)') + arc(64, doneToday / todayTotal, 'var(--kc-day)') +
      '</svg><div class="kc-ring-c"><b>' + kp + '</b><span>KP</span></div></div>' +
      '<div class="kc-legend">' +
        '<div><i class="kc-dot-gold"></i>' + (nextAt == null ? 'Maximální level' : 'Do levelu ' + (lvl + 1)) + '<b>' + (nextAt == null ? '100 %' : levelPct + ' %') + '</b></div>' +
        '<div><i style="background:var(--kc-week)"></i>Série · dny v kuse<b>' + streak + ' ' + (streak === 1 ? 'den' : (streak >= 2 && streak <= 4 ? 'dny' : 'dní')) + '</b></div>' +
        '<div><i style="background:var(--kc-day)"></i>Dnešní úkoly<b>' + doneToday + ' / ' + todayTotal + '</b></div>' +
      '</div>' + (nextAt == null ? '' : '<p class="kc-rings-hint">Ještě ' + toNext + ' KP do levelu ' + (lvl + 1) + '</p>') + '</section>';
  }

  // Průvodce startem jako krokovník.
  function kcStart(b) {
    var tasks = activationTasks(b), doneCount = tasks.filter(function (t) { return t.done; }).length;
    var next = tasks.find(function (t) { return !t.done; });
    var lastDone = -1; tasks.forEach(function (t, i) { if (t.done) lastDone = i; });
    var fill = tasks.length > 1 ? Math.max(0, lastDone) / (tasks.length - 1) : 1;
    var short = { profile: 'Profil', read: 'Článek', ai: 'Kenji AI', intro: 'Představ se', feedback: 'Feedback' };
    var steps = tasks.map(function (t) {
      var cur = !!(next && next.key === t.key);
      return '<a class="kc-st' + (t.done ? ' is-done' : '') + (cur ? ' is-cur' : '') + '" href="' + esc(t.href) + '"' + (cur ? ' aria-current="step"' : '') + ' title="' + esc(t.title) + '">' +
        '<span class="kc-st-o">' + (t.done ? CHECK_SVG : uiIcon(t.icon === 'user' ? 'users' : t.icon)) + '</span>' +
        '<b>' + esc(short[t.key] || t.title) + '</b><small>' + (cur ? '+' + t.xp + ' KP · teď' : '+' + t.xp) + '</small></a>';
    }).join('');
    return '<section class="kc-tile kc-start" data-tour="plan">' +
      '<div class="kc-start-head">' + kcKicker('Tvůj start') + '<h3>' + (doneCount === tasks.length ? 'Hotovo' : doneCount + ' z ' + tasks.length + ' <span>kroků</span>') + '</h3>' +
      (next ? '<p>' + esc(next.title) + '</p>' : '<p>Základ máš hotový.</p>') +
      '<button class="kc-start-x" type="button" data-act="activation-dismiss" aria-label="Skrýt úvodní průvodce" title="Skrýt úvodní průvodce">✕</button></div>' +
      '<div class="kc-steps" style="--n:' + tasks.length + ';--fill:' + fill + '">' + steps + '</div></section>';
  }

  // Webinář je vždy 12. v měsíci v 19:00. Po skončení (21:00) se přepne na další měsíc
  // a tlačítko Stream každý měsíc otevře další záznam z tohoto seznamu (dokola).
  var WEBINARS = [
    { url: 'https://www.youtube.com/live/KjxMlOyCQHY', topic: 'Evenilo a Vánoce' },
    { url: 'https://www.youtube.com/live/Kz9s7eO31No', topic: 'Webinář s Kenjim' },
    { url: 'https://www.youtube.com/watch?v=F-x1s_Kkjp0', topic: 'Modelkování s Bárou Zavadilovou' },
    { url: 'https://www.youtube.com/watch?v=Sc5-tMNl4JQ', topic: 'Hodnotím vaše portfolia' },
    { url: 'https://www.youtube.com/watch?v=AsRC8uOHOrk', topic: 'Color grading v Lightroomu a Photoshopu' }
  ];
  function webinarInfo() {
    var now = new Date();
    var next = new Date(now.getFullYear(), now.getMonth(), 12, 19, 0);
    if (now - next > 2 * 3600000) next = new Date(now.getFullYear(), now.getMonth() + 1, 12, 19, 0);
    var prev = new Date(next.getFullYear(), next.getMonth() - 1, 12, 21, 0);
    var idx = (((next.getFullYear() * 12 + next.getMonth()) - (2026 * 12 + 10)) % WEBINARS.length + WEBINARS.length) % WEBINARS.length;
    var live = now >= next;
    var diff = next - now, d = Math.floor(diff / 86400000), hh = Math.floor(diff % 86400000 / 3600000), mm = Math.floor(diff % 3600000 / 60000);
    var dw = d === 1 ? 'den' : (d >= 2 && d <= 4 ? 'dny' : 'dní');
    var M = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
    var W = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
    return {
      month: M[next.getMonth()], weekday: W[next.getDay()], topic: WEBINARS[idx].topic, url: WEBINARS[idx].url, live: live,
      left: live ? 'Právě běží' : (d > 0 ? 'za ' + d + ' ' + dw + ' ' + hh + ' h' : 'za ' + hh + ' h ' + mm + ' min'),
      pct: Math.max(4, Math.min(100, Math.round((now - prev) / (next - prev) * 100)))
    };
  }
  function kcWebinar() {
    var w = webinarInfo(), member = isAcademyMember();
    var play = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4l14 8-14 8z" fill="currentColor"/></svg>';
    var btn = member
      ? '<a class="kc-mini" href="' + esc(w.url) + '" target="_blank" rel="noopener">' + play + 'Stream</a>'
      : '<a class="kc-mini kc-mini-lock" href="academy.html">Jen Academy</a>';
    return '<section class="kc-tile kc-web">' + kcKicker('Webinář') +
      '<div class="kc-web-date"><b class="kc-gold-text">12</b><span>' + esc(w.month) + '<small>' + esc(w.weekday) + ' · 19:00</small></span></div>' +
      '<h4>' + esc(w.topic) + '</h4><div class="kc-bar"><i style="width:' + w.pct + '%"></i></div>' +
      '<div class="kc-web-foot"><span>' + esc(w.left) + '</span>' + btn + '</div></section>';
  }

  function kcChallenge() {
    var c = currentChallenge(), joined = challengeJoined(), left = daysLeftInWeek();
    var url = 'prispevky.html?category=tydenni-vyzva&challenge=' + encodeURIComponent(c.key || weekKey());
    return '<a class="kc-tile kc-chal" href="' + url + '">' + kcKicker('Týdenní výzva · ' + daysLeftText(left)) +
      '<div class="kc-chal-big">+250<small> KP</small></div><h4>' + esc(c.title) + '</h4>' +
      '<div class="kc-chal-row"><span>' + (joined ? '✓ Splněno' : 'Pro všechny') + '</span><span class="kc-chal-go" aria-hidden="true">→</span></div></a>';
  }

  function kcWins() {
    var pool = (window.KENJI_COMMUNITY_WINS && window.KENJI_COMMUNITY_WINS.length) ? window.KENJI_COMMUNITY_WINS : WINS_SEED;
    var mine = jget(MYWINS, []); if (!Array.isArray(mine)) mine = [];
    var items = mine.slice(0, 2).map(function (w) { return { n: 'Ty', t: w }; }).concat(pool.slice(0, 6));
    var colors = ['#2f6fe0', '#0f8a63', '#8a3fd1', '#c93636'];
    var stack = pool.slice(0, 4).map(function (w, i) { return '<span style="background:' + colors[i % colors.length] + '">' + esc(String(w.n || '?').charAt(0)) + '</span>'; }).join('');
    var cd = winCooldownMs();
    return '<section class="kc-tile kc-wins">' + kcKicker('Úspěchy komunity') +
      '<div class="kc-stack" aria-hidden="true">' + stack + '</div>' +
      '<div class="kc-ticker">' + items.map(function (w, i) { return '<p' + (i === 0 ? ' class="on"' : '') + '><b>' + esc(w.n) + '</b> ' + esc(w.t) + '</p>'; }).join('') + '</div>' +
      '<button class="kc-add-win" type="button" data-act="win-add"' + (cd > 0 ? ' disabled' : '') + '>' + (cd > 0 ? 'Další za ' + fmtCooldown(cd) : 'Přidat svůj úspěch') + '<em>+100 KP</em></button></section>';
  }
  var kcTickerTimer = null;
  function kcStartTicker() {
    if (kcTickerTimer) return;
    kcTickerTimer = setInterval(function () {
      var ps = MOUNT.querySelectorAll('.kc-ticker p'); if (ps.length < 2) return;
      var cur = 0; ps.forEach(function (p, i) { if (p.classList.contains('on')) cur = i; });
      ps[cur].classList.remove('on'); ps[(cur + 1) % ps.length].classList.add('on');
    }, 3600);
  }

  function kcTaskRow(t) {
    return '<li class="kc-li' + (t.done ? ' is-done' : '') + '"><button class="kc-li-c" type="button" data-act="task-toggle" data-id="' + t.id + '" aria-label="' + (t.done ? 'Vrátit mezi aktivní' : 'Označit jako hotové') + '">' + CHECK_SVG + '</button>' +
      '<b>' + esc(t.text) + '</b>' + (t.mins ? '<span>' + esc(t.mins) + ' min</span>' : '') +
      '<button class="kc-li-del" type="button" data-act="task-del" data-id="' + t.id + '" aria-label="Smazat úkol">✕</button></li>';
  }
  function kcNext(active, done) {
    var h = '<section class="kc-tile kc-next">' + kcKicker('Potom') + '<h3>Další na řadě</h3><ul class="kc-list">' +
      active.slice(1, 5).map(kcTaskRow).join('') + '</ul>' +
      '<form class="kc-add" data-act="task-add"><span aria-hidden="true">+</span><input class="co-taskadd-input" type="text" maxlength="120" placeholder="Vlastní úkol" aria-label="Nový úkol"><button type="submit">Přidat</button></form>';
    if (done.length) {
      h += '<button class="kc-done-toggle" type="button" data-act="toggle-done">' + (showDone ? 'Skrýt hotové' : 'Hotové (' + done.length + ')') + '</button>';
      if (showDone) h += '<ul class="kc-list kc-list-done">' + done.map(kcTaskRow).join('') + '</ul>';
    }
    return h + '</section>';
  }

  function kcAi(b) {
    var ctx = 'Jsem ' + (industryNames(b) || 'vizuální tvůrce') + ', jsem ve fázi „' + experienceText(b) + '“. ';
    var sugg = [
      { l: 'Co napsat klientovi?', q: ctx + 'Co mám napsat potenciálnímu klientovi, aby odpověděl? Dej mi konkrétní zprávu.' },
      { l: 'Kolik si říct za zakázku?', q: ctx + 'Kolik si mám říct za zakázku? Proveď mě výpočtem krok po kroku.' },
      { l: 'Vylepši mi BIO', q: ctx + 'Napiš mi silné Instagram BIO, ať je jasné, co nabízím a komu.' }
    ];
    return '<section class="kc-tile kc-ai">' + kcKicker('Kenji AI') + '<h3>Zasekl ses? Zeptej se.</h3>' +
      '<form class="kc-ask" data-act="ai-ask"><input type="text" name="q" maxlength="400" placeholder="Napiš dotaz…" aria-label="Dotaz pro Kenji AI"><button type="submit" aria-label="Odeslat">↑</button></form>' +
      '<div class="kc-sugg">' + sugg.map(function (s) { return '<a href="' + esc(aiUrl(s.q)) + '">' + esc(s.l) + '</a>'; }).join('') + '</div></section>';
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
      h += '<div class="onb-screen"><p class="onb-step">01 · ČEMU SE VĚNUJEŠ</p><h1>Čemu se věnuješ?</h1><p class="onb-lead">Vyber klidně víc možností. Plán se přizpůsobí tomu, co skutečně děláš.</p>';
      h += '<div class="onb-industry-grid">' + INDUSTRIES.map(function (x) {
        return '<button type="button" class="onb-choice' + (p.industries.indexOf(x.id) >= 0 ? ' active' : '') + '" data-onb="industries" data-id="' + x.id + '">' + uiIcon(industryIcons[x.id]) + '<span>' + esc(x.label) + '</span><b>✓</b></button>';
      }).join('') + '</div>';
      if (p.industries.indexOf('jine') >= 0) h += otherField('industryOther', 'Napiš svůj obor', p.industryOther, 'Např. dron, dokument, architektura…');
      h += '</div>';
    } else if (onbStep === 2) {
      var expDesc = {
        start: 'Sbírám základ a první práce do portfolia.',
        practice: 'Řemeslo roste — chci ho proměnit v nabídku.',
        clients: 'Zakázky mám, chci stabilnější systém a lepší obchod.',
        fulltime: 'Tvorba mě živí. Řeším cenu, proces a další růst.'
      };
      h += '<div class="onb-screen"><p class="onb-step">02 · KDE JSI TEĎ</p><h1>Kde jsi teď?</h1><p class="onb-lead">Nejde o hodnocení. Podle toho zvolím správný začátek tvého plánu.</p>' +
        '<div class="onb-levels" role="radiogroup" aria-label="Tvoje fáze">' + EXPERIENCES.map(function (x, i) {
          var on = p.experience === x.id, bars = '';
          for (var bi = 0; bi < 4; bi++) bars += '<i class="' + (bi <= i ? 'on' : '') + '"></i>';
          return '<button type="button" class="onb-level' + (on ? ' active' : '') + '" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" data-onb="experience" data-id="' + x.id + '">' +
            '<span class="onb-level-bars" aria-hidden="true">' + bars + '</span>' +
            '<span class="onb-level-main"><b>LEVEL 0' + (i + 1) + '</b><strong>' + esc(x.label) + '</strong><small>' + esc(expDesc[x.id]) + '</small></span>' +
            '<span class="onb-level-check" aria-hidden="true">✓</span></button>';
        }).join('') + '</div>' +
        (p.experience === 'jine' ? otherField('experienceOther', 'Napiš, kde jsi', p.experienceOther, 'Např. vracím se po pauze, měním obor…') : '') +
        '</div>';
    } else if (onbStep === 3) {
      var incomeShort = { '0-10': 'do 10k', '10-30': '10–30k', '30-60': '30–60k', '60-100': '60–100k', '100+': '100k+' };
      h += '<div class="onb-screen"><p class="onb-step">03 · CO TEĎ ŘEŠÍŠ</p><h1>Co teď nejvíc řešíš?</h1><p class="onb-lead">Vyber jednu věc. Podle ní dostaneš první konkrétní kroky.</p>' +
        '<div class="onb-blocker-grid">' + BLOCKERS.map(function (x) { return '<button type="button" class="onb-choice' + (p.blocker === x.id ? ' active' : '') + '" data-onb="blocker" data-id="' + x.id + '">' + uiIcon(blockerIcons[x.id]) + '<span>' + esc(x.label) + '</span><b>✓</b></button>'; }).join('') + '</div>' +
        (p.blocker === 'jine' ? otherField('blockerOther', 'Napiš, co řešíš', p.blockerOther, 'Např. nestíhám editovat, bojím se oslovit klienty…') : '') +
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

  // Volitelné doplňující pole u možnosti „Něco jiného" — používá se ve všech třech krocích.
  function otherField(key, label, value, placeholder) {
    return '<label class="onb-other" data-other-for="' + key + '"><span>' + esc(label) + '</span>' +
      '<input type="text" class="onb-other-input" data-other-key="' + key + '" maxlength="120" value="' + esc(value || '') + '" placeholder="' + esc(placeholder) + '"></label>';
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
        if (key === 'experience' || key === 'blocker') {
          var otherKey = key + 'Other';
          var scr2 = el.closest('.onb-screen');
          var existing = scr2 && scr2.querySelector('[data-other-for="' + otherKey + '"]');
          if (id === 'jine' && scr2 && !existing) {
            var wrap = document.createElement('div');
            wrap.innerHTML = key === 'experience'
              ? otherField(otherKey, 'Napiš, kde jsi', target[otherKey], 'Např. vracím se po pauze, měním obor…')
              : otherField(otherKey, 'Napiš, co řešíš', target[otherKey], 'Např. nestíhám editovat, bojím se oslovit klienty…');
            var grid = scr2.querySelector(key === 'experience' ? '.onb-levels' : '.onb-blocker-grid') || el.parentElement;
            grid.after(wrap.firstChild);
          } else if (id !== 'jine' && existing) { existing.remove(); }
        }
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
      if (onbStep === 2 && navTarget.experience === 'jine' && !(navTarget.experienceOther || '').trim()) { flash('Napiš prosím, kde se právě nacházíš.'); return; }
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
      if (target2.experience === 'jine' && !(target2.experienceOther || '').trim()) { flash('Napiš prosím, kde se právě nacházíš.'); return; }
      if (target2.blocker === 'jine' && !(target2.blockerOther || '').trim()) { flash('Napiš prosím, co teď řešíš.'); return; }
      var firstTime = !editingProfile && !jget(ONB_DONE, false);
      bizSet(target2);
      jset(ONB_DONE, true);
      // Ulož profil i na server, ať se onboarding neopakuje na jiném zařízení (mobil vs. počítač).
      try { if (window.KenjiAuth && window.KenjiAuth.saveProfile) window.KenjiAuth.saveProfile(target2); } catch (eSP) {}
      try { localStorage.removeItem(ONB_DRAFT); } catch (e2) {}
      if (firstTime && !todosGet().length) seedTasks(target2);
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
    if (act === 'kpintro-dismiss') {
      jset('kenji_kp_intro_v1', true);
      if (window.KenjiAuth && window.KenjiAuth.dismissPointsIntro) window.KenjiAuth.dismissPointsIntro().catch(function () {});
      render(); return;
    }
    if (act === 'activation-dismiss') { jset('kenji_activation_hidden_v1', true); render(); return; }
    if (act === 'kpnudge-dismiss') { jset('kenji_kpnudge_dismiss_v1', new Date().toDateString()); render(); return; }
    if (act === 'stream-notyet') { flash('Stream nebo webinář ještě nezačal 🔴 Dej vědět mailem, ať ti nic neuteče.'); return; }

    // --- Úkoly ---
    if (act === 'task-toggle') {
      var id = el.getAttribute('data-id'), t = todosGet(), justDone = false;
      t.forEach(function (x) { if (x.id === id) { x.done = !x.done; justDone = x.done; } });
      todosSet(t);
      if (justDone) {
        tactile(16);
        var award = awardTaskXp();
        render();
        if (award.awarded) xpToast(20, 'Úkol splněn · ' + award.used + '/5 dnes');
        else flash('Úkol je hotový. KP za úkoly dnes už máš vyčerpané (5/5).');
      }
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
    target[other.getAttribute('data-other-key') || 'industryOther'] = other.value;
    if (editingProfile) bizSet(target); else { pendOnb = target; jset(ONB_DRAFT, pendOnb); }
  });

  MOUNT.addEventListener('submit', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act');
    if (act === 'ai-ask') {
      e.preventDefault();
      var q = ((el.querySelector('input') || {}).value || '').trim();
      if (q) location.href = aiUrl(q);
      return;
    }
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

  // Zápis úspěchu spuštěný z pop-upu (odkaz index.html?addwin=1)
  try {
    if (new URLSearchParams(location.search).get('addwin')) {
      history.replaceState(null, '', location.pathname);
      if (profileComplete()) setTimeout(promptAddWin, 350);
    }
  } catch (e) {}
})();
