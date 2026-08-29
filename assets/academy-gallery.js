(function () {
  const viewport = document.querySelector('.academy-wins-viewport');
  const track = viewport && viewport.querySelector('.academy-wins-grid');
  const originals = track ? Array.from(track.querySelectorAll('.academy-win-image')) : [];
  const platform = document.querySelector('[data-academy-lightbox]');
  if (!originals.length && !platform) return;

  if (track && originals.length) {
    originals.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.tabIndex = -1;
      const image = clone.querySelector('img');
      if (image) image.alt = '';
      track.appendChild(clone);
    });
    track.classList.add('is-loop-ready');
  }

  // Auto-scroll + ruční ovládání. Obě sekce jsou reálné vodorovné scroll-kontejnery:
  // posouvají se samy (rAF přes scrollLeft) a zároveň je uživatel může chytit a scrollovat
  // sám — myší (drag), prstem (nativní touch swipe) i kolečkem/trackpadem. Obsah je zdvojený,
  // takže se pás na hranici nekonečně smyčkuje bez viditelného skoku. Když je mimo obrazovku,
  // auto-scroll se zastaví (šetří výkon).
  function initDragScroll(container) {
    if (!container) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPEED = 0.4; // px za snímek (~60 fps)
    let hover = false, dragging = false, touchActive = false, wheelActive = false, onscreen = true;
    let startX = 0, startScroll = 0, pid = null, moved = 0, wheelTimer = null, touchTimer = null;

    const half = () => container.scrollWidth / 2;
    function wrap() {
      const h = half(); if (h <= 1) return;
      if (container.scrollLeft >= h) container.scrollLeft -= h;
      else if (container.scrollLeft < 0) container.scrollLeft += h;
    }
    function tick() {
      if (!reduce && onscreen && !hover && !dragging && !touchActive && !wheelActive) { container.scrollLeft += SPEED; wrap(); }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { entries.forEach((en) => { onscreen = en.isIntersecting; }); }, { rootMargin: '160px 0px' }).observe(container);
    }

    // Myš: najetím pauza (ať se dá číst), tažením scrollování.
    container.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    container.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hover = false; });
    container.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; moved = 0; startX = e.clientX; startScroll = container.scrollLeft; pid = e.pointerId;
      try { container.setPointerCapture(pid); } catch (err) {}
      container.classList.add('is-dragging');
    });
    container.addEventListener('pointermove', (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - startX; if (Math.abs(dx) > moved) moved = Math.abs(dx);
      container.scrollLeft = startScroll - dx; wrap();
    });
    const endDrag = () => { if (!dragging) return; dragging = false; container.classList.remove('is-dragging'); try { container.releasePointerCapture(pid); } catch (err) {} };
    container.addEventListener('pointerup', endDrag);
    container.addEventListener('pointercancel', endDrag);
    // Po tažení potlač klik, ať drag přes obrázek neotevře lightbox.
    container.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
    container.addEventListener('dragstart', (e) => e.preventDefault());

    // Dotyk: nativní scroll; auto-scroll pauza během doteku a chvíli po něm.
    container.addEventListener('touchstart', () => { touchActive = true; if (touchTimer) clearTimeout(touchTimer); }, { passive: true });
    container.addEventListener('touchend', () => { if (touchTimer) clearTimeout(touchTimer); touchTimer = setTimeout(() => { touchActive = false; wrap(); }, 1400); }, { passive: true });
    // Kolečko / trackpad: auto-scroll pauza během a chvíli po.
    container.addEventListener('wheel', () => { wheelActive = true; if (wheelTimer) clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { wheelActive = false; }, 700); }, { passive: true });
    // Udrž smyčku i při nativním scrollu.
    container.addEventListener('scroll', () => { if (!dragging && !touchActive) wrap(); }, { passive: true });
  }

  initDragScroll(document.querySelector('.academy-marquee'));
  initDragScroll(viewport);

  let activeIndex = -1;
  let previousFocus = null;
  const dialog = document.createElement('div');
  dialog.className = 'academy-lightbox';
  dialog.hidden = true;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Zvětšený náhled');
  dialog.innerHTML =
    '<button class="academy-lightbox-close" type="button" aria-label="Zavřít náhled">&#10005;</button>' +
    '<button class="academy-lightbox-nav is-prev" type="button" aria-label="Předchozí výsledek">&#8592;</button>' +
    '<figure><img src="" alt=""><figcaption></figcaption></figure>' +
    '<button class="academy-lightbox-nav is-next" type="button" aria-label="Další výsledek">&#8594;</button>';
  document.body.appendChild(dialog);

  const dialogImage = dialog.querySelector('img');
  const caption = dialog.querySelector('figcaption');
  const previousButton = dialog.querySelector('.is-prev');
  const nextButton = dialog.querySelector('.is-next');
  const closeButton = dialog.querySelector('.academy-lightbox-close');

  function showImage(src, alt, index) {
    activeIndex = typeof index === 'number' ? index : -1;
    dialogImage.src = src;
    dialogImage.alt = alt || '';
    caption.textContent = alt || '';
    caption.hidden = !alt;
    previousButton.hidden = activeIndex < 0 || originals.length < 2;
    nextButton.hidden = activeIndex < 0 || originals.length < 2;
  }

  function openLightbox(trigger, index) {
    const image = trigger.querySelector('img');
    const src = trigger.dataset.lightboxSrc || trigger.getAttribute('href') || (image && image.currentSrc);
    if (!src) return;
    previousFocus = document.activeElement;
    showImage(src, image ? image.alt : '', index);
    dialog.hidden = false;
    document.body.classList.add('academy-lightbox-open');
    closeButton.focus();
  }

  function closeLightbox() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    dialogImage.removeAttribute('src');
    document.body.classList.remove('academy-lightbox-open');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  function move(direction) {
    if (activeIndex < 0 || !originals.length) return;
    activeIndex = (activeIndex + direction + originals.length) % originals.length;
    const item = originals[activeIndex];
    const image = item.querySelector('img');
    showImage(item.getAttribute('href'), image ? image.alt : '', activeIndex);
  }

  if (platform) platform.addEventListener('click', () => openLightbox(platform, -1));

  if (viewport) viewport.addEventListener('click', (event) => {
    const item = event.target.closest('.academy-win-image');
    if (!item) return;
    event.preventDefault();
    const src = item.getAttribute('href');
    const index = originals.findIndex((original) => original.getAttribute('href') === src);
    openLightbox(item, index);
  });

  closeButton.addEventListener('click', closeLightbox);
  previousButton.addEventListener('click', () => move(-1));
  nextButton.addEventListener('click', () => move(1));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeLightbox();
  });
  document.addEventListener('keydown', (event) => {
    if (dialog.hidden) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft' && activeIndex >= 0) move(-1);
    if (event.key === 'ArrowRight' && activeIndex >= 0) move(1);
  });
})();

// Cena v ROI kartě — plynulé napočítání při odhalení. Finální číslo je už v HTML,
// takže bez JS / při prefers-reduced-motion se prostě zobrazí rovnou.
(function () {
  var el = document.querySelector('[data-countup]');
  if (!el) return;
  var target = parseInt(el.getAttribute('data-countup'), 10);
  if (!target) return;
  function fmt(n) { return Math.round(n).toLocaleString('cs-CZ').replace(/ /g, ' '); }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window) || !('requestAnimationFrame' in window)) { el.textContent = fmt(target); return; }
  var done = false;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting || done) return;
      done = true; io.disconnect();
      var start = performance.now(), dur = 1100;
      (function step(t) {
        var p = Math.min(1, (t - start) / dur);
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
      })(start);
    });
  }, { threshold: 0.45 });
  io.observe(el);
})();
