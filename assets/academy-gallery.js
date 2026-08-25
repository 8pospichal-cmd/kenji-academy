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

  // Nekresli nekonečné pásy, když jsou mimo obrazovku. Jejich pozice i
  // rychlost zůstávají zachované a po návratu do viewportu plynule pokračují.
  if ('IntersectionObserver' in window) {
    const animatedRows = [document.querySelector('.academy-marquee'), viewport].filter(Boolean);
    const visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
    }, { rootMargin: '160px 0px' });
    animatedRows.forEach((row) => visibilityObserver.observe(row));
  }

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
