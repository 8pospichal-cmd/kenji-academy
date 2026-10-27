(function () {
  'use strict';
  var ROOT = document.getElementById('admin-root');
  if (!ROOT) return;
  var A = window.KenjiAuth || {};
  var IS_LOCAL = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  var sb = null, started = false, view = 'overview';
  var peopleSeg = 'all', peopleQuery = '', peopleSort = 'new', selectedPerson = null;
  var selectedEmailSequenceId = null, selectedEmailStepId = null;
  var cache = { overview: null, people: null, orders: null, content: [], coupons: [], emailing: null, ecomail: null, emailSequences: [], audience: null, detail: {} };

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
    if (days < 30) return 'před ' + days + ' dny';
    var months = Math.floor(days / 30);
    return 'před ' + months + (months === 1 ? ' měsícem' : ' měsíci');
  }
  function n(value) { return Number(value || 0).toLocaleString('cs-CZ'); }
  function kc(value) { return value ? n(Math.round(value)) + ' Kč' : '—'; }
  function label(value) { return ({ page_view:'Návštěva stránky',session_started:'Nová relace',registered:'Registrace',onboarding_completed:'Dokončený onboarding',onboarding_step_complete:'Krok onboardingu',onboarding_plan_created:'Vytvořený plán v onboardingu',quiz_started:'Spuštěný kvíz',quiz_completed:'Dokončený kvíz',audit_completed:'Dokončený audit',hourly_calculator_completed:'Spočítaná hodinovka',ai_question_sent:'Dotaz na Kenji AI',community_post_created:'Příspěvek v komunitě',academy_cta:'Klik na koupit (prodejní stránka)',academy_blocker:'Prohlížel brzdy na prodejní stránce',checkout_started:'Zahájená objednávka',purchase_completed:'Dokončený nákup' })[value] || value || 'Událost'; }
  function typeLabel(value) { return ({ weekly_challenge:'Týdenní výzva',news:'Novinka',webinar:'Webinář',quiz:'Kvíz',audit:'Audit',hourly_calculator:'Hodinovka' })[value] || value; }
  var REFRESH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  function head(eyebrow,title,description,extra) {
    return '<div class="admin-view-head"><div><span class="admin-eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div><div class="admin-row-actions">'+(extra||'')+
      '<button class="admin-refresh" type="button" data-admin-refresh title="Načíst čerstvá data" aria-label="Načíst čerstvá data">'+REFRESH_ICON+'<span data-refresh-label>Načíst data</span></button></div></div>';
  }
  function chip(value, text) { return '<span class="admin-chip is-'+esc(value)+'">'+esc(text || value)+'</span>'; }
  function kpi(title,value,note){return '<div class="admin-kpi"><span>'+esc(title)+'</span><strong>'+esc(typeof value==='string'?value:n(value))+'</strong><small>'+esc(note)+'</small></div>';}
  function mailStat(title,value){return '<div><span>'+esc(title)+'</span><strong>'+n(value)+'</strong></div>';}

  // ── Ukázková data (jen lokálně) ─────────────────────────────────────────
  function demoData() {
    var now = new Date().toISOString(), yesterday = new Date(Date.now()-86400000).toISOString(), week = new Date(Date.now()-6*86400000).toISOString();
    cache.overview = { users_total:148,users_new_7d:17,active_7d:63,free_total:113,knihovna_total:6,academy_total:29,presets_total:11,consented_total:92,sync_errors:3,quiz_30d:41,audit_30d:26,calculator_30d:18,
      leads_new:1,leads_oldest_new:now,hot_no_academy:2,challenge_current_ends_at:new Date(Date.now()+4*86400000).toISOString(),challenge_upcoming:0,revenue_30d:51491,orders_30d:4,
      funnel_30d:{tools:85,registered:61,onboarding:44,sales_page:23,checkout:9,purchases:4},
      recent_users:[{email:'klara@example.cz',display_name:'Klára',tier:'free',created_at:now},{email:'david@example.cz',display_name:'David',tier:'academy',created_at:yesterday}],
      recent_events:[{event_name:'audit_completed',email:'klara@example.cz',created_at:now},{event_name:'academy_cta',email:'petra@example.cz',created_at:now},{event_name:'hourly_calculator_completed',email:'tomas@example.cz',created_at:yesterday},{event_name:'quiz_completed',email:'david@example.cz',created_at:yesterday},{event_name:'ai_question_sent',email:'david@example.cz',created_at:yesterday}] };
    cache.people = [
      {email:'petra@example.cz',has_account:false,name:'Petra',instagram:'petra.foto',phone:'+420 777 000 111',tier:null,created_at:now,last_seen_at:now,consent:true,source:'cenik',lead_id:2,lead_status:'novy',lead_note:null,money:72000,money_tool:'audit',potential:120000,tools:['audit'],xp:0,orders:0},
      {email:'klara@example.cz',has_account:true,name:'Klára',instagram:'klaravisual',tier:'free',account_status:'active',role:'member',created_at:now,last_seen_at:now,consent:true,source:'instagram',money:18000,money_tool:'audit',potential:43000,tools:['audit'],xp:120,orders:0},
      {email:'tomas@example.cz',has_account:false,name:'Tomáš',instagram:'tomas_video',phone:'603 111 222',tier:null,created_at:yesterday,last_seen_at:yesterday,consent:false,source:'hero',lead_id:1,lead_status:'kontaktovan',lead_note:'Volat po 17:00',money:130500,money_tool:'hourly_calculator',tools:['hourly_calculator'],xp:0,orders:0},
      {email:'david@example.cz',has_account:true,name:'David',instagram:'davidvideo',tier:'academy',account_status:'active',role:'member',has_presets:true,created_at:week,last_seen_at:yesterday,consent:true,source:'email',money:0,tools:['quiz'],xp:860,orders:1},
      {email:'jana@example.cz',has_account:true,name:'Jana',tier:'knihovna',account_status:'active',role:'member',created_at:week,last_seen_at:week,consent:false,ecomail_sync_error:null,source:null,money:0,tools:[],xp:40,orders:1}
    ];
    cache.detail = {
      'petra@example.cz':{has_account:false,user:{email:'petra@example.cz'},orders:[],ai_questions:0,posts:0,
        submissions:[{tool:'audit',claimed_email:'petra@example.cz',result:{industries:['svatby','rodina'],level:'rozjizdi',average_price:8000,jobs_per_month:2,current:72000,potential:120000,annual_gap:576000,utm_source:'instagram'},completed_at:yesterday}],
        plan_requests:[{id:2,created_at:now,name:'Petra',email:'petra@example.cz',phone:'+420 777 000 111',instagram:'petra.foto',obory:['svatby','rodina'],level:'1-3',jobs:'1-2',price:8000,blockers:['cena','klienti'],goal:40000,hours:5,marketing_consent:true,source:'cenik',plan:{phases:[{title:'Odstraníme, co tě brzdí',items:['Cenotvorba','Prodej, follow-up a upsell']},{title:'Postavíme tvůj obor',items:['Svatba od A do Z']},{title:'Rozjedeme systém',items:['90denní výzva']}],weeks:4},status:'novy',note:null}],
        events:[{event_name:'academy_cta',created_at:now},{event_name:'audit_completed',created_at:yesterday}]},
      'klara@example.cz':{has_account:true,user:{email:'klara@example.cz',display_name:'Klára',instagram:'klaravisual',tier:'free',role:'member',account_status:'active',created_at:now,last_seen_at:now,xp:120,read:['portfolio','cenotvorba','cold-outreach','instagram'],
          profile:{industries:['svatby','portret'],income:'10-30',experience:'clients',blocker:'klienti'},marketing_consent_at:now,marketing_consent_source:'registrace',ecomail_synced_at:now,acquisition_source:'instagram'},
        orders:[],plan_requests:[],ai_questions:3,posts:1,
        submissions:[{tool:'audit',user_email:'klara@example.cz',result:{industries:['svatby','portret'],level:'rozjizdi',average_price:9000,jobs_per_month:2,hours_per_week:20,goal:'prechod',brake:'klienti',current:18000,potential:43000,annual_gap:300000},completed_at:now}],
        events:[{event_name:'audit_completed',created_at:now},{event_name:'onboarding_completed',created_at:now},{event_name:'registered',created_at:now}]},
      'david@example.cz':{has_account:true,user:{email:'david@example.cz',display_name:'David',instagram:'davidvideo',tier:'academy',role:'member',account_status:'active',has_presets:true,created_at:week,last_seen_at:yesterday,xp:860,read:new Array(21).fill('x'),
          profile:{industries:['video'],income:'30-60',experience:'fulltime',blocker:'cas'},marketing_consent_at:week,marketing_consent_source:'registrace',ecomail_synced_at:week,acquisition_source:'email',admin_note:'Partner Nikon, chce spolupráci.'},
        orders:[{created_at:week,product:'academy',tier:'academy',amount_total:19998,currency:'czk',coupon:'NIKON20',source:'email',status:'paid'}],plan_requests:[],ai_questions:27,posts:6,
        submissions:[{tool:'quiz',user_email:'david@example.cz',result:{level:'business',level_name:'Byznys',score:13,total:15,passed:true},completed_at:yesterday}],
        events:[{event_name:'quiz_completed',created_at:yesterday},{event_name:'ai_question_sent',created_at:yesterday},{event_name:'purchase_completed',created_at:week}]}
    };
    cache.orders = [{id:4,created_at:week,email:'david@example.cz',product:'academy',tier:'academy',amount_total:19998,currency:'czk',coupon:'NIKON20',source:'email',status:'paid'},{id:3,created_at:week,email:'jana@example.cz',product:'databaze',tier:'knihovna',amount_total:1497,currency:'czk',coupon:null,source:'koupit',status:'paid'}];
    cache.content = [{id:'demo-content',type:'weekly_challenge',title:'Ukaž svůj největší posun',body:'Sdílej jednu věc, kterou ses tento týden naučil.',status:'published',audience:'all',xp:50,starts_at:now,ends_at:new Date(Date.now()+4*86400000).toISOString()},{id:'demo-web',type:'webinar',title:'Jak si říct o víc',status:'scheduled',audience:'academy',xp:0,starts_at:new Date(Date.now()+9*86400000).toISOString()}];
    cache.coupons = [{code:'NIKON20',description:'Partner Nikon',percent_off:20,products:['academy'],active:true,used_count:7,max_uses:50,valid_until:null}];
    cache.emailing = {users_total:148,consented_total:92,eligible_leads:71,academy_consented:21,synced_total:89,unsubscribed_total:6,sync_errors:3,events_30d:{delivered:824,opened:441,clicked:96,bounced:4,unsubscribed:5,complained:0},recent_events:[]};
    cache.ecomail = {configured:true,list:{list:{name:'Fotografové'},subscribers:{subscribed:949,unsubscribed:307,hard_bounced:55}},pipelines:[{id:1,name:'7 dní pro lepší byznys'},{id:2,name:'Týdenní výzva'}],segments:[{id:'seg1',name:'Sekvence – vlna 1'},{id:'seg2',name:'Sekvence – vlna 2'}],webhook:{configured:true,matches:true}};
    cache.campaignStats={'72':{delivery:699,open:214,open_rate:30.6,click:41,unsub:1}};
    cache.emailSequences = [{id:'22222222-2222-4222-8222-222222222222',name:'Otevřel jsem novou platformu. Vstup máš zdarma.',description:'',audience:'consented_non_academy',status:'draft',from_name:'Kenji',from_email:'kenji@mail.kenji.cz',reply_to:'ahoj@kenji.cz',ecomail_pipeline_id:null,created_at:now,steps:[{id:'mail-1',position:1,delay_days:0,status:'draft',plain:true,subject:'Otevřel jsem novou platformu. Vstup máš zdarma.',preheader:'Stačí se přihlásit e-mailem.',headline:'',body:'Ahoj,\n\nrád bych tě pozval do vylepšené platformy…',cta_label:'Udělat si audit — 2 minuty',cta_url:'https://kenjiacademy.cz/audit.html',ecomail_campaign_id:72,ecomail_segment:'Sekvence – vlna 1',ecomail_campaign_sent_at:now}]}];
  }
  // Ukázkové srovnání publika (jen lokálně) — čísla jsou smyšlená, ať jde vidět rozložení.
  function demoAudience() {
    return {generated_at:new Date().toISOString(),ecomail:{subscribed:250,unsubscribed:307,bounced:55,complained:1,not_confirmed:4},academy:{total:195,free:144,knihovna:6,academy:45,consented:61},overlap:{active_in_both:70,only_ecomail:180,only_academy:125,only_academy_consented:38},safe:{total:214,engaged:131,registered:41,tier_knihovna:3,not_registered:173},excluded:{academy:29,admin:1,test:2,typo:3,invalid:0,duplicate:0,unsubscribed_academy:1,bounce:0,blocked:0,total:36},
      rows:[{email:'david@example.cz',verdict:'academy',reason:'Člen Kenji Academy',tier:'academy'},{email:'test.ucet@seznam.cz',verdict:'test',reason:'Vypadá jako testovací adresa',tier:''},{email:'jana.n@gmial.com',verdict:'typo',reason:'Pravděpodobný překlep v doméně',suggestion:'jana.n@gmail.com',tier:''}]};
  }

  // ── Supabase ────────────────────────────────────────────────────────────
  async function getSB() { if (sb) return sb; sb = A.getSupabase ? await A.getSupabase() : null; return sb; }
  function errText(error) { return String((error && (error.message || error.hint || error.details)) || error || 'neznámá chyba'); }
  function isStaleSession(error) { return /jwt|expired|token|Jen pro admina/i.test(errText(error)); }
  function isMissingFn(error) { return /could not find the function|PGRST202|does not exist/i.test(errText(error) + ' ' + ((error && error.code) || '')); }

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
      // Odkaz z upozornění na nového zájemce: admin.html?osoba=e-mail otevře rovnou jeho kartu.
      var target = ''; try { target = (new URLSearchParams(location.search).get('osoba') || '').trim().toLowerCase(); } catch (e) {}
      if (IS_LOCAL) { document.getElementById('admin-env').hidden = false; demoData(); if (target) { selectedPerson = target; view = 'people'; } render(); return; }
      var adminEmail = await rpc('current_admin_email');
      if (!adminEmail) throw new Error('not admin');
      if (target) { selectedPerson = target; await go('people'); return; }
      await loadOverview(); render();
    } catch (e) { fail(e); }
  }

  async function loadOverview() { cache.overview = await rpc('admin_overview'); }
  // Jeden seznam lidí. Dokud není nasazená migrace admin_list_people, složí se
  // ze starších RPC (účty + zájemci + nástroje), ať admin nikdy nezůstane prázdný.
  async function loadPeople() {
    try { cache.people = await rpc('admin_list_people',{p_limit:3000}) || []; return; }
    catch (e) { if (!isMissingFn(e)) throw e; }
    var users = await rpc('admin_list_users_v2',{p_search:null,p_tier:null,p_status:null,p_limit:300,p_offset:0}) || [];
    var leads = []; try { leads = await rpc('admin_list_plan_requests',{p_status:null,p_limit:1000}) || []; } catch (e) {}
    var tools = []; try { tools = await rpc('admin_list_tool_submissions',{p_tool:null,p_limit:300}) || []; } catch (e) {}
    var map = {};
    function get(email){ email=String(email||'').toLowerCase(); if(!email)return null; return map[email]||(map[email]={email:email,has_account:false,tools:[],money:0,xp:0,orders:0}); }
    users.forEach(function(u){var p=get(u.email);Object.assign(p,{has_account:true,name:u.display_name,instagram:u.instagram,tier:u.tier,role:u.role,account_status:u.account_status,created_at:u.created_at,last_seen_at:u.last_seen_at});});
    leads.forEach(function(l){var p=get(l.email);if(p.lead_id)return;p.lead_id=l.id;p.lead_status=l.status;p.lead_note=l.note;p.name=p.name||l.name;p.instagram=p.instagram||l.instagram;p.phone=l.phone;p.source=p.source||l.source;p.created_at=p.created_at||l.created_at;if(!p.has_account)p.consent=!!l.marketing_consent;});
    tools.forEach(function(t){var p=get(t.user_email||t.claimed_email);if(!p)return;var m=toolMoney(t);if(p.tools.indexOf(t.tool)<0)p.tools.push(t.tool);if(m>p.money){p.money=m;p.money_tool=t.tool;p.potential=(t.result||{}).potential;}p.created_at=p.created_at||t.completed_at;});
    cache.people = Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));});
  }
  async function loadOrders() { try { cache.orders = await rpc('admin_list_orders',{p_limit:1000}) || []; } catch (e) { if (!isMissingFn(e)) throw e; cache.orders = null; } }
  async function loadContent() { cache.content = await rpc('admin_list_content',{p_type:null}) || []; }
  async function loadCoupons() { cache.coupons = await rpc('admin_list_coupons_v2') || []; }
  async function adminEmailApi(method,body) {
    var session=A.liveSession?await A.liveSession():null;
    if(!session||!session.access_token)throw new Error('Přihlášení vypršelo.');
    var res=await fetch('/.netlify/functions/ecomail-admin',{method:method||'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    var data=await res.json().catch(function(){return {};});
    if(!res.ok)throw new Error(data.error||'Ecomail není dostupný.');
    return data;
  }
  async function loadEmailing() {
    cache.emailing=await rpc('admin_email_overview')||{};
    cache.emailSequences=await rpc('admin_list_email_sequences')||[];
    try{cache.ecomail=await adminEmailApi('GET');}catch(e){cache.ecomail={configured:false,error:errText(e)};}
    // Čísla odeslaných kampaní (doručeno / otevřeno / prokliky) přímo z Ecomailu.
    var ids=(cache.emailSequences||[]).map(function(seq){var st=(seq.steps||[])[0]||{};return st.ecomail_campaign_sent_at&&st.ecomail_campaign_id?String(st.ecomail_campaign_id):null;}).filter(Boolean);
    if(ids.length&&!IS_LOCAL){try{var r=await adminEmailApi('POST',{action:'campaign-stats',ids:ids});cache.campaignStats=r.stats||{};}catch(e){cache.campaignStats={};}}
  }
  async function ensureData(v, force) {
    if (IS_LOCAL) return;
    if (v==='overview' && (force||!cache.overview)) await loadOverview();
    if (v==='people') { if(force||!cache.people) await loadPeople(); if(force) cache.detail={}; }
    if (v==='sales') { if(force||!cache.orders) await loadOrders(); if(force||!cache.coupons.length) await loadCoupons(); if(force||!cache.overview) await loadOverview(); }
    if (v==='content' && (force||!cache.content.length)) await loadContent();
    if (v==='emailing' && (force||!cache.emailing)) await loadEmailing();
  }

  function render() {
    document.querySelectorAll('[data-admin-view]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-admin-view')===view);});
    if (view === 'overview') renderOverview();
    if (view === 'people') renderPeople();
    if (view === 'sales') renderSales();
    if (view === 'content') renderContent();
    if (view === 'emailing') renderEmailing();
  }
  async function go(v, seg) {
    view = v; if (seg) peopleSeg = seg;
    ROOT.innerHTML = '<div class="admin-loading">Načítám…</div>';
    try { await ensureData(v); render(); window.scrollTo(0,0); } catch (err) { fail(err); }
  }

  // ── Přehled ─────────────────────────────────────────────────────────────
  function todoRow(dot, title, note, cta, target) {
    return '<div class="admin-todo-row"><i class="is-'+dot+'" aria-hidden="true"></i><div><strong>'+esc(title)+'</strong><small>'+esc(note)+'</small></div><button class="admin-button secondary" type="button" data-goto="'+esc(target)+'">'+esc(cta)+'</button></div>';
  }
  function renderOverview() {
    var d = cache.overview || {}, f = d.funnel_30d || {};
    var todo = [];
    if (d.leads_new) todo.push(todoRow('hot', n(d.leads_new)+(d.leads_new===1?' nový zájemce':' noví zájemci')+' o plán na míru', 'Stránka slibuje ozvání do 2 pracovních dnů · nejstarší vyplnil '+rel(d.leads_oldest_new), 'Otevřít zájemce', 'people:leads'));
    if (d.hot_no_academy) todo.push(todoRow('hot', n(d.hot_no_academy)+' lidí uvedlo příjem nad 50 000 Kč a nemá Academy', 'Z auditu a kalkulačky hodinovky · seřazeno podle příjmu', 'Zobrazit', 'people:hot'));
    if (d.sync_errors) todo.push(todoRow('warn', n(d.sync_errors)+' kontaktů se nesynchronizovalo do Ecomailu', 'Mají souhlas, ale v seznamu chybí', 'Opravit', 'emailing'));
    if (!d.challenge_upcoming) todo.push(todoRow('idle', 'Další týdenní výzva není naplánovaná', d.challenge_current_ends_at ? 'Aktuální končí '+date(d.challenge_current_ends_at) : 'Teď neběží žádná výzva', 'Naplánovat', 'content'));
    var steps = [['Vyplnil nástroj',f.tools],['Registrace',f.registered],['Dokončil onboarding',f.onboarding],['Klik na koupit',f.sales_page],['Zahájená objednávka',f.checkout],['Nákup',f.purchases]];
    var max = Math.max.apply(null, steps.map(function(s){return Number(s[1]||0);}).concat([1]));
    var funnel = steps.map(function(s,i){var v=Number(s[1]||0),prev=i?Number(steps[i-1][1]||0):0;return '<div class="admin-funnel-row"><span>'+esc(s[0])+'</span><div class="admin-funnel-bar"><i style="width:'+Math.max(1,Math.round(v/max*100))+'%"'+(i>=4?' class="is-hot"':'')+'></i></div><strong>'+n(v)+'</strong><small>'+(i&&prev?Math.round(v/prev*100)+' %':'')+'</small></div>';}).join('');
    var paid = Number(d.academy_total||0)+Number(d.knihovna_total||0);
    var users = (d.recent_users||[]).map(function(u){return '<button class="admin-list-row" type="button" data-open-person="'+esc(u.email)+'"><div><strong>'+esc(u.display_name||u.email)+'</strong><small>'+esc(u.email)+'</small></div>'+chip(u.tier||'free')+'<time>'+esc(rel(u.created_at))+'</time></button>';}).join('') || '<div class="admin-empty">Zatím nikdo.</div>';
    var events = (d.recent_events||[]).map(function(e){return '<div class="admin-event"><i></i><div><strong>'+esc(label(e.event_name))+'</strong><small>'+esc(e.email||e.source||'anonymní návštěvník')+'</small></div><time>'+esc(rel(e.created_at))+'</time></div>';}).join('') || '<div class="admin-empty">Zatím bez událostí.</div>';
    ROOT.innerHTML = head(new Intl.DateTimeFormat('cs-CZ',{weekday:'long',day:'numeric',month:'numeric'}).format(new Date()).toUpperCase(),'Přehled','Co dnes udělat a jak se daří trychtýři.')+
      '<section class="admin-card admin-todo"><div class="admin-card-head"><h2>K vyřízení</h2>'+(todo.length?'<span class="admin-chip is-hot">'+todo.length+(todo.length===1?' úkol':todo.length<5?' úkoly':' úkolů')+'</span>':'')+'</div>'+(todo.length?todo.join(''):'<div class="admin-empty">Nic nečeká. Dobrá práce.</div>')+'</section>'+
      '<div class="admin-kpis admin-kpis-4">'+kpi('Lidé celkem',d.users_total,'+'+n(d.users_new_7d)+' za 7 dní')+kpi('Aktivní za 7 dní',d.active_7d,d.users_total?Math.round(d.active_7d/d.users_total*100)+' % účtů':'')+kpi('Platící',paid,n(d.academy_total)+' Academy · '+n(d.knihovna_total)+' Databáze')+kpi('Tržby 30 dní',d.revenue_30d!=null?kc(d.revenue_30d):'—',n(d.orders_30d)+' objednávek')+'</div>'+
      '<section class="admin-card"><div class="admin-card-head"><h2>Trychtýř · posledních 30 dní</h2><span>lidé, ne kliky</span></div><div class="admin-funnel">'+funnel+'</div></section>'+
      '<div class="admin-grid-2"><section class="admin-card"><div class="admin-card-head"><h2>Noví lidé</h2><button class="admin-link" type="button" data-goto="people">Všichni lidé</button></div>'+users+'</section>'+
      '<section class="admin-card"><div class="admin-card-head"><h2>Živá aktivita</h2></div><div class="admin-events">'+events+'</div></section></div>';
  }

  // ── Lidé ────────────────────────────────────────────────────────────────
  var LEAD_STATUS={novy:'Nový',kontaktovan:'Kontaktovaný',koupil:'Koupil',nezajem:'Nemá zájem'};
  var LEAD_OBOR={svatby:'Svatby',rodina:'Rodinné',lifestyle:'Lifestyle',portret:'Portrét',plesy:'Plesy a eventy',reality:'Nemovitosti',produkty:'Produktovky',video:'Video',sport:'Sport',nevim:'Ještě neví'};
  var LEAD_BLOCKER={cena:'Neví, kolik si říct',klienti:'Málo klientů',nabidka:'Neví, co nabízet',portfolio:'Slabé portfolio',chaos:'Chaos v zakázkách',technika:'Technika a úpravy'};
  var LEAD_LEVEL={zacinam:'Začíná','1-3':'1–3 roky','3-5':'3–5 let','5+':'5+ let'};
  var ONB_INDUSTRY={svatby:'Svatby',portret:'Portrét / lidé',produkt:'Produktové / e-shop',video:'Video / film',obsah:'Obsah / sítě',event:'Event / reportáž',nemovitosti:'Nemovitosti / interiéry',jine:'Něco jiného'};
  var ONB_INCOME={'0-10':'Do 10k / měsíc','10-30':'10–30k / měsíc','30-60':'30–60k / měsíc','60-100':'60–100k / měsíc','100+':'100k+ / měsíc'};
  var ONB_EXPERIENCE={start:'Začíná',practice:'Tvoří pro sebe',clients:'Má zakázky',fulltime:'Živí se tím',jine:'Něco jiného'};
  var ONB_BLOCKER={klienti:'Málo poptávek / klientů',cena:'Nízké ceny',portfolio:'Slabé portfolio / positioning',cas:'Chaos / nemá systém',zacatek:'Úplný začátek',jine:'Něco jiného'};
  var TIER_LABEL={free:'Free',knihovna:'Databáze',academy:'Academy'};
  var PRODUCT_LABEL={academy:'Academy',databaze:'Databáze',knihovna:'Databáze',presets:'Presety',presety:'Presety'};

  function toolMoney(row) { var r = row.result || {}; return Math.max(Number(r.current||0), Number(r.monthly_revenue||0)); }
  function stageOf(p) { if (!p.has_account) return {cls:'tool',text:'Bez účtu'}; return {cls:p.tier||'free',text:TIER_LABEL[p.tier]||'Free'}; }
  function isOpenLead(p) { return p.lead_id && (p.lead_status==='novy'||p.lead_status==='kontaktovan'); }
  function personName(p) { return p.name || (p.instagram?'@'+p.instagram:'') || p.email; }
  var SEGMENTS = [['all','Všichni'],['leads','Zájemci'],['hot','Nad 50 000 Kč'],['free','Free'],['knihovna','Databáze'],['academy','Academy'],['noacc','Jen nástroj, bez účtu']];
  function inSegment(p, seg) {
    if (seg==='leads') return isOpenLead(p);
    if (seg==='hot') return Number(p.money||0) >= 50000 && p.tier !== 'academy';
    if (seg==='free') return p.has_account && (p.tier||'free')==='free';
    if (seg==='knihovna'||seg==='academy') return p.tier===seg;
    if (seg==='noacc') return !p.has_account;
    return true;
  }
  function filteredPeople() {
    var q = peopleQuery.trim().toLowerCase();
    var rows = (cache.people||[]).filter(function(p){ return inSegment(p, peopleSeg) && (!q || [p.email,p.name,p.instagram,p.phone].join(' ').toLowerCase().indexOf(q) >= 0); });
    if (peopleSort==='money' || peopleSeg==='hot') rows.sort(function(a,b){return Number(b.money||0)-Number(a.money||0);});
    else if (peopleSort==='seen') rows.sort(function(a,b){return String(b.last_seen_at||'').localeCompare(String(a.last_seen_at||''));});
    return rows;
  }
  function peopleRows() {
    var rows = filteredPeople();
    if (!rows.length) return '<tr><td colspan="6"><div class="admin-empty">Nikdo neodpovídá filtru.</div></td></tr>';
    return rows.slice(0,500).map(function(p){
      var st = stageOf(p), signal = p.money ? kc(p.money) : (p.tools&&p.tools.length ? p.tools.map(typeLabel).join(', ') : '—');
      var signalNote = p.money ? typeLabel(p.money_tool)+(p.potential?' · potenciál '+kc(p.potential):'') : '';
      return '<tr class="admin-person-row'+(p.email===selectedPerson?' is-open':'')+'" data-person="'+esc(p.email)+'">'+
        '<td><span class="admin-person"><strong>'+esc(personName(p))+'</strong><small>'+esc(p.email)+'</small></span></td>'+
        '<td>'+chip(st.cls,st.text)+(isOpenLead(p)?' '+chip('hot',LEAD_STATUS[p.lead_status]):'')+(p.has_presets?' '+chip('presets','Presety'):'')+'</td>'+
        '<td'+(Number(p.money||0)>=50000?' class="is-hot"':'')+'>'+esc(signal)+(signalNote?'<small>'+esc(signalNote)+'</small>':'')+'</td>'+
        '<td>'+(p.consent?'Souhlas':'<span class="admin-muted">Bez souhlasu</span>')+(p.ecomail_sync_error?'<small class="is-err">chyba synchronizace</small>':'')+'</td>'+
        '<td>'+esc(p.source||'—')+'</td>'+
        '<td>'+esc(rel(p.last_seen_at||p.created_at))+'</td></tr>';
    }).join('');
  }
  function renderPeople() {
    var all = cache.people || [];
    var segs = SEGMENTS.map(function(s){var c=all.filter(function(p){return inSegment(p,s[0]);}).length;return '<button type="button" class="admin-seg'+(peopleSeg===s[0]?' is-on':'')+'" data-seg="'+s[0]+'">'+esc(s[1])+' <span>'+n(c)+'</span></button>';}).join('');
    ROOT.innerHTML = head('CRM · ÚČTY, ZÁJEMCI, NÁSTROJE','Lidé','Jeden e-mail = jeden člověk. Klikni na řádek a vpravo uvidíš všechno, co o něm víme.','<button class="admin-button secondary" type="button" data-people-csv>Export CSV</button>')+
      '<div class="admin-segs" role="group" aria-label="Segment">'+segs+'</div>'+
      '<div class="admin-filters admin-filters-people"><input class="admin-input" id="admin-people-search" placeholder="Hledat e-mail, jméno, Instagram, telefon" value="'+esc(peopleQuery)+'"><select class="admin-select" id="admin-people-sort" aria-label="Řazení"><option value="new"'+(peopleSort==='new'?' selected':'')+'>Řadit: nejnovější</option><option value="money"'+(peopleSort==='money'?' selected':'')+'>Řadit: příjem z nástrojů</option><option value="seen"'+(peopleSort==='seen'?' selected':'')+'>Řadit: poslední aktivita</option></select></div>'+
      '<form class="admin-addform" id="admin-add-user"><span class="admin-addform-label">Přidat člověka</span><input class="admin-input" name="email" type="email" required placeholder="email@clovek.cz"><select class="admin-select" name="tier"><option value="free">Free</option><option value="knihovna">Databáze</option><option value="academy">Academy</option></select><button class="admin-button" type="submit">Přidat / nastavit</button><span class="admin-addform-msg" id="admin-add-msg"></span></form>'+
      '<div class="admin-split"><div class="admin-table-wrap"><table class="admin-table admin-people-table"><thead><tr><th>Člověk</th><th>Fáze</th><th>Signál</th><th>E-maily</th><th>Zdroj</th><th>Naposledy</th></tr></thead><tbody id="admin-people-body">'+peopleRows()+'</tbody></table></div>'+
      '<aside class="admin-card admin-person-card" id="admin-person-card" aria-label="Karta člověka">'+(selectedPerson?'<div class="admin-loading">Načítám…</div>':'<div class="admin-empty">Vyber člověka v seznamu.</div>')+'</aside></div>';
    if (selectedPerson) openPerson(selectedPerson);
  }
  function refreshPeopleTable() { var body = document.getElementById('admin-people-body'); if (body) body.innerHTML = peopleRows(); }

  async function getDetail(email) {
    if (cache.detail[email]) return cache.detail[email];
    var d;
    if (IS_LOCAL) {
      var p = (cache.people||[]).find(function(x){return x.email===email;}) || {email:email};
      d = {has_account:!!p.has_account,user:{email:email,display_name:p.name,instagram:p.instagram,tier:p.tier,role:p.role||'member',account_status:p.account_status||'active',created_at:p.created_at,last_seen_at:p.last_seen_at,xp:p.xp},submissions:[],events:[],orders:[],plan_requests:[],ai_questions:0,posts:0};
    } else d = await rpc('admin_get_user_v2',{p_target:email});
    if (d && d.has_account == null) d.has_account = !!(d.user && d.user.created_at);
    cache.detail[email] = d || {user:{email:email}};
    return cache.detail[email];
  }
  function kv(k, v) { return '<div class="admin-kv"><span>'+esc(k)+'</span><strong>'+(v==null||v===''?'—':v)+'</strong></div>'; }
  function list(map, values) { return (values||[]).map(function(x){return map[x]||x;}).join(', '); }
  var POLE = {
    name:'Jméno', instagram:'Instagram', industries:'Obory', level:'Úroveň', level_name:'Úroveň', average_price:'Průměrná cena zakázky',
    jobs_per_month:'Zakázek měsíčně', hours_per_week:'Hodin týdně', problems:'Co ho brzdí',
    goal:'Cíl', brake:'Hlavní brzda', current:'Měsíčně teď', potential:'Potenciál měsíčně',
    annual_gap:'Rozdíl za rok', hourly:'Hodinovka', daily:'Denní sazba',
    monthly_revenue:'Měsíční obrat', monthly_taxes_and_levies:'Daně a odvody měsíčně',
    billable_hours:'Fakturovatelných hodin', score:'Skóre', total:'Otázek', passed:'Prošel',
    utm_source:'Zdroj návštěvy', utm_medium:'Kanál', utm_campaign:'Kampaň', utm_content:'Varianta odkazu', utm_term:'Klíčové slovo'
  };
  var PENIZE = { average_price:1, current:1, potential:1, annual_gap:1, hourly:1, daily:1, monthly_revenue:1, monthly_taxes_and_levies:1 };
  function submissionBlock(s) {
    var r = s.result || {};
    var rows = Object.keys(r).filter(function(k){return !/^utm_/.test(k);}).map(function(k){
      var v = r[k];
      if (v === null || v === '' || (Array.isArray(v) && !v.length) || typeof v === 'object' && !Array.isArray(v)) return '';
      if (Array.isArray(v)) v = v.join(', ');
      else if (typeof v === 'boolean') v = v ? 'ano' : 'ne';
      else if (PENIZE[k] && Number(v)) v = n(Math.round(Number(v))) + ' Kč';
      return kv(POLE[k] || k, esc(v));
    }).join('');
    return '<div class="admin-card-sub"><strong>'+esc(typeLabel(s.tool))+'</strong><small>'+esc(date(s.completed_at,true))+(s.user_email?'':' · neověřený e-mail')+'</small></div><div class="admin-kv-grid">'+(rows||kv('Bez detailu','—'))+'</div>';
  }
  function originOf(d) {
    var u = d.user || {}, out = [];
    var utm = (d.submissions||[]).map(function(s){return s.result||{};}).find(function(r){return r.utm_source;}) || {};
    var lead = (d.plan_requests||[])[0];
    out.push(kv('Zdroj účtu', esc(u.acquisition_source||'')));
    out.push(kv('UTM', esc([utm.utm_source,utm.utm_medium,utm.utm_campaign].filter(Boolean).join(' / '))));
    out.push(kv('Plán na míru odkud', esc(lead?lead.source:'')));
    out.push(kv('Registrace', esc(u.created_at?date(u.created_at,true):'zatím bez účtu')));
    return out.join('');
  }
  async function openPerson(email) {
    selectedPerson = email;
    document.querySelectorAll('.admin-person-row').forEach(function(r){r.classList.toggle('is-open',r.getAttribute('data-person')===email);});
    var card = document.getElementById('admin-person-card'); if (!card) return;
    card.innerHTML = '<div class="admin-loading">Načítám…</div>';
    var d; try { d = await getDetail(email); } catch (err) { card.innerHTML = '<div class="admin-empty">Kartu se nepovedlo načíst: '+esc(errText(err))+'</div>'; return; }
    if (selectedPerson !== email) return;
    var p = (cache.people||[]).find(function(x){return x.email===email;}) || {email:email};
    var u = d.user || {}, prof = u.profile || {}, lead = (d.plan_requests||[])[0], st = stageOf(Object.assign({}, p, {has_account:d.has_account, tier:u.tier||p.tier}));
    var phone = (lead&&lead.phone) || p.phone, insta = u.instagram || (lead&&lead.instagram) || p.instagram;
    var contact = [phone?'<a href="tel:'+esc(String(phone).replace(/\s/g,''))+'">'+esc(phone)+'</a>':'', insta?'<a href="https://www.instagram.com/'+encodeURIComponent(insta)+'" target="_blank" rel="noopener">@'+esc(insta)+'</a>':''].filter(Boolean).join(' · ');
    var mailto = 'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Kenji Academy')+'&body='+encodeURIComponent('Ahoj '+(u.display_name||(lead&&lead.name)||'')+',\n\n');

    var deal;
    if (lead) {
      deal = '<div class="admin-card-fields"><label>Stav zájemce<select class="admin-select" data-lead-status="'+esc(lead.id)+'">'+Object.keys(LEAD_STATUS).map(function(k){return '<option value="'+k+'"'+(lead.status===k?' selected':'')+'>'+LEAD_STATUS[k]+'</option>';}).join('')+'</select></label>'+
        (d.has_account?tierField(u):'')+'</div><label class="admin-card-note">Poznámka<textarea class="admin-input" rows="2" maxlength="2000" data-note-lead="'+esc(lead.id)+'">'+esc(lead.note||'')+'</textarea></label>';
    } else if (d.has_account) {
      deal = '<div class="admin-card-fields">'+tierField(u)+'</div><label class="admin-card-note">Poznámka<textarea class="admin-input" rows="2" maxlength="2000" data-note-user="'+esc(email)+'">'+esc(u.admin_note||'')+'</textarea></label>';
    } else {
      deal = '<p class="admin-notice">Člověk zatím nemá účet — vyplnil jen nástroj. Přístup mu můžeš dát v sekci „Přidat člověka“.</p>';
    }
    if (lead || d.has_account) deal += '<div class="admin-row-actions"><span class="admin-inline-msg" data-card-msg></span><button class="admin-button" type="button" data-card-save="'+esc(email)+'">Uložit</button></div>';

    var profile = Object.keys(prof).length ? '<div class="admin-kv-grid">'+
      kv('Obory', esc([list(ONB_INDUSTRY, prof.industries || (prof.industry?[prof.industry]:[])), prof.industryOther].filter(Boolean).join(', ')))+
      kv('Zkušenost', esc(ONB_EXPERIENCE[prof.experience]||prof.experience||''))+
      kv('Hlavní brzda', esc([ONB_BLOCKER[prof.blocker]||prof.blocker, prof.blockerOther].filter(Boolean).join(' — ')))+
      kv('Příjem', esc(ONB_INCOME[prof.income]||prof.income||''))+
      (prof.goal?kv('Cíl', esc(prof.goal)):'')+(prof.portfolio?kv('Portfolio', esc(prof.portfolio)):'')+'</div>' : '<p class="admin-muted">'+(d.has_account?'Onboarding zatím nevyplnil.':'Nemá účet, onboarding neproběhl.')+'</p>';

    var planHtml = lead ? '<div class="admin-kv-grid">'+kv('Vyplnil', esc(date(lead.created_at,true)))+kv('Obory', esc(list(LEAD_OBOR, lead.obory)))+kv('Zkušenost', esc(LEAD_LEVEL[lead.level]||lead.level||''))+kv('Zakázek měsíčně', esc(lead.jobs||''))+kv('Cena zakázky', esc(kc(lead.price)))+kv('Cíl měsíčně', esc(kc(lead.goal)))+kv('Čas týdně', esc(lead.hours?lead.hours+' h':''))+kv('Co ho brzdí', esc(list(LEAD_BLOCKER, lead.blockers)))+'</div>'+
      (((lead.plan||{}).phases||[]).length?'<ol class="admin-plan">'+lead.plan.phases.map(function(ph){return '<li><strong>'+esc(ph.title)+'</strong> — '+esc((ph.items||[]).join(', '))+'</li>';}).join('')+'</ol>':'') : '';

    var orders = (d.orders||[]).map(function(o){return '<div class="admin-card-line"><strong>'+esc(PRODUCT_LABEL[o.product]||o.product||o.tier||'Nákup')+'</strong><span>'+esc(kc(o.amount_total))+(o.coupon?' · '+esc(o.coupon):'')+' · '+esc(date(o.created_at))+'</span>'+(o.status==='refunded'?chip('hot','Vráceno'):'')+'</div>';}).join('');
    if (!orders) orders = '<p class="admin-muted">'+(u.tier==='academy'||u.tier==='knihovna'?'Přístup má, ale nákup ještě nebyl zaznamenaný (starší nákupy jsou jen ve Stripe).':'Zatím nic.')+'</p>';
    if (u.has_presets) orders += '<div class="admin-card-line"><strong>Presety</strong><span>odemčené</span></div>';

    var consent = d.has_account ? (u.marketing_unsubscribed_at ? 'odhlášen '+date(u.marketing_unsubscribed_at) : (u.marketing_consent_at ? 'ano · '+(u.marketing_consent_source||'')+' · '+date(u.marketing_consent_at) : 'ne')) : (lead ? (lead.marketing_consent?'ano · plán na míru':'ne') : '—');
    var mail = '<div class="admin-kv-grid">'+kv('Souhlas', esc(consent))+kv('Ecomail', u.ecomail_sync_error?'<span class="is-err">'+esc(u.ecomail_sync_error)+'</span>':esc(u.ecomail_synced_at?'synchronizováno '+date(u.ecomail_synced_at):''))+kv('Doručitelnost', esc(u.email_status||''))+'</div>';

    var readCount = Array.isArray(u.read) ? u.read.length : (u.read && typeof u.read==='object' ? Object.keys(u.read).length : 0);
    var engage = '<div class="admin-engage">'+[['XP',u.xp],['AI dotazů',d.ai_questions],['Příspěvků',d.posts],['Článků',readCount]].map(function(x){return '<div><strong>'+(d.has_account?n(x[1]):'—')+'</strong><span>'+x[0]+'</span></div>';}).join('')+'</div>';

    var subs = (d.submissions||[]).map(submissionBlock).join('') || '<p class="admin-muted">Žádný nástroj zatím nevyplnil.</p>';
    var events = (d.events||[]).slice(0,15).map(function(e){return '<div class="admin-card-line"><span>'+esc(rel(e.created_at))+'</span><strong>'+esc(label(e.event_name))+'</strong></div>';}).join('') || '<p class="admin-muted">Bez událostí.</p>';
    var account = d.has_account ? '<details class="admin-card-sec"><summary>Účet: role a blokace</summary><div class="admin-card-fields"><label>Role<select class="admin-select" data-card-role>'+['member','moderator','admin'].map(function(x){return '<option'+((u.role||'member')===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select></label><label>Stav<select class="admin-select" data-card-status>'+['active','pending','paused','blocked'].map(function(x){return '<option'+((u.account_status||'active')===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select></label></div><p class="admin-muted">Ukládá se tlačítkem Uložit v sekci Obchod.</p></details>' : '';

    card.innerHTML = '<div class="admin-card-top"><div><span class="admin-eyebrow">KARTA ČLOVĚKA</span><h2>'+esc(u.display_name||(lead&&lead.name)||p.name||email)+'</h2><p>'+esc(email)+(contact?'<br>'+contact:'')+'</p></div>'+chip(st.cls,st.text)+'</div>'+
      '<div class="admin-row-actions"><a class="admin-button" href="'+esc(mailto)+'">Napsat e-mail</a>'+(d.has_account?'<button class="admin-button secondary" type="button" data-quick-link="'+esc(email)+'">Poslat přihlašovací odkaz</button>':'')+'</div>'+
      sec('Obchod', deal)+sec('Profil z onboardingu', profile)+(lead?sec('Plán na míru', planHtml):'')+sec('Čísla z nástrojů', subs)+sec('Nákupy', orders)+sec('E-maily', mail)+sec('Zapojení', engage)+sec('Původ', '<div class="admin-kv-grid">'+originOf(d)+'</div>')+sec('Časová osa', events)+account;
  }
  function sec(title, body) { return '<section class="admin-card-sec"><h3>'+esc(title)+'</h3>'+body+'</section>'; }
  function tierField(u) { return '<label>Přístup<select class="admin-select" data-card-tier>'+['free','knihovna','academy'].map(function(x){return '<option value="'+x+'"'+((u.tier||'free')===x?' selected':'')+'>'+TIER_LABEL[x]+'</option>';}).join('')+'</select></label>'; }

  async function saveCard(email, btn) {
    var card = document.getElementById('admin-person-card'), msg = card.querySelector('[data-card-msg]');
    var d = cache.detail[email] || {}, u = d.user || {}, p = (cache.people||[]).find(function(x){return x.email===email;}) || {};
    var tierEl = card.querySelector('[data-card-tier]'), roleEl = card.querySelector('[data-card-role]'), statusEl = card.querySelector('[data-card-status]');
    var leadNote = card.querySelector('[data-note-lead]'), userNote = card.querySelector('[data-note-user]');
    btn.disabled = true;
    try {
      if (!IS_LOCAL) {
        if (d.has_account && tierEl) await rpc('admin_set_user_v2',{p_target:email,p_tier:tierEl.value,p_role:roleEl?roleEl.value:(u.role||'member'),p_status:statusEl?statusEl.value:(u.account_status||'active')});
        if (leadNote) await rpc('admin_update_plan_request',{p_id:Number(leadNote.getAttribute('data-note-lead')),p_status:null,p_note:leadNote.value});
        if (userNote) await rpc('admin_set_user_note',{p_target:email,p_note:userNote.value});
      }
      if (tierEl) { u.tier = p.tier = tierEl.value; }
      if (roleEl) u.role = roleEl.value; if (statusEl) u.account_status = p.account_status = statusEl.value;
      if (leadNote && d.plan_requests && d.plan_requests[0]) d.plan_requests[0].note = p.lead_note = leadNote.value.trim() || null;
      if (userNote) u.admin_note = userNote.value.trim() || null;
      if (msg) { msg.textContent = IS_LOCAL ? 'Jen náhled · neuloženo' : 'Uloženo ✓'; msg.className = 'admin-inline-msg is-ok'; }
      refreshPeopleTable();
    } catch (err) { if (msg) { msg.textContent = 'Nepovedlo se: '+errText(err); msg.className = 'admin-inline-msg is-err'; } }
    btn.disabled = false;
  }
  function exportPeople() {
    var cols=['email','name','phone','instagram','tier','has_account','lead_status','money','potential','consent','source','created_at','last_seen_at'];
    var rows=filteredPeople();
    var lines=[cols.join(';')].concat(rows.map(function(r){return cols.map(function(c){var v=r[c];if(v===true)v='ano';if(v===false)v='ne';v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(';');}));
    var blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kenji-lide-'+peopleSeg+'-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  }

  // ── Prodej ──────────────────────────────────────────────────────────────
  function renderSales() {
    var d = cache.overview || {}, orders = cache.orders;
    var ordersHtml = orders === null
      ? '<div class="admin-empty">Objednávky se začnou ukládat po nasazení migrace a webhooku. Do té doby jsou nákupy jen ve Stripe.</div>'
      : (orders.length ? '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Kdy</th><th>Člověk</th><th>Produkt</th><th>Částka</th><th>Kupón</th><th>Odkud</th><th>Stav</th></tr></thead><tbody>'+orders.map(function(o){
          return '<tr><td>'+esc(date(o.created_at,true))+'</td><td><button class="admin-link" type="button" data-open-person="'+esc(o.email)+'">'+esc(o.email)+'</button></td><td>'+esc(PRODUCT_LABEL[o.product]||o.product||o.tier||'—')+(o.presets&&o.product!=='presets'?' + presety':'')+'</td><td><strong>'+esc(kc(o.amount_total))+'</strong></td><td>'+esc(o.coupon||'—')+'</td><td>'+esc(o.source||'—')+'</td><td>'+chip(o.status==='refunded'?'hot':'ok',o.status==='refunded'?'Vráceno':'Zaplaceno')+'</td></tr>';
        }).join('')+'</tbody></table></div>' : '<div class="admin-empty">Zatím žádná zaznamenaná objednávka.</div>');
    ROOT.innerHTML = head('OBJEDNÁVKY · KUPÓNY','Prodej','Kdo co koupil, za kolik a s jakým kupónem.','<a class="admin-button secondary" href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener">Otevřít Stripe</a>')+
      '<div class="admin-kpis admin-kpis-4">'+kpi('Tržby 30 dní',d.revenue_30d!=null?kc(d.revenue_30d):'—',n(d.orders_30d)+' objednávek')+kpi('Academy',d.academy_total,'členů celkem')+kpi('Databáze',d.knihovna_total,'členů celkem')+kpi('Presety',d.presets_total,'odemčené presety')+'</div>'+
      '<section class="admin-section"><div class="admin-section-head"><h2>Objednávky</h2></div>'+ordersHtml+'</section>'+
      '<section class="admin-section"><div class="admin-section-head"><h2>Kupóny</h2></div>'+
      '<form class="admin-form" id="admin-coupon-form"><label>Kód<input class="admin-input" name="code" required maxlength="40" placeholder="NIKON20"></label><label>Sleva %<input class="admin-input" type="number" name="percent" min="1" max="100" required></label><label class="span-2">Popis<input class="admin-input" name="description" maxlength="160"></label><label>Produkty<select class="admin-select" name="products"><option value="">Všechny</option><option value="academy">Academy</option><option value="databaze">Databáze</option><option value="presets">Presety</option></select></label><label>Max. použití<input class="admin-input" type="number" name="max_uses" min="1"></label><div class="admin-form-actions"><button class="admin-button" type="submit">Přidat kupón</button></div></form>'+couponsTable(cache.coupons)+'</section>';
  }
  function couponsTable(rows){if(!rows.length)return '<div class="admin-empty">Zatím žádné kupóny.</div>';return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Kód</th><th>Sleva</th><th>Produkty</th><th>Použití</th><th>Stav</th><th></th></tr></thead><tbody>'+rows.map(function(x){return '<tr><td><strong>'+esc(x.code)+'</strong>'+(x.description?'<small>'+esc(x.description)+'</small>':'')+'</td><td>'+n(x.percent_off)+' %</td><td>'+esc((x.products||[]).join(', ')||'všechny')+'</td><td>'+n(x.used_count)+(x.max_uses?' / '+n(x.max_uses):' / ∞')+'</td><td><button class="admin-status-button'+(x.active?'':' is-off')+'" type="button" data-coupon-toggle="'+esc(x.code)+'">'+esc(x.active?'Aktivní':'Vypnutý')+'</button></td><td><button class="admin-button danger" type="button" data-coupon-delete="'+esc(x.code)+'">Smazat</button></td></tr>';}).join('')+'</tbody></table></div>';}

  // ── E-maily ─────────────────────────────────────────────────────────────
  function renderEmailing() {
    var d=cache.emailing||{},ev=d.events_30d||{},remote=cache.ecomail||{};
    var list=remote.list&&remote.list.list?remote.list.list:{};
    var subscribers=remote.list&&remote.list.subscribers?remote.list.subscribers:{};
    var pipelines=Array.isArray(remote.pipelines)?remote.pipelines:[];
    var webhook=remote.webhook||{};
    var live=remote.configured&&!IS_LOCAL;
    var status='<div class="admin-mail-bar">'+(remote.configured?'<span class="admin-mail-status is-ok">Ecomail propojen</span><span>'+esc(list.name||'')+(subscribers.subscribed!=null?' · '+n(subscribers.subscribed)+' aktivních':'')+'</span>':'<span class="admin-mail-status is-off">'+(remote.needsListId?'Vyber ID seznamu':'Ecomail čeká na nastavení v Netlify')+'</span>')+
      (webhook.matches?'<span class="admin-mail-status is-ok">Webhook aktivní</span>':'<span class="admin-mail-status is-off">Webhook čeká na nastavení</span>')+
      (d.sync_errors?'<span class="admin-mail-status is-warn">'+n(d.sync_errors)+' nesynchronizovaných</span>':'')+
      '<span class="admin-top-spacer"></span><button class="admin-button secondary" type="button" data-email-sync'+(live?'':' disabled')+'>Synchronizovat souhlasy</button></div>';
    var availableLists=remote.needsListId&&Array.isArray(remote.lists)?'<div class="admin-mail-list-picker"><strong>Dostupné seznamy</strong>'+remote.lists.map(function(item){return '<div><span>'+esc(item.name||'Bez názvu')+'</span><code>ID '+esc(item.id)+'</code></div>';}).join('')+'<small>Vybrané ID vlož v Netlify jako ECOMAIL_LIST_ID.</small></div>':'';
    var openRate=ev.delivered?Math.round(Number(ev.opened||0)/Number(ev.delivered)*100)+' %':'—';
    ROOT.innerHTML=head('ECOMAIL · SOUHLASY · KAMPANĚ','E-maily','Napiš e-mail, pošli si test, vytvoř koncept v Ecomailu a odešli.','<button class="admin-button" type="button" data-email-new>+ Nový e-mail</button>')+status+availableLists+
      '<div class="admin-kpis admin-kpis-4">'+kpi('Souhlas s e-maily',d.consented_total,'z '+n(d.users_total)+' účtů')+kpi('V Ecomailu',d.synced_total,d.sync_errors?n(d.sync_errors)+' čeká na opravu':'synchronizováno')+kpi('Otevřenost 30 dní',openRate,n(ev.opened)+' z '+n(ev.delivered)+' doručených · '+n(ev.clicked)+' prokliků')+kpi('Odhlášení',d.unsubscribed_total,n(ev.unsubscribed)+' za 30 dní · '+n(ev.bounced)+' bounce · '+n(ev.complained)+' spam')+'</div>'+
      renderEmailList()+renderEmailSequenceEditor()+
      '<details class="admin-audience-wrap"><summary>Srovnání publika před rozesláním (kontrola, nic neposílá)</summary>'+renderAudience(remote)+'</details>'+
      '<details class="admin-audience-wrap"><summary>Propojení a automatizace v Ecomailu</summary><section class="admin-section"><p class="admin-notice">Synchronizují se jen lidé s výslovným souhlasem. Odhlášené kontakty se nereaktivují.</p>'+
      '<div class="admin-mail-actions"><div><strong>Výsledky kampaní</strong><small>'+(webhook.matches?'Webhook aktivní':'Webhook čeká na nastavení')+'</small></div><button class="admin-button admin-button-secondary" type="button" data-email-webhook'+(live?'':' disabled')+'>'+(webhook.matches?'Obnovit webhook':'Nastavit webhook')+'</button></div>'+
      '<div class="admin-section-head"><h3>Automatizace</h3><a class="admin-mail-link" href="https://app.ecomail.cz/" target="_blank" rel="noopener">Otevřít Ecomail</a></div><div class="admin-mail-pipelines">'+(pipelines.length?pipelines.map(function(p){return '<div><strong>'+esc(p.name||('Automatizace '+p.id))+'</strong><small>ID '+esc(p.id)+'</small></div>';}).join(''):'<div class="admin-empty">Zatím nejsou načtené žádné automatizace.</div>')+'</div></section></details>';
  }
  var VERDICT_LABEL={ok:'Pošle se',academy:'Člen Academy',admin:'Správce',test:'Testovací',typo:'Překlep',invalid:'Neplatná',duplicate:'Duplicita',unsubscribed_academy:'Odhlášen v Academy',bounce:'Bounce',blocked:'Blokovaný'};
  function verdictLabel(v){return VERDICT_LABEL[v]||v;}
  function renderAudience(remote) {
    var a=cache.audience,canRun=!!(remote&&remote.configured);
    var headHtml='<div class="admin-section-head"><h2>Publikum pro sekvenci</h2><div class="admin-row-actions"><button class="admin-button admin-button-secondary" type="button" data-audience-run'+(canRun?'':' disabled')+'>'+(a?'Srovnat znovu':'Srovnat publikum')+'</button></div></div>';
    if(!a){
      return '<section class="admin-section admin-audience">'+headHtml+'<p class="admin-notice">Srovnání načte celý seznam z Ecomailu, porovná ho s účty v Academy a vyřadí členy Academy, správce, testovací adresy, překlepy, duplicity, odhlášené a nedoručitelné. Nic neposílá a nic nemění — jen řekne, komu se sekvence smí poslat.'+(canRun?'':' Funguje až po nasazení propojení s Ecomailem.')+'</p></section>';
    }
    var ex=a.excluded||{},ec=a.ecomail||{},ac=a.academy||{},ov=a.overlap||{},sf=a.safe||{};
    var excludedRows=(a.rows||[]).filter(function(r){return r.verdict!=='ok';});
    var table=excludedRows.length?'<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Adresa</th><th>Důvod</th><th>Tier</th><th>Poznámka</th></tr></thead><tbody>'+excludedRows.map(function(r){return '<tr><td><code>'+esc(r.email)+'</code></td><td>'+'<span class="admin-chip is-'+esc(r.verdict)+'">'+esc(verdictLabel(r.verdict))+'</span>'+'</td><td>'+esc(r.tier||'—')+'</td><td>'+esc(r.suggestion?'Nejspíš '+r.suggestion:(r.reason||''))+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="admin-empty">Nic k vyřazení — všechny aktivní kontakty prošly.</div>';
    return '<section class="admin-section admin-audience">'+headHtml+
      '<div class="admin-kpis admin-kpis-4">'+kpi('Pošle se',sf.total,n(sf.engaged)+' někdy otevřelo nebo kliklo')+kpi('Aktivních v Ecomailu',ec.subscribed,'+ '+n(ec.unsubscribed)+' odhl. · '+n(ec.bounced)+' bounce · '+n(ec.complained)+' spam')+kpi('Vyřazeno',ex.total,n(ex.academy)+' členů Academy')+kpi('Účtů v Academy',ac.total,n(ac.free)+' free · '+n(ac.knihovna)+' databáze · '+n(ac.academy)+' academy')+'</div>'+
      '<div class="admin-mail-stats admin-audience-stats">'+mailStat('Členové Academy',ex.academy)+mailStat('Správce',ex.admin)+mailStat('Testovací',ex.test)+mailStat('Překlepy',ex.typo)+mailStat('Neplatné',ex.invalid)+mailStat('Duplicity',ex.duplicate)+mailStat('Odhlášení v Academy',ex.unsubscribed_academy)+mailStat('Bounce',ex.bounce)+'</div>'+
      '<p class="admin-notice">Překryv: <strong>'+n(ov.active_in_both)+'</strong> kontaktů je v Ecomailu i v Academy, <strong>'+n(ov.only_ecomail)+'</strong> jen v Ecomailu, <strong>'+n(ov.only_academy)+'</strong> jen v Academy (z toho '+n(ov.only_academy_consented)+' se souhlasem — ty přidá „Synchronizovat souhlasy“). Odhlášené, bounced a spam kontakty v Ecomailu se nikdy nereaktivují. Srovnáno '+esc(date(a.generated_at,true))+'.</p>'+
      '<div class="admin-section-head"><h3>Vyřazené adresy ke kontrole</h3><div class="admin-row-actions"><button class="admin-button secondary" type="button" data-audience-csv="safe">Stáhnout bezpečný segment (CSV)</button><button class="admin-button secondary" type="button" data-audience-csv="excluded">Stáhnout vyřazené (CSV)</button></div></div>'+table+
      '<div class="admin-mail-actions admin-audience-tag"><div><strong>Označit bezpečný segment štítkem v Ecomailu</strong><small>Štítek nic nerozesílá. Segment v Ecomailu pak stačí založit jako „štítek = '+esc(audienceTag())+'“. Automatizaci postav až po označení — kdyby už poslouchala na tento štítek, spustila by se.</small></div><div class="admin-row-actions"><input class="admin-input admin-audience-tag-input" data-audience-tag-name value="'+esc(audienceTag())+'" maxlength="50" spellcheck="false"><button class="admin-button" type="button" data-audience-tag'+(canRun&&!IS_LOCAL?'':' disabled')+'>Označit '+n(sf.total)+' kontaktů</button></div></div></section>';
  }
  function audienceTag(){var el=document.querySelector('[data-audience-tag-name]');return (el&&el.value.trim())||'7dni-ok';}
  function downloadCsv(name,rows){
    var cols=['email','verdict','reason','suggestion','tier','registered','consented','engaged','tags','source','subscribed_at'];
    var lines=[cols.join(';')].concat(rows.map(function(r){return cols.map(function(c){var v=r[c];if(Array.isArray(v))v=v.join('|');if(v===true)v='ano';if(v===false)v='ne';v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(';');}));
    var blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
  }

  function activeEmailSequence() {
    var rows=cache.emailSequences||[];
    return rows.find(function(item){return item.id===selectedEmailSequenceId;})||null;
  }
  function activeEmailStep(sequence) {
    var steps=(sequence&&Array.isArray(sequence.steps)?sequence.steps:[]).slice().sort(function(a,b){return n(a.position)-n(b.position);});
    var step=steps.find(function(item){return item.id===selectedEmailStepId;})||steps[0]||null;
    if(step)selectedEmailStepId=step.id;
    return step;
  }
  function audienceLabel(value){return {consented_non_academy:'Souhlas + není Academy',consented_free:'Souhlas + Free',academy:'Členové Academy'}[value]||value;}
  function renderEmailSequenceEditor() {
    var sequence=activeEmailSequence();
    if(!sequence)return '';
    var step=activeEmailStep(sequence);if(!step)return '';
    var steps=(sequence.steps||[]).slice().sort(function(a,b){return n(a.position)-n(b.position);});
    var timeline=steps.map(function(item){return '<button type="button" class="admin-email-step'+(item.id===step.id?' is-active':'')+'" data-email-step="'+esc(item.id)+'"><span>DEN '+n(item.position)+'</span><strong>'+esc(item.subject||'Bez předmětu')+'</strong><small>'+(item.ecomail_template_id?'V Ecomailu · ID '+esc(item.ecomail_template_id):'Koncept')+'</small></button>';}).join('');
    var single=steps.length===1;
    return '<section class="admin-email-builder'+(single?' is-single':'')+'" data-email-editor id="email-editor"><div class="admin-email-builder-head"><div><span class="admin-eyebrow">'+(single?'E-MAIL':'SEKVENCE')+'</span><h2>'+esc(single?(step.subject||'Nový e-mail'):sequence.name)+'</h2><p>'+esc(single?'':(sequence.description||''))+'</p></div><div class="admin-email-builder-state"><div class="admin-row-actions"><button class="admin-button admin-button-secondary" type="button" data-email-close>Zavřít</button>'+(single?'<button class="admin-button danger" type="button" data-email-archive'+(step.ecomail_campaign_sent_at?' disabled title="Odeslaný e-mail zůstává v historii"':'')+'>Smazat koncept</button>':'')+'</div></div></div>'+
      '<div class="admin-email-settings"><label>Název<input data-sequence-field="name" value="'+esc(sequence.name)+'"></label><label>Publikum<select data-sequence-field="audience"><option value="consented_non_academy"'+(sequence.audience==='consented_non_academy'?' selected':'')+'>Souhlas, bez Academy</option><option value="consented_free"'+(sequence.audience==='consented_free'?' selected':'')+'>Pouze Free</option><option value="academy"'+(sequence.audience==='academy'?' selected':'')+'>Členové Academy</option></select></label><label>Stav<select data-sequence-field="status"><option value="draft"'+(sequence.status==='draft'?' selected':'')+'>Koncept</option><option value="ready"'+(sequence.status==='ready'?' selected':'')+'>Připraveno</option><option value="active"'+(sequence.status==='active'?' selected':'')+'>Aktivní</option><option value="paused"'+(sequence.status==='paused'?' selected':'')+'>Pozastaveno</option></select></label><label>Ecomail automatizace<input data-sequence-field="ecomail_pipeline_id" inputmode="numeric" placeholder="ID" value="'+esc(sequence.ecomail_pipeline_id||'')+'"></label></div><details class="admin-email-advanced"><summary>Odesílatel a technické nastavení</summary><div><label>Jméno odesílatele<input data-sequence-field="from_name" value="'+esc(sequence.from_name||'')+'"></label><label>E-mail odesílatele<input data-sequence-field="from_email" type="email" value="'+esc(sequence.from_email||'')+'"></label><label>Odpovědi na<input data-sequence-field="reply_to" type="email" value="'+esc(sequence.reply_to||'')+'"></label></div></details>'+
      '<div class="admin-email-workspace"><aside class="admin-email-timeline">'+timeline+'</aside><div class="admin-email-compose"><div class="admin-email-compose-top"><span>DEN '+n(step.position)+'</span><label class="admin-email-delay">Dnů od začátku<input data-step-number="delay_days" type="number" min="0" max="90" value="'+n(step.delay_days)+'"><em>(0 = ihned)</em></label></div><label>Předmět<input data-step-field="subject" value="'+esc(step.subject||'')+'"></label><label>Náhledový text<input data-step-field="preheader" value="'+esc(step.preheader||'')+'"></label><label class="admin-email-plain"><input type="checkbox" data-step-check="plain"'+(step.plain?' checked':'')+'> Osobní styl — bez loga a velkého nadpisu (vypadá jako e-mail od člověka)</label><label class="admin-email-headline-field">Nadpis<input data-step-field="headline" value="'+esc(step.headline||'')+'"></label><label>Tělo e-mailu<textarea data-step-field="body" rows="14">'+esc(step.body||'')+'</textarea></label><div class="admin-email-inline"><label>Text tlačítka<input data-step-field="cta_label" value="'+esc(step.cta_label||'')+'"></label><label>Odkaz<input data-step-field="cta_url" type="url" value="'+esc(step.cta_url||'')+'"></label></div><div class="admin-email-editor-actions"><span class="admin-inline-msg" data-email-save-msg></span><button class="admin-button admin-button-secondary" type="button" data-email-export'+(cache.ecomail&&cache.ecomail.configured&&!IS_LOCAL?'':' disabled')+'>'+(step.ecomail_template_id?'Aktualizovat šablonu':'Vytvořit šablonu v Ecomailu')+'</button><button class="admin-button" type="button" data-email-save>Uložit koncept</button></div>'+renderCampaignPanel(sequence,step)+'</div><div class="admin-email-preview-wrap"><div class="admin-email-inbox"><span>PŘEDMĚT</span><strong data-preview-subject>'+esc(step.subject||'')+'</strong><small data-preview-preheader>'+esc(step.preheader||'')+'</small></div><div class="admin-email-preview" data-email-preview>'+emailPreview(step)+'</div></div></div></section>';
  }
  function emailPreview(step) {
    var paragraphs=String(step.body||'').split(/\n\s*\n/).filter(Boolean).map(function(part){return '<p>'+esc(part).replace(/\n/g,'<br>')+'</p>';}).join('');
    return (step.plain?'':'<div class="admin-email-preview-logo">kenji<span>academy</span></div><h3>'+esc(step.headline||step.subject||'')+'</h3>')+paragraphs+(step.cta_label?'<span class="admin-email-preview-cta">'+esc(step.cta_label)+'</span>':'')+'<p>Měj se,<br><strong>Kenji</strong></p><footer>Tento e-mail dostáváš, protože ses přihlásil/a k užitečným e-mailům Kenji Academy. <u>Odhlásit se</u></footer>';
  }
  function renderCampaignPanel(sequence,step) {
    var live=!!(cache.ecomail&&cache.ecomail.configured)&&!IS_LOCAL;
    var segments=(cache.ecomail&&Array.isArray(cache.ecomail.segments))?cache.ecomail.segments:[];
    var chosen=step.ecomail_segment_id||(segments.find(function(sg){return /vlna 1|vlna-1/i.test(sg.name);})||{}).id||'';
    var options='<option value="">Celý seznam (všichni aktivní)</option>'+segments.map(function(sg){return '<option value="'+esc(sg.id)+'"'+(String(sg.id)===String(chosen)?' selected':'')+'>'+esc(sg.name)+'</option>';}).join('');
    var state=step.ecomail_campaign_sent_at?'<span class="admin-mail-status is-ok">Odesláno '+esc(date(step.ecomail_campaign_sent_at,true))+'</span>':(step.ecomail_campaign_id?'<span class="admin-mail-status is-ok">Koncept v Ecomailu · ID '+esc(step.ecomail_campaign_id)+'</span>':'<span class="admin-mail-status is-off">Kampaň zatím není v Ecomailu</span>');
    return '<div class="admin-campaign"><div class="admin-section-head"><h3>Odeslat jako kampaň</h3>'+state+'</div>'+
      '<p class="admin-notice">Pořadí: 1) test na tvůj e-mail, 2) koncept v Ecomailu s vybraným segmentem, 3) odeslání. Odeslání je nevratné a jde jen z konceptu, který ještě neodešel.</p>'+
      '<label>Komu<select class="admin-input" data-campaign-segment'+(step.ecomail_campaign_id?' disabled':'')+'>'+options+'</select></label>'+
      '<div class="admin-row-actions admin-campaign-actions"><button class="admin-button admin-button-secondary" type="button" data-email-test'+(live?'':' disabled')+'>Poslat test na můj e-mail</button><button class="admin-button admin-button-secondary" type="button" data-campaign-create'+(live&&!step.ecomail_campaign_sent_at?'':' disabled')+'>'+(step.ecomail_campaign_id?'Vytvořit nový koncept':'Vytvořit koncept v Ecomailu')+'</button><button class="admin-button danger" type="button" data-campaign-send'+(live&&step.ecomail_campaign_id&&!step.ecomail_campaign_sent_at?'':' disabled')+'>Odeslat kampaň</button></div></div>';
  }
  function uuid(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);});}
  // Nový samostatný e-mail: prázdný koncept v osobním stylu, odesílatel z Ecomailu.
  function newEmailDraft() {
    return {id:uuid(),name:'Nový e-mail',description:'',audience:'consented_non_academy',status:'draft',from_name:'Kenji',from_email:'kenji@mail.kenji.cz',reply_to:'ahoj@kenji.cz',ecomail_pipeline_id:null,created_at:new Date().toISOString(),steps:[{
      id:'mail-1',position:1,delay_days:0,status:'draft',plain:true,subject:'',preheader:'',headline:'',body:'Ahoj,\n\n',cta_label:'',cta_url:''
    }]};
  }
  function isSingleEmail(seq){return seq&&Array.isArray(seq.steps)&&seq.steps.length===1;}
  function emailDate(seq){var st=(seq.steps||[])[0]||{};return st.ecomail_campaign_sent_at||st.ecomail_campaign_created_at||seq.updated_at||seq.created_at||'';}
  function emailStatusChip(st){
    if(st.ecomail_campaign_sent_at)return '<span class="admin-chip is-ok">Odesláno</span>';
    if(st.ecomail_campaign_id)return '<span class="admin-chip is-typo">Koncept v Ecomailu</span>';
    return '<span class="admin-chip">Koncept</span>';
  }
  function campaignStatsLine(st){
    var cs=(cache.campaignStats||{})[String(st.ecomail_campaign_id||'')];if(!cs)return '';
    return '<small class="admin-email-row-stats">'+n(cs.delivery)+' doručeno · '+n(cs.open)+' otevřelo'+(cs.open_rate!=null?' ('+Math.round(cs.open_rate)+' %)':'')+' · '+n(cs.click)+' kliklo'+(cs.unsub?' · '+n(cs.unsub)+' odhl.':'')+'</small>';
  }
  function renderEmailList() {
    var rows=(cache.emailSequences||[]);
    var singles=rows.filter(function(seq){return isSingleEmail(seq)&&!(seq.steps[0]||{}).archived_at;}).sort(function(a,b){return String(emailDate(b)).localeCompare(String(emailDate(a)));});
    var sequences=rows.filter(function(seq){return !isSingleEmail(seq);});
    var list=singles.length?singles.map(function(seq){var st=seq.steps[0]||{};var when=emailDate(seq);return '<div class="admin-email-row'+(seq.id===selectedEmailSequenceId?' is-active':'')+'"><div class="admin-email-row-main"><strong>'+esc(st.subject||'Bez předmětu')+'</strong><small>'+esc(when?date(when,true):'')+(st.ecomail_segment?' · '+esc(st.ecomail_segment):'')+'</small>'+campaignStatsLine(st)+'</div><div class="admin-email-row-side">'+emailStatusChip(st)+'<button class="admin-button secondary" type="button" data-email-open="'+esc(seq.id)+'">'+(seq.id===selectedEmailSequenceId?'Otevřeno':'Otevřít')+'</button></div></div>';}).join(''):'<div class="admin-empty">Zatím žádný e-mail. Klikni na „Nový e-mail“, napiš ho, pošli si test a pak ho pošli lidem.</div>';
    var seqHtml=sequences.length?'<details class="admin-email-seqs"><summary>Sekvence pro automatizace ('+sequences.length+')</summary>'+sequences.map(function(seq){return '<div class="admin-email-row"><div class="admin-email-row-main"><strong>'+esc(seq.name)+'</strong><small>'+n((seq.steps||[]).length)+' e-mailů · '+esc(audienceLabel(seq.audience))+'</small></div><div class="admin-email-row-side"><span class="admin-chip">'+esc(seq.status==='draft'?'Koncept':seq.status)+'</span><button class="admin-button secondary" type="button" data-email-open="'+esc(seq.id)+'">Otevřít</button></div></div>';}).join('')+'</details>':'';
    return '<section class="admin-section admin-email-list"><div class="admin-section-head"><h2>Odeslané a koncepty</h2></div>'+list+seqHtml+'</section>';
  }

  function collectEmailEditor() {
    var sequence=activeEmailSequence(),step=activeEmailStep(sequence);if(!sequence||!step)return null;
    document.querySelectorAll('[data-sequence-field]').forEach(function(input){var key=input.getAttribute('data-sequence-field'),value=input.value;sequence[key]=key==='ecomail_pipeline_id'?(value?Number(value):null):value;});
    document.querySelectorAll('[data-step-field]').forEach(function(input){step[input.getAttribute('data-step-field')]=input.value;});
    document.querySelectorAll('[data-step-check]').forEach(function(input){step[input.getAttribute('data-step-check')]=!!input.checked;});
    document.querySelectorAll('[data-step-number]').forEach(function(input){step[input.getAttribute('data-step-number')]=Math.max(0,Math.min(90,Number(input.value)||0));});
    return {sequence:sequence,step:step};
  }
  function refreshEmailPreview() {
    var draft=collectEmailEditor();if(!draft)return;
    var subject=document.querySelector('[data-preview-subject]'),preheader=document.querySelector('[data-preview-preheader]'),preview=document.querySelector('[data-email-preview]');
    if(subject)subject.textContent=draft.step.subject||'';if(preheader)preheader.textContent=draft.step.preheader||'';if(preview)preview.innerHTML=emailPreview(draft.step);
  }
  async function saveEmailSequence(showMessage) {
    var draft=collectEmailEditor();if(!draft)return;
    var s=draft.sequence;
    if(isSingleEmail(s))s.name=String(draft.step.subject||'').trim()||'Nový e-mail';
    if(!IS_LOCAL)await rpc('admin_upsert_email_sequence',{p_id:s.id,p_name:s.name,p_description:s.description||'',p_audience:s.audience,p_status:s.status,p_from_name:s.from_name,p_from_email:s.from_email,p_reply_to:s.reply_to,p_ecomail_pipeline_id:s.ecomail_pipeline_id||null,p_steps:s.steps});
    var msg=document.querySelector('[data-email-save-msg]');if(msg&&showMessage){msg.textContent=IS_LOCAL?'Pouze náhled · změny platí do obnovení stránky':'Uloženo ✓';msg.className='admin-inline-msg is-ok';}
  }

  // ── Obsah ───────────────────────────────────────────────────────────────
  var CONTENT_STATUS={draft:'Koncept',scheduled:'Naplánováno',published:'Publikováno',archived:'Archiv'};
  function renderContent() {
    var groups=[['weekly_challenge','Týdenní výzvy'],['webinar','Webináře'],['news','Novinky']];
    var lists=groups.map(function(g){
      var rows=(cache.content||[]).filter(function(x){return x.type===g[0];}).sort(function(a,b){return String(b.starts_at||b.created_at||'').localeCompare(String(a.starts_at||a.created_at||''));});
      return '<section class="admin-card"><div class="admin-card-head"><h2>'+esc(g[1])+'</h2><span>'+n(rows.length)+'</span></div>'+(rows.length?rows.map(function(x){
        var live=x.status==='published'&&(!x.ends_at||new Date(x.ends_at)>new Date())&&(!x.starts_at||new Date(x.starts_at)<=new Date());
        return '<div class="admin-list-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc([x.audience==='all'?'Všichni':x.audience==='free'?'Free':'Academy',x.xp?n(x.xp)+' XP':'',x.starts_at?date(x.starts_at,true):'',x.ends_at?'do '+date(x.ends_at):''].filter(Boolean).join(' · '))+'</small></div>'+chip(live?'ok':x.status,live?'Běží':CONTENT_STATUS[x.status]||x.status)+'<div class="admin-row-actions"><button class="admin-button secondary" type="button" data-content-edit="'+esc(x.id)+'">Upravit</button><button class="admin-button danger" type="button" data-content-delete="'+esc(x.id)+'">Smazat</button></div></div>';
      }).join(''):'<div class="admin-empty">Nic tu není.</div>')+'</section>';
    }).join('');
    ROOT.innerHTML = head('VÝZVY · WEBINÁŘE · NOVINKY','Obsah','Vlevo co běží a co je na řadě, vpravo úprava.','<button class="admin-button" type="button" data-content-reset>+ Nový obsah</button>')+
      '<div class="admin-split admin-split-content"><div class="admin-stack">'+lists+'</div>'+
      '<form class="admin-card admin-content-form" id="admin-content-form"><input type="hidden" name="id"><span class="admin-eyebrow" data-content-mode>NOVÝ OBSAH</span><label>Typ<select class="admin-select" name="type"><option value="weekly_challenge">Týdenní výzva</option><option value="webinar">Webinář</option><option value="news">Novinka</option></select></label><label>Název<input class="admin-input" name="title" required maxlength="160"></label><label>Text<textarea class="admin-textarea" name="body" maxlength="4000" rows="4"></textarea></label><div class="admin-card-fields"><label>Začátek<input class="admin-input" type="datetime-local" name="starts_at"></label><label>Konec<input class="admin-input" type="datetime-local" name="ends_at"></label><label>Pro koho<select class="admin-select" name="audience"><option value="all">Všichni</option><option value="free">Free</option><option value="academy">Academy</option></select></label><label>XP<input class="admin-input" type="number" min="0" max="10000" name="xp" value="0"></label><label>Stav<select class="admin-select" name="status"><option value="draft">Koncept</option><option value="scheduled">Naplánováno</option><option value="published">Publikováno</option><option value="archived">Archiv</option></select></label></div><label>Odkaz<input class="admin-input" name="link_url" placeholder="https://…"></label><div class="admin-form-actions"><span class="admin-inline-msg" id="admin-content-msg"></span><button class="admin-button" type="submit">Uložit obsah</button></div></form></div>';
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
      id: f.get('id') || null, type: f.get('type'), title: title,
      body: String(f.get('body') || '').trim() || null,
      status: f.get('status'), audience: f.get('audience'),
      starts_at: f.get('starts_at') ? new Date(f.get('starts_at')).toISOString() : null,
      ends_at: f.get('ends_at') ? new Date(f.get('ends_at')).toISOString() : null,
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
          p_ends_at: row.ends_at, p_xp: row.xp, p_link_url: row.link_url, p_metadata: {}
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
  function localDateTime(value) {
    if (!value) return '';
    var d = new Date(value), offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0,16);
  }
  function resetContentForm() {
    var form = document.getElementById('admin-content-form'); if (!form) return;
    form.reset(); form.elements.id.value = ''; form.elements.xp.value = '0';
    form.querySelector('[data-content-mode]').textContent = 'NOVÝ OBSAH';
    form.elements.title.focus();
  }
  function editContent(id) {
    var item = cache.content.find(function(x){return x.id===id;}), form = document.getElementById('admin-content-form');
    if (!item || !form) return;
    form.elements.id.value=item.id;form.elements.type.value=item.type;form.elements.title.value=item.title||'';form.elements.status.value=item.status;form.elements.audience.value=item.audience;form.elements.xp.value=item.xp||0;form.elements.body.value=item.body||'';form.elements.starts_at.value=localDateTime(item.starts_at);form.elements.ends_at.value=localDateTime(item.ends_at);form.elements.link_url.value=item.link_url||'';
    form.querySelector('[data-content-mode]').textContent='ÚPRAVA';form.scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus();
  }

  // ── Události ────────────────────────────────────────────────────────────
  document.addEventListener('click',async function(e){
    var viewButton=e.target.closest('[data-admin-view]');if(viewButton){go(viewButton.getAttribute('data-admin-view'));return;}
    var gotoBtn=e.target.closest('[data-goto]');if(gotoBtn){var parts=gotoBtn.getAttribute('data-goto').split(':');go(parts[0],parts[1]);return;}
    var openP=e.target.closest('[data-open-person]');if(openP){selectedPerson=openP.getAttribute('data-open-person');peopleSeg='all';peopleQuery='';go('people');return;}
    var refreshBtn=e.target.closest('[data-admin-refresh]');
    if(refreshBtn){
      refreshBtn.disabled=true; refreshBtn.classList.add('is-loading');
      var lbl=refreshBtn.querySelector('[data-refresh-label]'); if(lbl) lbl.textContent='Načítám…';
      try{
        if(IS_LOCAL){ demoData(); } else { await ensureData(view,true); }
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
    // Lidé
    var seg=e.target.closest('[data-seg]');if(seg){peopleSeg=seg.getAttribute('data-seg');renderPeople();return;}
    var personRow=e.target.closest('[data-person]');if(personRow&&!e.target.closest('a,button,select')){openPerson(personRow.getAttribute('data-person'));return;}
    var cardSave=e.target.closest('[data-card-save]');if(cardSave){saveCard(cardSave.getAttribute('data-card-save'),cardSave);return;}
    if(e.target.closest('[data-people-csv]')){exportPeople();return;}
    var qlink=e.target.closest('[data-quick-link]');if(qlink){var lEmail=qlink.getAttribute('data-quick-link');qlink.disabled=true;try{if(IS_LOCAL){alert('(Lokálně) Přihlašovací odkaz by šel na: '+lEmail);}else{var KA=window.KenjiAuth;if(KA&&KA.requestMagicLink){var r=await KA.requestMagicLink(lEmail,{redirect:'index.html'});if(!r||!r.ok)throw new Error('nepovedlo se odeslat');}alert('Přihlašovací odkaz odeslán na '+lEmail);}}catch(err){alert('Odkaz se nepovedlo odeslat: '+((err&&err.message)||'chyba'));}qlink.disabled=false;return;}
    // E-maily
    var audienceRun=e.target.closest('[data-audience-run]');if(audienceRun){audienceRun.disabled=true;audienceRun.textContent='Srovnávám…';try{if(IS_LOCAL){cache.audience=demoAudience();}else{cache.audience=await adminEmailApi('POST',{action:'audience-audit'});}renderEmailing();}catch(err){alert('Srovnání se nepovedlo: '+errText(err));audienceRun.disabled=false;audienceRun.textContent='Srovnat publikum';}return;}
    var audienceCsv=e.target.closest('[data-audience-csv]');if(audienceCsv&&cache.audience){var kind=audienceCsv.getAttribute('data-audience-csv'),rowsAll=cache.audience.rows||[];var picked=kind==='safe'?rowsAll.filter(function(r){return r.verdict==='ok';}):rowsAll.filter(function(r){return r.verdict!=='ok';});downloadCsv('kenji-publikum-'+kind+'-'+new Date().toISOString().slice(0,10)+'.csv',picked);return;}
    var audienceTagBtn=e.target.closest('[data-audience-tag]');if(audienceTagBtn&&cache.audience){var tagName=audienceTag();if(!/^[a-z0-9][a-z0-9-]{1,49}$/.test(tagName)){alert('Štítek smí mít jen malá písmena, čísla a pomlčky.');return;}var safeCount=(cache.audience.safe||{}).total||0;if(!confirm('Označit '+n(safeCount)+' kontaktů štítkem „'+tagName+'“ v Ecomailu? Srovnání se před označením spustí znovu na serveru. Nic se nerozešle.'))return;audienceTagBtn.disabled=true;audienceTagBtn.textContent='Označuji…';try{var tagged=await adminEmailApi('POST',{action:'tag-audience',tag:tagName});cache.audience=await adminEmailApi('POST',{action:'audience-audit'});renderEmailing();alert('Hotovo. Štítek „'+tagName+'“ má '+n(tagged.tagged)+' kontaktů. Nic nebylo rozesláno.');}catch(err){alert('Označení se nepovedlo: '+errText(err));audienceTagBtn.disabled=false;audienceTagBtn.textContent='Označit '+n(safeCount)+' kontaktů';}return;}
    var emailSync=e.target.closest('[data-email-sync]');if(emailSync){if(!confirm('Synchronizovat do Ecomailu všechny účty s platným souhlasem? Odhlášené kontakty se přeskočí.'))return;emailSync.disabled=true;emailSync.textContent='Synchronizuji…';try{var sync=await adminEmailApi('POST',{action:'sync-consented'});await loadEmailing();renderEmailing();alert('Hotovo. Synchronizováno: '+n(sync.synced)+', chyby: '+n(sync.failed)+'.');}catch(err){alert('Synchronizace se nepovedla: '+errText(err));emailSync.disabled=false;emailSync.textContent='Synchronizovat souhlasy';}return;}
    var emailWebhook=e.target.closest('[data-email-webhook]');if(emailWebhook){if(!confirm('Nastavit v Ecomailu zabezpečený webhook pro výsledky kampaní?'))return;emailWebhook.disabled=true;emailWebhook.textContent='Nastavuji…';try{await adminEmailApi('POST',{action:'configure-webhook'});await loadEmailing();renderEmailing();alert('Webhook je nastavený.');}catch(err){alert('Webhook se nepovedlo nastavit: '+errText(err));emailWebhook.disabled=false;emailWebhook.textContent='Nastavit webhook';}return;}
    var emailNew=e.target.closest('[data-email-new]');if(emailNew){collectEmailEditor();var freshMail=newEmailDraft();emailNew.disabled=true;try{if(!IS_LOCAL)await rpc('admin_upsert_email_sequence',{p_id:freshMail.id,p_name:freshMail.name,p_description:freshMail.description,p_audience:freshMail.audience,p_status:freshMail.status,p_from_name:freshMail.from_name,p_from_email:freshMail.from_email,p_reply_to:freshMail.reply_to,p_ecomail_pipeline_id:null,p_steps:freshMail.steps});cache.emailSequences=(cache.emailSequences||[]).concat([freshMail]);selectedEmailSequenceId=freshMail.id;selectedEmailStepId='mail-1';renderEmailing();var ed=document.getElementById('email-editor');if(ed)ed.scrollIntoView({behavior:'smooth',block:'start'});}catch(err){alert('Nový e-mail se nepovedlo založit: '+errText(err));emailNew.disabled=false;}return;}
    var emailOpen=e.target.closest('[data-email-open]');if(emailOpen){collectEmailEditor();selectedEmailSequenceId=emailOpen.getAttribute('data-email-open');selectedEmailStepId=null;renderEmailing();var ed2=document.getElementById('email-editor');if(ed2)ed2.scrollIntoView({behavior:'smooth',block:'start'});return;}
    var emailClose=e.target.closest('[data-email-close]');if(emailClose){collectEmailEditor();try{await saveEmailSequence(false);}catch(err){}selectedEmailSequenceId=null;selectedEmailStepId=null;renderEmailing();return;}
    var emailArchive=e.target.closest('[data-email-archive]');if(emailArchive){var dA=collectEmailEditor();if(!dA)return;if(!confirm('Smazat tento koncept? Odeslané e-maily zůstávají v historii, tenhle zmizí ze seznamu.'))return;dA.step.archived_at=new Date().toISOString();dA.sequence.status='paused';try{await saveEmailSequence(false);}catch(err){alert('Nepovedlo se: '+errText(err));return;}selectedEmailSequenceId=null;selectedEmailStepId=null;renderEmailing();return;}
    var emailTest=e.target.closest('[data-email-test]');if(emailTest){var d1=collectEmailEditor();if(!d1)return;emailTest.disabled=true;emailTest.textContent='Posílám…';try{await saveEmailSequence(false);var t=await adminEmailApi('POST',{action:'send-test',sequenceId:d1.sequence.id,stepId:d1.step.id});alert('Test odešel na '+t.to+'. Koukni do schránky (i do spamu).');}catch(err){alert('Test se nepovedlo poslat: '+errText(err));}emailTest.disabled=false;emailTest.textContent='Poslat test na můj e-mail';return;}
    var campCreate=e.target.closest('[data-campaign-create]');if(campCreate){var d2=collectEmailEditor();if(!d2)return;var segSel=document.querySelector('[data-campaign-segment]');var segId=segSel?segSel.value:'';var segName=segSel&&segSel.selectedOptions[0]?segSel.selectedOptions[0].textContent:'celý seznam';if(!confirm('Uložit koncept a vytvořit kampaň v Ecomailu pro: '+segName+'? Nic se ještě nerozešle.'))return;campCreate.disabled=true;campCreate.textContent='Vytvářím…';try{await saveEmailSequence(false);await adminEmailApi('POST',{action:'create-campaign',sequenceId:d2.sequence.id,stepId:d2.step.id,segmentId:segId});await loadEmailing();renderEmailing();alert('Koncept kampaně je v Ecomailu. Nic nebylo rozesláno.');}catch(err){alert('Koncept se nepovedlo vytvořit: '+errText(err));campCreate.disabled=false;campCreate.textContent='Vytvořit koncept v Ecomailu';}return;}
    var campSend=e.target.closest('[data-campaign-send]');if(campSend){var d3=collectEmailEditor();if(!d3)return;var typed=prompt('Tohle rozešle kampaň všem v segmentu a nejde vzít zpět.\n\nPro potvrzení napiš ODESLAT:');if(typed!=='ODESLAT')return;campSend.disabled=true;campSend.textContent='Odesílám…';try{await adminEmailApi('POST',{action:'send-campaign',sequenceId:d3.sequence.id,stepId:d3.step.id,confirm:'ODESLAT'});await loadEmailing();renderEmailing();alert('Kampaň je ve frontě Ecomailu. Statistiky uvidíš po nastavení webhooku.');}catch(err){alert('Odeslání se nepovedlo: '+errText(err));campSend.disabled=false;campSend.textContent='Odeslat kampaň';}return;}
    var emailStep=e.target.closest('[data-email-step]');if(emailStep){collectEmailEditor();selectedEmailStepId=emailStep.getAttribute('data-email-step');renderEmailing();return;}
    var emailSave=e.target.closest('[data-email-save]');if(emailSave){emailSave.disabled=true;try{await saveEmailSequence(true);}catch(err){alert('Koncept se nepovedlo uložit: '+errText(err));}emailSave.disabled=false;return;}
    var emailExport=e.target.closest('[data-email-export]');if(emailExport){var draft=collectEmailEditor();if(!draft)return;if(!confirm('Uložit koncept a vytvořit z tohoto e-mailu šablonu v Ecomailu? Nic se ještě nerozešle.'))return;emailExport.disabled=true;emailExport.textContent='Vytvářím…';try{await saveEmailSequence(false);if(IS_LOCAL){draft.step.ecomail_template_id='DEMO';draft.step.ecomail_synced_at=new Date().toISOString();}else{await adminEmailApi('POST',{action:'export-template',sequenceId:draft.sequence.id,stepId:draft.step.id});await loadEmailing();}renderEmailing();alert('Šablona je připravená v Ecomailu. Nic nebylo rozesláno.');}catch(err){alert('Šablonu se nepovedlo vytvořit: '+errText(err));emailExport.disabled=false;emailExport.textContent='Vytvořit šablonu v Ecomailu';}return;}
    // Obsah
    var editItem=e.target.closest('[data-content-edit]');if(editItem){editContent(editItem.getAttribute('data-content-edit'));return;}
    if(e.target.closest('[data-content-reset]')){resetContentForm();return;}
    var delContent=e.target.closest('[data-content-delete]');if(delContent&&confirm('Opravdu smazat tento obsah?')){if(!IS_LOCAL)await rpc('admin_delete_content',{p_id:delContent.getAttribute('data-content-delete')});cache.content=cache.content.filter(function(x){return x.id!==delContent.getAttribute('data-content-delete');});renderContent();return;}
    // Kupóny
    var toggleCoupon=e.target.closest('[data-coupon-toggle]');if(toggleCoupon){var coupon=cache.coupons.find(function(x){return x.code===toggleCoupon.getAttribute('data-coupon-toggle');});if(coupon){if(!IS_LOCAL)await rpc('admin_upsert_coupon_v2',{p_code:coupon.code,p_percent:coupon.percent_off,p_products:coupon.products||[],p_active:!coupon.active,p_max_uses:coupon.max_uses,p_description:coupon.description,p_valid_until:coupon.valid_until});coupon.active=!coupon.active;renderSales();}return;}
    var delCoupon=e.target.closest('[data-coupon-delete]');if(delCoupon&&confirm('Opravdu smazat kupón '+delCoupon.getAttribute('data-coupon-delete')+'?')){if(!IS_LOCAL)await rpc('admin_delete_coupon_v2',{p_code:delCoupon.getAttribute('data-coupon-delete')});cache.coupons=cache.coupons.filter(function(x){return x.code!==delCoupon.getAttribute('data-coupon-delete');});renderSales();}
  });

  document.addEventListener('change',async function(e){
    var ls=e.target.closest('[data-lead-status]');
    if(ls){
      var id=ls.getAttribute('data-lead-status'),person=(cache.people||[]).find(function(p){return String(p.lead_id)===String(id);});
      try{if(!IS_LOCAL)await rpc('admin_update_plan_request',{p_id:Number(id),p_status:ls.value,p_note:null});if(person)person.lead_status=ls.value;var det=person&&cache.detail[person.email];if(det&&det.plan_requests&&det.plan_requests[0])det.plan_requests[0].status=ls.value;ls.classList.add('is-saved');setTimeout(function(){ls.classList.remove('is-saved');},900);refreshPeopleTable();}
      catch(err){alert('Stav se neuložil: '+errText(err));}
      return;
    }
    if(e.target.id==='admin-people-sort'){peopleSort=e.target.value;refreshPeopleTable();}
  });

  document.addEventListener('input',function(e){
    if(e.target.closest('[data-email-editor]'))refreshEmailPreview();
    if(e.target.id==='admin-people-search'){peopleQuery=e.target.value;refreshPeopleTable();}
  });

  document.addEventListener('submit',async function(e){
    if(e.target.id==='admin-add-user'){
      e.preventDefault();
      var af=new FormData(e.target),aEmail=String(af.get('email')||'').trim().toLowerCase(),aTier=af.get('tier')||'free';
      var msg=document.getElementById('admin-add-msg');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(aEmail)){if(msg){msg.textContent='Zadej platný e-mail.';msg.className='admin-addform-msg is-err';}return;}
      try{
        if(IS_LOCAL){
          var ex=(cache.people||[]).find(function(x){return x.email===aEmail;});
          if(ex){ex.has_account=true;ex.tier=aTier;ex.account_status='active';}
          else cache.people.unshift({email:aEmail,has_account:true,tier:aTier,account_status:'active',role:'member',created_at:new Date().toISOString(),tools:[]});
        } else {
          await rpc('admin_upsert_user',{p_email:aEmail,p_tier:aTier});
          delete cache.detail[aEmail];
          await loadPeople();
        }
        selectedPerson=aEmail;renderPeople();
        var msg2=document.getElementById('admin-add-msg');if(msg2){msg2.textContent='Hotovo: '+aEmail+' → '+(TIER_LABEL[aTier]||aTier);msg2.className='admin-addform-msg is-ok';}
      }catch(err){var m=document.getElementById('admin-add-msg');if(m){m.textContent='Nepovedlo se: '+((err&&err.message)||'chyba');m.className='admin-addform-msg is-err';}}
      return;
    }
    // Obsah řeší wireContentForm() přímo na formuláři.
    if(e.target.id==='admin-coupon-form'){e.preventDefault();var c=new FormData(e.target),code=String(c.get('code')||'').trim().toUpperCase(),products=c.get('products')?[c.get('products')]:[];if(IS_LOCAL)cache.coupons.unshift({code:code,description:c.get('description'),percent_off:Number(c.get('percent')),products:products,active:true,used_count:0,max_uses:Number(c.get('max_uses'))||null});else{await rpc('admin_upsert_coupon_v2',{p_code:code,p_percent:Number(c.get('percent')),p_products:products,p_active:true,p_max_uses:Number(c.get('max_uses'))||null,p_description:c.get('description')||null,p_valid_until:null});await loadCoupons();}renderSales();}
  });

  document.addEventListener('kenji-auth-ready',boot,{once:true});
  setTimeout(boot,IS_LOCAL?0:4500);
})();
