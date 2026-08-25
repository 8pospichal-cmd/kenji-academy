// ============================================
// KENJI KNIHOVNA — Sdílený JS
// ============================================

document.addEventListener('DOMContentLoaded', () => {

  // --------------------------------------------
  // 1) Mobilní menu toggle
  // --------------------------------------------
  const toggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (toggle && sidebar) {
    const closeMenu = () => {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    };

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('show');
    });

    if (overlay) overlay.addEventListener('click', closeMenu);

    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 968) closeMenu();
      });
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 968) closeMenu();
    });
  }

  // --------------------------------------------
  // 2) Reading progress bar (jen v článcích)
  // --------------------------------------------
  const article = document.querySelector('.main-inner');
  const header = document.querySelector('.top-header');
  const isArticle = document.querySelector('.article-hero');

  if (article && header && isArticle) {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    header.appendChild(bar);

    const updateProgress = () => {
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;

      const totalScrollable = articleHeight - windowHeight + articleTop;
      const progress = Math.max(0, Math.min(100, ((scrollTop - articleTop / 2) / totalScrollable) * 100));

      bar.style.width = progress + '%';
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    updateProgress();
  }

  // --------------------------------------------
  // 3) Scrollspy — zvýraznění aktivní sekce v sidebar
  // --------------------------------------------
  const tocLinks = document.querySelectorAll('.sidebar-section:last-child .sidebar-sublink');
  if (tocLinks.length > 0 && isArticle) {
    const sections = Array.from(tocLinks).map(link => {
      const id = link.getAttribute('href')?.replace('#', '');
      return id ? { link, section: document.getElementById(id) } : null;
    }).filter(item => item && item.section);

    if (sections.length > 0) {
      const setActive = () => {
        const scrollPos = window.scrollY + 120;
        let activeIndex = 0;

        for (let i = 0; i < sections.length; i++) {
          if (sections[i].section.offsetTop <= scrollPos) {
            activeIndex = i;
          }
        }

        sections.forEach((item, i) => {
          item.link.classList.toggle('toc-active', i === activeIndex);
        });
      };

      window.addEventListener('scroll', setActive, { passive: true });
      setActive();
    }
  }

  // --------------------------------------------
  // Slevový kupón: z URL (?coupon=NIKON20 / ?slevovy_kod=) — partnerský odkaz, sleva sama.
  // Uloží se do sessionStorage (přežije proklik webem) nebo z pole #kenji-coupon.
  window.kenjiCoupon = function () {
    try {
      const url = new URLSearchParams(location.search);
      const fromUrl = url.get('coupon') || url.get('slevovy_kod');
      if (fromUrl) sessionStorage.setItem('kenji_coupon', fromUrl.trim().toUpperCase());
      const field = document.getElementById('kenji-coupon');
      if (field && field.value.trim()) return field.value.trim().toUpperCase();
      return sessionStorage.getItem('kenji_coupon') || '';
    } catch (e) { return ''; }
  };

  // 4) Stripe checkout — produkty z data atributů
  // --------------------------------------------
  document.addEventListener('click', async (event) => {
    const link = event.target.closest('[data-checkout-product]');
    if (!link) return;

    event.preventDefault();
    const product = link.getAttribute('data-checkout-product') || 'academy';
    const originalText = link.textContent;
    link.setAttribute('aria-busy', 'true');
    link.textContent = 'Připravuju platbu...';

    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, source: 'site-cta', coupon: window.kenjiCoupon() || undefined })
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Platbu se nepodařilo připravit.');
      window.location.href = data.url;
    } catch (error) {
      link.textContent = originalText;
      link.removeAttribute('aria-busy');
      alert(error.message || 'Platbu se nepodařilo připravit. Zkus to prosím znovu.');
    }
  });
});

// Academy sales page: product exploration, motion and conversion signals.
document.addEventListener('DOMContentLoaded', () => {
  const academyPage = document.querySelector('.academy-sale-page');
  if (!academyPage) return;

  window.dataLayer = window.dataLayer || [];
  const trackAcademy = (event, detail = {}) => {
    window.dataLayer.push({ event, page_type: 'academy_sales', ...detail });
  };

  const setupTabs = (buttonSelector, panelSelector, eventName) => {
    const buttons = Array.from(document.querySelectorAll(buttonSelector));
    const panels = Array.from(document.querySelectorAll(panelSelector));
    if (!buttons.length || !panels.length) return;

    const activate = (button) => {
      const panelId = button.getAttribute('aria-controls');
      buttons.forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => { panel.hidden = panel.id !== panelId; });
      trackAcademy(eventName, { selection: panelId });
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => activate(button));
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = buttons[(index + direction + buttons.length) % buttons.length];
        activate(next);
        next.focus();
      });
    });
  };

  setupTabs('[data-diagnostic-tab]', '[data-diagnostic-panel]', 'academy_diagnostic_select');
  setupTabs('[data-product-tab]', '[data-product-panel]', 'academy_product_tab');
  setupTabs('[data-course-tab]', '[data-course-panel]', 'academy_course_tab');

  const header = document.querySelector('.academy-sale-top');
  const progress = document.createElement('i');
  progress.className = 'academy-scroll-progress';
  if (header) header.appendChild(progress);

  const reachedDepths = new Set();
  const updateSalesProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
    progress.style.width = `${ratio * 100}%`;
    [25, 50, 75, 90].forEach((depth) => {
      if (ratio * 100 >= depth && !reachedDepths.has(depth)) {
        reachedDepths.add(depth);
        trackAcademy('academy_scroll_depth', { depth });
      }
    });
  };
  window.addEventListener('scroll', updateSalesProgress, { passive: true });
  window.addEventListener('resize', updateSalesProgress);
  updateSalesProgress();

  document.addEventListener('click', (event) => {
    const cta = event.target.closest('.academy-sale-page a, .academy-sale-top a');
    if (!cta) return;
    trackAcademy('academy_cta_click', {
      location: cta.dataset.ctaLocation || cta.closest('section')?.id || cta.closest('section')?.className || 'header',
      label: cta.textContent.trim(),
      destination: cta.getAttribute('href') || ''
    });
  });

  document.querySelectorAll('.academy-faq-list details').forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) trackAcademy('academy_faq_open', { question: item.querySelector('summary')?.textContent.trim() || '' });
    });
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('academy-motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  trackAcademy('academy_page_view');
});
