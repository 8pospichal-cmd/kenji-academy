// ============================================
// KENJI ACADEMY — upozornění na nové příspěvky
// ============================================
// Malá červená značka u komunity a u jednotlivých kanálů. Bez serverových změn:
// bere seznam z list_posts a porovnává ho s tím, kdy uživatel kanál naposled otevřel.
// Otevření kanálu ho označí za přečtený.
// ============================================
(function () {
  'use strict';
  var SEEN_KEY = 'kenji_feed_seen_v1';
  var CACHE_KEY = 'kenji_feed_cache_v1';
  var CACHE_MS = 2 * 60 * 1000;      // mezi stránkami nestahujeme znovu
  var MAX_BADGE = 99;

  var A = window.KenjiAuth || {};
  var counts = {}, total = 0, loading = false;

  function jget(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function jset(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

  function seenMap() { return jget(SEEN_KEY, null); }

  // První spuštění: nezačneme křičet o celé historii — všechno bereme jako přečtené.
  function ensureInit(posts) {
    if (seenMap()) return false;
    var now = new Date().toISOString();
    var fresh = { __init: now };
    (posts || []).forEach(function (p) { fresh[p.category] = now; });
    jset(SEEN_KEY, fresh);
    return true;
  }

  function lastSeen(category) {
    var map = seenMap() || {};
    return map[category] || map.__init || '';
  }

  function recount(posts) {
    counts = {}; total = 0;
    (posts || []).forEach(function (p) {
      if (!p || !p.category || !p.created_at) return;
      var since = lastSeen(p.category);
      if (since && new Date(p.created_at) <= new Date(since)) return;
      counts[p.category] = (counts[p.category] || 0) + 1;
      total++;
    });
  }

  function badgeHtml(count, extraClass) {
    if (!count) return '';
    var text = count > MAX_BADGE ? MAX_BADGE + '+' : String(count);
    return '<span class="kenji-badge' + (extraClass ? ' ' + extraClass : '') + '" aria-label="' + text + ' nových příspěvků">' + text + '</span>';
  }

  function paint() {
    // Spodní lišta — souhrn přes všechny kanály.
    var bnav = document.querySelector('.bottom-nav a[href$="prispevky.html"]');
    if (bnav) {
      var old = bnav.querySelector('.kenji-badge');
      if (old) old.remove();
      if (total) bnav.insertAdjacentHTML('beforeend', badgeHtml(total, 'kenji-badge-nav'));
    }
    // Postranní menu komunity — po kanálech.
    document.querySelectorAll('.feed-category-link').forEach(function (link) {
      var old = link.querySelector('.kenji-badge');
      if (old) old.remove();
      var cat = link.getAttribute('data-feed-cat');
      var count = cat ? (counts[cat] || 0) : total;
      if (count) link.insertAdjacentHTML('beforeend', badgeHtml(count));
    });
    // Taby ve feedu.
    document.querySelectorAll('.feed-tab[data-cat]').forEach(function (tab) {
      var old = tab.querySelector('.kenji-badge');
      if (old) old.remove();
      var cat = tab.getAttribute('data-cat');
      var count = cat ? (counts[cat] || 0) : total;
      if (count) tab.insertAdjacentHTML('beforeend', badgeHtml(count));
    });
    try { document.dispatchEvent(new CustomEvent('kenji:unread', { detail: { counts: counts, total: total } })); } catch (e) {}
  }

  async function fetchPosts(force) {
    var cached = jget(CACHE_KEY, null);
    if (!force && cached && (Date.now() - cached.at) < CACHE_MS) return cached.posts || [];
    if (!A.getSupabase || !A.isLoggedIn || !A.isLoggedIn()) return (cached && cached.posts) || [];
    var client = await A.getSupabase();
    if (!client) return (cached && cached.posts) || [];
    // Bez živé relace vrací list_posts 401 — nemá smysl ji volat.
    var session = await client.auth.getSession();
    if (!session || !session.data || !session.data.session) return (cached && cached.posts) || [];
    var user = A.getUser ? A.getUser() : null;
    var res = await client.rpc('list_posts', { p_email: (user && user.email) || '', p_category: null, p_limit: 100 });
    if (res.error) throw res.error;
    var slim = (res.data || []).map(function (p) { return { category: p.category, created_at: p.created_at }; });
    jset(CACHE_KEY, { at: Date.now(), posts: slim });
    return slim;
  }

  async function refresh(force) {
    if (loading) return;
    loading = true;
    try {
      var posts = await fetchPosts(force);
      ensureInit(posts);
      recount(posts);
      paint();
    } catch (e) {
      // Upozornění jsou doplněk — když selžou, nesmí to nic rozbít.
      try { console.warn('unread', e); } catch (_) {}
    }
    loading = false;
  }

  // Otevřený kanál = přečtený.
  function markSeen(category) {
    var map = seenMap() || {};
    var now = new Date().toISOString();
    if (category) map[category] = now;
    else { map.__init = now; Object.keys(map).forEach(function (k) { if (k !== '__init') map[k] = now; }); }
    jset(SEEN_KEY, map);
    if (category) { total -= (counts[category] || 0); counts[category] = 0; if (total < 0) total = 0; }
    else { counts = {}; total = 0; }
    paint();
  }

  window.KenjiNotify = {
    refresh: refresh,
    markSeen: markSeen,
    counts: function () { return { counts: counts, total: total }; },
    paint: paint
  };

  function start() { A = window.KenjiAuth || A; refresh(false); }
  if (window.KenjiAuth) setTimeout(start, 600);
  else document.addEventListener('kenji-auth-ready', function () { setTimeout(start, 300); }, { once: true });
})();
