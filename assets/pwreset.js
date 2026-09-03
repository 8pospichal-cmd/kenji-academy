// Kenji Academy — nastavení nového hesla po kliknutí na odkaz z e-mailu.
// Supabase pošle odkaz s tokenem v hashi; auth.js z něj udělá platnou session,
// takže tady už jen zapíšeme nové heslo přes updateUser().
(function () {
  'use strict';
  var ROOT_EL = document.getElementById('pwreset-root');
  if (!ROOT_EL) return;
  var A = window.KenjiAuth || {};
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }

  function renderForm(email) {
    ROOT_EL.innerHTML =
      '<h1 class="pwreset-title">Nastav si nové heslo</h1>' +
      '<p class="pwreset-sub">' + (email ? 'Pro účet <strong>' + esc(email) + '</strong>. ' : '') +
        'Po uložení se rovnou dostaneš dovnitř.</p>' +
      '<label class="kg-label" for="pwr-a">Nové heslo</label>' +
      '<input class="kg-input" id="pwr-a" type="password" autocomplete="new-password" placeholder="Alespoň 8 znaků">' +
      '<label class="kg-label" for="pwr-b">Heslo pro kontrolu</label>' +
      '<input class="kg-input" id="pwr-b" type="password" autocomplete="new-password" placeholder="Zadej ho ještě jednou">' +
      '<div class="kg-error" id="pwr-err" hidden></div>' +
      '<button class="kg-btn" id="pwr-save">Uložit heslo a pokračovat →</button>';
    wireForm();
  }

  function renderExpired(message) {
    ROOT_EL.innerHTML =
      '<h1 class="pwreset-title">Odkaz už neplatí</h1>' +
      '<p class="pwreset-sub">' + esc(message || 'Odkaz pro obnovu hesla vypršel nebo už byl použitý. Pošli si prosím nový — trvá to chvilku.') + '</p>' +
      '<label class="kg-label" for="pwr-mail">E-mail</label>' +
      '<input class="kg-input" id="pwr-mail" type="email" autocomplete="email" placeholder="tvuj@email.cz">' +
      '<div class="kg-error" id="pwr-err" hidden></div>' +
      '<button class="kg-btn" id="pwr-again">Poslat nový odkaz →</button>' +
      '<a class="pwreset-back" href="academy.html">Zpět na úvodní stránku</a>';
    var btn = document.getElementById('pwr-again');
    var mail = document.getElementById('pwr-mail');
    var errEl = document.getElementById('pwr-err');
    btn.addEventListener('click', async function () {
      var value = String(mail.value || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errEl.textContent = 'Zadej platný e-mail.'; errEl.hidden = false; mail.focus(); return;
      }
      errEl.hidden = true;
      btn.disabled = true; btn.textContent = 'Posílám…';
      var res = A.requestPasswordReset ? await A.requestPasswordReset(value) : { ok: false };
      if (res && res.ok) {
        btn.textContent = 'Odkaz je v e-mailu ✓';
      } else {
        btn.disabled = false; btn.textContent = 'Poslat nový odkaz →';
        errEl.textContent = 'Odkaz se teď nepovedlo odeslat. Zkus to prosím za chvíli.'; errEl.hidden = false;
      }
    });
  }

  function wireForm() {
    var a = document.getElementById('pwr-a');
    var b = document.getElementById('pwr-b');
    var btn = document.getElementById('pwr-save');
    var errEl = document.getElementById('pwr-err');
    function err(msg) { errEl.textContent = msg; errEl.hidden = false; }
    async function save() {
      if (a.value.length < 8) { err('Heslo musí mít aspoň 8 znaků.'); a.focus(); return; }
      if (a.value !== b.value) { err('Hesla se neshodují.'); b.focus(); return; }
      errEl.hidden = true;
      btn.disabled = true; btn.textContent = 'Ukládám…';
      var res = A.setPassword ? await A.setPassword(a.value) : { ok: false, err: 'Přihlášení není dostupné.' };
      if (res && res.ok) {
        btn.textContent = 'Hotovo ✓';
        location.href = 'index.html';
        return;
      }
      btn.disabled = false; btn.textContent = 'Uložit heslo a pokračovat →';
      err((res && res.err) || 'Heslo se nepovedlo uložit. Zkus to prosím znovu.');
    }
    btn.addEventListener('click', save);
    [a, b].forEach(function (el) { el.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); }); });
  }

  async function start() {
    // Neplatný/vypršelý odkaz vrací Supabase jako #error=...&error_code=otp_expired.
    // auth.js hash uklidí hned při startu, proto se ptáme i jeho.
    var linkFailed = /[#&?](error|error_code)=/.test(location.href) || !!(A.authLinkFailed && A.authLinkFailed());
    if (linkFailed) { renderExpired(); return; }
    if (IS_LOCAL) { renderForm('lokální náhled'); return; }

    var sb = A.getSupabase ? await A.getSupabase() : null;
    if (!sb) { renderExpired('Přihlášení teď není dostupné. Zkus stránku načíst znovu.'); return; }
    // auth.js session z odkazu vyzvedává asynchronně — zkoušíme, dokud nenaběhne.
    var session = null;
    for (var i = 0; i < 12 && !session; i++) {
      var result = await sb.auth.getSession();
      session = result && result.data ? result.data.session : null;
      if (!session) await new Promise(function (r) { setTimeout(r, 500); });
    }
    if (!session) { renderExpired(); return; }
    renderForm(session.user && session.user.email);
  }

  start();
})();
