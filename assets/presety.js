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

  function renderList(soubory) {
    if (!soubory.length) {
      ROOT.innerHTML = '<div class="feed-empty"><strong>Presety se připravují.</strong><span>Máš je zaplacené, ale soubory se ještě nahrávají. Zkus to prosím za chvíli.</span></div>';
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
      '<p class="pres-note">Nevíš si rady s instalací? Napiš nám na <a href="https://www.instagram.com/kenjiacademycz" target="_blank" rel="noopener">Instagram</a> a poradíme.</p>';
    wire(soubory);
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

  async function start() {
    A = window.KenjiAuth || A;
    if (IS_LOCAL) {
      renderList([{ nazev: 'Ukazka.xmp', popis: 'Lokální náhled — soubory jsou jen na serveru', cesta: 'ukazka.xmp' }]);
      return;
    }
    try {
      var client = await A.getSupabase();
      if (!client) { renderError('Přihlášení teď není dostupné.'); return; }
      var opravneni = await client.rpc('my_presets');
      if (opravneni.error) throw opravneni.error;
      if (!opravneni.data) { renderPaywall(); return; }

      var seznam = await client.storage.from('presety').list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });
      if (seznam.error) throw seznam.error;
      var soubory = (seznam.data || [])
        .filter(function (f) { return f.name && f.name.indexOf('.') > 0; })
        .map(function (f) {
          return {
            nazev: f.name,
            popis: (/\.zip$/i.test(f.name) ? 'Všechny presety v jednom balíčku' : 'Preset pro Lightroom i Photoshop') +
                   (f.metadata && f.metadata.size ? ' · ' + kb(f.metadata.size) : ''),
            cesta: f.name
          };
        });
      renderList(soubory);
    } catch (e) {
      console.warn('presety', e);
      renderError((e && e.message) || '');
    }
  }

  if (window.KenjiAuth) setTimeout(start, 500);
  else document.addEventListener('kenji-auth-ready', function () { setTimeout(start, 200); }, { once: true });
})();
