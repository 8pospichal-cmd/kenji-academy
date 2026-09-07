// ============================================
// KENJI ACADEMY — stažení zakoupených presetů
// ============================================
// Soubory leží v soukromém Supabase bucketu „presety". Stáhne je jen ten, kdo
// má nákup zapsaný (nebo je členem Academy) — hlídá to politika na úložišti,
// takže se to nedá obejít úpravou stránky.
// ============================================
(function () {
  'use strict';
  var ROOT = document.getElementById('presety-root');
  if (!ROOT) return;
  var A = window.KenjiAuth || {};
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function kb(bytes) { return bytes ? Math.max(1, Math.round(bytes / 1024)) + ' kB' : ''; }

  // Stránka se otevře komukoli — zamčené je až samotné stažení.
  function renderHost() {
    ROOT.innerHTML =
      '<div class="pres-gate">' +
        '<h2>Ke stažení se dostaneš po přihlášení</h2>' +
        '<p>Presety jsou navázané na tvůj účet, ne na tenhle prohlížeč. Přihlas se stejným e-mailem, kterým jsi platil — soubory pak máš kdykoli po ruce, i na jiném počítači.</p>' +
        '<div class="pres-gate-actions">' +
          '<a class="pres-gate-cta" href="index.html">Přihlásit se</a>' +
          '<a class="pres-gate-alt" href="preset.html">Ještě je nemám — koupit za 982 Kč →</a>' +
        '</div>' +
      '</div>';
  }

  function renderPaywall() {
    ROOT.innerHTML =
      '<div class="paywall"><div class="paywall-lock">🔒</div>' +
      '<h2 class="paywall-title">Presety zatím nemáš</h2>' +
      '<p class="paywall-text">Kenjiho presety pro Lightroom i Photoshop jsou samostatný balíček. Po zaplacení se ti tady rovnou objeví ke stažení.</p>' +
      '<div class="paywall-actions"><a class="paywall-cta" href="preset.html">Prohlédnout presety →</a></div></div>';
  }

  function renderError(text) {
    ROOT.innerHTML = '<div class="feed-empty"><strong>Presety se nepovedlo načíst.</strong><span>' + esc(text || 'Obnov stránku a zkus to prosím znovu.') + '</span></div>';
  }

  var VIDEA = {
    navod: { id: 'xMXkbrzV9YE', titul: 'Jak používat moje presety', delka: '3:15',
             popis: 'Instalace v Lightroomu i Photoshopu a jak s nima pracuju. Pusť si to jako první.' },
    bonusy: [
      { id: '2roIGGba7TI', titul: 'Úprava fotek s Kenjim', delka: '1:24:12',
        popis: 'Celý můj postup od RAWu po hotovou fotku. Vidíš každý krok i proč ho dělám.' },
      { id: 'AsRC8uOHOrk', titul: 'Color grading v Lightroomu a Photoshopu', delka: '2:08:04',
        popis: 'Editing session naživo — práce s barvou do hloubky, včetně otázek od diváků.' }
    ]
  };

  function prehravac(v, velky) {
    return '<div class="pres-video' + (velky ? ' is-hero' : '') + '" data-yt="' + esc(v.id) + '">' +
      '<button class="pres-video-play" type="button" aria-label="Přehrát: ' + esc(v.titul) + '">' +
        '<img src="https://i.ytimg.com/vi/' + esc(v.id) + '/hqdefault.jpg" alt="" loading="lazy">' +
        '<span class="pres-video-btn" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></span>' +
        '<span class="pres-video-time">' + esc(v.delka) + '</span>' +
      '</button>' +
      '<div class="pres-video-meta"><strong>' + esc(v.titul) + '</strong><small>' + esc(v.popis) + '</small></div>' +
    '</div>';
  }

  function videaMarkup() {
    return '<div class="pres-block">' +
      '<div class="pres-block-head"><h2>Video návod</h2><p>Nemusíš nic hádat — projdeme to spolu krok za krokem.</p></div>' +
      prehravac(VIDEA.navod, true) +
    '</div>' +
    '<div class="pres-block">' +
      '<div class="pres-block-head"><h2>Bonusy k presetům <span class="pres-tag">zdarma</span></h2>' +
      '<p>Dvě dlouhá videa, kde upravuju fotky odshora dolů. Presety jsou zkratka — tohle je to, co za nimi stojí.</p></div>' +
      '<div class="pres-video-grid">' + VIDEA.bonusy.map(function (v) { return prehravac(v, false); }).join('') + '</div>' +
    '</div>';
  }

  // Náhled → prehrávač až na kliknutí.
  function wireVidea() {
    ROOT.querySelectorAll('.pres-video').forEach(function (box) {
      var tlacitko = box.querySelector('.pres-video-play');
      if (!tlacitko) return;
      tlacitko.addEventListener('click', function () {
        var id = box.getAttribute('data-yt');
        var ramec = document.createElement('iframe');
        ramec.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
        ramec.title = box.querySelector('.pres-video-meta strong').textContent;
        ramec.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
        ramec.allowFullscreen = true;
        ramec.loading = 'lazy';
        tlacitko.replaceWith(ramec);
      });
    });
  }

  function renderList(soubory) {
    if (!soubory.length) {
      ROOT.innerHTML = '<div class="feed-empty"><strong>Presety se připravují.</strong>' +
        '<span>Máš je zaplacené, ale v úložišti zatím nejsou žádné soubory. Zkus to prosím za chvíli — nebo nám napiš.</span></div>' + videaMarkup();
      wireVidea();
      return;
    }
    ROOT.innerHTML =
      '<div class="pres-head"><div><h2>Tvoje presety</h2>' +
      '<p>Stáhni si je a nainstaluj podle videa níž. Zůstávají ti napořád.</p></div>' +
      '<button class="pres-all" id="pres-all" type="button">Stáhnout vše</button></div>' +
      '<ul class="pres-list">' + soubory.map(function (f) {
        return '<li class="pres-item"><span class="pres-ico" aria-hidden="true">◐</span>' +
          '<span class="pres-name"><strong>' + esc(f.nazev) + '</strong><small>' + esc(f.popis) + '</small></span>' +
          '<button class="pres-dl" type="button" data-stahnout="' + esc(f.cesta) + '">Stáhnout</button></li>';
      }).join('') + '</ul>' +
      '<p class="pres-note">Nevíš si rady s instalací? Napiš nám na <a href="https://www.instagram.com/kenjiacademycz" target="_blank" rel="noopener">Instagram</a> a poradíme.</p>' +
      videaMarkup();
    wire(soubory);
    wireVidea();
  }

  async function stahni(client, cesta, nazev) {
    var res = await client.storage.from('presety').download(cesta);
    if (res.error) throw res.error;
    var url = URL.createObjectURL(res.data);
    var a = document.createElement('a');
    a.href = url; a.download = nazev || cesta.split('/').pop();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function wire(soubory) {
    ROOT.querySelectorAll('[data-stahnout]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var puvodni = btn.textContent;
        btn.disabled = true; btn.textContent = 'Stahuji…';
        try {
          var client = await A.getSupabase();
          await stahni(client, btn.getAttribute('data-stahnout'));
          btn.textContent = 'Hotovo ✓';
          setTimeout(function () { btn.disabled = false; btn.textContent = puvodni; }, 1800);
        } catch (e) {
          console.warn('preset download', e);
          btn.disabled = false; btn.textContent = 'Nepovedlo se';
          setTimeout(function () { btn.textContent = puvodni; }, 2200);
        }
      });
    });
    var vse = document.getElementById('pres-all');
    if (vse) vse.addEventListener('click', async function () {
      vse.disabled = true; vse.textContent = 'Stahuji…';
      try {
        var client = await A.getSupabase();
        for (var i = 0; i < soubory.length; i++) {
          vse.textContent = 'Stahuji ' + (i + 1) + ' z ' + soubory.length + '…';
          await stahni(client, soubory[i].cesta, soubory[i].nazev);
          await new Promise(function (r) { setTimeout(r, 350); });   // ať prohlížeč stíhá
        }
        vse.textContent = 'Hotovo ✓';
      } catch (e) {
        console.warn('preset download all', e);
        vse.textContent = 'Nepovedlo se';
      }
      setTimeout(function () { vse.disabled = false; vse.textContent = 'Stáhnout vše'; }, 2200);
    });
  }

  // Supabase list() vrací jen jednu úroveň. Když někdo nahraje presety do složky,
  // v kořeni je vidět jen ta složka — proto se do ní podíváme taky.
  async function najdiSoubory(client, prefix, hloubka) {
    hloubka = hloubka || 0;
    var res = await client.storage.from('presety').list(prefix, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
    if (res.error) throw res.error;
    var polozky = res.data || [];
    var vysledek = [];
    for (var i = 0; i < polozky.length; i++) {
      var f = polozky[i];
      if (!f.name || f.name.charAt(0) === '.') continue;          // .emptyFolderPlaceholder apod.
      var cesta = prefix ? prefix + '/' + f.name : f.name;
      var jeSlozka = !f.id && !(f.metadata && f.metadata.size);
      if (jeSlozka) {
        if (hloubka < 2) vysledek = vysledek.concat(await najdiSoubory(client, cesta, hloubka + 1));
        continue;
      }
      vysledek.push({
        nazev: f.name,
        popis: (/\.zip$/i.test(f.name) ? 'Všechny presety v jednom balíčku' : 'Preset pro Lightroom i Photoshop') +
               (f.metadata && f.metadata.size ? ' · ' + kb(f.metadata.size) : ''),
        cesta: cesta
      });
    }
    return vysledek;
  }

  async function start() {
    A = window.KenjiAuth || A;
    // Nepřihlášený vidí uvítací obrazovku i v dev režimu — ať jde otestovat.
    if (!A.isLoggedIn || !A.isLoggedIn()) { renderHost(); return; }
    if (IS_LOCAL) {
      renderList([{ nazev: 'Ukazka.xmp', popis: 'Lokální náhled — soubory jsou jen na serveru', cesta: 'ukazka.xmp' }]);
      return;
    }
    try {
      var client = await A.getSupabase();
      if (!client) { renderError('Přihlášení teď není dostupné.'); return; }
      var session = A.liveSession ? await A.liveSession() : null;
      if (!session) { renderHost(); return; }   // účet je lokálně, ale relace vypršela
      var opravneni = await client.rpc('my_presets');
      if (opravneni.error) throw opravneni.error;
      if (!opravneni.data) { renderPaywall(); return; }

      var soubory = await najdiSoubory(client, '');
      renderList(soubory);
    } catch (e) {
      console.warn('presety', e);
      renderError((e && e.message) || '');
    }
  }

  if (window.KenjiAuth) setTimeout(start, 500);
  else document.addEventListener('kenji-auth-ready', function () { setTimeout(start, 200); }, { once: true });
})();
