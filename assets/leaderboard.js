// Komunitní žebříček Kenji Academy. V produkci bere veřejná KP data ze Supabase,
// v lokálním náhledu drží rychlý fallback se seedovanou komunitou.
(function () {
  'use strict';

  var SEED = [
    { n: 'Nikola Kirchschlägerová', ig: 'fotografkanikola', xp: 8600 },
    { n: 'Tomáš Šreiber', ig: 'tomassreiber', xp: 6200 },
    { n: 'Klára Brůnová', ig: 'klarushe', xp: 4800 },
    { n: 'Luboš Římal', ig: 'lrfoto', xp: 3600 },
    { n: 'Matěj Kubíček', ig: 'matejkubicek', xp: 2850 },
    { n: 'Karolína Hůlová', ig: 'karolinahulova1', xp: 2100 },
    { n: 'Marián Janík', ig: 'marianjanik', xp: 1700 },
    { n: 'Martin Plíva', ig: 'martinlikeitraw', xp: 1320 },
    { n: 'Matyáš Tuma', ig: 'matyastuma', xp: 940 },
    { n: 'Jakub Danel', ig: 'scalixcz', xp: 720 },
    { n: 'Michaela Švábenská', ig: 'svabenskaphoto', xp: 560 },
    { n: 'Kristýna Urubová', ig: 'kurubova', xp: 420 }
  ];
  var TOTAL = 286;
  var AVATAR_BASE = 'assets/whop-predstav-se-export/profiles/';
  var LEVEL_THRESHOLDS = [0, 100, 500, 1500, 3000, 5000, 8000, 12000, 17000, 23000];

  function get(key, fallback) {
    try { var value = JSON.parse(localStorage.getItem(key)); return value == null ? fallback : value; }
    catch (e) { return fallback; }
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>\"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function initial(name) { return (String(name || '?').trim()[0] || '?').toUpperCase(); }
  function levelOf(xp) {
    xp = Math.max(0, Number(xp) || 0);
    var level = 1;
    for (var i = 0; i < LEVEL_THRESHOLDS.length; i++) if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    return Math.min(LEVEL_THRESHOLDS.length, level);
  }
  function avatar(row, cls) {
    var src = row.ig ? AVATAR_BASE + row.ig + '.webp' : '';
    return src
      ? '<span class="' + cls + ' has-image"><img src="' + esc(src) + '" alt="" loading="lazy" onerror="this.parentNode.classList.remove(\'has-image\');this.remove()"><b>' + esc(initial(row.n)) + '</b></span>'
      : '<span class="' + cls + '">' + esc(initial(row.n)) + '</span>';
  }
  function myIdentity() {
    var profile = get('kenji_profile_v1', {}) || {};
    var stored = get('kenji_user', {}) || {};
    var name = String(profile.displayName || stored.name || stored.display_name || '').trim();
    if (!name && stored.email) name = String(stored.email).split('@')[0];
    return name || 'Ty';
  }
  function currentUserRow() {
    var xpState = get('kenji_xp_v1', {}) || {};
    var myXp = Number(xpState.xp) || 0;
    var name = myIdentity();
    return { n: name, ig: '', xp: myXp, me: true };
  }
  function fallbackRows() {
    var rows = SEED.map(function (row) { return { n: row.n, ig: row.ig, xp: row.xp, me: false }; });
    rows.push(currentUserRow());
    return rows;
  }
  function normalizeRemote(rows) {
    rows = (rows || []).map(function (row) {
      return {
        n: row.display_name || row.instagram || 'Tvůrce',
        ig: row.instagram || '',
        xp: Math.max(0, Number(row.xp) || 0),
        me: !!row.is_me
      };
    }).filter(function (row) { return row.xp > 0; });
    if (!rows.some(function (row) { return row.me; })) rows.push(currentUserRow());
    return rows;
  }
  function render(sourceRows) {
    var rows = (sourceRows && sourceRows.length ? sourceRows : fallbackRows()).slice();
    rows.sort(function (a, b) { return b.xp - a.xp; });
    var myIndex = rows.findIndex(function (row) { return row.me; });
    if (myIndex < 0) {
      rows.push(currentUserRow());
      rows.sort(function (a, b) { return b.xp - a.xp; });
      myIndex = rows.findIndex(function (row) { return row.me; });
    }
    var myRank = myIndex + 1;
    var podium = rows.slice(0, 3);
    var medals = ['🥇', '🥈', '🥉'];
    var count = sourceRows && sourceRows.length ? rows.length : TOTAL;
    var html = '<section class="co-card co-lb feed-leaderboard"><div class="co-card-head"><div><span class="community-view-kicker">KOMUNITA</span><h1 class="co-card-title">Žebříček tohoto týdne</h1></div><span class="co-count">' + count + ' tvůrců</span></div><p class="feed-leaderboard-lead">Sbírej KP za články, úkoly a aktivitu v komunitě. Tady vidíš, kam tě pravidelný posun dostal.</p><div class="co-podium">';
    [1, 0, 2].forEach(function (position) {
      var row = podium[position]; if (!row) return;
      var cls = position === 0 ? 'is-gold' : (position === 1 ? 'is-silver' : 'is-bronze');
      html += '<div class="co-podium-item ' + cls + (row.me ? ' is-me' : '') + '"><div class="co-podium-badge">' + medals[position] + '</div>' + avatar(row, 'co-podium-av') + '<div class="co-podium-name">' + esc(row.n) + (row.me ? ' <span class="co-lbyou">ty</span>' : '') + '</div>' + (row.ig ? '<a class="co-podium-ig" href="https://instagram.com/' + esc(row.ig) + '" target="_blank" rel="noopener">@' + esc(row.ig) + '</a>' : '<span class="co-podium-ig co-podium-ig-empty"></span>') + '<div class="co-podium-step"><span class="co-podium-rank">' + (position + 1) + '</span><span class="co-podium-xp">' + row.xp + ' KP · L' + levelOf(row.xp) + '</span></div></div>';
    });
    html += '</div><ol class="co-lblist">';
    rows.slice(3, 10).forEach(function (row, index) {
      html += '<li class="co-lbrow' + (row.me ? ' is-me' : '') + '"><span class="co-lbrank">' + (index + 4) + '</span>' + avatar(row, 'co-lbav') + '<span class="co-lbname">' + esc(row.n) + (row.ig ? ' <span class="co-lbig">@' + esc(row.ig) + '</span>' : '') + (row.me ? ' <span class="co-lbyou">ty</span>' : '') + '</span><span class="co-lbxp">' + row.xp + ' KP · L' + levelOf(row.xp) + '</span></li>';
    });
    html += '</ol>';
    if (myRank > 10) {
      var above = rows[myIndex - 1];
      var me = rows[myIndex];
      html += '<div class="co-lbme">' + avatar(me, 'co-lbav') + '<span class="co-lbname"><strong>' + myRank + '. ' + esc(me.n) + '</strong> <span class="co-lbyou">ty</span></span><span class="co-lbxp">' + me.xp + ' KP · L' + levelOf(me.xp) + '</span></div>';
      if (above) html += '<p class="co-lbhint">Ještě ' + (above.xp - me.xp + 1) + ' KP a posuneš se o místo výš.</p>';
    } else {
      html += '<p class="co-lbhint">Jsi v TOP 10. Drž pravidelný rytmus.</p>';
    }
    return html + '<p class="co-lbnote">Aktuálně jsi #' + myRank + ' z ' + count + ' tvůrců.</p></section>';
  }
  async function loadRemoteRows() {
    var A = window.KenjiAuth;
    if (!A || !A.isLoggedIn || !A.isLoggedIn() || !A.getSupabase) return null;
    var isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname) || /\.local$/.test(location.hostname);
    if (isLocal) return null;
    var sb = await A.getSupabase();
    if (!sb) return null;
    var result = await sb.rpc('community_leaderboard', { p_limit: 50 });
    if (result.error) throw result.error;
    return normalizeRemote(result.data || []);
  }
  async function hydrate(root) {
    if (!root) return;
    try {
      var rows = await loadRemoteRows();
      if (rows && rows.length) root.innerHTML = render(rows);
    } catch (e) {
      console.warn('community_leaderboard', e);
    }
  }

  window.KenjiLeaderboard = { render: render, hydrate: hydrate };
})();
