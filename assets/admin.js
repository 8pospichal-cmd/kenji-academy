(function () {
  'use strict';
  var ROOT = document.getElementById('admin-root');
  if (!ROOT) return;
  var DIALOG = document.getElementById('admin-dialog');
  var DIALOG_CONTENT = document.getElementById('admin-dialog-content');
  var A = window.KenjiAuth || {};
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  var sb = null, started = false, view = 'overview';
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
  function head(eyebrow,title,description) { return '<div class="admin-view-head"><div><span class="admin-eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div><button class="admin-refresh" type="button" data-admin-refresh>Obnovit</button></div>'; }
  function chip(value) { return '<span class="admin-chip is-'+esc(value)+'">'+esc(value)+'</span>'; }

  function demoData() {
    var now = new Date(), yesterday = new Date(Date.now()-86400000).toISOString();
    cache.overview = { users_total:148,users_new_7d:17,active_7d:63,free_total:119,academy_total:29,quiz_30d:41,audit_30d:26,calculator_30d:18,
      recent_users:[{email:'klara@example.cz',display_name:'Klára',instagram:'klaravisual',tier:'free',account_status:'active',created_at:now.toISOString(),last_seen_at:now.toISOString()},{email:'david@example.cz',display_name:'David',instagram:'davidvideo',tier:'academy',account_status:'active',created_at:yesterday,last_seen_at:yesterday}],
      recent_events:[{event_name:'audit_completed',email:'klara@example.cz',source:'audit',created_at:now.toISOString()},{event_name:'quiz_completed',email:'david@example.cz',source:'quiz',created_at:yesterday}] };
    cache.users = cache.overview.recent_users.map(function(u,i){return Object.assign({},u,{role:'member',updated_at:u.created_at,quiz_completed:i===1,audit_completed:i===0,calculator_completed:false});});
    cache.tools = [{id:'demo1',tool:'audit',claimed_email:'klara@example.cz',result:{level:'rozjizdi',goal:'prechod',brake:'klienti',current:18000,potential:43000},completed_at:now.toISOString()},{id:'demo2',tool:'quiz',user_email:'david@example.cz',result:{level:'business',score:13,total:15,passed:true},completed_at:yesterday}];
    cache.content = [{id:'demo-content',type:'weekly_challenge',title:'Ukaž svůj největší posun',body:'Sdílej jednu věc, kterou ses tento týden naučil.',status:'published',audience:'all',xp:50,starts_at:now.toISOString()}];
    cache.coupons = [{code:'NIKON20',description:'Partner Nikon',percent_off:20,products:['academy'],active:true,used_count:7,max_uses:50,valid_until:null}];
  }

  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  async function rpc(name,args) { var client = await getSB(); if (!client) throw new Error('Supabase není dostupný.'); var result = await client.rpc(name,args || {}); if (result.error) throw result.error; return result.data; }
  function fail(error) { console.warn('admin',error); ROOT.innerHTML = '<section class="admin-denied"><span class="admin-eyebrow">PŘÍSTUP ZAMÍTNUT</span><h1>Administrace je jen pro správce.</h1><p>Přihlas se ověřeným e-mailem s rolí admin. Samotná znalost administrátorského e-mailu nestačí.</p><a class="admin-button" href="nastaveni.html">Zpět do Nastavení</a></section>'; }

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
      await loadOverview(); render();
    } catch (e) { fail(e); }
  }

  async function loadOverview() { cache.overview = await rpc('admin_overview'); }
  async function loadUsers(search,tier,status) { cache.users = await rpc('admin_list_users_v2',{p_search:search||null,p_tier:tier||null,p_status:status||null,p_limit:200,p_offset:0}) || []; }
  async function loadTools(tool) { cache.tools = await rpc('admin_list_tool_submissions',{p_tool:tool||null,p_limit:200}) || []; }
  async function loadContent() { cache.content = await rpc('admin_list_content',{p_type:null}) || []; }
  async function loadCoupons() { cache.coupons = await rpc('admin_list_coupons_v2') || []; }

  function render() {
    document.querySelectorAll('[data-admin-view]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-admin-view')===view);});
    if (view === 'overview') renderOverview();
    if (view === 'people') renderPeople();
    if (view === 'tools') renderTools();
    if (view === 'content') renderContent();
    if (view === 'coupons') renderCoupons();
  }

  function renderOverview() {
    var d = cache.overview || {};
    var users = d.recent_users || [], events = d.recent_events || [];
    ROOT.innerHTML = head('PRACOVNÍ PŘEHLED','Co se děje právě teď','Čísla, která vedou k další akci. Ne dekorativní analytika.')+
      '<div class="admin-kpis">'+
        kpi('Všichni lidé',d.users_total,'+'+n(d.users_new_7d)+' za 7 dní')+
        kpi('Aktivní za 7 dní',d.active_7d,'ověřená aktivita')+
        kpi('Academy',d.academy_total,'z '+n(d.free_total)+' Free')+
        kpi('Lidé s auditem',d.audit_30d,'za posledních 30 dní')+
        kpi('Lidé v nástrojích',Number(d.quiz_30d||0)+Number(d.calculator_30d||0),n(d.quiz_30d)+' kvíz · '+n(d.calculator_30d)+' sazba')+
      '</div><div class="admin-grid-2"><section class="admin-section"><div class="admin-section-head"><h2>Noví lidé</h2><span>posledních 8</span></div>'+usersTable(users,true)+'</section><section class="admin-section"><div class="admin-section-head"><h2>Poslední aktivita</h2><span>živý signál</span></div><div class="admin-events">'+(events.length?events.map(eventRow).join(''):'<div class="admin-empty">Zatím bez událostí.</div>')+'</div></section></div>';
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
  function usersTable(users,compact) {
    if (!users.length) return '<div class="admin-empty">Nikdo neodpovídá filtru.</div>';
    return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Člověk</th><th>Tier</th><th>Stav</th><th>Přidal se</th><th>Naposledy</th>'+(compact?'':'<th>Nástroje</th><th>Rychlá akce</th>')+'</tr></thead><tbody>'+users.map(function(u){
      var name=u.display_name||(u.instagram?'@'+u.instagram:'Bez jména');
      var tools=[u.quiz_completed?'Kvíz':'',u.audit_completed?'Audit':'',u.calculator_completed?'Sazba':''].filter(Boolean).join(' · ')||'—';
      return '<tr data-email="'+esc(u.email)+'"><td><span class="admin-person"><strong>'+esc(name)+'</strong><small>'+esc(u.email)+'</small>'+userBadges(u)+'</span></td><td>'+chip(u.tier||'free')+'</td><td>'+chip(u.account_status||'active')+'</td><td>'+esc(date(u.created_at,false))+'</td><td>'+esc(rel(u.last_seen_at))+'</td>'+(compact?'':'<td>'+esc(tools)+'</td><td class="admin-quick" data-noopen>'+tierSelect(u.email,u.tier)+blockButton(u.email,u.account_status)+linkButton(u.email)+'</td>')+'</tr>';
    }).join('')+'</tbody></table></div>';
  }

  function renderPeople() {
    ROOT.innerHTML = head('CRM','Lidé','Kdo přišel, kde se nachází a co už v Academy udělal.')+
      '<form class="admin-addform" id="admin-add-user"><span class="admin-addform-label">Přidat člověka</span>'+
        '<input class="admin-input" name="email" type="email" required placeholder="email@clovek.cz">'+
        '<select class="admin-select" name="tier"><option value="free">free</option><option value="knihovna">knihovna (databáze)</option><option value="academy">academy (plný přístup)</option></select>'+
        '<button class="admin-button" type="submit">Přidat / nastavit</button>'+
        '<span class="admin-addform-msg" id="admin-add-msg"></span>'+
      '</form>'+
      '<div class="admin-filters"><input class="admin-input" id="admin-user-search" placeholder="Hledat e-mail, jméno nebo Instagram"><select class="admin-select" id="admin-user-tier"><option value="">Všechny tiery</option><option>free</option><option>knihovna</option><option>academy</option></select><select class="admin-select" id="admin-user-status"><option value="">Všechny stavy</option><option>active</option><option>pending</option><option>paused</option><option>blocked</option></select><button class="admin-button" id="admin-user-filter">Filtrovat</button></div>'+usersTable(cache.users,false);
  }

  function renderTools() {
    var counts={quiz:0,audit:0,hourly_calculator:0}; cache.tools.forEach(function(x){counts[x.tool]=(counts[x.tool]||0)+1;});
    ROOT.innerHTML = head('SIGNÁLY ZÁJMU','Nástroje','Dokončení a výsledky, podle kterých lze tvořit smysluplné segmenty.')+
      '<p class="admin-notice">Výsledky zadané bez ověřené relace jsou označené jako neověřený e-mail. Detailní životní výdaje z kalkulačky se neukládají.</p>'+
      '<div class="admin-tools-summary"><button class="active" data-tool-filter=""><span>Všechny výsledky</span><strong>'+n(cache.tools.length)+'</strong></button><button data-tool-filter="audit"><span>Audit</span><strong>'+n(counts.audit)+'</strong></button><button data-tool-filter="quiz"><span>Kvíz</span><strong>'+n(counts.quiz)+'</strong></button><button data-tool-filter="hourly_calculator"><span>Hodinovka</span><strong>'+n(counts.hourly_calculator)+'</strong></button></div>'+toolsTable(cache.tools);
  }
  function toolsTable(rows){if(!rows.length)return '<div class="admin-empty">Zatím žádná dokončení.</div>';return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Nástroj</th><th>Člověk</th><th>Výsledek</th><th>Dokončeno</th></tr></thead><tbody>'+rows.map(function(x){var r=x.result||{};var summary=x.tool==='quiz'?((r.score||0)+' / '+(r.total||'—')):x.tool==='audit'?([r.level,r.goal,r.brake].filter(Boolean).join(' · ')||'audit dokončen'):(r.hourly?Math.round(r.hourly).toLocaleString('cs-CZ')+' Kč/h':'výpočet dokončen');return '<tr><td>'+chip(typeLabel(x.tool))+'</td><td><span class="admin-person"><strong>'+esc(x.user_email||x.claimed_email||'Anonymní')+'</strong><small>'+(x.user_email?'ověřeno':'neověřený e-mail')+'</small></span></td><td>'+esc(summary)+'</td><td>'+esc(date(x.completed_at,true))+'</td></tr>';}).join('')+'</tbody></table></div>';}

  function renderContent() {
    ROOT.innerHTML = head('PUBLIKOVÁNÍ','Obsah','Výzvy, novinky a webináře na jednom místě.')+
      '<form class="admin-form" id="admin-content-form"><input type="hidden" name="id"><label>Typ<select class="admin-select" name="type"><option value="weekly_challenge">Týdenní výzva</option><option value="news">Novinka</option><option value="webinar">Webinář</option></select></label><label class="span-2">Název<input class="admin-input" name="title" required maxlength="160"></label><label>Stav<select class="admin-select" name="status"><option value="draft">Koncept</option><option value="scheduled">Naplánováno</option><option value="published">Publikováno</option><option value="archived">Archiv</option></select></label><label>Pro koho<select class="admin-select" name="audience"><option value="all">Všichni</option><option value="free">Free</option><option value="academy">Academy</option></select></label><label>KP<input class="admin-input" type="number" min="0" max="10000" name="xp" value="0"></label><label class="span-3">Text<textarea class="admin-textarea" name="body" maxlength="4000"></textarea></label><label>Začátek<input class="admin-input" type="datetime-local" name="starts_at"></label><label>Konec<input class="admin-input" type="datetime-local" name="ends_at"></label><label>Odkaz<input class="admin-input" name="link_url" placeholder="https://…"></label><div class="admin-form-actions"><button class="admin-button secondary" type="button" data-content-reset hidden>Zrušit úpravu</button><button class="admin-button" type="submit">Uložit obsah</button></div></form>'+contentTable(cache.content);
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
    form.elements.id.value=item.id;form.elements.type.value=item.type;form.elements.title.value=item.title||'';form.elements.status.value=item.status;form.elements.audience.value=item.audience;form.elements.xp.value=item.xp||0;form.elements.body.value=item.body||'';form.elements.starts_at.value=localDateTime(item.starts_at);form.elements.ends_at.value=localDateTime(item.ends_at);form.elements.link_url.value=item.link_url||'';
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
    var viewButton=e.target.closest('[data-admin-view]');if(viewButton){view=viewButton.getAttribute('data-admin-view');ROOT.innerHTML='<div class="admin-loading">Načítám…</div>';try{if(view==='overview'&&!cache.overview)await loadOverview();if(view==='people'&&!cache.users.length)await loadUsers();if(view==='tools'&&!cache.tools.length)await loadTools();if(view==='content'&&!cache.content.length)await loadContent();if(view==='coupons'&&!cache.coupons.length)await loadCoupons();render();}catch(err){fail(err);}return;}
    if(e.target.closest('[data-admin-refresh]')){try{if(view==='overview')await loadOverview();if(view==='people')await loadUsers();if(view==='tools')await loadTools();if(view==='content')await loadContent();if(view==='coupons')await loadCoupons();render();}catch(err){fail(err);}return;}
    var qb=e.target.closest('[data-quick-block]');if(qb){var qbEmail=qb.getAttribute('data-quick-block');var qbUser=cache.users.find(function(x){return x.email===qbEmail;});var newStatus=(qbUser&&qbUser.account_status==='blocked')?'active':'blocked';if(qbUser)qbUser.account_status=newStatus;try{if(!IS_LOCAL)await rpc('admin_set_user_v2',{p_target:qbEmail,p_status:newStatus});}catch(err){fail(err);return;}renderPeople();return;}
    var qlink=e.target.closest('[data-quick-link]');if(qlink){var lEmail=qlink.getAttribute('data-quick-link');qlink.disabled=true;try{if(IS_LOCAL){alert('(Lokálně) Přihlašovací odkaz by šel na: '+lEmail);}else{var A=window.KenjiAuth;if(A&&A.requestMagicLink){var r=await A.requestMagicLink(lEmail,{redirect:'index.html'});if(!r||!r.ok)throw new Error('nepovedlo se odeslat');}alert('Přihlašovací odkaz odeslán na '+lEmail);}}catch(err){alert('Odkaz se nepovedlo odeslat: '+((err&&err.message)||'chyba'));}qlink.disabled=false;return;}
    var row=e.target.closest('tr[data-email]');if(row&&!e.target.closest('[data-noopen]')){openUser(row.getAttribute('data-email')).catch(fail);return;}
    if(e.target.id==='admin-user-filter'){await loadUsers(document.getElementById('admin-user-search').value,document.getElementById('admin-user-tier').value,document.getElementById('admin-user-status').value);renderPeople();return;}
    var tool=e.target.closest('[data-tool-filter]');if(tool){await loadTools(tool.getAttribute('data-tool-filter'));renderTools();return;}
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
    if(e.target.id==='admin-content-form'){e.preventDefault();var f=new FormData(e.target),existingId=f.get('id')||null;var row={id:existingId||(IS_LOCAL?'demo-'+Date.now():null),type:f.get('type'),title:f.get('title'),body:f.get('body'),status:f.get('status'),audience:f.get('audience'),starts_at:f.get('starts_at')?new Date(f.get('starts_at')).toISOString():null,ends_at:f.get('ends_at')?new Date(f.get('ends_at')).toISOString():null,xp:Number(f.get('xp')||0),link_url:f.get('link_url')||null,metadata:{}};if(IS_LOCAL){var oldIndex=cache.content.findIndex(function(x){return x.id===row.id;});if(oldIndex>=0)cache.content.splice(oldIndex,1,row);else cache.content.unshift(row);}else await rpc('admin_upsert_content',{p_id:row.id,p_type:row.type,p_title:row.title,p_body:row.body,p_status:row.status,p_audience:row.audience,p_starts_at:row.starts_at,p_ends_at:row.ends_at,p_xp:row.xp,p_link_url:row.link_url,p_metadata:{}});if(!IS_LOCAL)await loadContent();renderContent();}
    if(e.target.id==='admin-coupon-form'){e.preventDefault();var c=new FormData(e.target),code=String(c.get('code')||'').trim().toUpperCase(),products=c.get('products')?[c.get('products')]:[];if(IS_LOCAL)cache.coupons.unshift({code:code,description:c.get('description'),percent_off:Number(c.get('percent')),products:products,active:true,used_count:0,max_uses:Number(c.get('max_uses'))||null});else{await rpc('admin_upsert_coupon_v2',{p_code:code,p_percent:Number(c.get('percent')),p_products:products,p_active:true,p_max_uses:Number(c.get('max_uses'))||null,p_description:c.get('description')||null,p_valid_until:null});await loadCoupons();}renderCoupons();}
  });

  document.addEventListener('kenji-auth-ready',boot,{once:true});
  setTimeout(boot,IS_LOCAL?0:4500);
})();
