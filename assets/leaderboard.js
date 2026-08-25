// Komunitní žebříček Kenji Academy. Data jsou zatím seedovaná, vlastní KP jsou lokální.
(function () {
  'use strict';

  var SEED = [
    { n: 'Nikola Kirchschlägerová', ig: 'fotografkanikola', xp: 980 },
    { n: 'Tomáš Šreiber', ig: 'tomassreiber', xp: 910 },
    { n: 'Klára Brůnová', ig: 'klarushe', xp: 850 },
    { n: 'Luboš Římal', ig: 'lrfoto', xp: 790 },
    { n: 'Matěj Kubíček', ig: 'matejkubicek', xp: 720 },
    { n: 'Karolína Hůlová', ig: 'karolinahulova1', xp: 660 },
    { n: 'Marián Janík', ig: 'marianjanik', xp: 610 },
    { n: 'Martin Plíva', ig: 'martinlikeitraw', xp: 560 },
    { n: 'Matyáš Tuma', ig: 'matyastuma', xp: 520 },
    { n: 'Jakub Danel', ig: 'scalixcz', xp: 470 },
    { n: 'Michaela Švábenská', ig: 'svabenskaphoto', xp: 430 },
    { n: 'Kristýna Urubová', ig: 'kurubova', xp: 390 }
  ];
  var TOTAL = 286;
  var AVATAR_BASE = 'assets/whop-predstav-se-export/profiles/';

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
  function render() {
    var xpState = get('kenji_xp_v1', {}) || {};
    var myXp = Number(xpState.xp) || 0;
    var name = myIdentity();
    var rows = SEED.map(function (row) { return { n: row.n, ig: row.ig, xp: row.xp, me: false }; });
    rows.push({ n: name, ig: '', xp: myXp, me: true });
    rows.sort(function (a, b) { return b.xp - a.xp; });
    var myIndex = rows.findIndex(function (row) { return row.me; });
    var myRank = myIndex + 1;
    var podium = rows.slice(0, 3);
    var medals = ['🥇', '🥈', '🥉'];
    var html = '<section class="co-card co-lb feed-leaderboard"><div class="co-card-head"><div><span class="community-view-kicker">KOMUNITA</span><h1 class="co-card-title">Žebříček tohoto týdne</h1></div><span class="co-count">' + TOTAL + ' tvůrců</span></div><p class="feed-leaderboard-lead">Sbírej KP za články, úkoly a aktivitu v komunitě. Tady vidíš, kam tě pravidelný posun dostal.</p><div class="co-podium">';
    [1, 0, 2].forEach(function (position) {
      var row = podium[position]; if (!row) return;
      var cls = position === 0 ? 'is-gold' : (position === 1 ? 'is-silver' : 'is-bronze');
      html += '<div class="co-podium-item ' + cls + (row.me ? ' is-me' : '') + '"><div class="co-podium-badge">' + medals[position] + '</div>' + avatar(row, 'co-podium-av') + '<div class="co-podium-name">' + esc(row.n) + (row.me ? ' <span class="co-lbyou">ty</span>' : '') + '</div>' + (row.ig ? '<a class="co-podium-ig" href="https://instagram.com/' + esc(row.ig) + '" target="_blank" rel="noopener">@' + esc(row.ig) + '</a>' : '<span class="co-podium-ig co-podium-ig-empty"></span>') + '<div class="co-podium-step"><span class="co-podium-rank">' + (position + 1) + '</span><span class="co-podium-xp">' + row.xp + ' KP</span></div></div>';
    });
    html += '</div><ol class="co-lblist">';
    rows.slice(3, 10).forEach(function (row, index) {
      html += '<li class="co-lbrow' + (row.me ? ' is-me' : '') + '"><span class="co-lbrank">' + (index + 4) + '</span>' + avatar(row, 'co-lbav') + '<span class="co-lbname">' + esc(row.n) + (row.ig ? ' <span class="co-lbig">@' + esc(row.ig) + '</span>' : '') + (row.me ? ' <span class="co-lbyou">ty</span>' : '') + '</span><span class="co-lbxp">' + row.xp + ' KP</span></li>';
    });
    html += '</ol>';
    if (myRank > 10) {
      var above = rows[myIndex - 1];
      html += '<div class="co-lbme">' + avatar({ n: name, ig: '' }, 'co-lbav') + '<span class="co-lbname"><strong>' + myRank + '. ' + esc(name) + '</strong> <span class="co-lbyou">ty</span></span><span class="co-lbxp">' + myXp + ' KP</span></div>';
      if (above) html += '<p class="co-lbhint">Ještě ' + (above.xp - myXp + 1) + ' KP a posuneš se o místo výš.</p>';
    } else {
      html += '<p class="co-lbhint">Jsi v TOP 10. Drž pravidelný rytmus.</p>';
    }
    return html + '<p class="co-lbnote">Aktuálně jsi #' + myRank + ' z ' + TOTAL + ' tvůrců.</p></section>';
  }

  window.KenjiLeaderboard = { render: render };
})();
