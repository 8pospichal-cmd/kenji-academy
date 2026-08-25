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
  var isAdmin = ADMIN_EMAILS.indexOf(email.toLowerCase()) >= 0; // doplní se i podle role
  var sb = null, pendingAvatar = null, avatarUrl = '';

  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  async function rpc(fn, args) { var c = await getSB(); if (!c) throw new Error('offline'); var r = await c.rpc(fn, args); if (r.error) throw r.error; return r.data; }

  // ---------- KOSTRA ----------
  ROOT.innerHTML =
    '<div class="set-card">' +
      '<div class="set-card-title">Můj profil</div>' +
      '<div class="set-avatar-row">' +
        '<div class="set-avatar" id="set-avatar">' + initials(ig) + '</div>' +
        '<label class="set-avatar-btn">Nahrát fotku<input type="file" id="set-file" accept="image/*" hidden></label>' +
      '</div>' +
      '<label class="set-label">Zobrazované jméno</label>' +
      '<input class="set-input" id="set-name" placeholder="Jak se ti říká?">' +
      '<label class="set-label">O mně</label>' +
      '<textarea class="set-input set-textarea" id="set-bio" rows="3" placeholder="Pár slov o sobě, čemu se věnuješ…"></textarea>' +
      '<label class="set-label">Instagram</label>' +
      '<input class="set-input" id="set-ig" placeholder="@tvojeprofil" value="' + esc(ig) + '">' +
      '<label class="set-label">E-mail</label>' +
      '<input class="set-input" id="set-email" value="' + esc(email) + '" disabled>' +
      '<div class="set-bar"><span class="set-msg" id="set-msg"></span><button class="set-save" id="set-save">Uložit profil</button></div>' +
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
      }
    } catch (e) { console.warn('get_profile', e); msg('Profil se načte, až bude nastavená databáze.', false); }
    if (isAdmin) renderAdmin();
  })();

  // ---------- UPLOAD FOTKY ----------
  fileInput.addEventListener('change', async function () {
    var f = fileInput.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { msg('Fotka je moc velká (max 5 MB).', true); fileInput.value = ''; return; }
    msg('Nahrávám fotku…', false);
    try {
      var c = await getSB();
      var path = email.replace(/[^a-z0-9]/gi, '') + '/' + Date.now() + '-' + f.name.replace(/[^a-z0-9.\-]/gi, '');
      var up = await c.storage.from('avatars').upload(path, f, { contentType: f.type, upsert: true });
      if (up.error) throw up.error;
      pendingAvatar = c.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      avatarEl.innerHTML = '<img src="' + esc(pendingAvatar) + '" alt="">';
      msg('Fotka připravená — nezapomeň uložit.', false);
    } catch (e) { console.warn('avatar', e); msg('Fotku se nepovedlo nahrát (úložiště možná není nastavené).', true); }
  });

  // ---------- ULOŽ PROFIL ----------
  document.getElementById('set-save').addEventListener('click', async function () {
    var btn = this; btn.disabled = true; msg('Ukládám…', false);
    // onboarding: vyplněný profil (jméno nebo bio nebo fotka) = splněný úkol „Nastav si profil"
    try {
      var hasProfile = document.getElementById('set-name').value.trim() || document.getElementById('set-bio').value.trim() || pendingAvatar || avatarUrl;
      if (hasProfile) localStorage.setItem('kenji_task_profile', '1');
    } catch (e) {}
    try {
      await rpc('save_profile', {
        p_email: email,
        p_display_name: document.getElementById('set-name').value.trim(),
        p_bio: document.getElementById('set-bio').value.trim(),
        p_avatar_url: pendingAvatar || avatarUrl || '',
        p_instagram: document.getElementById('set-ig').value.trim().replace(/^@+/, '')
      });
      if (pendingAvatar) { avatarUrl = pendingAvatar; pendingAvatar = null; }
      msg('Uloženo ✓', false);
    } catch (e) { console.warn('save_profile', e); msg('Uložení se nepovedlo — zkontroluj, že běží databáze.', true); }
    btn.disabled = false;
  });

  // ---------- ADMIN PANEL ----------
  function renderAdmin() {
    var box = document.getElementById('set-admin');
    box.innerHTML =
      '<div class="set-card">' +
        '<div class="set-card-title">Správa uživatelů <span class="set-admin-badge">ADMIN</span></div>' +
        '<div class="set-search"><input class="set-input" id="adm-search" placeholder="Hledej e-mail, jméno nebo Instagram…"></div>' +
        '<div class="set-users" id="adm-users"><div class="set-loading">Načítám uživatele…</div></div>' +
      '</div>' +
      '<div class="set-card">' +
        '<div class="set-card-title">Slevové kupóny <span class="set-admin-badge">ADMIN</span></div>' +
        '<p class="set-hint">Partnerské slevy na vstup do Kenji Academy. Kód se uplatní při platbě přes Stripe.</p>' +
        '<div class="cpn-add">' +
          '<input class="set-input cpn-code" id="cpn-code" placeholder="KÓD (např. NIKON20)" maxlength="40">' +
          '<input class="set-input cpn-pct" id="cpn-pct" type="number" min="1" max="100" placeholder="Sleva %">' +
          '<input class="set-input cpn-desc" id="cpn-desc" placeholder="Popis / partner (nepovinné)">' +
          '<div class="cpn-prods">' +
            '<label><input type="checkbox" value="databaze" checked> Databáze</label>' +
            '<label><input type="checkbox" value="academy" checked> Academy</label>' +
            '<label><input type="checkbox" value="presets"> Presety</label>' +
          '</div>' +
          '<input class="set-input cpn-max" id="cpn-max" type="number" min="1" placeholder="Max použití (∞)">' +
          '<button class="set-save cpn-add-btn" id="cpn-add">Přidat kupón</button>' +
        '</div>' +
        '<div class="cpn-err" id="cpn-err" hidden></div>' +
        '<div class="cpn-list" id="cpn-list"><div class="set-loading">Načítám kupóny…</div></div>' +
      '</div>';
    var searchEl = document.getElementById('adm-search');
    var t = null;
    searchEl.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { loadUsers(searchEl.value.trim()); }, 300); });
    loadUsers('');
    document.getElementById('cpn-add').addEventListener('click', addCoupon);
    loadCoupons();
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
