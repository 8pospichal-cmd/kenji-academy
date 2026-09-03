(function () {
  'use strict';
  var ROOT = document.getElementById('admin-root');
  if (!ROOT) return;
  var DIALOG = document.getElementById('admin-dialog');
  var DIALOG_CONTENT = document.getElementById('admin-dialog-content');
  var A = window.KenjiAuth || {};
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  var sb = null, started = false, view = 'people', toolFilter = '', toolSort = 'money';
  var cache = { overview: null, users: [], tools: [], content: [], coupons: [] };

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"]/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]; }); }
  function date(value, withTime) { if (!value) return '—'; try { return new Intl.DateTimeFormat('cs-CZ', withTime ? { dateStyle:'medium',timeStyle:'short' } : { dateStyle:'medium' }).format(new Date(value)); } catch (e) { return '—'; } }
  function rel(value) {
    if (!value) return 'nikdy';
    var ms = Date.now() - new Date(value).getTime();
    var mins = Math.floor(ms / 60000);
    if (mins < 1) return 'právě teď';
    if (mins < 60) return 'před ' + mins + ' min';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return 'před ' + hrs + (hrs === 1 ? ' hodinou' : ' hodinami');
    var days = Math.floor(hrs / 24);
    if (days === 1) return 'včera';
    if (days < 5) return 'před ' + days + ' dny';
    if (days < 30) return 'před ' + days + ' dny';
    var months = Math.floor(days / 30);
    return 'před ' + months + (months === 1 ? ' měsícem' : ' měsíci');
  }
  function n(value) { return Number(value || 0).toLocaleString('cs-CZ'); }
  function label(value) { return ({ page_view:'Návštěva stránky',session_started:'Nová relace',registered:'Registrace',onboarding_completed:'Dokončený onboarding',quiz_started:'Spuštěný kvíz',quiz_completed:'Dokončený kvíz',audit_completed:'Dokončený audit',hourly_calculator_completed:'Spočítaná hodinovka',ai_question_sent:'Dotaz na Kenji AI',community_post_created:'Příspěvek v komunitě',checkout_started:'Zahájená objednávka',purchase_completed:'Dokončený nákup' })[value] || value || 'Událost'; }
  function typeLabel(value) { return ({ weekly_challenge:'Týdenní výzva',news:'Novinka',webinar:'Webinář',quiz:'Kvíz',audit:'Audit',hourly_calculator:'Hodinovka' })[value] || value; }
  var REFRESH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  function head(eyebrow,title,description) {
    return '<div class="admin-view-head"><div><span class="admin-eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>'+
      '<button class="admin-refresh" type="button" data-admin-refresh title="Načíst čerstvá data" aria-label="Načíst čerstvá data">'+REFRESH_ICON+'<span data-refresh-label>Načíst data</span></button></div>';
  }
  function chip(value) { return '<span class="admin-chip is-'+esc(value)+'">'+esc(value)+'</span>'; }

  function demoData() {
    var now = new Date(), yesterday = new Date(Date.now()-86400000).toISOString();
    cache.overview = { users_total:148,users_new_7d:17,active_7d:63,free_total:119,academy_total:29,quiz_30d:41,audit_30d:26,calculator_30d:18,
      recent_users:[{email:'klara@example.cz',display_name:'Klára',instagram:'klaravisual',tier:'free',account_status:'active',created_at:now.toISOString(),last_seen_at:now.toISOString()},{email:'david@example.cz',display_name:'David',instagram:'davidvideo',tier:'academy',account_status:'active',created_at:yesterday,last_seen_at:yesterday}],
      recent_events:[{event_name:'audit_completed',email:'klara@example.cz',source:'audit',created_at:now.toISOString()},{event_name:'quiz_completed',email:'david@example.cz',source:'quiz',created_at:yesterday}] };
    cache.users = cache.overview.recent_users.map(function(u,i){return Object.assign({},u,{role:'member',updated_at:u.created_at,quiz_completed:i===1,audit_completed:i===0,calculator_completed:false});});
    cache.tools = [{id:'demo1',tool:'audit',claimed_email:'klara@example.cz',result:{industries:['svatby','portret'],level:'rozjizdi',average_price:9000,jobs_per_month:2,hours_per_week:20,problems:['cena','klienti'],goal:'prechod',brake:'klienti',current:18000,potential:43000,annual_gap:300000},completed_at:now.toISOString()},{id:'demo2',tool:'quiz',user_email:'david@example.cz',result:{level:'business',level_name:'Byznys',score:13,total:15,passed:true},completed_at:yesterday},{id:'demo3',tool:'audit',user_email:'petra@example.cz',result:{industries:['firemni'],level:'zavedeny',average_price:24000,jobs_per_month:3,goal:'skalovat',brake:'cas',current:72000,potential:120000,annual_gap:576000},completed_at:yesterday},{id:'demo4',tool:'hourly_calculator',user_email:'tomas@example.cz',result:{billable_hours:90,hourly:1450,daily:11600,monthly_revenue:130500,monthly_taxes_and_levies:31000},completed_at:now.toISOString()}];
    cache.content = [{id:'demo-content',type:'weekly_challenge',title:'Ukaž svůj největší posun',body:'Sdílej jednu věc, kterou ses tento týden naučil.',status:'published',audience:'all',xp:50,starts_at:now.toISOString()}];
    cache.coupons = [{code:'NIKON20',description:'Partner Nikon',percent_off:20,products:['academy'],active:true,used_count:7,max_uses:50,valid_until:null}];
  }

  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  function errText(error) { return String((error && (error.message || error.hint || error.details)) || error || 'neznámá chyba'); }
  function isStaleSession(error) { return /jwt|expired|token|Jen pro admina/i.test(errText(error)); }

  // Když vyprší přihlašovací token, RPC spadne na „Jen pro admina". Jednou obnovíme
  // relaci a zkusíme znovu — jinak by admin viděl jen prázdnou obrazovku.
  async function rpc(name,args) {
    var client = await getSB();
    if (!client) throw new Error('Supabase není dostupný.');
    var result = await client.rpc(name,args || {});
    if (result.error && isStaleSession(result.error)) {
      try { await client.auth.refreshSession(); } catch (e) {}
      result = await client.rpc(name,args || {});
    }
    if (result.error) throw result.error;
    return result.data;
  }
  function fail(error) { console.warn('admin',error); ROOT.innerHTML = '<section class="admin-denied"><span class="admin-eyebrow">PŘÍSTUP ZAMÍTNUT</span><h1>Administrace je jen pro správce.</h1><p>Přihlas se ověřeným e-mailem s rolí admin. Samotná znalost administrátorského e-mailu nestačí.</p><p class="admin-denied-detail">Detail: '+esc(errText(error))+'</p><a class="admin-button" href="nastaveni.html">Zpět do Nastavení</a></section>'; }

  async function boot() {
    if (started) return; started = true;
    A = window.KenjiAuth || A;
    try {
      if (IS_LOCAL) {
        document.getElementById('admin-env').hidden = false;
        demoData(); render(); return;
      }
      var adminEmail = await rpc('current_admin_email');
      if (!adminEmail) throw new Error('not admin');
      await loadOverview(); await loadUsers(); render();
    } catch (e) { fail(e); }
  }

  async function loadOverview() { cache.overview = await rpc('admin_overview'); }
  async function loadUsers(search,tier,status) { cache.users = await rpc('admin_list_users_v2',{p_search:search||null,p_tier:tier||null,p_status:status||null,p_limit:200,p_offset:0}) || []; }
  async function loadTools(tool) { toolFilter = tool || ''; cache.tools = await rpc('admin_list_tool_submissions',{p_tool:tool||null,p_limit:1000}) || []; }
  async function loadContent() { cache.content = await rpc('admin_list_content',{p_type:null}) || []; }
  async function loadCoupons() { cache.coupons = await rpc('admin_list_coupons_v2') || []; }

  function render() {
    document.querySelectorAll('[data-admin-view]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-admin-view')===view);});
    if (view === 'people') renderPeople();
    if (view === 'tools') renderTools();
    if (view === 'content') renderContent();
    if (view === 'coupons') renderCoupons();
    if (view === 'activity') renderActivity();
  }

  // Čísla, která vedou k akci (nahoře nad CRM) — ne dekorativní analytika.
  function kpiRow() {
    var d = cache.overview || {};
    return '<div class="admin-kpis">'+
      kpi('Všichni lidé',d.users_total,'+'+n(d.users_new_7d)+' za 7 dní')+
      kpi('Aktivní za 7 dní',d.active_7d,'ověřená aktivita')+
      kpi('Academy',d.academy_total,'z '+n(d.free_total)+' Free')+
      kpi('Lidé s auditem',d.audit_30d,'za posledních 30 dní')+
      kpi('Lidé v nástrojích',Number(d.quiz_30d||0)+Number(d.calculator_30d||0),n(d.quiz_30d)+' kvíz · '+n(d.calculator_30d)+' sazba')+
    '</div>';
  }
  function renderActivity() {
    var events = (cache.overview && cache.overview.recent_events) || [];
    ROOT.innerHTML = head('SIGNÁL','Aktivita','Živý přehled toho, co lidé v Academy dělají.')+
      '<div class="admin-events admin-events-full">'+(events.length?events.map(eventRow).join(''):'<div class="admin-empty">Zatím bez událostí.</div>')+'</div>';
  }
  function kpi(title,value,note){return '<div class="admin-kpi"><span>'+esc(title)+'</span><strong>'+n(value)+'</strong><small>'+esc(note)+'</small></div>';}
  function eventRow(e){return '<div class="admin-event"><i></i><div><strong>'+esc(label(e.event_name))+'</strong><small>'+esc(e.email||e.source||'anonymní návštěvník')+'</small></div><time>'+esc(rel(e.created_at))+'</time></div>';}

  function tierSelect(email, current) {
    return '<select class="admin-quick-tier" data-quick-tier="'+esc(email)+'" title="Změnit tier">'+
      ['free','knihovna','academy'].map(function(t){ return '<option value="'+t+'"'+((current||'free')===t?' selected':'')+'>'+t+'</option>'; }).join('')+
      '</select>';
  }
  function blockButton(email, status) {
    var blocked = status === 'blocked';
    return '<button class="admin-quick-block'+(blocked?' is-blocked':'')+'" type="button" data-quick-block="'+esc(email)+'">'+(blocked?'Odblokovat':'Zablokovat')+'</button>';
  }
  function linkButton(email) {
    return '<button class="admin-quick-link" type="button" data-quick-link="'+esc(email)+'" title="Poslat přihlašovací odkaz" aria-label="Poslat odkaz">✉</button>';
  }
  // Malé auto-štítky — jen užitečné signály, minimalisticky.
  function userBadges(u) {
    var b = [];
    if (u.tier === 'academy') b.push('<span class="admin-badge is-academy">Academy</span>');
    else if (u.tier === 'knihovna') b.push('<span class="admin-badge is-db">Databáze</span>');
    var created = u.created_at ? Date.now() - new Date(u.created_at).getTime() : 0;
    if (created > 0 && created < 7 * 86400000) b.push('<span class="admin-badge is-new">Nový</span>');
    var seen = u.last_seen_at ? Date.now() - new Date(u.last_seen_at).getTime() : Infinity;
    if (seen > 30 * 86400000) b.push('<span class="admin-badge is-idle">Neaktivní</span>');
    return b.length ? '<span class="admin-badges">' + b.join('') + '</span>' : '';
  }
  function opts(list, current) { return list.map(function(x){ return '<option value="'+x+'"'+((current||list[0])===x?' selected':'')+'>'+x+'</option>'; }).join(''); }
  function usersTable(users) {
    if (!users.length) return '<div class="admin-empty">Nikdo neodpovídá filtru.</div>';
    return '<div class="admin-table-wrap"><table class="admin-table admin-people-table"><thead><tr><th>Člověk</th><th>Tier</th><th>Stav</th><th>Přidal se</th><th>Naposledy</th></tr></thead><tbody>'+users.map(function(u){
      var name=u.display_name||(u.instagram?'@'+u.instagram:'Bez jména');
      return '<tr class="admin-people-row" data-email="'+esc(u.email)+'"><td><span class="admin-person"><strong>'+esc(name)+'</strong><small>'+esc(u.email)+'</small>'+userBadges(u)+'</span></td><td>'+chip(u.tier||'free')+'</td><td>'+chip(u.account_status||'active')+'</td><td>'+esc(date(u.created_at,false))+'</td><td>'+esc(rel(u.last_seen_at))+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  // Inline rozbalení řádku — úprava člověka rovnou v tabulce, bez nové stránky.
  async function toggleUser(email, rowEl) {
    var next = rowEl.nextElementSibling;
    if (next && next.classList.contains('admin-detail-row')) { next.remove(); rowEl.classList.remove('is-open'); return; }
    document.querySelectorAll('.admin-detail-row').forEach(function(r){ r.remove(); });
    document.querySelectorAll('.admin-people-row.is-open').forEach(function(r){ r.classList.remove('is-open'); });
    var u;
    if (IS_LOCAL) { u = cache.users.find(function(x){return x.email===email;}) || {}; }
    else { try { var detail = await rpc('admin_get_user_v2',{p_target:email}); u = (detail&&detail.user)||{}; } catch(err){ fail(err); return; } }
    var tools=[u.quiz_completed?'Kvíz':'',u.audit_completed?'Audit':'',u.calculator_completed?'Sazba':''].filter(Boolean).join(' · ')||'—';
    var tr = document.createElement('tr');
    tr.className = 'admin-detail-row';
    tr.innerHTML = '<td colspan="'+rowEl.children.length+'"><div class="admin-inline-detail">'+
      '<div class="admin-inline-meta">'+
        '<span>Přidal se<strong>'+esc(date(u.created_at,true))+'</strong></span>'+
        '<span>Instagram<strong>'+esc(u.instagram?'@'+u.instagram:'—')+'</strong></span>'+
        '<span>Poslední aktivita<strong>'+esc(rel(u.last_seen_at))+'</strong></span>'+
        '<span>Nástroje<strong>'+esc(tools)+'</strong></span>'+
      '</div>'+
      '<div class="admin-inline-fields">'+
        '<label>Tier<select class="admin-select" data-d="tier">'+opts(['free','knihovna','academy'],u.tier||'free')+'</select></label>'+
        '<label>Role<select class="admin-select" data-d="role">'+opts(['member','moderator','admin'],u.role||'member')+'</select></label>'+
        '<label>Stav<select class="admin-select" data-d="status">'+opts(['active','pending','paused','blocked'],u.account_status||'active')+'</select></label>'+
        '<button class="admin-button" type="button" data-detail-save="'+esc(email)+'">Uložit změny</button>'+
        '<button class="admin-quick-link" type="button" data-quick-link="'+esc(email)+'" title="Poslat přihlašovací odkaz">✉ Odkaz</button>'+
      '</div>'+
      '<span class="admin-inline-msg" data-detail-msg></span>'+
    '</div></td>';
    rowEl.after(tr);
    rowEl.classList.add('is-open');
  }

  function renderPeople() {
    ROOT.innerHTML = head('CRM','Lidé','Kdo přišel, kde se nachází a co už v Academy udělal.')+
      kpiRow()+
      '<form class="admin-addform" id="admin-add-user"><span class="admin-addform-label">Přidat člověka</span>'+
        '<input class="admin-input" name="email" type="email" required placeholder="email@clovek.cz">'+
        '<select class="admin-select" name="tier"><option value="free">free</option><option value="knihovna">knihovna (databáze)</option><option value="academy">academy (plný přístup)</option></select>'+
        '<button class="admin-button" type="submit">Přidat / nastavit</button>'+
        '<span class="admin-addform-msg" id="admin-add-msg"></span>'+
      '</form>'+
      '<div class="admin-filters"><input class="admin-input" id="admin-user-search" placeholder="Hledat e-mail, jméno nebo Instagram"><select class="admin-select" id="admin-user-tier"><option value="">Všechny tiery</option><option>free</option><option>knihovna</option><option>academy</option></select><select class="admin-select" id="admin-user-status"><option value="">Všechny stavy</option><option>active</option><option>pending</option><option>paused</option><option>blocked</option></select><button class="admin-button" id="admin-user-filter">Filtrovat</button></div>'+usersTable(cache.users);
  }

  // Kolik člověk měsíčně točí — audit i kalkulačka to počítají, jen jinak se to jmenuje.
  function mesicniPrijem(row) {
    var r = row.result || {};
    if (row.tool === 'audit') return Number(r.current || 0);
    if (row.tool === 'hourly_calculator') return Number(r.monthly_revenue || 0);
    return 0;
  }
  function potencial(row) {
    var r = row.result || {};
    return row.tool === 'audit' ? Number(r.potential || 0) : 0;
  }
  function kc(value) { return value ? n(Math.round(value)) + ' Kč' : '—'; }
  function toolEmail(row) { return row.user_email || row.claimed_email || ''; }

  function medianOf(list) {
    if (!list.length) return 0;
    var a = list.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2);
  }

  // Souhrn, který vede k akci: kdo má na Academy peníze už teď.
  function moneyRow(rows) {
    var prijmy = rows.map(mesicniPrijem).filter(function (v) { return v > 0; });
    if (!prijmy.length) return '';
    var bohati = prijmy.filter(function (v) { return v >= 50000; }).length;
    var gap = rows.reduce(function (sum, r) { return sum + Math.max(0, potencial(r) - mesicniPrijem(r)); }, 0);
    return '<div class="admin-kpis admin-kpis-4">' +
      kpi('Uvedlo příjem', prijmy.length, 'z ' + n(rows.length) + ' vyplnění') +
      kpi('Medián měsíčně', medianOf(prijmy), 'Kč / měsíc') +
      kpi('Nad 50 000 Kč', bohati, 'na Academy mají') +
      kpi('Nevyužitý potenciál', Math.round(gap), 'Kč / měsíc dohromady') +
    '</div>';
  }

  function renderTools() {
    var counts = { quiz:0, audit:0, hourly_calculator:0 };
    cache.tools.forEach(function (x) { counts[x.tool] = (counts[x.tool] || 0) + 1; });
    var rows = cache.tools.slice();
    if (toolSort === 'money') rows.sort(function (a, b) { return mesicniPrijem(b) - mesicniPrijem(a); });
    else rows.sort(function (a, b) { return new Date(b.completed_at) - new Date(a.completed_at); });

    ROOT.innerHTML = head('SIGNÁLY ZÁJMU','Nástroje','Kdo co vyplnil, kolik točí a kde má rezervu. Seřaď podle příjmu a máš seznam lidí, kterým dává smysl nabídnout Academy.')+
      '<div class="admin-tools-summary">'+
        toolTab('', 'Všechny výsledky', cache.tools.length)+
        toolTab('audit', 'Audit', counts.audit)+
        toolTab('quiz', 'Kvíz', counts.quiz)+
        toolTab('hourly_calculator', 'Hodinovka', counts.hourly_calculator)+
      '</div>'+
      moneyRow(cache.tools)+
      '<div class="admin-sortbar">Řadit podle: '+
        '<button type="button" data-tool-sort="money"'+(toolSort==='money'?' class="is-on"':'')+'>nejvyššího příjmu</button>'+
        '<button type="button" data-tool-sort="date"'+(toolSort==='date'?' class="is-on"':'')+'>data vyplnění</button>'+
      '</div>'+
      '<p class="admin-notice">Klikni na řádek a uvidíš všechno, co člověk vyplnil. Výsledky bez ověřené relace jsou označené jako neověřený e-mail.</p>'+
      toolsTable(rows);
  }
  function toolTab(id, label, count) {
    return '<button'+(toolFilter===id?' class="active"':'')+' data-tool-filter="'+id+'"><span>'+esc(label)+'</span><strong>'+n(count)+'</strong></button>';
  }

  function toolsTable(rows) {
    if (!rows.length) return '<div class="admin-empty">Zatím žádná dokončení.</div>';
    return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'+
      '<th>Nástroj</th><th>Člověk</th><th>Měsíčně teď</th><th>Potenciál</th><th>Situace</th><th>Dokončeno</th>'+
      '</tr></thead><tbody>'+rows.map(toolRow).join('')+'</tbody></table></div>';
  }

  function toolRow(x) {
    var r = x.result || {};
    var email = toolEmail(x);
    var situace = x.tool === 'quiz'
      ? ((r.level_name || r.level || 'kvíz') + ' · ' + (r.score || 0) + '/' + (r.total || '—') + (r.passed ? ' ✓' : ''))
      : x.tool === 'audit'
        ? ([r.level, r.goal, r.brake].filter(Boolean).join(' · ') || 'audit dokončen')
        : (r.hourly ? Math.round(r.hourly).toLocaleString('cs-CZ') + ' Kč/h' : 'výpočet dokončen');
    var prijem = mesicniPrijem(x), pot = potencial(x);
    return '<tr data-tool-row="'+esc(x.id)+'">'+
      '<td>'+chip(typeLabel(x.tool))+'</td>'+
      '<td><span class="admin-person"><strong>'+esc(email || 'Anonymní')+'</strong><small>'+(x.user_email?'ověřeno':'neověřený e-mail')+'</small></span></td>'+
      '<td'+(prijem>=50000?' class="is-hot"':'')+'>'+kc(prijem)+'</td>'+
      '<td>'+kc(pot)+'</td>'+
      '<td>'+esc(situace)+'</td>'+
      '<td>'+esc(date(x.completed_at,true))+'</td>'+
    '</tr>';
  }

  // Rozklikni řádek → uvidíš úplně všechno, co člověk zadal.
  var POLE = {
    industries:'Obory', level:'Úroveň', level_name:'Úroveň', average_price:'Průměrná cena zakázky',
    jobs_per_month:'Zakázek měsíčně', hours_per_week:'Hodin týdně', problems:'Co ho brzdí',
    goal:'Cíl', brake:'Hlavní brzda', current:'Měsíčně teď', potential:'Potenciál měsíčně',
    annual_gap:'Rozdíl za rok', hourly:'Hodinovka', daily:'Denní sazba',
    monthly_revenue:'Měsíční obrat', monthly_taxes_and_levies:'Daně a odvody měsíčně',
    billable_hours:'Fakturovatelných hodin', score:'Skóre', total:'Otázek', passed:'Prošel'
  };
  var PENIZE = { average_price:1, current:1, potential:1, annual_gap:1, hourly:1, daily:1, monthly_revenue:1, monthly_taxes_and_levies:1 };
  function toggleTool(id, rowEl) {
    var open = rowEl.nextElementSibling;
    if (open && open.classList.contains('admin-inline-detail-row')) { open.remove(); return; }
    document.querySelectorAll('.admin-inline-detail-row').forEach(function (el) { el.remove(); });
    var item = cache.tools.find(function (x) { return String(x.id) === String(id); });
    if (!item) return;
    var r = item.result || {};
    var radky = Object.keys(r).map(function (k) {
      var v = r[k];
      if (v === null || v === '' || (Array.isArray(v) && !v.length)) return '';
      if (Array.isArray(v)) v = v.join(', ');
      else if (typeof v === 'boolean') v = v ? 'ano' : 'ne';
      else if (PENIZE[k] && Number(v)) v = n(Math.round(Number(v))) + ' Kč';
      return '<div class="admin-kv"><span>'+esc(POLE[k] || k)+'</span><strong>'+esc(v)+'</strong></div>';
    }).join('');
    var tr = document.createElement('tr');
    tr.className = 'admin-inline-detail-row';
    tr.innerHTML = '<td colspan="6"><div class="admin-inline-detail"><div class="admin-kv-grid">'+
      (radky || '<div class="admin-kv"><span>Bez detailu</span><strong>—</strong></div>')+'</div>'+
      (toolEmail(item) ? '<div class="admin-inline-fields"><a class="admin-button secondary" href="mailto:'+esc(toolEmail(item))+'">Napsat e-mail</a></div>' : '')+
    '</div></td>';
    rowEl.parentNode.insertBefore(tr, rowEl.nextSibling);
  }

  function renderContent() {
    ROOT.innerHTML = head('PUBLIKOVÁNÍ','Obsah','Výzvy, novinky a webináře na jednom místě.')+
      '<form class="admin-form" id="admin-content-form"><input type="hidden" name="id"><label>Typ<select class="admin-select" name="type"><option value="weekly_challenge">Týdenní výzva</option><option value="news">Novinka</option><option value="webinar">Webinář</option></select></label><label class="span-2">Název<input class="admin-input" name="title" required maxlength="160"></label><label>Stav<select class="admin-select" name="status"><option value="draft">Koncept</option><option value="scheduled">Naplánováno</option><option value="published">Publikováno</option><option value="archived">Archiv</option></select></label><label>Pro koho<select class="admin-select" name="audience"><option value="all">Všichni</option><option value="free">Free</option><option value="academy">Academy</option></select></label><label>KP<input class="admin-input" type="number" min="0" max="10000" name="xp" value="0"></label><label class="span-3">Text<textarea class="admin-textarea" name="body" maxlength="4000"></textarea></label><label>Začátek<input class="admin-input" type="datetime-local" name="starts_at"></label><label>Odkaz<input class="admin-input" name="link_url" placeholder="https://…"></label><div class="admin-form-actions"><span class="admin-inline-msg" id="admin-content-msg"></span><button class="admin-button secondary" type="button" data-content-reset hidden>Zrušit úpravu</button><button class="admin-button" type="submit">Uložit obsah</button></div></form>'+contentTable(cache.content);
    wireContentForm();
  }

  // Formulář obsahu má vlastní posluchač (ne jen delegovaný), aby prohlížeč nikdy
  // neprovedl nativní odeslání a nepřenačetl celou administraci.
  function wireContentForm() {
    var form = document.getElementById('admin-content-form');
    if (!form) return;
    form.addEventListener('submit', function (e) { e.preventDefault(); saveContent(form); });
  }

  function contentMsg(text, kind) {
    var el = document.getElementById('admin-content-msg');
    if (el) { el.textContent = text || ''; el.className = 'admin-inline-msg' + (kind ? ' is-' + kind : ''); }
  }

  async function saveContent(form) {
    var f = new FormData(form);
    var title = String(f.get('title') || '').trim();
    if (!title) { contentMsg('Doplň název.', 'err'); form.elements.title.focus(); return; }
    var button = form.querySelector('button[type="submit"]');
    var row = {
      id: f.get('id') || null,
      type: f.get('type'),
      title: title,
      body: String(f.get('body') || '').trim() || null,
      status: f.get('status'),
      audience: f.get('audience'),
      starts_at: f.get('starts_at') ? new Date(f.get('starts_at')).toISOString() : null,
      xp: Number(f.get('xp') || 0),
      link_url: String(f.get('link_url') || '').trim() || null
    };
    if (button) button.disabled = true;
    contentMsg('Ukládám…', '');
    try {
      if (IS_LOCAL) {
        if (!row.id) row.id = 'demo-' + Date.now();
        var oldIndex = cache.content.findIndex(function (x) { return x.id === row.id; });
        if (oldIndex >= 0) cache.content.splice(oldIndex, 1, row); else cache.content.unshift(row);
      } else {
        await rpc('admin_upsert_content', {
          p_id: row.id, p_type: row.type, p_title: row.title, p_body: row.body,
          p_status: row.status, p_audience: row.audience, p_starts_at: row.starts_at,
          p_ends_at: null, p_xp: row.xp, p_link_url: row.link_url, p_metadata: {}
        });
        await loadContent();
      }
      renderContent();
      contentMsg('Uloženo ✓', 'ok');
    } catch (err) {
      console.warn('admin_upsert_content', err);
      if (button) button.disabled = false;
      contentMsg('Nepovedlo se uložit: ' + ((err && (err.message || err.hint)) || 'neznámá chyba'), 'err');
    }
  }

  function contentTable(rows){if(!rows.length)return '<div class="admin-empty">Zatím žádný spravovaný obsah.</div>';return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Typ</th><th>Název</th><th>Stav</th><th>Publikum</th><th>Termín</th><th></th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td>'+esc(typeLabel(x.type))+'</td><td><span class="admin-person"><strong>'+esc(x.title)+'</strong><small>'+esc((x.body||'').slice(0,90))+'</small></span></td><td>'+chip(x.status)+'</td><td>'+esc(x.audience)+'</td><td>'+esc(date(x.starts_at,true))+'</td><td><div class="admin-row-actions"><button class="admin-button secondary" type="button" data-content-edit="'+esc(x.id)+'">Upravit</button><button class="admin-button danger" type="button" data-content-delete="'+esc(x.id)+'">Smazat</button></div></td></tr>';}).join('')+'</tbody></table></div>';}

  function localDateTime(value) {
    if (!value) return '';
    var d = new Date(value), offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0,16);
  }
  function resetContentForm() {
    var form = document.getElementById('admin-content-form'); if (!form) return;
    form.reset(); form.elements.id.value = ''; form.elements.xp.value = '0';
    form.querySelector('[data-content-reset]').hidden = true;
  }
  function editContent(id) {
    var item = cache.content.find(function(x){return x.id===id;}), form = document.getElementById('admin-content-form');
    if (!item || !form) return;
    form.elements.id.value=item.id;form.elements.type.value=item.type;form.elements.title.value=item.title||'';form.elements.status.value=item.status;form.elements.audience.value=item.audience;form.elements.xp.value=item.xp||0;form.elements.body.value=item.body||'';form.elements.starts_at.value=localDateTime(item.starts_at);form.elements.link_url.value=item.link_url||'';
    form.querySelector('[data-content-reset]').hidden=false;form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus();
  }

  function renderCoupons() {
    ROOT.innerHTML = head('NABÍDKY','Kupóny','Kódy, limity a reálné použití bez hledání v databázi.')+
      '<form class="admin-form" id="admin-coupon-form"><label>Kód<input class="admin-input" name="code" required maxlength="40" placeholder="NIKON20"></label><label>Sleva %<input class="admin-input" type="number" name="percent" min="1" max="100" required></label><label class="span-2">Popis<input class="admin-input" name="description" maxlength="160"></label><label>Produkty<select class="admin-select" name="products"><option value="">Všechny</option><option value="academy">Academy</option><option value="databaze">Databáze</option><option value="presets">Presety</option></select></label><label>Max. použití<input class="admin-input" type="number" name="max_uses" min="1"></label><div class="admin-form-actions"><button class="admin-button" type="submit">Přidat kupón</button></div></form>'+couponsTable(cache.coupons);
  }
  function couponsTable(rows){if(!rows.length)return '<div class="admin-empty">Zatím žádné kupóny.</div>';return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Kód</th><th>Sleva</th><th>Produkty</th><th>Použití</th><th>Stav</th><th></th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><strong>'+esc(x.code)+'</strong></td><td>'+n(x.percent_off)+' %</td><td>'+esc((x.products||[]).join(', ')||'všechny')+'</td><td>'+n(x.used_count)+(x.max_uses?' / '+n(x.max_uses):' / ∞')+'</td><td><button class="admin-status-button'+(x.active?'':' is-off')+'" type="button" data-coupon-toggle="'+esc(x.code)+'">'+esc(x.active?'Aktivní':'Vypnutý')+'</button></td><td><button class="admin-button danger" type="button" data-coupon-delete="'+esc(x.code)+'">Smazat</button></td></tr>';}).join('')+'</tbody></table></div>';}

  async function openUser(email) {
    var detail;
    if (IS_LOCAL) { var user=cache.users.find(function(x){return x.email===email;}); detail={user:user,submissions:cache.tools.filter(function(x){return (x.user_email||x.claimed_email)===email;}),events:[]}; }
    else detail=await rpc('admin_get_user_v2',{p_target:email});
    var u=detail&&detail.user||{};
    DIALOG_CONTENT.innerHTML='<div class="admin-detail"><div class="admin-detail-top"><div><span class="admin-eyebrow">DETAIL ČLOVĚKA</span><h2>'+esc(u.display_name||u.email)+'</h2><p>'+esc(u.email||'')+'</p></div><button class="admin-dialog-close" type="button" aria-label="Zavřít">×</button></div><div class="admin-detail-grid"><label>Přidal se<strong>'+esc(date(u.created_at,true))+'</strong></label><label>Poslední aktivita<strong>'+esc(rel(u.last_seen_at))+'</strong></label><label>Instagram<strong>'+esc(u.instagram?'@'+u.instagram:'—')+'</strong></label><label>Tier<select class="admin-select" id="detail-tier"><option>free</option><option>knihovna</option><option>academy</option></select></label><label>Role<select class="admin-select" id="detail-role"><option>member</option><option>moderator</option><option>admin</option></select></label><label>Stav<select class="admin-select" id="detail-status"><option>active</option><option>pending</option><option>paused</option><option>blocked</option></select></label></div><div class="admin-form-actions"><button class="admin-button" id="detail-save" type="button">Uložit změny</button></div><h3>Výsledky nástrojů</h3><pre class="admin-json">'+esc(JSON.stringify(detail.submissions||[],null,2))+'</pre><h3>Poslední události</h3><pre class="admin-json">'+esc(JSON.stringify(detail.events||[],null,2))+'</pre></div>';
    DIALOG_CONTENT.querySelector('#detail-tier').value=u.tier||'free';DIALOG_CONTENT.querySelector('#detail-role').value=u.role||'member';DIALOG_CONTENT.querySelector('#detail-status').value=u.account_status||'active';
    DIALOG_CONTENT.querySelector('.admin-dialog-close').onclick=function(){DIALOG.close();};
    DIALOG_CONTENT.querySelector('#detail-save').onclick=async function(){if(IS_LOCAL){DIALOG.close();return;}await rpc('admin_set_user_v2',{p_target:u.email,p_tier:document.getElementById('detail-tier').value,p_role:document.getElementById('detail-role').value,p_status:document.getElementById('detail-status').value});DIALOG.close();await loadUsers();renderPeople();};
    DIALOG.showModal();
  }

  document.addEventListener('click',async function(e){
    var viewButton=e.target.closest('[data-admin-view]');if(viewButton){view=viewButton.getAttribute('data-admin-view');ROOT.innerHTML='<div class="admin-loading">Načítám…</div>';try{if(view==='people'){if(!cache.overview)await loadOverview();if(!cache.users.length)await loadUsers();}if(view==='activity'&&!cache.overview)await loadOverview();if(view==='tools'&&!cache.tools.length)await loadTools();if(view==='content'&&!cache.content.length)await loadContent();if(view==='coupons'&&!cache.coupons.length)await loadCoupons();render();}catch(err){fail(err);}return;}
    var refreshBtn=e.target.closest('[data-admin-refresh]');
    if(refreshBtn){
      refreshBtn.disabled=true; refreshBtn.classList.add('is-loading');
      var lbl=refreshBtn.querySelector('[data-refresh-label]'); if(lbl) lbl.textContent='Načítám…';
      try{
        if(IS_LOCAL){ demoData(); }
        else {
          if(view==='people'){await loadOverview();await loadUsers();}
          if(view==='activity')await loadOverview();
          if(view==='tools')await loadTools(toolFilter);
          if(view==='content')await loadContent();
          if(view==='coupons')await loadCoupons();
        }
        render();
        // render() postavil tlačítko znovu — potvrzení zapiš do toho nového.
        var fresh=document.querySelector('[data-admin-refresh]');
        if(fresh){
          fresh.classList.add('is-done');
          var freshLbl=fresh.querySelector('[data-refresh-label]');
          if(freshLbl) freshLbl.textContent='Aktuální ✓';
          setTimeout(function(){
            var el=document.querySelector('[data-admin-refresh]');
            if(el){el.classList.remove('is-done');var l=el.querySelector('[data-refresh-label]');if(l)l.textContent='Načíst data';}
          },1800);
        }
      }catch(err){
        console.warn('obnova dat',err);
        var bad=document.querySelector('[data-admin-refresh]')||refreshBtn;
        bad.disabled=false; bad.classList.remove('is-loading'); bad.classList.add('is-error');
        var badLbl=bad.querySelector('[data-refresh-label]'); if(badLbl) badLbl.textContent='Nenačteno';
        setTimeout(function(){
          var el=document.querySelector('[data-admin-refresh]');
          if(el){el.classList.remove('is-error');var l=el.querySelector('[data-refresh-label]');if(l)l.textContent='Načíst data';}
        },2600);
      }
      return;
    }
    var qb=e.target.closest('[data-quick-block]');if(qb){var qbEmail=qb.getAttribute('data-quick-block');var qbUser=cache.users.find(function(x){return x.email===qbEmail;});var newStatus=(qbUser&&qbUser.account_status==='blocked')?'active':'blocked';if(qbUser)qbUser.account_status=newStatus;try{if(!IS_LOCAL)await rpc('admin_set_user_v2',{p_target:qbEmail,p_status:newStatus});}catch(err){fail(err);return;}renderPeople();return;}
    var qlink=e.target.closest('[data-quick-link]');if(qlink){var lEmail=qlink.getAttribute('data-quick-link');qlink.disabled=true;try{if(IS_LOCAL){alert('(Lokálně) Přihlašovací odkaz by šel na: '+lEmail);}else{var A=window.KenjiAuth;if(A&&A.requestMagicLink){var r=await A.requestMagicLink(lEmail,{redirect:'index.html'});if(!r||!r.ok)throw new Error('nepovedlo se odeslat');}alert('Přihlašovací odkaz odeslán na '+lEmail);}}catch(err){alert('Odkaz se nepovedlo odeslat: '+((err&&err.message)||'chyba'));}qlink.disabled=false;return;}
    var saveDetail=e.target.closest('[data-detail-save]');if(saveDetail){var sEmail=saveDetail.getAttribute('data-detail-save');var wrap=saveDetail.closest('.admin-inline-detail');var sTier=wrap.querySelector('[data-d="tier"]').value,sRole=wrap.querySelector('[data-d="role"]').value,sStatus=wrap.querySelector('[data-d="status"]').value;var dmsg=wrap.querySelector('[data-detail-msg]');saveDetail.disabled=true;try{if(!IS_LOCAL)await rpc('admin_set_user_v2',{p_target:sEmail,p_tier:sTier,p_role:sRole,p_status:sStatus});var su=cache.users.find(function(x){return x.email===sEmail;});if(su){su.tier=sTier;su.role=sRole;su.account_status=sStatus;}if(dmsg){dmsg.textContent='Uloženo ✓';dmsg.className='admin-inline-msg is-ok';}setTimeout(function(){renderPeople();},600);}catch(err){if(dmsg){dmsg.textContent='Nepovedlo se uložit.';dmsg.className='admin-inline-msg is-err';}saveDetail.disabled=false;}return;}
    var row=e.target.closest('tr[data-email]');if(row&&!e.target.closest('[data-noopen]')){toggleUser(row.getAttribute('data-email'),row).catch(fail);return;}
    if(e.target.id==='admin-user-filter'){await loadUsers(document.getElementById('admin-user-search').value,document.getElementById('admin-user-tier').value,document.getElementById('admin-user-status').value);renderPeople();return;}
    var tool=e.target.closest('[data-tool-filter]');if(tool){try{await loadTools(tool.getAttribute('data-tool-filter'));}catch(err){fail(err);return;}renderTools();return;}
    var sortBtn=e.target.closest('[data-tool-sort]');if(sortBtn){toolSort=sortBtn.getAttribute('data-tool-sort');renderTools();return;}
    var toolRowEl=e.target.closest('tr[data-tool-row]');if(toolRowEl){toggleTool(toolRowEl.getAttribute('data-tool-row'),toolRowEl);return;}
    var editItem=e.target.closest('[data-content-edit]');if(editItem){editContent(editItem.getAttribute('data-content-edit'));return;}
    if(e.target.closest('[data-content-reset]')){resetContentForm();return;}
    var delContent=e.target.closest('[data-content-delete]');if(delContent&&confirm('Opravdu smazat tento obsah?')){if(!IS_LOCAL)await rpc('admin_delete_content',{p_id:delContent.getAttribute('data-content-delete')});cache.content=cache.content.filter(function(x){return x.id!==delContent.getAttribute('data-content-delete');});renderContent();return;}
    var toggleCoupon=e.target.closest('[data-coupon-toggle]');if(toggleCoupon){var coupon=cache.coupons.find(function(x){return x.code===toggleCoupon.getAttribute('data-coupon-toggle');});if(coupon){if(!IS_LOCAL)await rpc('admin_upsert_coupon_v2',{p_code:coupon.code,p_percent:coupon.percent_off,p_products:coupon.products||[],p_active:!coupon.active,p_max_uses:coupon.max_uses,p_description:coupon.description,p_valid_until:coupon.valid_until});coupon.active=!coupon.active;renderCoupons();}return;}
    var delCoupon=e.target.closest('[data-coupon-delete]');if(delCoupon&&confirm('Opravdu smazat kupón '+delCoupon.getAttribute('data-coupon-delete')+'?')){if(!IS_LOCAL)await rpc('admin_delete_coupon_v2',{p_code:delCoupon.getAttribute('data-coupon-delete')});cache.coupons=cache.coupons.filter(function(x){return x.code!==delCoupon.getAttribute('data-coupon-delete');});renderCoupons();}
  });

  // Rychlá změna tieru přímo v řádku.
  document.addEventListener('change',async function(e){
    var qt=e.target.closest('[data-quick-tier]');if(!qt)return;
    var email=qt.getAttribute('data-quick-tier'),tier=qt.value;
    var u=cache.users.find(function(x){return x.email===email;});if(u)u.tier=tier;
    // vizuální potvrzení
    qt.classList.add('is-saved');setTimeout(function(){qt.classList.remove('is-saved');},900);
    try{if(!IS_LOCAL)await rpc('admin_set_user_v2',{p_target:email,p_tier:tier});}catch(err){fail(err);}
  });

  document.addEventListener('submit',async function(e){
    if(e.target.id==='admin-add-user'){
      e.preventDefault();
      var af=new FormData(e.target),aEmail=String(af.get('email')||'').trim().toLowerCase(),aTier=af.get('tier')||'free';
      var msg=document.getElementById('admin-add-msg');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(aEmail)){if(msg){msg.textContent='Zadej platný e-mail.';msg.className='admin-addform-msg is-err';}return;}
      try{
        if(IS_LOCAL){
          var ex=cache.users.find(function(x){return x.email===aEmail;});
          if(ex){ex.tier=aTier;ex.account_status='active';}
          else cache.users.unshift({email:aEmail,display_name:'',instagram:'',tier:aTier,account_status:'active',role:'member',created_at:new Date().toISOString(),last_seen_at:null});
        } else {
          await rpc('admin_upsert_user',{p_email:aEmail,p_tier:aTier});
          await loadUsers();
        }
        renderPeople();
        var msg2=document.getElementById('admin-add-msg');if(msg2){msg2.textContent='Hotovo: '+aEmail+' → '+aTier;msg2.className='admin-addform-msg is-ok';}
      }catch(err){var m=document.getElementById('admin-add-msg');if(m){m.textContent='Nepovedlo se: '+((err&&err.message)||'chyba');m.className='admin-addform-msg is-err';}}
      return;
    }
    // Obsah řeší wireContentForm() přímo na formuláři.
    if(e.target.id==='admin-coupon-form'){e.preventDefault();var c=new FormData(e.target),code=String(c.get('code')||'').trim().toUpperCase(),products=c.get('products')?[c.get('products')]:[];if(IS_LOCAL)cache.coupons.unshift({code:code,description:c.get('description'),percent_off:Number(c.get('percent')),products:products,active:true,used_count:0,max_uses:Number(c.get('max_uses'))||null});else{await rpc('admin_upsert_coupon_v2',{p_code:code,p_percent:Number(c.get('percent')),p_products:products,p_active:true,p_max_uses:Number(c.get('max_uses'))||null,p_description:c.get('description')||null,p_valid_until:null});await loadCoupons();}renderCoupons();}
  });

  document.addEventListener('kenji-auth-ready',boot,{once:true});
  setTimeout(boot,IS_LOCAL?0:4500);
})();
