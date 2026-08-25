// Kenji Academy - povinný první průchod s reálnými checkpointy.
(function () {
  'use strict';

  var A = window.KenjiAuth;
  if (!A || !A.isLoggedIn || !A.isLoggedIn()) return;

  var KEY = 'kenji_guided_onboarding_v3';
  var VERSION = 3;
  var forced = /[?&]tour=1(?:&|$)/.test(location.search);
  var currentFile = location.pathname.split('/').pop() || 'index.html';
  var inArticle = /\/clanky\//.test(location.pathname);
  var prefix = inArticle ? '../' : '';
  var active = false;
  var index = 0;
  var target = null;
  var catcher = null;
  var ring = null;
  var card = null;
  var waitTimer = 0;
  var placeTimer = 0;
  var previousScrollBehavior = '';

  var articleByBlocker = {
    klienti: 'cold-outreach',
    cena: 'cenik-ktery-prodava',
    portfolio: 'portfolio',
    cas: 'planovani-roku',
    zacatek: 'expozice'
  };

  function recommendedArticle() {
    try {
      var biz = JSON.parse(localStorage.getItem('kenji_biz_v1') || '{}');
      return articleByBlocker[biz.blocker] || 'expozice';
    } catch (e) { return 'expozice'; }
  }

  function isAcademy() { return !!(A.isAcademy && A.isAcademy()); }
  function homeFile() { return currentFile === '' || currentFile === 'index.html'; }
  function routeMatches(step) {
    if (!step.route || step.route === 'any') return true;
    if (step.route === 'home') return homeFile();
    if (step.route === 'article') return inArticle && currentFile === recommendedArticle() + '.html';
    if (step.route === 'course') return currentFile === 'kurz.html';
    return currentFile === step.route;
  }

  var steps = [
    { id: 'welcome', route: 'home', kind: 'dialog', eyebrow: 'AHOJ, JÁ JSEM KENJI', title: 'Nejdřív ti to tady ukážu.', text: 'Společně nastavíme profil a rovnou si vyzkoušíš obsah, Kenji AI, kurzy i komunitu. Až potom tě pustím do celé Academy.', next: 'Jdeme na to →' },
    { id: 'plan', route: 'home', kind: 'dialog', selector: '[data-tour="plan"]', eyebrow: 'TVŮJ START', title: 'Tady vždycky uvidíš další krok.', text: 'Tvůj plán není seznam funkcí. Podle oboru a cíle ti ukazuje, co má největší smysl udělat právě teď.', next: 'Nastavit můj profil →', href: 'nastaveni.html?onboarding=profile' },
    { id: 'profile', route: 'nastaveni.html', kind: 'task', selector: '#set-save', fallback: '[data-tour="profile"]', eyebrow: '1 · TVŮJ PROFIL', title: 'Ať víme, kdo jsi.', text: 'Nahraj profilovou fotku, doplň jméno, pár vět o sobě a Instagram. Potom profil opravdu ulož.', require: 'profile', next: 'Pokračovat do databáze →', href: 'index.html?onboarding=database' },
    { id: 'database', route: 'home', kind: 'dialog', selector: '[data-tour="database"]', fallback: '[data-tour="database-tab"]', sidebar: true, eyebrow: '2 · DATABÁZE', title: 'Najdi řešení podle problému.', text: 'Databáze propojuje techniku, tvorbu i byznys. Teď ti otevřu jeden článek vybraný podle tvého plánu.', next: 'Otevřít doporučený článek →', href: function () { return 'clanky/' + recommendedArticle() + '.html?onboarding=article'; } },
    { id: 'article', route: 'article', kind: 'task', selector: '#kenji-read-toggle', eyebrow: '3 · PRAKTICKÝ OBSAH', title: 'Jeden článek, jeden konkrétní posun.', text: 'Projdi si článek a dole ho označ jako přečtený. Tím se uloží do tvého postupu a plán pozná, že může pokračovat dál.', require: 'article', next: 'Vyzkoušet Kenji AI →', href: '../kenji-ai.html?onboarding=ai' },
    { id: 'ai', route: 'kenji-ai.html', kind: 'task', selector: '[data-tour="ai-input"]', eyebrow: '4 · KENJI AI', title: 'Teď mi polož skutečný dotaz.', text: 'Napiš, s čím se právě zasekáváš, a dotaz odešli. Nestačí AI jen otevřít - tenhle krok splní až tvoje první zpráva.', require: 'ai', next: 'Pokračovat do kurzů →', href: 'kurzy.html?onboarding=courses' },
    { id: 'course_catalog', route: 'kurzy.html', kind: 'task', selector: '[data-tour="course-grid"] .course-card', fallback: '[data-tour="course-grid"]', eyebrow: '5 · KURZY', title: 'Vyber si cestu, která tě zajímá.', text: 'Každý kurz je poskládaný po lekcích a Academy si pamatuje postup. Otevři teď libovolný kurz a podíváme se dovnitř.', require: 'course-open' },
    { id: 'course_tree', route: 'course', kind: 'dialog', selector: '[data-tour="course-tree"]', eyebrow: 'UVNITŘ KURZU', title: 'Celou osnovu máš vlevo.', text: 'Moduly můžeš rozbalovat a mezi lekcemi přecházet přímo v menu. Academy zvýrazní, co právě sleduješ, a uloží hotové lekce.', next: 'Ukázat přehrávač →' },
    { id: 'course_content', route: 'course', kind: 'dialog', selector: '[data-tour="course-player"]', fallback: '.paywall', eyebrow: 'VIDEO A POZNÁMKY', title: 'Video je jen začátek.', text: function () { return isAcademy() ? 'Pod videem najdeš shrnutí, konkrétní postupy a návazný obsah. Další lekci otevřeš tlačítkem dole nebo vlevo v osnově.' : 'Ve Free verzi vidíš osnovu kurzu. Videa, podrobné popisky a ukládání lekcí se odemknou v plné Academy.'; }, next: 'Poslední krok: komunita →', href: 'prispevky.html?category=foto-feedback&onboarding=1' },
    { id: 'community', route: 'prispevky.html', kind: 'dialog', selector: '[data-tour="community-composer"]', eyebrow: '6 · FOTO FEEDBACK', title: 'Tady můžeš ukázat svoji tvorbu.', text: 'Ve Foto feedbacku nahraješ svoji práci a řekneš, s čím chceš poradit. První příspěvek není povinný teď — na dashboardu za něj ale získáš 30 KP.', next: 'Dokončit průvodce →' },
    { id: 'finish', route: 'any', kind: 'finish', eyebrow: 'HOTOVO', title: 'Teď už jsi opravdu uvnitř.', text: 'Máš nastavený profil, první výstup z AI, otevřený kurz a přečtený článek. Víš také, kde získat feedback. Odteď pokračuj podle osobního plánu.', next: 'Otevřít můj dashboard →', href: 'index.html#dash-modules' }
  ];

  function defaultState(mode) {
    return { version: VERSION, status: 'active', mode: mode || 'mandatory', step: 0, checkpoints: {}, updatedAt: Date.now() };
  }
  function readState() {
    try {
      var value = JSON.parse(localStorage.getItem(KEY));
      return value && value.version === VERSION ? value : null;
    } catch (e) { return null; }
  }
  function saveState(state) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function stateNow() {
    var state = readState();
    if (!state) { state = defaultState(forced ? 'review' : 'mandatory'); saveState(state); }
    return state;
  }
  function isReview() { return stateNow().mode === 'review'; }

  function checkpointDone(name) {
    var state = stateNow();
    if (isReview()) return true;
    if (state.checkpoints && state.checkpoints[name]) return true;
    if (name === 'profile') {
      try { return localStorage.getItem('kenji_task_profile') === '1'; } catch (e) { return false; }
    }
    if (name === 'article') {
      try { return (JSON.parse(localStorage.getItem('kenji_read_v1') || '[]') || []).indexOf(recommendedArticle()) >= 0; } catch (e2) { return false; }
    }
    return false;
  }

  function completeCheckpoint(name) {
    var state = stateNow();
    state.checkpoints = state.checkpoints || {};
    state.checkpoints[name] = true;
    saveState(state);
    renderCurrent();
  }

  function rootHref(href) {
    if (!href) return '';
    if (/^(?:\.\.\/|https?:|#)/.test(href)) return href;
    return prefix + href;
  }
  function stepHref(step) { return rootHref(typeof step.href === 'function' ? step.href() : step.href); }

  function expectedHref(step) {
    if (step.route === 'home') return prefix + 'index.html?onboarding=' + step.id;
    if (step.route === 'nastaveni.html') return prefix + 'nastaveni.html?onboarding=profile';
    if (step.route === 'article') return prefix + 'clanky/' + recommendedArticle() + '.html?onboarding=article';
    if (step.route === 'kenji-ai.html') return prefix + 'kenji-ai.html?onboarding=ai';
    if (step.route === 'kurzy.html') return prefix + 'kurzy.html?onboarding=courses';
    if (step.route === 'course') {
      var state = stateNow();
      return prefix + (state.courseHref || 'kurzy.html?onboarding=courses');
    }
    if (step.route === 'prispevky.html') return prefix + 'prispevky.html?category=foto-feedback&onboarding=1';
    return prefix + 'index.html';
  }

  function goToStep(nextIndex, href) {
    var state = stateNow();
    index = Math.max(0, Math.min(steps.length - 1, nextIndex));
    state.step = index;
    saveState(state);
    var destination = href || '';
    if (destination) location.href = destination;
    else renderCurrent();
  }

  function isMobile() {
    var toggle = document.querySelector('.menu-toggle');
    return !!(toggle && getComputedStyle(toggle).display !== 'none');
  }
  function setSidebar(open) {
    var sidebar = document.querySelector('#sidebar');
    var overlay = document.querySelector('.sidebar-overlay');
    if (!sidebar) return;
    sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('show', open);
  }

  function createUi(step) {
    destroyUi();
    ring = document.createElement('div');
    card = document.createElement('section');
    ring.className = 'kt-ring' + (step.kind === 'task' ? ' is-task' : '');
    card.className = 'kt-card';
    card.setAttribute('role', step.kind === 'task' ? 'status' : 'dialog');
    if (step.kind !== 'task') {
      catcher = document.createElement('div');
      catcher.className = 'kt-catch';
      document.body.appendChild(catcher);
      card.setAttribute('aria-modal', 'true');
    }
    document.body.appendChild(ring);
    document.body.appendChild(card);
  }

  function destroyUi() {
    clearTimeout(waitTimer); clearTimeout(placeTimer);
    [catcher, ring, card].forEach(function (el) { if (el) el.remove(); });
    catcher = ring = card = target = null;
  }

  function teardown() {
    active = false;
    destroyUi();
    setSidebar(false);
    document.body.classList.remove('kenji-tour-active', 'kenji-tour-task');
    document.documentElement.style.scrollBehavior = previousScrollBehavior;
    window.removeEventListener('resize', schedulePlace);
    window.removeEventListener('scroll', schedulePlace, true);
    document.removeEventListener('keydown', onKeydown);
    document.removeEventListener('kenji:profile-complete', onProfile);
    document.removeEventListener('kenji:article-read', onArticle);
    document.removeEventListener('kenji:ai-question-sent', onAi);
    document.removeEventListener('click', onCourseClick, true);
  }

  function closeReview() {
    var state = stateNow();
    state.status = 'complete';
    saveState(state);
    teardown();
  }

  function progressText() {
    var userSteps = steps.filter(function (s) { return s.require; });
    var currentId = steps[index].id;
    var at = Math.max(0, userSteps.findIndex(function (s) { return s.id === currentId; }));
    return Math.min(at + 1, userSteps.length) + ' / ' + userSteps.length;
  }

  function renderCard(step) {
    var mandatory = !isReview();
    var done = step.require ? checkpointDone(step.require) : false;
    var text = typeof step.text === 'function' ? step.text() : step.text;
    var task = step.kind === 'task';
    var finish = step.kind === 'finish';
    card.className = 'kt-card' + (task ? ' is-task' : '') + (step.id === 'welcome' ? ' is-welcome' : '') + (finish ? ' is-finish' : '') + (done ? ' is-complete' : '');
    card.innerHTML =
      '<div class="kt-person"><img src="' + prefix + 'assets/kenji-portret.webp" alt="Kenji"><span><strong>Kenji</strong><small>' + (mandatory ? 'Povinný první start' : 'Opakování průvodce') + '</small></span></div>' +
      (isReview() ? '<button type="button" class="kt-skip">Zavřít</button>' : '<span class="kt-required">' + (task ? progressText() : 'PRVNÍ START') + '</span>') +
      '<div class="kt-copy"><span class="kt-eyebrow">' + step.eyebrow + '</span><h2>' + step.title + '</h2><p>' + text + '</p></div>' +
      (task ? '<div class="kt-task-state ' + (done ? 'is-done' : '') + '"><span>' + (done ? '✓' : '●') + '</span><strong>' + (done ? 'Splněno. Můžeme pokračovat.' : taskWaitingText(step.require)) + '</strong></div>' : '') +
      '<div class="kt-actions"><span></span><div class="kt-actions-main">' +
        ((task && !done && !isReview()) || step.require === 'course-open' ? '' : '<button type="button" class="kt-next">' + step.next + '</button>') +
      '</div></div>';

    var close = card.querySelector('.kt-skip');
    if (close) close.addEventListener('click', closeReview);
    var next = card.querySelector('.kt-next');
    if (next) next.addEventListener('click', function () {
      if (finish) {
        var state = stateNow(); state.status = 'complete'; saveState(state); teardown(); location.href = stepHref(step);
      } else goToStep(index + 1, stepHref(step));
    });
  }

  function taskWaitingText(requirement) {
    return ({
      profile: 'Čekám, až uložíš kompletní profil.',
      article: 'Čekám na označení článku jako přečteného.',
      ai: 'Čekám na tvoji první odeslanou otázku.',
      'course-open': 'Klikni na jeden z kurzů.'
    })[requirement] || 'Dokonči tento krok přímo na stránce.';
  }

  function place() {
    if (!active || !card) return;
    var step = steps[index];
    if (!target || step.kind === 'finish' || step.id === 'welcome') {
      if (ring) ring.hidden = true;
      card.style.removeProperty('top'); card.style.removeProperty('left'); card.style.removeProperty('width');
      return;
    }
    var rect = target.getBoundingClientRect();
    var pad = isMobile() ? 5 : 8;
    ring.hidden = false;
    ring.style.top = Math.max(4, rect.top - pad) + 'px';
    ring.style.left = Math.max(4, rect.left - pad) + 'px';
    ring.style.width = Math.max(1, Math.min(innerWidth - 8, rect.width + pad * 2)) + 'px';
    ring.style.height = Math.max(1, Math.min(innerHeight - 8, rect.height + pad * 2)) + 'px';
    if (isMobile()) {
      card.style.removeProperty('width');
      card.style.left = '0'; card.style.right = '0';
      if (step.kind === 'task' && (rect.top > innerHeight * .48 || innerHeight - rect.bottom < card.offsetHeight + 16)) {
        card.style.top = 'max(64px, env(safe-area-inset-top))';
        card.style.bottom = 'auto';
      } else {
        card.style.removeProperty('top');
        card.style.bottom = '0';
      }
      return;
    }
    var width = Math.min(390, innerWidth - 32);
    card.style.width = width + 'px';
    var height = card.offsetHeight;
    var gap = 18;
    var centeredLeft = Math.max(16, Math.min(innerWidth - width - 16, rect.left + rect.width / 2 - width / 2));
    var centeredTop = Math.max(16, Math.min(innerHeight - height - 16, rect.top + rect.height / 2 - height / 2));
    var candidates = [
      { left: rect.right + gap, top: centeredTop },
      { left: rect.left - width - gap, top: centeredTop },
      { left: centeredLeft, top: rect.top - height - gap },
      { left: centeredLeft, top: rect.bottom + gap }
    ];
    var chosen = candidates.find(function (pos) {
      return pos.left >= 16 && pos.top >= 16 && pos.left + width <= innerWidth - 16 && pos.top + height <= innerHeight - 16;
    });
    var left = chosen ? chosen.left : (rect.left + rect.width / 2 < innerWidth / 2 ? innerWidth - width - 16 : 16);
    var top = chosen ? chosen.top : (rect.top + rect.height / 2 < innerHeight / 2 ? innerHeight - height - 16 : 16);
    card.style.right = 'auto'; card.style.bottom = 'auto';
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }

  function schedulePlace() { clearTimeout(placeTimer); placeTimer = setTimeout(place, 40); }
  function findTarget(step, tries) {
    target = step.selector ? document.querySelector(step.selector) : null;
    if (!target && step.fallback) target = document.querySelector(step.fallback);
    if (!target && tries < 40) { waitTimer = setTimeout(function () { findTarget(step, tries + 1); }, 100); return; }
    if (!target) {
      ring.hidden = true;
      card.classList.add('is-fallback');
      place();
      return;
    }
    if (step.id === 'ai' && !checkpointDone('ai')) prefillAi();
    if (isMobile()) setSidebar(!!step.sidebar);
    if (step.kind !== 'task' || step.id === 'article') {
      try { target.scrollIntoView({ block: step.kind === 'task' ? 'center' : 'center', inline: 'nearest', behavior: 'auto' }); } catch (e) {}
    }
    setTimeout(place, isMobile() && step.sidebar ? 300 : 60);
  }

  function prefillAi() {
    var input = document.querySelector('#ai-input');
    if (!input || input.value) return;
    var biz = {};
    try { biz = JSON.parse(localStorage.getItem('kenji_biz_v1') || '{}'); } catch (e) {}
    var focus = ({ klienti: 'získat více klientů', cena: 'lépe nastavit cenu a nabídku', portfolio: 'zlepšit portfolio', cas: 'udělat si systém v práci', zacatek: 'vybrat první správný krok' })[biz.blocker] || 'posunout svoje kreativní podnikání';
    input.value = 'Pomoz mi tento týden ' + focus + '. Polož mi nejdřív otázky, které potřebuješ.';
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (e2) {}
  }

  function renderCurrent() {
    if (!active) return;
    var step = steps[index];
    document.body.classList.toggle('kenji-tour-task', step.kind === 'task');
    createUi(step); renderCard(step); findTarget(step, 0);
    setTimeout(function () { var btn = card && card.querySelector('.kt-next'); if (btn) btn.focus({ preventScroll: true }); }, 80);
  }

  function onProfile() { if (steps[index].require === 'profile') completeCheckpoint('profile'); }
  function onArticle(event) { if (steps[index].require === 'article' && event.detail && event.detail.read) completeCheckpoint('article'); }
  function onAi() { if (steps[index].require === 'ai') completeCheckpoint('ai'); }
  function onCourseClick(event) {
    if (!active || steps[index].require !== 'course-open') return;
    var link = event.target.closest('.course-card');
    if (!link) return;
    var state = stateNow();
    state.checkpoints['course-open'] = true;
    state.courseHref = link.getAttribute('href') || '';
    state.step = index + 1;
    saveState(state);
  }
  function onKeydown(event) { if (event.key === 'Escape' && isReview()) teardown(); }

  function start() {
    if (active) return;
    var state = stateNow();
    if (state.status === 'complete' && !forced) return;
    if (forced) { state = defaultState('review'); saveState(state); }
    index = Math.max(0, Math.min(steps.length - 1, Number(state.step) || 0));
    var step = steps[index];
    if (!routeMatches(step)) { location.replace(expectedHref(step)); return; }
    active = true;
    previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.classList.add('kenji-tour-active');
    window.addEventListener('resize', schedulePlace);
    window.addEventListener('scroll', schedulePlace, true);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('kenji:profile-complete', onProfile);
    document.addEventListener('kenji:article-read', onArticle);
    document.addEventListener('kenji:ai-question-sent', onAi);
    document.addEventListener('click', onCourseClick, true);
    renderCurrent();
  }

  window.KenjiTour = { start: function () { location.href = prefix + 'index.html?tour=1'; }, state: readState };
  try { document.dispatchEvent(new Event('kenji-tour-ready')); } catch (e) {}
  setTimeout(start, 650);
})();
