// Kenji Academy - jednoducha staticka prohlidka skutecnych stranek aplikace.
(function () {
  'use strict';

  var A = window.KenjiAuth;
  if (!A || !A.isLoggedIn || !A.isLoggedIn()) return;

  var KEY = 'kenji_guided_onboarding_v4';
  var OLD_KEY = 'kenji_guided_onboarding_v3';
  var VERSION = 4;
  var params = new URLSearchParams(location.search);
  var explicitStart = params.get('tour') === '1' && !params.has('tourStep');
  var requestedStep = params.has('tourStep') ? Number(params.get('tourStep')) : NaN;
  var currentFile = location.pathname.split('/').pop() || 'index.html';
  var inArticle = /\/clanky\//.test(location.pathname);
  var prefix = inArticle ? '../' : '';
  var active = false;
  var index = 0;
  var overlay = null;
  var card = null;
  var focus = null;
  var target = null;
  var targetTimer = 0;

  var steps = [
    {
      id: 'welcome', route: 'index.html', place: 'center', eyebrow: 'VÍTEJ V KENJI ACADEMY',
      title: 'Ukážu ti, kde co najdeš.',
      text: 'Zabere to jen chvilku. Nic nemusíš vyplňovat ani zkoušet, jen se podíváš, jak Academy funguje.'
    },
    {
      id: 'dashboard', route: 'index.html', place: 'top-right', target: '.bottom-nav-inner', eyebrow: 'TVŮJ DASHBOARD',
      title: 'Tady začíná každý návrat.',
      text: 'Na dashboardu vidíš další krok a rozdělané úkoly. Spodní lištou se kdykoli přepneš mezi kurzy, databází, komunitou a Kenji AI.'
    },
    {
      id: 'database', route: 'index.html', place: 'bottom-right', target: '.sidebar-search', mobileTarget: '.bottom-nav a[href="index.html"]', eyebrow: 'DATABÁZE',
      title: 'Řešení najdeš podle situace.',
      text: 'V menu otevřeš články o technice, tvorbě i byznysu. Vyhledávání tě dovede rovnou ke konkrétní odpovědi.'
    },
    {
      id: 'courses', route: 'kurzy.html', place: 'top-right', target: '.bottom-nav a[href="kurzy.html"]', eyebrow: 'KURZY A LEKCE',
      title: 'Když chceš jít krok za krokem.',
      text: 'Kurzy skládají témata do jasného pořadí. Uvnitř najdeš osnovu, videa a praktické popisky.'
    },
    {
      id: 'ai', route: 'kenji-ai.html', place: 'top-right', target: '.ai-inputbar', eyebrow: 'KENJI AI',
      title: 'Tady se můžeš na cokoli zeptat.',
      text: 'Kenji AI zná tvůj profil a pomůže s tvorbou, nabídkou, cenou i klienty. Ve Free verzi máš pět otázek za 24 hodin.'
    },
    {
      id: 'community', route: 'prispevky.html', query: 'category=foto-feedback', place: 'top-right', target: '.bottom-nav a[href="prispevky.html"]', eyebrow: 'KOMUNITA',
      title: 'Nemusíš na všechno přijít sám.',
      text: 'Ve Foto feedbacku ukážeš svoji práci. Najdeš tu také týdenní výzvy, zkušenosti a úspěchy ostatních.'
    },
    {
      id: 'profile', route: 'nastaveni.html', place: 'bottom-right', mobilePlace: 'bottom', target: '.set-avatar-row', eyebrow: 'PROFIL A NASTAVENÍ',
      title: 'Čím víc o tobě víme, tím lépe poradíme.',
      text: 'Tady doplníš fotku, jméno, Instagram a pár vět o sobě. Díky tomu dostaneš přesnější pomoc od AI i komunity.'
    },
    {
      id: 'points', route: 'index.html', anchor: 'dash-modules', place: 'bottom-right', mobilePlace: 'bottom', target: '.co-xp-badge', eyebrow: 'KP — KENJI POINTY',
      title: 'Za aktivitu sbíráš KP.',
      text: 'Počítá se všechno: splněné úkoly z plánu, zhlédnutá videa a lekce, účast na webinářích i aktivita v komunitě — vlastní příspěvky, komentáře a pomoc ostatním. Každých 100 KP = nový level.'
    },
    {
      id: 'finish', route: 'index.html', anchor: 'dash-modules', place: 'center', target: '.bottom-nav-inner', eyebrow: 'MÁŠ PŘEHLED',
      title: 'Teď si vyber první malý krok.',
      text: 'Startovní úkoly najdeš na dashboardu. Plň je vlastním tempem — každá akce ti přidá KP, posune tě v levelu i v žebříčku a otevře cestu k odměnám pro nejaktivnější.'
    }
  ];

  function defaultState(mode) {
    return { version: VERSION, status: 'active', mode: mode || 'first', step: 0, updatedAt: Date.now() };
  }

  function readState() {
    try {
      var value = JSON.parse(localStorage.getItem(KEY) || 'null');
      return value && value.version === VERSION ? value : null;
    } catch (e) { return null; }
  }

  function saveState(state) {
    state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function migrateCompletedTour() {
    if (readState() || explicitStart) return;
    try {
      var oldState = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      if (oldState && oldState.version === 3 && oldState.status === 'complete') {
        var migrated = defaultState('migrated');
        migrated.status = 'complete';
        migrated.step = steps.length - 1;
        saveState(migrated);
      }
    } catch (e) {}
  }

  function currentState() {
    var state = readState();
    if (!state) {
      state = defaultState(explicitStart ? 'replay' : 'first');
      saveState(state);
    }
    return state;
  }

  function normalizeFile(file) {
    return !file || file === '/' ? 'index.html' : file;
  }

  function routeMatches(step) {
    return normalizeFile(currentFile) === step.route;
  }

  function routeFor(step, stepIndex) {
    var query = step.query ? step.query + '&' : '';
    return prefix + step.route + '?' + query + 'tour=1&tourStep=' + stepIndex + (step.anchor ? '#' + step.anchor : '');
  }

  function cleanTourParams() {
    try {
      var url = new URL(location.href);
      url.searchParams.delete('tour');
      url.searchParams.delete('tourStep');
      history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch (e) {}
  }

  function teardown() {
    active = false;
    clearTimeout(targetTimer);
    if (overlay) overlay.remove();
    overlay = card = focus = target = null;
    document.body.classList.remove('kenji-tour-active');
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', placeUi);
  }

  function stop(status) {
    var state = currentState();
    state.status = status;
    state.step = index;
    saveState(state);
    teardown();
    cleanTourParams();
  }

  function move(nextIndex) {
    var bounded = Math.max(0, Math.min(steps.length - 1, nextIndex));
    var state = currentState();
    state.status = 'active';
    state.step = bounded;
    saveState(state);
    if (routeMatches(steps[bounded])) {
      index = bounded;
      render();
    } else {
      location.replace(routeFor(steps[bounded], bounded));
    }
  }

  function dots() {
    return steps.map(function (_, dotIndex) {
      var stateClass = dotIndex === index ? ' is-active' : (dotIndex < index ? ' is-done' : '');
      return '<span class="' + stateClass + '" aria-hidden="true"></span>';
    }).join('');
  }

  function render() {
    if (!active) return;
    var step = steps[index];
    var last = index === steps.length - 1;
    var first = index === 0;

    card.innerHTML =
      '<button type="button" class="kt-skip" aria-label="Ukončit průvodce">Ukončit <span aria-hidden="true">×</span></button>' +
      '<div class="kt-person"><img src="' + prefix + 'assets/kenji-portret.webp" alt=""><span><strong>Kenji</strong><small>Průvodce Academy</small></span></div>' +
      '<div class="kt-copy"><span class="kt-eyebrow">' + step.eyebrow + '</span><h2 id="kt-title">' + step.title + '</h2><p>' + step.text + '</p></div>' +
      '<div class="kt-footer"><div class="kt-progress" aria-label="Krok ' + (index + 1) + ' z ' + steps.length + '"><div class="kt-dots">' + dots() + '</div><small>' + (index + 1) + ' / ' + steps.length + '</small></div>' +
      '<div class="kt-actions-main">' +
        (first ? '' : '<button type="button" class="kt-back" aria-label="Předchozí krok"><span aria-hidden="true">&larr;</span><span>Zpět</span></button>') +
        '<button type="button" class="kt-next">' + (last ? 'Dokončit' : 'Další') + '<span aria-hidden="true">' + (last ? '&#10003;' : '&rarr;') + '</span></button>' +
      '</div></div>';
    card.dataset.place = window.innerWidth <= 760 && step.mobilePlace ? step.mobilePlace : (step.place || 'top-right');

    card.querySelector('.kt-skip').addEventListener('click', function () { stop('dismissed'); });
    var back = card.querySelector('.kt-back');
    if (back) back.addEventListener('click', function () { move(index - 1); });
    card.querySelector('.kt-next').addEventListener('click', function () {
      if (last) {
        stop('complete');
        if (normalizeFile(currentFile) !== 'index.html') location.href = prefix + 'index.html#dash-modules';
      } else {
        move(index + 1);
      }
    });
    setTimeout(function () {
      var next = card && card.querySelector('.kt-next');
      if (next) next.focus({ preventScroll: true });
    }, 40);
    findTarget(step, 0);
  }

  function createUi() {
    overlay = document.createElement('div');
    overlay.className = 'kt-overlay';
    overlay.innerHTML = '<div class="kt-focus" aria-hidden="true"></div><section class="kt-card" role="dialog" aria-modal="true" aria-labelledby="kt-title"></section>';
    document.body.appendChild(overlay);
    card = overlay.querySelector('.kt-card');
    focus = overlay.querySelector('.kt-focus');
  }

  function findTarget(step, attempt) {
    clearTimeout(targetTimer);
    var selector = window.innerWidth <= 760 && step.mobileTarget ? step.mobileTarget : step.target;
    target = selector ? document.querySelector(selector) : null;
    if (!target && selector && attempt < 20) {
      targetTimer = setTimeout(function () { findTarget(step, attempt + 1); }, 100);
      return;
    }
    placeUi();
  }

  function placeUi() {
    if (!active || !card || !focus) return;
    var step = steps[index];
    card.dataset.place = window.innerWidth <= 760 && step.mobilePlace ? step.mobilePlace : (step.place || 'top-right');
    if (!target) {
      focus.hidden = true;
      return;
    }
    var rect = target.getBoundingClientRect();
    var pad = window.innerWidth <= 760 ? 5 : 7;
    focus.hidden = false;
    focus.style.left = Math.max(4, rect.left - pad) + 'px';
    focus.style.top = Math.max(4, rect.top - pad) + 'px';
    focus.style.width = Math.max(1, Math.min(window.innerWidth - 8, rect.width + pad * 2)) + 'px';
    focus.style.height = Math.max(1, Math.min(window.innerHeight - 8, rect.height + pad * 2)) + 'px';
  }

  function onKeydown(event) {
    if (!active) return;
    if (event.key === 'ArrowRight' && index < steps.length - 1) { event.preventDefault(); move(index + 1); }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); move(index - 1); }
    if (event.key === 'Escape') { event.preventDefault(); stop('dismissed'); }
  }

  function start() {
    migrateCompletedTour();
    var state = currentState();
    if (explicitStart) {
      state = defaultState('replay');
      saveState(state);
    } else if (Number.isFinite(requestedStep)) {
      state.status = 'active';
      state.step = Math.max(0, Math.min(steps.length - 1, requestedStep));
      saveState(state);
    }
    if ((state.status === 'complete' || state.status === 'dismissed') && !explicitStart) return;

    index = Math.max(0, Math.min(steps.length - 1, Number(state.step) || 0));
    if (!routeMatches(steps[index])) {
      location.replace(routeFor(steps[index], index));
      return;
    }

    active = true;
    document.body.classList.add('kenji-tour-active');
    createUi();
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('resize', placeUi);
    render();
  }

  window.KenjiTour = {
    start: function () { location.href = prefix + 'index.html?tour=1'; },
    state: readState
  };
  try { document.dispatchEvent(new Event('kenji-tour-ready')); } catch (e) {}
  setTimeout(start, 450);
})();
