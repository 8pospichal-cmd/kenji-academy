// ============================================
// KENJI ACADEMY — NASTAVENÍ (profil + admin)
// ============================================
// Profil (fotka, jméno, bio, Instagram) → Supabase. Admin (8pospichal@gmail.com
// nebo role=admin) spravuje uživatele. Viz SUPABASE_PROFILY.md pro nasazení.
// ============================================
(function () {
  var ROOT = document.getElementById('settings-root');
  if (!ROOT) return;
  var A = window.KenjiAuth || {};
  var user = A.getUser ? A.getUser() : null;
  var ADMIN_EMAILS = ['8pospichal@gmail.com'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(h) { h = (h || '?').replace(/^@/, ''); return (h[0] || '?').toUpperCase(); }

  if (!user || !user.email) {
    ROOT.innerHTML = '<div class="paywall"><div class="paywall-lock">🔒</div><h2 class="paywall-title">Nejdřív se přihlas</h2><p class="paywall-text">Pro úpravu profilu se musíš přihlásit do databáze.</p></div>';
    return;
  }

  var email = user.email, ig = user.instagram || '';
  var PROFILE_CACHE = 'kenji_profile_v1';
  var isAdmin = ADMIN_EMAILS.indexOf(email.toLowerCase()) >= 0; // doplní se i podle role
  var sb = null, pendingAvatar = null, avatarUrl = '';

  // Importované komunitní profily — párování podle Instagramu, ať se člen po přihlášení
  // spojí se svým profilem ze scrapeu (fotka + bio) a nemá prázdný druhý účet.
  var LEGACY_PROFILES = window.KENJI_LEGACY_PROFILES || {};
  var legacyPrefillDone = false;
  function normIg(v) { return String(v == null ? '' : v).trim().replace(/^@+/, '').toLowerCase(); }
  function matchLegacy(v) { var k = normIg(v); return k && LEGACY_PROFILES[k] ? LEGACY_PROFILES[k] : null; }

  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  async function rpc(fn, args) { var c = await getSB(); if (!c) throw new Error('offline'); var r = await c.rpc(fn, args); if (r.error) throw r.error; return r.data; }

  // ---------- KOSTRA ----------
  ROOT.innerHTML =
    '<div class="set-card" data-tour="profile">' +
      '<div class="set-card-title">Můj profil</div>' +
      '<div class="set-avatar-row">' +
        '<div class="set-avatar" id="set-avatar">' + initials(ig) + '</div>' +
        '<label class="set-avatar-btn">Nahrát fotku<input type="file" id="set-file" accept="image/*" hidden></label>' +
      '</div>' +
      '<label class="set-label">Zobrazované jméno</label>' +
      '<input class="set-input" id="set-name" placeholder="Jak se ti říká?">' +
      '<label class="set-label">O mně</label>' +
      '<textarea class="set-input set-textarea" id="set-bio" rows="3" placeholder="Pár slov o sobě, čemu se věnuješ…"></textarea>' +
      '<label class="set-label" for="set-ig">Instagram · povinné</label>' +
      '<input class="set-input" id="set-ig" placeholder="@tvojeprofil" value="' + esc(ig) + '" autocomplete="username" required>' +
      '<label class="set-label">E-mail</label>' +
      '<input class="set-input" id="set-email" value="' + esc(email) + '" disabled>' +
      '<div class="set-bar"><span class="set-msg" id="set-msg"></span><button class="set-save" id="set-save">Uložit profil</button></div>' +
    '</div>' +
    '<div id="set-focus"></div>' +
    '<div id="set-password"></div>' +
    '<div class="set-card set-guide">' +
      '<div class="set-guide-copy"><div class="set-card-title">Úvodní průvodce</div>' +
      '<p class="set-hint">Kenji ti znovu ukáže dashboard, databázi, kurzy, AI, komunitu a profil.</p></div>' +
      '<a class="set-tour-start" href="index.html?tour=1">Spustit průvodce znovu →</a>' +
    '</div>' +
    '<div id="set-admin"></div>';

  var fileInput = document.getElementById('set-file');
  var avatarEl = document.getElementById('set-avatar');
  var msgEl = document.getElementById('set-msg');
  function msg(t, err) { msgEl.textContent = t; msgEl.style.color = err ? '#ff6b6b' : 'var(--text-mute)'; }

  // ---------- NAČTI PROFIL ----------
  (async function loadProfile() {
    try {
      var rows = await rpc('get_profile', { p_email: email });
      var p = Array.isArray(rows) ? rows[0] : rows;
      if (p) {
        document.getElementById('set-name').value = p.display_name || '';
        document.getElementById('set-bio').value = p.bio || '';
        if (p.instagram) document.getElementById('set-ig').value = p.instagram;
        if (p.avatar_url) { avatarUrl = p.avatar_url; avatarEl.innerHTML = '<img src="' + esc(p.avatar_url) + '" alt="">'; }
        if (p.role === 'admin') isAdmin = true;
        try { localStorage.setItem(PROFILE_CACHE, JSON.stringify({ displayName: p.display_name || '', bio: p.bio || '', instagram: p.instagram || '', avatar: p.avatar_url || '' })); } catch (e2) {}
      }
    } catch (e) { console.warn('get_profile', e); msg('Profil se načte, až bude nastavená databáze.', false); }
    tryLegacyPrefill();
    if (isAdmin) renderAdmin();
  })();

  // ---------- AUTOMATICKÉ PŘEDVYPLNĚNÍ Z KOMUNITY (párování podle IG) ----------
  function tryLegacyPrefill() {
    if (legacyPrefillDone) return;
    var nameEl = document.getElementById('set-name');
    var bioEl = document.getElementById('set-bio');
    var igEl = document.getElementById('set-ig');
    var m = matchLegacy(igEl.value);
    if (!m) return;
    var filled = false;
    if (nameEl && !nameEl.value.trim() && m.name) { nameEl.value = m.name; filled = true; }
    if (bioEl && !bioEl.value.trim() && m.bio) { bioEl.value = m.bio; filled = true; }
    if (!pendingAvatar && !avatarUrl && m.avatar) { avatarUrl = m.avatar; avatarEl.innerHTML = '<img src="' + esc(m.avatar) + '" alt="">'; filled = true; }
    if (filled) { legacyPrefillDone = true; msg('Načetli jsme tvůj profil z komunity — zkontroluj a ulož. ✨', false); }
  }
  document.getElementById('set-ig').addEventListener('change', function () { legacyPrefillDone = false; tryLegacyPrefill(); });

  // ---------- UPLOAD FOTKY ----------
  // Bucket „avatars" přijímá jen JPG/PNG/WebP do 3 MB — držíme se toho i na klientovi,
  // ať člověk nedostane až od serveru nesrozumitelnou chybu.
  var AVATAR_MIME = /^image\/(jpeg|png|webp)$/;
  var AVATAR_MAX = 3 * 1024 * 1024;
  var EXT_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

  // iPhone umí poslat HEIC a některé androidí prohlížeče neposílají typ vůbec —
  // proto se ptáme i na příponu, ne jen na MIME.
  function looksLikeImage(f) {
    if (/^image\//.test(f.type || '')) return true;
    return /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name || '');
  }
  function uploadMime(f) {
    if (AVATAR_MIME.test(f.type || '')) return f.type;
    var ext = String(f.name || '').split('.').pop().toLowerCase();
    return EXT_MIME[ext] || '';
  }

  // Session s jistě platným tokenem — hlídá i expiraci, ne jen přítomnost.
  async function freshSession() {
    if (A.liveSession) return await A.liveSession();
    var c = await getSB(); if (!c) return null;
    var r = await c.auth.getSession();
    return r && r.data ? r.data.session : null;
  }

  fileInput.addEventListener('change', async function () {
    var f = fileInput.files[0]; if (!f) return;
    if (!looksLikeImage(f)) { msg('Vyber prosím obrázek (JPG, PNG nebo WebP).', true); fileInput.value = ''; return; }
    if (f.size > 25 * 1024 * 1024) { msg('Fotka je moc velká (max 25 MB).', true); fileInput.value = ''; return; }
    msg('Zpracovávám fotku…', false);
    try {
      var small = window.KenjiImage ? await window.KenjiImage.compress(f, { maxDim: 512, quality: 0.86 }) : f;

      // Zmenšení mohlo selhat (např. HEIC, které prohlížeč neumí dekódovat) a vrátit originál.
      var mime = uploadMime(small);
      if (!mime) {
        msg('Tenhle formát fotky prohlížeč neumí zpracovat. Ulož ji prosím jako JPG a zkus to znovu.', true);
        fileInput.value = ''; return;
      }
      if (small.size > AVATAR_MAX) {
        msg('Fotka je i po zmenšení moc velká. Zkus ji prosím uložit v menším rozlišení.', true);
        fileInput.value = ''; return;
      }

      var c = await getSB();
      var session = await freshSession();
      var uid = session && session.user ? session.user.id : '';
      if (!c || !uid) throw new Error('no-session');

      // Okamžitý lokální náhled, ať uživatel vidí výběr hned.
      try { avatarEl.innerHTML = '<img src="' + URL.createObjectURL(small) + '" alt="">'; } catch (e0) {}
      msg('Nahrávám fotku…', false);

      var ext = mime === 'image/png' ? 'png' : (mime === 'image/jpeg' ? 'jpg' : 'webp');
      var path = uid + '/' + Date.now() + '.' + ext;
      var up = await c.storage.from('avatars').upload(path, small, { contentType: mime, upsert: false });

      // Prošlý token se projeví jako chyba oprávnění — obnov session a zkus to ještě jednou.
      if (up.error && /jwt|expired|unauthorized|row-level|policy/i.test(String(up.error.message || ''))) {
        var again = await freshSession();
        if (again && again.user) {
          path = again.user.id + '/' + Date.now() + '.' + ext;
          up = await c.storage.from('avatars').upload(path, small, { contentType: mime, upsert: false });
        }
      }
      if (up.error) throw up.error;

      pendingAvatar = c.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      msg('Fotka připravená — nezapomeň uložit.', false);
    } catch (e) {
      console.warn('avatar', e);
      var m = String((e && e.message) || '').toLowerCase();
      if (m.indexOf('bucket not found') >= 0) msg('Úložiště fotek zatím není na serveru aktivní.', true);
      else if (m.indexOf('no-session') >= 0 || m.indexOf('jwt') >= 0 || m.indexOf('expired') >= 0) msg('Přihlášení na tomhle zařízení vypršelo. Načti stránku znovu a přihlas se.', true);
      else if (m.indexOf('row-level') >= 0 || m.indexOf('policy') >= 0 || m.indexOf('unauthorized') >= 0) {
        // Přesný důvod od serveru ukážeme taky — bez něj se tahle chyba nedá dohledat.
        var detail = String((e && (e.message || e.error)) || '').slice(0, 90);
        msg('Nahrání fotky server odmítl' + (detail ? ' (' + detail + ')' : '') + '. Napiš nám to prosím i s touhle hláškou.', true);
      }
      else if (m.indexOf('maximum allowed size') >= 0 || m.indexOf('too large') >= 0 || m.indexOf('413') >= 0) msg('Fotka je pro server moc velká. Zkus menší rozlišení.', true);
      else if (m.indexOf('mime') >= 0) msg('Tenhle formát fotky server nepřijímá. Ulož ji jako JPG a zkus to znovu.', true);
      else msg('Fotku se nepovedlo nahrát. Zkus to prosím znovu.', true);
      fileInput.value = '';
    }
  });

  // ---------- ULOŽ PROFIL ----------
  document.getElementById('set-save').addEventListener('click', async function () {
    var btn = this; btn.disabled = true; msg('Ukládám…', false);
    try {
      var displayName = document.getElementById('set-name').value.trim();
      var bio = document.getElementById('set-bio').value.trim();
      var instagram = document.getElementById('set-ig').value.trim().replace(/^@+/, '');
      var finalAvatar = pendingAvatar || avatarUrl || '';
      if (!displayName) {
        msg('Doplň svoje jméno, ať tě ostatní poznají.', true);
        document.getElementById('set-name').focus();
        btn.disabled = false;
        return;
      }
      if (!bio) {
        msg('Napiš prosím pár vět o sobě a své tvorbě.', true);
        document.getElementById('set-bio').focus();
        btn.disabled = false;
        return;
      }
      if (!instagram) {
        msg('Doplň svůj Instagram, ať můžeme profil dokončit.', true);
        document.getElementById('set-ig').focus();
        btn.disabled = false;
        return;
      }
      if (!finalAvatar) {
        msg('Nahraj ještě profilovou fotku.', true);
        fileInput.focus();
        btn.disabled = false;
        return;
      }
      await rpc('save_profile', {
        p_email: email,
        p_display_name: displayName,
        p_bio: bio,
        p_avatar_url: finalAvatar,
        p_instagram: instagram
      });
      if (A.updateUserProfile) A.updateUserProfile({ instagram: instagram, name: displayName });
      try { localStorage.setItem(PROFILE_CACHE, JSON.stringify({ displayName: displayName, bio: bio, instagram: instagram, avatar: finalAvatar || '' })); } catch (e1) {}
      if (pendingAvatar) { avatarUrl = pendingAvatar; pendingAvatar = null; }
      try {
        if (displayName && bio && finalAvatar && instagram) localStorage.setItem('kenji_task_profile', '1');
        else localStorage.removeItem('kenji_task_profile');
      } catch (e2) {}
      try { document.dispatchEvent(new CustomEvent('kenji:profile-complete')); } catch (e3) {}
      msg('Uloženo ✓', false);
    } catch (e) { console.warn('save_profile', e); msg('Uložení se nepovedlo — zkontroluj, že běží databáze.', true); }
    btn.disabled = false;
  });

  // ---------- ZAMĚŘENÍ (obor / fáze / priorita) — pohání osobní plán a doporučení ----------
  var BIZ_KEY = 'kenji_biz_v1';
  var FOCUS_INDUSTRIES = [
    { id: 'svatby', label: 'Svatební foto/video' }, { id: 'portret', label: 'Portrét / lidé' },
    { id: 'produkt', label: 'Produktové / e-shop' }, { id: 'video', label: 'Video / film' },
    { id: 'obsah', label: 'Obsah / sociální sítě' }, { id: 'event', label: 'Event / reportáž' },
    { id: 'nemovitosti', label: 'Nemovitosti / interiéry' }, { id: 'jine', label: 'Něco jiného' }
  ];
  var FOCUS_EXPERIENCES = [
    { id: 'start', label: 'Začínám' }, { id: 'practice', label: 'Tvořím pro sebe' },
    { id: 'clients', label: 'Mám zakázky' }, { id: 'fulltime', label: 'Živím se tím' },
    { id: 'jine', label: 'Něco jiného' }
  ];
  var FOCUS_BLOCKERS = [
    { id: 'klienti', label: 'Málo poptávek / klientů' }, { id: 'cena', label: 'Nízké ceny / neumím říct o víc' },
    { id: 'portfolio', label: 'Slabé portfolio / positioning' }, { id: 'cas', label: 'Chaos / nemám systém' },
    { id: 'zacatek', label: 'Úplný začátek, nevím kde začít' }, { id: 'jine', label: 'Něco jiného' }
  ];
  function bizGet() { try { return JSON.parse(localStorage.getItem(BIZ_KEY) || '{}') || {}; } catch (e) { return {}; } }

  function renderFocus() {
    var host = document.getElementById('set-focus'); if (!host) return;
    var b = bizGet();
    var inds = Array.isArray(b.industries) ? b.industries.slice() : (b.industry ? [b.industry] : []);
    function chips(list, sel, kind, multi) {
      return list.map(function (x) {
        var on = multi ? sel.indexOf(x.id) >= 0 : sel === x.id;
        return '<button type="button" class="set-focus-chip' + (on ? ' on' : '') + '" data-focus="' + kind + '" data-id="' + x.id + '">' + esc(x.label) + '</button>';
      }).join('');
    }
    var showOther = inds.indexOf('jine') >= 0;
    host.innerHTML =
      '<div class="set-card">' +
        '<div class="set-card-title">Čemu se věnuješ</div>' +
        '<p class="set-hint">Podle toho ti Kenji ladí osobní plán, doporučené články i odpovědi. Klidně vyber víc oborů.</p>' +
        '<label class="set-label">Obor, kterému se věnuji</label>' +
        '<div class="set-focus-chips" data-group="industries">' + chips(FOCUS_INDUSTRIES, inds, 'industries', true) + '</div>' +
        '<div id="set-focus-other-wrap"' + (showOther ? '' : ' hidden') + '>' +
          '<label class="set-label">Napiš svůj obor</label>' +
          '<input class="set-input" id="set-focus-other" maxlength="80" placeholder="Např. dron, dokument, architektura…" value="' + esc(b.industryOther || '') + '">' +
        '</div>' +
        '<label class="set-label">Kde jsi teď</label>' +
        '<div class="set-focus-chips" data-group="experience">' + chips(FOCUS_EXPERIENCES, b.experience || '', 'experience', false) + '</div>' +
        '<div id="set-exp-other-wrap"' + (b.experience === 'jine' ? '' : ' hidden') + '>' +
          '<label class="set-label" for="set-exp-other">Napiš, kde jsi</label>' +
          '<input class="set-input" id="set-exp-other" maxlength="120" placeholder="Např. vracím se po pauze, měním obor…" value="' + esc(b.experienceOther || '') + '">' +
        '</div>' +
        '<label class="set-label">Co teď nejvíc řešíš</label>' +
        '<div class="set-focus-chips" data-group="blocker">' + chips(FOCUS_BLOCKERS, b.blocker || '', 'blocker', false) + '</div>' +
        '<div id="set-blk-other-wrap"' + (b.blocker === 'jine' ? '' : ' hidden') + '>' +
          '<label class="set-label" for="set-blk-other">Napiš, co řešíš</label>' +
          '<input class="set-input" id="set-blk-other" maxlength="120" placeholder="Např. nestíhám editovat, bojím se oslovit klienty…" value="' + esc(b.blockerOther || '') + '">' +
        '</div>' +
        '<div class="set-bar"><span class="set-msg" id="set-focus-msg"></span><button class="set-save" id="set-focus-save">Uložit zaměření</button></div>' +
      '</div>';
    wireFocus();
  }

  function wireFocus() {
    var host = document.getElementById('set-focus'); if (!host) return;
    var fmsg = document.getElementById('set-focus-msg');
    host.querySelectorAll('.set-focus-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-focus');
        if (kind === 'industries') {
          btn.classList.toggle('on');
        } else {
          // fáze/priorita = jedna volba
          host.querySelectorAll('[data-focus="' + kind + '"]').forEach(function (o) { o.classList.remove('on'); });
          btn.classList.add('on');
        }
        // „Něco jiného" → zobraz textové pole (u všech tří otázek)
        function prepni(vyber, wrapId) {
          var chip = host.querySelector(vyber), wrap = document.getElementById(wrapId);
          if (wrap) wrap.hidden = !(chip && chip.classList.contains('on'));
        }
        prepni('[data-focus="industries"][data-id="jine"]', 'set-focus-other-wrap');
        prepni('[data-focus="experience"][data-id="jine"]', 'set-exp-other-wrap');
        prepni('[data-focus="blocker"][data-id="jine"]', 'set-blk-other-wrap');
      });
    });
    document.getElementById('set-focus-save').addEventListener('click', function () {
      var btn = this; btn.disabled = true;
      var b = bizGet();
      b.industries = [].slice.call(host.querySelectorAll('[data-focus="industries"].on')).map(function (a) { return a.getAttribute('data-id'); });
      b.industry = b.industries[0] || '';
      var expOn = host.querySelector('[data-focus="experience"].on');
      b.experience = expOn ? expOn.getAttribute('data-id') : '';
      var blkOn = host.querySelector('[data-focus="blocker"].on');
      b.blocker = blkOn ? blkOn.getAttribute('data-id') : '';
      var otherEl = document.getElementById('set-focus-other');
      var expOther = document.getElementById('set-exp-other');
      var blkOther = document.getElementById('set-blk-other');
      b.industryOther = (b.industries.indexOf('jine') >= 0 && otherEl) ? otherEl.value.trim() : '';
      b.experienceOther = (b.experience === 'jine' && expOther) ? expOther.value.trim() : '';
      b.blockerOther = (b.blocker === 'jine' && blkOther) ? blkOther.value.trim() : '';
      if (b.experience === 'jine' && !b.experienceOther) { if (fmsg) { fmsg.textContent = 'Napiš prosím, kde se právě nacházíš.'; fmsg.style.color = '#ff6b6b'; } btn.disabled = false; expOther && expOther.focus(); return; }
      if (b.blocker === 'jine' && !b.blockerOther) { if (fmsg) { fmsg.textContent = 'Napiš prosím, co teď řešíš.'; fmsg.style.color = '#ff6b6b'; } btn.disabled = false; blkOther && blkOther.focus(); return; }
      try { localStorage.setItem(BIZ_KEY, JSON.stringify(b)); } catch (e) {}
      try { if (A.saveProfile) A.saveProfile(b); } catch (e2) {}
      if (fmsg) { fmsg.textContent = 'Uloženo ✓'; fmsg.style.color = 'var(--text-mute)'; }
      btn.disabled = false;
    });
  }

  renderFocus();

  // ---------- HESLO (nepovinné zrychlení přihlášení) ----------
  // Heslo se nastavuje na už ověřené session, takže neposílá žádný potvrzovací e-mail.
  // Kdo si ho nenastaví, přihlašuje se dál odkazem — nic ho k tomu nenutí.
  function renderPassword() {
    var box = document.getElementById('set-password');
    if (!box) return;
    var has = !!(A.hasPassword && A.hasPassword());
    box.innerHTML =
      '<div class="set-card">' +
        '<div class="set-card-title">Přihlašování</div>' +
        '<p class="set-hint">' + (has
          ? 'Heslo máš nastavené — příště se přihlásíš rovnou, bez čekání na e-mail. Tady si ho můžeš změnit.'
          : 'Teď se přihlašuješ odkazem z e-mailu. Nastav si heslo a příště budeš uvnitř hned. Odkaz ti bude fungovat dál — třeba když heslo zapomeneš.') + '</p>' +
        '<label class="set-label" for="set-pw">' + (has ? 'Nové heslo' : 'Heslo') + '</label>' +
        '<input class="set-input" id="set-pw" type="password" autocomplete="new-password" placeholder="Alespoň 8 znaků">' +
        '<label class="set-label" for="set-pw2">Heslo pro kontrolu</label>' +
        '<input class="set-input" id="set-pw2" type="password" autocomplete="new-password" placeholder="Zadej ho ještě jednou">' +
        '<div class="set-bar"><span class="set-msg" id="set-pw-msg"></span>' +
        '<button class="set-save" id="set-pw-save">' + (has ? 'Změnit heslo' : 'Nastavit heslo') + '</button></div>' +
      '</div>';
    wirePassword();
  }

  function wirePassword() {
    var btn = document.getElementById('set-pw-save');
    var pw = document.getElementById('set-pw');
    var pw2 = document.getElementById('set-pw2');
    var pmsg = document.getElementById('set-pw-msg');
    if (!btn) return;
    function say(text, isErr) { if (pmsg) { pmsg.textContent = text; pmsg.style.color = isErr ? '#ff6b6b' : 'var(--text-mute)'; } }
    btn.addEventListener('click', async function () {
      var value = pw.value, again = pw2.value;
      if (value.length < 8) { say('Heslo musí mít aspoň 8 znaků.', true); pw.focus(); return; }
      if (value !== again) { say('Hesla se neshodují.', true); pw2.focus(); return; }
      if (!A.setPassword) { say('Přihlášení není dostupné.', true); return; }
      btn.disabled = true; say('Ukládám…');
      var res = await A.setPassword(value);
      btn.disabled = false;
      if (res && res.ok) {
        renderPassword();   // překreslí kartu → zprávu musíme napsat do nového prvku
        var fresh = document.getElementById('set-pw-msg');
        if (fresh) { fresh.textContent = 'Heslo je nastavené ✓'; fresh.style.color = 'var(--text-mute)'; }
      }
      else { say((res && res.err) || 'Heslo se nepovedlo uložit.', true); }
    });
  }

  renderPassword();

  // ---------- ADMIN PANEL ----------
  function renderAdmin() {
    var box = document.getElementById('set-admin');
    box.innerHTML =
      '<div class="set-card set-guide set-admin-entry">' +
        '<div class="set-guide-copy"><div class="set-card-title">Administrace <span class="set-admin-badge">ADMIN</span></div>' +
        '<p class="set-hint">Lidé, aktivita, výsledky nástrojů, obsah a kupóny jsou v samostatném pracovním prostoru.</p></div>' +
        '<a class="set-tour-start" href="admin.html">Přepnout do administrace →</a>' +
      '</div>';
  }

  function couponProductsFromForm() {
    return [].slice.call(document.querySelectorAll('.cpn-prods input:checked')).map(function (c) { return c.value; });
  }
  async function addCoupon() {
    var errEl = document.getElementById('cpn-err');
    var code = (document.getElementById('cpn-code').value || '').trim().toUpperCase();
    var pct = parseInt(document.getElementById('cpn-pct').value, 10);
    var desc = (document.getElementById('cpn-desc').value || '').trim();
    var maxRaw = (document.getElementById('cpn-max').value || '').trim();
    var maxUses = maxRaw ? parseInt(maxRaw, 10) : null;
    var products = couponProductsFromForm();
    function fail(m) { errEl.textContent = m; errEl.hidden = false; }
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) { return fail('Kód: 2–40 znaků, jen písmena/čísla/-/_.'); }
    if (!(pct >= 1 && pct <= 100)) { return fail('Sleva musí být 1–100 %.'); }
    errEl.hidden = true;
    var btn = document.getElementById('cpn-add'); btn.disabled = true; btn.textContent = 'Přidávám…';
    try {
      await rpc('admin_upsert_coupon', {
        p_admin: email, p_code: code, p_description: desc || null, p_percent: pct,
        p_products: products, p_active: true, p_max_uses: maxUses, p_valid_until: null
      });
      document.getElementById('cpn-code').value = ''; document.getElementById('cpn-pct').value = '';
      document.getElementById('cpn-desc').value = ''; document.getElementById('cpn-max').value = '';
      loadCoupons();
    } catch (e) { console.warn('admin_upsert_coupon', e); fail('Uložení se nepovedlo (běží už SUPABASE_KUPONY.md?).'); }
    btn.disabled = false; btn.textContent = 'Přidat kupón';
  }
  async function loadCoupons() {
    var el = document.getElementById('cpn-list');
    el.innerHTML = '<div class="set-loading">Načítám…</div>';
    try {
      var rows = await rpc('admin_list_coupons', { p_admin: email });
      if (!rows || !rows.length) { el.innerHTML = '<div class="set-loading">Zatím žádné kupóny. Přidej první nahoře. 👆</div>'; return; }
      el.innerHTML =
        '<div class="cpn-head"><span>Kód</span><span>Sleva</span><span>Produkty</span><span>Použito</span><span>Stav</span><span></span></div>' +
        rows.map(function (c) {
          var prods = (c.products && c.products.length) ? c.products.join(', ') : 'všechny';
          var used = c.used_count + (c.max_uses ? ' / ' + c.max_uses : ' / ∞');
          return '<div class="cpn-row' + (c.active ? '' : ' off') + '" data-code="' + esc(c.code) + '">' +
            '<span class="cpn-chip">' + esc(c.code) + '</span>' +
            '<span>' + c.percent_off + ' %</span>' +
            '<span class="cpn-prod">' + esc(prods) + (c.description ? '<small>' + esc(c.description) + '</small>' : '') + '</span>' +
            '<span>' + esc(String(used)) + '</span>' +
            '<span><button class="cpn-toggle">' + (c.active ? 'Aktivní' : 'Vypnutý') + '</button></span>' +
            '<span><button class="cpn-del" title="Smazat">✕</button></span>' +
          '</div>';
        }).join('');
      el.querySelectorAll('.cpn-row').forEach(function (row) {
        var code = row.getAttribute('data-code');
        var cpn = rows.find(function (x) { return x.code === code; });
        row.querySelector('.cpn-toggle').addEventListener('click', async function () {
          try {
            await rpc('admin_upsert_coupon', { p_admin: email, p_code: code, p_description: cpn.description, p_percent: cpn.percent_off, p_products: cpn.products, p_active: !cpn.active, p_max_uses: cpn.max_uses, p_valid_until: cpn.valid_until });
            loadCoupons();
          } catch (e) { console.warn('toggle', e); alert('Změna se nepovedla.'); }
        });
        row.querySelector('.cpn-del').addEventListener('click', async function () {
          if (!confirm('Smazat kupón ' + code + '?')) return;
          try { await rpc('admin_delete_coupon', { p_admin: email, p_code: code }); loadCoupons(); }
          catch (e) { console.warn('delete', e); alert('Smazání se nepovedlo.'); }
        });
      });
    } catch (e) { console.warn('admin_list_coupons', e); el.innerHTML = '<div class="set-loading">Kupóny se načtou, až spustíš SUPABASE_KUPONY.md.</div>'; }
  }

  async function loadUsers(search) {
    var el = document.getElementById('adm-users');
    el.innerHTML = '<div class="set-loading">Načítám…</div>';
    try {
      var users = await rpc('admin_list_users', { p_admin: email, p_search: search || null, p_limit: 300 });
      if (!users || !users.length) { el.innerHTML = '<div class="set-loading">Nikdo nenalezen.</div>'; return; }
      var tiers = ['free', 'knihovna', 'academy'], roles = ['member', 'moderator', 'admin'];
      el.innerHTML =
        '<div class="set-users-head"><span>Uživatel</span><span>Tier</span><span>Role</span></div>' +
        users.map(function (u) {
          var name = u.display_name || (u.instagram ? '@' + u.instagram : '');
          return '<div class="set-user" data-email="' + esc(u.email) + '">' +
            '<div class="set-user-id"><span class="set-user-email">' + esc(u.email) + '</span>' + (name ? '<span class="set-user-name">' + esc(name) + '</span>' : '') + '</div>' +
            '<select class="set-user-tier">' + tiers.map(function (x) { return '<option value="' + x + '"' + (u.tier === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
            '<select class="set-user-role">' + roles.map(function (x) { return '<option value="' + x + '"' + (u.role === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
          '</div>';
        }).join('');
      el.querySelectorAll('.set-user').forEach(function (row) {
        var tEmail = row.getAttribute('data-email');
        row.querySelectorAll('select').forEach(function (sel) {
          sel.addEventListener('change', async function () {
            sel.disabled = true;
            try {
              await rpc('admin_set_user', {
                p_admin: email, p_target: tEmail,
                p_tier: row.querySelector('.set-user-tier').value,
                p_role: row.querySelector('.set-user-role').value
              });
              row.classList.add('saved'); setTimeout(function () { row.classList.remove('saved'); }, 1200);
            } catch (e) { console.warn('admin_set_user', e); alert('Změna se nepovedla.'); }
            sel.disabled = false;
          });
        });
      });
    } catch (e) { console.warn('admin_list_users', e); el.innerHTML = '<div class="set-loading">Seznam se načte, až bude nastavená databáze (SUPABASE_PROFILY.md).</div>'; }
  }
})();
