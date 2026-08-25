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
