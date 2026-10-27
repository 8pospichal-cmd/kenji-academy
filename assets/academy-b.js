// Prodejní stránka Kenji Academy (varianta B): interakce nad statickým HTML,
// které sestavuje tools/build-academy-b.py. Platbu obsluhuje script.js
// (data-checkout-product), přihlášení auth.js (KenjiAuth.login).
(function () {
  'use strict';

  var CHIP_ON = 'font:inherit;font-size:15px;font-weight:700;padding:13px 20px;border-radius:999px;border:1px solid #0E0E10;background:#0E0E10;color:#FFFFFF;cursor:pointer;min-height:44px';
  var CHIP_OFF = 'font:inherit;font-size:15px;font-weight:600;padding:13px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.85);background:rgba(255,255,255,.6);color:#0E0E10;cursor:pointer;min-height:44px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)';
  var CAT_ON = 'font:inherit;font-size:14px;font-weight:700;padding:11px 18px;border-radius:999px;border:1px solid #0E0E10;background:#0E0E10;color:#FFFFFF;cursor:pointer;min-height:44px';
  var CAT_OFF = 'font:inherit;font-size:14px;font-weight:600;padding:11px 18px;border-radius:999px;border:1px solid rgba(255,255,255,.85);background:rgba(255,255,255,.6);color:#0E0E10;cursor:pointer;min-height:44px;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)';

  // Texty musí odpovídat poli blockers v _source/academy-b/B-Web.dc.html.
  var BLOCKERS = [
    { kicker: '01 / NABÍDKA', title: '„Fotím všechno pro všechny“ není nabídka.', text: 'Vím, taky jsem tak začínal. Spolu vybereme obor, pojmenujeme, co klientovi reálně přineseš, a z portfolia uděláš výkladní skříň místo šuplíku na všechno.', out: 'nabídkou, které klient rozumí za 5 vteřin' },
    { kicker: '02 / CENY', title: 'Cena podle pocitu ti nájem nezaplatí.', text: 'Ukážu ti, jak spočítat čas, náklady, rozsah i licenci. A hlavně jak cenu říct nahlas tak, aby se ti u toho netřásl hlas.', out: 'cenou, za kterou se nemusíš omlouvat' },
    { kicker: '03 / KLIENTI', title: 'Čekat, až se někdo ozve, není strategie.', text: 'Vybereme 2–3 kanály, které zvládneš dělat pravidelně. Aby poptávky chodily i v týdnu, kdy nemáš náladu točit stories.', out: 'plánem, odkud přijde další zakázka' },
    { kicker: '04 / SYSTÉM', title: 'Pošesté psát ten samý e-mail? To ne.', text: 'Poskládáme postup od poptávky po předání: šablony, smlouvu, checklisty. Ty pak fotíš, místo abys dohledával, co jsi komu slíbil.', out: 'workflow, které nemusíš znovu vymýšlet' }
  ];
  var CATS = ['vse', 'remeslo', 'byznys', 'svatby', 'praxe'];

  function $(id) { return document.getElementById(id); }
  function track(event, detail) {
    window.dataLayer = window.dataLayer || [];
    var row = { event: event, page_type: 'academy_sales' };
    for (var k in detail) row[k] = detail[k];
    window.dataLayer.push(row);
    // Do databáze taky, ať je admin vidí v trychtýři a na kartě člověka.
    try { if (window.KenjiAuth && window.KenjiAuth.track) window.KenjiAuth.track(event, 'academy', detail || {}); } catch (e) {}
  }

  // Přihlášení: existující člen jde rovnou do aplikace.
  // Stejné tlačítko je v hlavičce (počítač) i v mobilním menu.
  var logins = document.querySelectorAll('#academy-login-btn,[data-academy-login]');
  if (logins.length) {
    Array.prototype.forEach.call(logins, function (login) {
      login.addEventListener('click', function () {
        if (window.KenjiAuth && window.KenjiAuth.login) window.KenjiAuth.login();
        else location.href = 'index.html';
      });
    });
    var syncLogin = function () {
      var logged = !!(window.KenjiAuth && window.KenjiAuth.isLoggedIn && window.KenjiAuth.isLoggedIn());
      Array.prototype.forEach.call(logins, function (login) {
        login.textContent = logged ? 'Do aplikace →' : 'Přihlásit se';
      });
    };
    document.addEventListener('kenji-auth-ready', syncLogin);
    setTimeout(syncLogin, 1200);
  }

  // Mobilní menu (hamburger vpravo nahoře).
  var menuBtn = $('b-menu-btn');
  var menu = $('b-menu');
  if (menuBtn && menu) {
    var setMenu = function (open) {
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
    };
    menuBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setMenu(menu.hidden);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a,button')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
  }

  // Co tě brzdí.
  var bkChips = $('bk-chips');
  if (bkChips) {
    var bkButtons = bkChips.querySelectorAll('button');
    Array.prototype.forEach.call(bkButtons, function (btn, i) {
      btn.addEventListener('click', function () {
        var b = BLOCKERS[i];
        if (!b) return;
        Array.prototype.forEach.call(bkButtons, function (o, j) {
          o.setAttribute('aria-pressed', j === i ? 'true' : 'false');
          o.setAttribute('style', j === i ? CHIP_ON : CHIP_OFF);
        });
        $('bk-kicker').textContent = b.kicker;
        $('bk-title').textContent = b.title;
        $('bk-text').textContent = b.text;
        $('bk-out').textContent = b.out;
        track('academy_blocker', { blocker: b.kicker });
      });
    });
  }

  // Filtr balíčků.
  var katChips = $('kat-chips');
  var shelf = $('kat-shelf');
  if (katChips && shelf) {
    var katButtons = katChips.querySelectorAll('button');
    Array.prototype.forEach.call(katButtons, function (btn, i) {
      btn.addEventListener('click', function () {
        var cat = CATS[i];
        Array.prototype.forEach.call(katButtons, function (o, j) {
          o.setAttribute('aria-pressed', j === i ? 'true' : 'false');
          o.setAttribute('style', j === i ? CAT_ON : CAT_OFF);
        });
        Array.prototype.forEach.call(shelf.querySelectorAll('[data-cat]'), function (card) {
          card.hidden = cat !== 'vse' && card.getAttribute('data-cat') !== cat;
        });
        shelf.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });
  }

  // Recenze: automatický pohyb obou řad a nativní posouvání prstem.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  Array.prototype.forEach.call(document.querySelectorAll('.testimonial-marq'), function (row) {
    var cards = row.querySelector('.track');
    if (!cards) return;
    var reverse = cards.classList.contains('rev');
    var touching = false;
    var hovering = false;
    var onscreen = true;
    var pauseUntil = 0;
    var previousTime = 0;
    var dragX = 0;
    var dragScroll = 0;
    var dragging = false;
    var pointerId = null;
    var period = function () { return cards.scrollWidth / 2; };
    if (reverse) row.scrollLeft = Math.max(0, period() - 1);

    function wrap() {
      var length = period();
      if (!length) return;
      if (row.scrollLeft >= length) row.scrollLeft -= length;
      else if (row.scrollLeft < 0) row.scrollLeft += length;
    }

    row.addEventListener('touchstart', function () { touching = true; }, { passive: true });
    row.addEventListener('touchend', function () { touching = false; wrap(); pauseUntil = performance.now() + 1400; }, { passive: true });
    row.addEventListener('touchcancel', function () { touching = false; wrap(); pauseUntil = performance.now() + 1400; }, { passive: true });
    row.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') hovering = true; });
    row.addEventListener('pointerleave', function (event) { if (event.pointerType === 'mouse') hovering = false; });
    row.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      pointerId = event.pointerId;
      dragX = event.clientX;
      dragScroll = row.scrollLeft;
      row.setPointerCapture(pointerId);
      row.style.cursor = 'grabbing';
    });
    row.addEventListener('pointermove', function (event) {
      if (!dragging || event.pointerId !== pointerId) return;
      row.scrollLeft = dragScroll + dragX - event.clientX;
      wrap();
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      pauseUntil = performance.now() + 1400;
      row.style.cursor = '';
      try { row.releasePointerCapture(pointerId); } catch (error) {}
    }
    row.addEventListener('pointerup', endDrag);
    row.addEventListener('pointercancel', endDrag);
    row.addEventListener('dragstart', function (event) { event.preventDefault(); });

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) { onscreen = entries[0].isIntersecting; });
      observer.observe(row);
    }
    function animate(now) {
      if (previousTime && onscreen && !document.hidden && !reduceMotion.matches && !touching && !dragging && !hovering && now >= pauseUntil) {
        var delta = Math.min(now - previousTime, 64);
        row.scrollLeft += (reverse ? -1 : 1) * delta * (reverse ? .022 : .026);
        wrap();
      }
      previousTime = now;
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  });

  // Úspěchy členů: zvětšení screenshotu.
  var box = $('win-box');
  var boxImg = $('win-img');
  var wins = Array.prototype.slice.call(document.querySelectorAll('[data-win]'));
  var current = 0;
  var opener = null;
  function showWin(i) {
    current = (i + wins.length) % wins.length;
    boxImg.src = wins[current].getAttribute('data-win');
  }
  function closeWin() {
    box.hidden = true;
    document.documentElement.style.overflow = '';
    if (opener) opener.focus();
  }
  if (box && boxImg && wins.length) {
    wins.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        opener = btn;
        showWin(i);
        box.hidden = false;
        document.documentElement.style.overflow = 'hidden';
        var close = box.querySelector('button[data-win-close]:not([style*="inset:0"])');
        if (close) close.focus();
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-win-close]'), function (b) { b.addEventListener('click', closeWin); });
    box.querySelector('[data-win-prev]').addEventListener('click', function () { showWin(current - 1); });
    box.querySelector('[data-win-next]').addEventListener('click', function () { showWin(current + 1); });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') closeWin();
      else if (e.key === 'ArrowLeft') showWin(current - 1);
      else if (e.key === 'ArrowRight') showWin(current + 1);
    });
  }

  // FAQ: otevřená je vždy nejvýš jedna odpověď.
  var faqButtons = Array.prototype.slice.call(document.querySelectorAll('.faq-q'));
  faqButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var willOpen = btn.getAttribute('aria-expanded') !== 'true';
      faqButtons.forEach(function (o) {
        var open = o === btn && willOpen;
        o.setAttribute('aria-expanded', open ? 'true' : 'false');
        var answer = o.parentNode.querySelector('.faq-a');
        if (answer) answer.hidden = !open;
      });
    });
  });

  // Slevový kód: pole čte window.kenjiCoupon() ze script.js.
  var couponToggle = $('coupon-toggle');
  var couponBox = $('coupon-box');
  if (couponToggle && couponBox) {
    couponToggle.addEventListener('click', function () {
      couponBox.hidden = !couponBox.hidden;
      couponToggle.setAttribute('aria-expanded', couponBox.hidden ? 'false' : 'true');
      if (!couponBox.hidden) $('kenji-coupon').focus();
    });
    try {
      var q = new URLSearchParams(location.search);
      var preset = q.get('coupon') || q.get('slevovy_kod') || sessionStorage.getItem('kenji_coupon');
      if (preset) {
        $('kenji-coupon').value = preset.toUpperCase();
        couponBox.hidden = false;
        couponToggle.setAttribute('aria-expanded', 'true');
      }
    } catch (e) {}
  }

  // Měření kliků na výzvy k akci.
  document.addEventListener('click', function (e) {
    var cta = e.target.closest('[data-cta-location]');
    if (cta) track('academy_cta', { cta_location: cta.getAttribute('data-cta-location') });
  });

  // Odkazy na sekce: obrázky se cestou dolů načítají a posouvají obsah, takže
  // obyčejný skok na kotvu skončí o kus výš. Po zastavení cíl dorovnáme.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    // U sekce míříme rovnou na nadpis, ne na prázdný horní okraj.
    var anchor = target.classList.contains('sec') && target.firstElementChild ? target.firstElementChild : target;
    var goal = function () { return Math.max(0, anchor.getBoundingClientRect().top + window.pageYOffset - 20); };
    window.scrollTo({ top: goal(), behavior: 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + target.id);
    var tries = 0, last = -1, still = 0;
    var timer = setInterval(function () {
      var y = window.pageYOffset;
      still = Math.abs(y - last) < 1 ? still + 1 : 0;
      last = y;
      if (still < 2) return;
      var want = goal();
      if (Math.abs(want - y) > 4 && tries < 6) { tries++; still = 0; window.scrollTo({ top: want, behavior: 'smooth' }); }
      else clearInterval(timer);
    }, 120);
  });
})();
