// ============================================
// KENJI KNIHOVNA — DATABÁZE OBSAHU (MANIFEST)
// ============================================
//
// JEDINÝ zdroj pravdy o článcích a kategoriích.
// Sidebar, vyhledávání i počty u kategorií se generují odsud (viz nav.js).
//
// PŘIDÁNÍ / ZVEŘEJNĚNÍ ČLÁNKU:
//   • napiš HTML do clanky/ a u záznamu změň status: 'soon' → 'published'
//     + doplň url a date.
//   • free vs premium řídí KENJI_FREE_SLUGS dole.
//
// status: 'published' = hotový a klikatelný | 'soon' = naplánovaný (v menu šedý)
// Pořadí v poli = pořadí v rozklikávací kategorii v sidebaru.
// ============================================

const KENJI_CATEGORIES = [
  { id: 'zacatecnik', icon: '🎓', name: 'Začátečník',         desc: 'Fotoslovník a základy. Expozice, kompozice, jak vůbec začít.', path: ['expozice', 'svetlo', 'kompozice'] },
  { id: 'technika',   icon: '📸', name: 'Technika & výbava',   desc: 'Foťáky, objektivy, světla, drony. Co kupovat, čemu se vyhnout.', path: ['jak-vybrat-fotak', 'jak-funguji-objektivy', 'jaky-objektiv'] },
  { id: 'editace',    icon: '🎨', name: 'Nástroje a AI',  desc: 'Lightroom, Photoshop, barvy, AI nástroje. Jak upravovat a tvořit efektivně.', path: ['top-nastroje', 'raw-vs-jpeg', 'skin-tones'] },
  // Speciální kategorie = otevírá vlastní stránku (page), ne accordion s články. Zatím zamčená.
  { id: 'sablony',    icon: '📄', name: 'Šablony',           desc: 'Smlouvy, ceníky, e-maily, model release. Hotové dokumenty ke stažení.', page: 'sablony.html', locked: true },
  { id: 'byznys',     icon: '💼', name: 'Byznys & klienti',    desc: 'Cenotvorba, akvizice, marketing, sales. Jak se tím fakt živit.', path: ['cenik-ktery-prodava', 'prvni-klienti', 'portfolio'] },
  { id: 'obory',      icon: '🎬', name: 'Výdělečné obory',     desc: 'Portrét, svatby, produkt, event. Kolik se v každém oboru vydělá.', path: ['prehled-oboru', 'obor-svatby', 'obor-portret'] },
  { id: 'mindset',    icon: '🧠', name: 'Mindset & růst',      desc: 'Motivace, burnout, srovnávání. Jak to celé ustát dlouhodobě.', path: ['planovani-roku', 'srovnavani', 'burnout'] },
  { id: 'pravo',      icon: '⚖️', name: 'Právo & účetnictví',  desc: 'Smlouvy, autorská práva, daně, fakturace. Bez právničiny.', path: ['smlouvy-pro-fotografy', 'fakturace', 'klient-nezaplatil'] }
];

const KENJI_ARTICLES = [
  // ============ 🎓 ZAČÁTEČNÍK (hotovo) ============
  { slug: 'expozice', url: 'clanky/expozice.html', icon: '🔺', category: 'zacatecnik',
    title: 'Expozice — clona, závěrka a ISO',
    desc: 'Tři páky, co rozhodují o každé fotce. Plus jak si nastavit foťák.',
    status: 'published', date: '2026-05-30',
    tags: ['iso','clona','závěrka','expozice','základy','režimy','av','tv','custom módy'] },
  { slug: 'ohnisko', url: 'clanky/ohnisko.html', icon: '🔭', category: 'zacatecnik',
    title: 'Ohnisková vzdálenost — co znamenají ty mm',
    desc: 'Široké vs dlouhé, komprese perspektivy a crop faktor. Jaký objektiv na co.',
    status: 'published', date: '2026-05-30',
    tags: ['ohnisko','objektiv','mm','crop faktor','aps-c','full frame','perspektiva','tele','širák'] },
  { slug: 'white-balance', url: 'clanky/white-balance.html', icon: '🌡', category: 'zacatecnik',
    title: 'White balance — vyvážení bílé',
    desc: 'Proč jsou fotky moc žluté nebo modré, teplota barev a kdy selhává auto WB.',
    status: 'published', date: '2026-05-30',
    tags: ['white balance','vyvážení bílé','kelvin','teplota barev','wb','barvy','awb'] },
  { slug: 'hloubka-ostrosti', url: 'clanky/hloubka-ostrosti.html', icon: '🌫', category: 'zacatecnik',
    title: 'Hloubka ostrosti — jak rozmazat pozadí',
    desc: 'Tři faktory, co řídí ostrost, bokeh a kdy chceš naopak ostré všechno.',
    status: 'published', date: '2026-05-30',
    tags: ['hloubka ostrosti','bokeh','rozmazané pozadí','clona','dof','ostrost'] },
  { slug: 'raw-vs-jpeg', url: 'clanky/raw-vs-jpeg.html', icon: '📁', category: 'zacatecnik',
    title: 'RAW vs JPEG — který formát fotit',
    desc: 'Rozdíl mezi formáty, kdy fotit který a proč ti RAW zachrání zkaženou fotku.',
    status: 'published', date: '2026-05-30',
    tags: ['raw','jpeg','formát','editace','soubory','kvalita'] },
  { slug: 'autofocus', url: 'clanky/autofocus.html', icon: '🎯', category: 'zacatecnik',
    title: 'Autofocus — režimy ostření a Eye AF',
    desc: 'Single vs continuous, oblasti ostření a Eye AF. Ať máš fotky konečně ostré.',
    status: 'published', date: '2026-05-30',
    tags: ['autofocus','af','ostření','eye af','af-c','af-s','servo','tracking','ostrost'] },
  { slug: 'svetlo', url: 'clanky/svetlo.html', icon: '💡', category: 'zacatecnik',
    title: 'Práce se světlem — základ, co rozhoduje o všem',
    desc: 'Měkké vs tvrdé, směr světla, zlatá hodinka a okenní světlo. Proč fotky září.',
    status: 'published', date: '2026-05-30',
    tags: ['světlo','osvětlení','zlatá hodinka','měkké světlo','tvrdé světlo','protisvětlo','okno','přirozené světlo'] },
  { slug: 'kompozice', url: 'clanky/kompozice.html', icon: '📐', category: 'zacatecnik',
    title: 'Kompozice — základy, co dělají fotku silnou',
    desc: 'Pravidlo třetin, vodící linie, rámování a hloubka. Ať fotky drží pohromadě.',
    status: 'published', date: '2026-05-30',
    tags: ['kompozice','pravidlo třetin','vodící linie','rámování','composition'] },

  // ============ 📸 TECHNIKA & VÝBAVA ============
  { slug: 'jak-vybrat-fotak', url: 'clanky/jak-vybrat-fotak.html', icon: '📷', category: 'technika',
    title: 'Jak vybrat první foťák', desc: 'Bez marketingových keců. Co řešit, co je jedno + modely 2026.',
    status: 'published', date: '2026-05-30',
    tags: ['foťák','body','sony','canon','nikon','fujifilm','mirrorless','aps-c','full frame','začátek'] },
  { slug: 'aps-c-vs-full-frame', url: 'clanky/aps-c-vs-full-frame.html', icon: '🔲', category: 'technika',
    title: 'APS-C vs Full Frame — kdy co', desc: 'Velikost čipu, co ti reálně přinese a kdy se full frame vyplatí.',
    status: 'published', date: '2026-05-30',
    tags: ['aps-c','full frame','čip','senzor','crop','bokeh','iso'] },
  { slug: 'jak-funguji-objektivy', url: 'clanky/jak-funguji-objektivy.html', icon: '🔬', category: 'technika',
    title: 'Jak fungují objektivy', desc: 'Ohnisko, světelnost, stabilizace, bajonet a jak číst název skla.',
    status: 'published', date: '2026-05-30',
    tags: ['objektiv','sklo','clona','světelnost','bajonet','stabilizace','prime','zoom'] },
  { slug: 'jaky-objektiv', url: 'clanky/jaky-objektiv.html', icon: '🧰', category: 'technika',
    title: 'Jaký objektiv na co', desc: 'Portrét, svatba, krajina, produkt, sport → konkrétní ohniska a kde začít.',
    status: 'published', date: '2026-05-30',
    tags: ['objektiv','doporučení','portrét','svatba','krajina','85mm','24-70','svatá trojka'] },
  { slug: 'drony', url: 'clanky/drony.html', icon: '🚁', category: 'technika',
    title: 'Drony pro fotografy — kompletní průvodce',
    desc: 'Legislativa 2026, jaký dron vybrat a jak ho monetizovat ve focení.',
    status: 'published', date: '2026-05-01',
    tags: ['dron','dji','legislativa','letecké záběry','video'] },
  { slug: 'druhy-svetel', url: 'clanky/druhy-svetel.html', icon: '🔦', category: 'technika',
    title: 'Druhy světel — trvalé vs záblesk', desc: 'Continuous vs blesk, key/fill/rim, modifikátory a co pořídit první.',
    status: 'published', date: '2026-05-30',
    tags: ['světla','studio','softbox','continuous','blesk','strobe','godox','aputure','key light','modifikátory'] },
  { slug: 'blesky', url: 'clanky/blesky.html', icon: '⚡', category: 'technika',
    title: 'Jak fungují blesky a jak je používat', desc: 'TTL, HSS, off-camera, bounce. Plesy, svatby, eventy + co pořídit.',
    status: 'published', date: '2026-05-30',
    tags: ['blesk','hss','ttl','off-camera','speedlight','bounce','godox','v1','plesy','eventy'] },
  { slug: 'mikrofony-pro-video', url: 'clanky/mikrofony-pro-video.html', icon: '🎙', category: 'technika',
    title: 'Mikrofony pro video', desc: 'Lavalier, shotgun, podcast, 32-bit float a co pořídit. Proč zvuk prodává.',
    status: 'published', date: '2026-05-30',
    tags: ['mikrofon','audio','video','lavalier','shotgun','dji mic','rode','podcast','32-bit float'] },

  // ============ 🎨 NÁSTROJE & EDITACE ============
  { slug: 'top-nastroje', url: 'clanky/top-nastroje.html', icon: '🛠', category: 'editace',
    title: 'TOP programy a nástroje pro tvůrce', desc: 'Lightroom, Photoshop, Capture One, DaVinci, Premiere + AI. Kde neplatit zbytečně.',
    status: 'published', date: '2026-05-30',
    tags: ['lightroom','photoshop','davinci','capture one','premiere','affinity','topaz','ai','software','editace'] },
  { slug: 'skin-tones', url: 'clanky/skin-tones.html', icon: '🎨', category: 'editace',
    title: 'Skin tones — jak je nikdy nezkazit', desc: 'Věrná pleť krok za krokem: white balance, HSL, sytost. Nejčastější omyly.',
    status: 'published', date: '2026-05-30',
    tags: ['skin tones','pleť','barvy','lightroom','hsl','white balance','tonalita'] },
  { slug: 'ai-pro-tvurce', url: 'clanky/ai-pro-tvurce.html', icon: '🤖', category: 'editace',
    title: 'AI pro tvůrce — nečestná výhoda', desc: 'Web za odpoledne, hledání klientů a kontaktů, grafika i smlouvy. Co dnes AI udělá za tebe a kde platit.',
    status: 'published', date: '2026-06-02',
    tags: ['ai','chatgpt','claude','gemini','lovable','web','akvizice','klienti','karusely','grafika','smlouvy','automatizace','nástroje'] },

  // ============ 💼 BYZNYS & KLIENTI ============
  // -- Cenotvorba --
  { slug: 'cenik-ktery-prodava', url: 'clanky/cenik-ktery-prodava.html', icon: '💰', category: 'byznys',
    title: 'Jak postavit ceník, který prodává', desc: 'Balíčky místo položek, tři úrovně, kotvení ceny a jak ceník podat.',
    status: 'published', date: '2026-05-30',
    tags: ['ceník','cenotvorba','balíčky','prodej','kotvení','anchoring','tři úrovně'] },
  { slug: 'hodina-vs-balicky', url: 'clanky/hodina-vs-balicky.html', icon: '📦', category: 'byznys',
    title: 'Hodina vs balíčky vs hodnotová cena', desc: 'Jak účtovat, abys nevyměnil čas za drobné. Tři modely, tři výsledky.',
    status: 'published', date: '2026-05-30',
    tags: ['cena','balíčky','hodinovka','value','hodnotová cena','účtování'] },
  { slug: 'cenova-psychologie', url: 'clanky/cenova-psychologie.html', icon: '💸', category: 'byznys',
    title: 'Cenová psychologie', desc: 'Kotvení, návnada, charm pricing a rámování. Jak prezentace ceny prodává.',
    status: 'published', date: '2026-05-30',
    tags: ['psychologie','cena','prodej','kotvení','anchoring','decoy','charm pricing','framing'] },
  { slug: 'cenove-urovne', url: 'clanky/cenove-urovne.html', icon: '📊', category: 'byznys',
    title: 'Cenové úrovně — entry, standard, premium', desc: 'Kde se na trhu zařadit, jaká klientela u každé úrovně a jak růst nahoru.',
    status: 'published', date: '2026-05-30',
    tags: ['ceník','úrovně','premium','pozicování','trh','positioning'] },
  { slug: 'kdy-zdrazit', url: 'clanky/kdy-zdrazit.html', icon: '📈', category: 'byznys',
    title: 'Kdy a jak zdražit', desc: 'Pět signálů, že je čas, a jak zdražit chytře bez ztráty klientů.',
    status: 'published', date: '2026-05-30',
    tags: ['zdražení','cena','marže','růst','klienti'] },
  { slug: 'konkurence-pozice', url: 'clanky/konkurence-pozice.html', icon: '🥊', category: 'byznys',
    title: 'Konkurence a tržní pozice', desc: 'Jak se odlišit specializací, stylem a nikou, abys přestal soutěžit cenou.',
    status: 'published', date: '2026-05-30',
    tags: ['konkurence','pozicování','trh','odlišení','specializace','nika','styl'] },
  // -- Akvizice --
  { slug: '5-chyb-fotografu', url: 'clanky/5-chyb-fotografu.html', icon: '🔥', category: 'byznys',
    title: '5 chyb, co drží 90 % fotografů pod 2M ročně',
    desc: 'Strukturální chyby, které ti krvácí peníze, i když máš plný kalendář.',
    status: 'published', date: '2026-04-15',
    tags: ['cenotvorba','byznys','peníze','zisk','chyby'] },
  { slug: 'prvni-klienti', url: 'clanky/prvni-klienti.html', icon: '🤝', category: 'byznys',
    title: 'Jak získat první klienty', desc: 'Pět cest k prvním zakázkám, když nemáš jméno ani portfolio.',
    status: 'published', date: '2026-05-30',
    tags: ['klienti','akvizice','začátek','portfolio','reference'] },
  { slug: 'cold-outreach', url: 'clanky/cold-outreach.html', icon: '📧', category: 'byznys',
    title: 'Cold outreach pro fotografy', desc: 'Komu psát, jak složit zprávu a follow-up, aby ti firmy odepsaly a koupily.',
    status: 'published', date: '2026-05-30',
    tags: ['outreach','oslovení','b2b','akvizice','e-mail','firmy'] },
  { slug: 'networking', url: 'clanky/networking.html', icon: '🌐', category: 'byznys',
    title: 'Networking, který fakt funguje', desc: 'Bez trapnosti. Dávej první, ber kolegy jako spojence, pěstuj vztahy.',
    status: 'published', date: '2026-05-30',
    tags: ['networking','kontakty','vztahy','doporučení','kolegové'] },
  { slug: 'spoluprace-partneri', url: 'clanky/spoluprace-partneri.html', icon: '🤵', category: 'byznys',
    title: 'Spolupráce s plannery, makléři a agenturami', desc: 'Partnerství, co ti naplní kalendář cizíma rukama. S kým a jak.',
    status: 'published', date: '2026-05-30',
    tags: ['partnerství','wedding planner','makléři','agentury','doporučení','win-win'] },
  { slug: 'doporucovaci-system', url: 'clanky/doporucovaci-system.html', icon: '🔁', category: 'byznys',
    title: 'Doporučovací systém', desc: 'Jak z každého klienta systematicky udělat zdroj dalších klientů.',
    status: 'published', date: '2026-05-30',
    tags: ['doporučení','referral','klienti','systém','marketing'] },
  { slug: 'lead-magnety', url: 'clanky/lead-magnety.html', icon: '🧲', category: 'byznys',
    title: 'Lead magnety pro fotografy', desc: 'Co nabídnout zdarma za kontakt a jak z toho udělat klienty.',
    status: 'published', date: '2026-05-30',
    tags: ['lead magnet','e-mail','akvizice','kontakty','pdf'] },
  { slug: 'funnel', url: 'clanky/funnel.html', icon: '🪜', category: 'byznys',
    title: 'Funnel od prvního dotyku po podpis', desc: 'Čtyři fáze cesty klienta a kde lidi odpadávají. Ať nic neuteče.',
    status: 'published', date: '2026-05-30',
    tags: ['funnel','prodej','cesta klienta','konverze','akvizice'] },
  // -- Marketing & osobní brand --
  { slug: 'instagram', url: 'clanky/instagram.html', icon: '📲', category: 'byznys',
    title: 'Instagram pro fotografy 2026', desc: 'Co táhne dosah, jaký mix obsahu postovat a jak z lajků udělat klienty.',
    status: 'published', date: '2026-05-30',
    tags: ['instagram','social','reach','marketing','reels','algoritmus','dosah'] },
  { slug: 'youtube', url: 'clanky/youtube.html', icon: '▶️', category: 'byznys',
    title: 'YouTube strategie pro fotografy', desc: 'Dlouhá hra, co staví autoritu, klienty i druhý příjem. Co točit.',
    status: 'published', date: '2026-05-30',
    tags: ['youtube','video','obsah','brand','autorita','seo'] },
  { slug: 'tiktok', url: 'clanky/tiktok.html', icon: '🎵', category: 'byznys',
    title: 'TikTok — má to pro tebe smysl?', desc: 'Kdy do toho jít, kdy je to žrout času a jak z dosahu udělat klienty.',
    status: 'published', date: '2026-05-30',
    tags: ['tiktok','social','video','dosah','marketing'] },
  { slug: 'portfolio', url: 'clanky/portfolio.html', icon: '🖥', category: 'byznys',
    title: 'Webové portfolio — co tam dát', desc: 'Co patří na web, aby prodával, a co ho zabíjí. Méně je víc.',
    status: 'published', date: '2026-05-30',
    tags: ['portfolio','web','prezentace','cta','reference'] },
  { slug: 'seo', url: 'clanky/seo.html', icon: '🔍', category: 'byznys',
    title: 'SEO základy pro fotografy', desc: 'Google Business Profile, klíčová slova, alt texty a recenze. Ať tě najdou.',
    status: 'published', date: '2026-05-30',
    tags: ['seo','google','web','vyhledávání','google business profile','lokální seo','recenze'] },
  { slug: 'email-marketing', url: 'clanky/email-marketing.html', icon: '✉️', category: 'byznys',
    title: 'E-mail marketing pro fotografy', desc: 'Kanál, co vlastníš a prodává na autopilota. Co posílat a jak začít.',
    status: 'published', date: '2026-05-30',
    tags: ['e-mail','newsletter','marketing','seznam','automatizace'] },
  { slug: 'storytelling', url: 'clanky/storytelling.html', icon: '📖', category: 'byznys',
    title: 'Storytelling v marketingu', desc: 'Jak vyprávět svůj příběh, udělat z klienta hrdinu a prodávat emocí.',
    status: 'published', date: '2026-05-30',
    tags: ['storytelling','příběh','marketing','emoce','značka'] },
  // -- Sales & klientská komunikace --
  { slug: 'discovery-call', url: 'clanky/discovery-call.html', icon: '📞', category: 'byznys',
    title: 'Discovery call — jak ho vést', desc: 'První hovor, co uzavře zakázku. Ptej se, naslouchej, ceník až nakonec.',
    status: 'published', date: '2026-05-30',
    tags: ['hovor','sales','klient','prodej','discovery'] },
  { slug: 'prezentace-ceniku', url: 'clanky/prezentace-ceniku.html', icon: '💬', category: 'byznys',
    title: 'Jak prezentovat ceník bez ostychu', desc: 'Řekni si o peníze sebevědomě, bez omluv a bez snižování ceny.',
    status: 'published', date: '2026-05-30',
    tags: ['ceník','prezentace','sales','sebevědomí','cena'] },
  { slug: 'namitky', url: 'clanky/namitky.html', icon: '🛡', category: 'byznys',
    title: 'Námitky a jak je řešit', desc: '„Je to drahé", „rozmyslím si to" a další klasiky — a co na ně.',
    status: 'published', date: '2026-05-30',
    tags: ['námitky','sales','prodej','cena','komunikace'] },
  { slug: 'upsell', url: 'clanky/upsell.html', icon: '⬆️', category: 'byznys',
    title: 'Upsell techniky', desc: 'Jak zvednout hodnotu zakázky bez vnucování. Upgrady, alba, načasování.',
    status: 'published', date: '2026-05-30',
    tags: ['upsell','prodej','hodnota','alba','balíčky'] },
  { slug: 'onboarding', url: 'clanky/onboarding.html', icon: '📋', category: 'byznys',
    title: 'Klientská onboarding sekvence', desc: 'Od podpisu po focení tak, aby klient miloval celý proces.',
    status: 'published', date: '2026-05-30',
    tags: ['onboarding','klient','proces','komunikace','zážitek'] },
  { slug: 'difficult-clients', url: 'clanky/difficult-clients.html', icon: '🚩', category: 'byznys',
    title: 'Difficult clients — kdy odmítnout', desc: 'Jak poznat průšvih dopředu podle signálů a jak slušně říct ne.',
    status: 'published', date: '2026-05-30',
    tags: ['klienti','hranice','odmítnutí','red flags','komunikace'] },
  { slug: 'follow-up', url: 'clanky/follow-up.html', icon: '🔔', category: 'byznys',
    title: 'Follow-up po dodání práce', desc: 'Co udělat po zakázce, ať se klient vrátí, doporučí a nechá recenzi.',
    status: 'published', date: '2026-05-30',
    tags: ['follow-up','retence','klient','recenze','doporučení'] },

  // ============ 🎬 VÝDĚLEČNÉ OBORY ============
  { slug: 'prehled-oboru', url: 'clanky/prehled-oboru.html', icon: '🎬', category: 'obory',
    title: 'Přehled výdělečných foto-video oborů', desc: 'Co se v ČR vyplatí, kolik se vydělá, bariéra a sezónnost. Mapa pro výběr.',
    status: 'published', date: '2026-05-30',
    tags: ['obory','specializace','výdělek','přehled','bariéra','sezónnost'] },
  { slug: 'obor-portret', url: 'clanky/obor-portret.html', icon: '👤', category: 'obory',
    title: 'Portrét', desc: 'Kde jsou v portrétu peníze a jak vyniknout v přeplněném oboru.',
    status: 'published', date: '2026-05-30',
    tags: ['portrét','obor','headshot','rodina','branding'] },
  { slug: 'obor-svatby', url: 'clanky/obor-svatby.html', icon: '💍', category: 'obory',
    title: 'Svatby', desc: 'Nejvýdělečnější obor — co obnáší, co potřebuješ a jak nacenit.',
    status: 'published', date: '2026-05-30',
    tags: ['svatby','wedding','obor','záloha','balíčky'] },
  { slug: 'obor-maturity-plesy', url: 'clanky/obor-maturity-plesy.html', icon: '🕺', category: 'obory',
    title: 'Maturity & plesy', desc: 'Sezónní mašina na peníze: blesk v sále, objem a prodej fotek.',
    status: 'published', date: '2026-05-30',
    tags: ['maturity','plesy','event','blesk','sezóna','prodej'] },
  { slug: 'obor-reportaz', url: 'clanky/obor-reportaz.html', icon: '📰', category: 'obory',
    title: 'Reportáž & event', desc: 'Firemní akce a konference — stabilní celoroční příjem z firemních rozpočtů.',
    status: 'published', date: '2026-05-30',
    tags: ['reportáž','event','firmy','b2b','konference','agentury'] },
  { slug: 'obor-produkt', url: 'clanky/obor-produkt.html', icon: '🛍', category: 'obory',
    title: 'Produktové focení', desc: 'Nejstabilnější obor: e-shopy a značky platí za konzistenci celoročně.',
    status: 'published', date: '2026-05-30',
    tags: ['produkt','e-shop','komerční','světlo','konzistence'] },
  { slug: 'obor-architektura', url: 'clanky/obor-architektura.html', icon: '🏛', category: 'obory',
    title: 'Architektura & nemovitosti', desc: 'Reality a interiéry — vděčný a stabilní obor s opakovanými makléři.',
    status: 'published', date: '2026-05-30',
    tags: ['architektura','nemovitosti','reality','interiér','airbnb','makléři'] },
  { slug: 'obor-moda', url: 'clanky/obor-moda.html', icon: '👗', category: 'obory',
    title: 'Móda & beauty', desc: 'Prestižní obor pro pokročilé: tým, koncept a jak se dostat ke značkám.',
    status: 'published', date: '2026-05-30',
    tags: ['móda','beauty','editorial','tým','tfp','lookbook'] },
  { slug: 'obor-newborn', url: 'clanky/obor-newborn.html', icon: '👶', category: 'obory',
    title: 'Newborn & rodina', desc: 'Citlivý obor s věrnými klienty: bezpečí miminka a opakování přes etapy.',
    status: 'published', date: '2026-05-30',
    tags: ['newborn','rodina','miminka','bezpečí','opakování'] },
  { slug: 'obor-sport', url: 'clanky/obor-sport.html', icon: '⚽', category: 'obory',
    title: 'Sport', desc: 'Akce, rychlost, dlouhá skla a kdo za sportovní focení platí.',
    status: 'published', date: '2026-05-30',
    tags: ['sport','akce','tele','autofocus','kluby'] },
  { slug: 'obor-niche', url: 'clanky/obor-niche.html', icon: '💎', category: 'obory',
    title: 'Niche obory — málo konkurence, vášniví klienti', desc: 'Influenceři, drahé hodinky, doutníky, auta, psi. Úzké niche, kde se dobře platí.',
    status: 'published', date: '2026-05-30',
    tags: ['niche','influenceři','hodinky','auta','psi','luxus','specializace','ugc'] },

  // ============ 🧠 MINDSET & RŮST ============
  { slug: 'imposter-syndrom', url: 'clanky/imposter-syndrom.html', icon: '🧠', category: 'mindset',
    title: 'Imposter syndrom u kreativců', desc: 'Proč si i dobří tvůrci připadají jako podvodníci — a jak s tím pracovat.',
    status: 'published', date: '2026-05-30',
    tags: ['mindset','imposter','sebevědomí','pochybnosti','psychika'] },
  { slug: 'creative-block', url: 'clanky/creative-block.html', icon: '🧩', category: 'mindset',
    title: 'Creative block — jak ho prolomit', desc: 'Když vyschnou nápady: omezení, hra, vypnout cizí tvorbu a prostě začít.',
    status: 'published', date: '2026-05-30',
    tags: ['kreativita','blok','motivace','inspirace'] },
  { slug: 'motivace-slow', url: 'clanky/motivace-slow.html', icon: '🔋', category: 'mindset',
    title: 'Jak si držet motivaci v slow sezoně', desc: 'Když nejedou zakázky: drž rutinu, stavěj na příští sezonu, neztrácej smysl.',
    status: 'published', date: '2026-05-30',
    tags: ['motivace','sezona','disciplína','slow'] },
  { slug: 'burnout', url: 'clanky/burnout.html', icon: '😮‍💨', category: 'mindset',
    title: 'Burnout — předcházení', desc: 'Jak nevyhořet z koníčku-práce: hranice, výběr zakázek, odpočinek, jiskra.',
    status: 'published', date: '2026-05-30',
    tags: ['burnout','vyhoření','rovnováha','hranice','odpočinek'] },
  { slug: 'fotit-pro-sebe', url: 'clanky/fotit-pro-sebe.html', icon: '❤️', category: 'mindset',
    title: 'Jak nepřestat fotit pro sebe', desc: 'Udržet radost a osobní tvorbu, i když z focení žiješ. Palivo tvého stylu.',
    status: 'published', date: '2026-05-30',
    tags: ['radost','osobní projekty','tvorba','styl'] },
  { slug: 'negativni-recenze', url: 'clanky/negativni-recenze.html', icon: '⭐', category: 'mindset',
    title: 'Jak číst negativní recenze', desc: 'Oddělit konstruktivní od jedovaté, nebrat osobně, reagovat profesionálně.',
    status: 'published', date: '2026-05-30',
    tags: ['recenze','kritika','psychika','zpětná vazba'] },
  { slug: 'srovnavani', url: 'clanky/srovnavani.html', icon: '📱', category: 'mindset',
    title: 'Srovnávání na sociálních sítích', desc: 'Proč ti Instagram kazí radost a jak se přestat měřit cizí výkladní skříní.',
    status: 'published', date: '2026-05-30',
    tags: ['srovnávání','social','psychika','instagram'] },
  { slug: 'planovani-roku', url: 'clanky/planovani-roku.html', icon: '🗓', category: 'mindset',
    title: 'Plánování roku a goal setting', desc: 'Příjmový cíl, sezóny, konkrétní cíle a měsíční revize. Řiď byznys, ne naopak.',
    status: 'published', date: '2026-05-30',
    tags: ['plánování','cíle','strategie','příjem','goal setting'] },
  { slug: 'pomala-sezona', url: 'clanky/pomala-sezona.html', icon: '❄️', category: 'mindset',
    title: 'Pomalá sezona — co dělat', desc: 'Konkrétní checklist: audit, web, vzdělávání, obsah, networking — i odpočinek.',
    status: 'published', date: '2026-05-30',
    tags: ['sezona','plánování','rozvoj','checklist'] },
  { slug: 'rodina-freelance', url: 'clanky/rodina-freelance.html', icon: '🏠', category: 'mindset',
    title: 'Rodina + freelance — jak to ustát', desc: 'Hranice, kolísavý příjem, čas a vina. Jak nezklamat byznys ani blízké.',
    status: 'published', date: '2026-05-30',
    tags: ['rodina','freelance','rovnováha','hranice','čas'] },

  // ============ ⚖️ PRÁVO & ÚČETNICTVÍ ============
  { slug: 'smlouvy-pro-fotografy', url: 'clanky/smlouvy-pro-fotografy.html', icon: '⚖️', category: 'pravo',
    title: 'Smlouvy pro fotografy — co tam musí být', desc: 'Předmět, cena, záloha, storno, termín, licence, GDPR. Lidsky, bez paragrafů.',
    status: 'published', date: '2026-05-30',
    tags: ['smlouva','právo','klient','storno','licence','záloha'] },
  { slug: 'autorska-prava', url: 'clanky/autorska-prava.html', icon: '©️', category: 'pravo',
    title: 'Autorská práva v praxi', desc: 'Komu patří fotky, osobnostní vs majetková práva a licence místo prodeje.',
    status: 'published', date: '2026-05-30',
    tags: ['autorská práva','licence','copyright','majetková práva'] },
  { slug: 'souhlas-foceni', url: 'clanky/souhlas-foceni.html', icon: '✍️', category: 'pravo',
    title: 'Souhlas s focením (model & property release)', desc: 'Kdy potřebuješ souhlas s podobiznou, model a property release a výjimky.',
    status: 'published', date: '2026-05-30',
    tags: ['souhlas','model release','property release','podobizna','ochrana osobnosti'] },
  { slug: 'gdpr', url: 'clanky/gdpr.html', icon: '🔐', category: 'pravo',
    title: 'GDPR pro fotografy', desc: 'Jaké údaje máš, právní důvod, zabezpečení a práva klientů. Lidsky.',
    status: 'published', date: '2026-05-30',
    tags: ['gdpr','osobní údaje','ochrana','souhlas','data'] },
  { slug: 'fakturace', url: 'clanky/fakturace.html', icon: '🧾', category: 'pravo',
    title: 'Fakturace, OSVČ vs s.r.o.', desc: 'Živnost, náležitosti faktury, DPH limit a kdy přejít na firmu. Lidsky.',
    status: 'published', date: '2026-05-30',
    tags: ['fakturace','osvč','sro','daně','dph','živnost'] },
  { slug: 'pausal-vs-vydaje', url: 'clanky/pausal-vs-vydaje.html', icon: '🧮', category: 'pravo',
    title: 'Paušál vs reálné výdaje', desc: 'Paušální daň, výdajový paušál a reálné výdaje — co je co a kdy se vyplatí.',
    status: 'published', date: '2026-05-30',
    tags: ['daně','paušál','výdaje','účetnictví','paušální daň','výdajový paušál'] },
  { slug: 'socialni-zdravotni-osvc', url: 'clanky/socialni-zdravotni-osvc.html', icon: '🩺', category: 'pravo',
    title: 'Sociální a zdravotní pojištění OSVČ', desc: 'Zálohy, minimální základy 2026 a jak to funguje. Na co začátečníci doplácí.',
    status: 'published', date: '2026-05-30',
    tags: ['sociální','zdravotní','pojištění','osvč','zálohy','čssz'] },
  { slug: 'hlavni-vedlejsi-cinnost', url: 'clanky/hlavni-vedlejsi-cinnost.html', icon: '🔀', category: 'pravo',
    title: 'Hlavní vs vedlejší činnost', desc: 'Fotíš při zaměstnání, studiu či rodičovské? Mírnější pravidla a zálohy.',
    status: 'published', date: '2026-05-30',
    tags: ['vedlejší činnost','hlavní činnost','osvč','zaměstnání','studium','zálohy'] },
  { slug: 'danove-naklady', url: 'clanky/danove-naklady.html', icon: '📒', category: 'pravo',
    title: 'Co si dát do nákladů (daňové výdaje)', desc: 'Technika, auto, home office, software — jak legálně snížit daň.',
    status: 'published', date: '2026-05-30',
    tags: ['náklady','výdaje','daně','odpisy','technika','home office'] },
  { slug: 'pojisteni', url: 'clanky/pojisteni.html', icon: '☂️', category: 'pravo',
    title: 'Pojištění (odpovědnost, technika)', desc: 'Pojištění odpovědnosti a techniky: co krýt, na co se ptát a pozor na výluky.',
    status: 'published', date: '2026-05-30',
    tags: ['pojištění','odpovědnost','technika','krádež','škoda'] },
  { slug: 'fakturace-do-zahranici', url: 'clanky/fakturace-do-zahranici.html', icon: '🌍', category: 'pravo',
    title: 'Fakturace do zahraničí', desc: 'Služba firmě v EU, reverse charge, identifikovaná osoba a klient mimo EU.',
    status: 'published', date: '2026-05-30',
    tags: ['fakturace','zahraničí','dph','reverse charge','identifikovaná osoba','eu'] },
  { slug: 'reklama-ze-zahranici', url: 'clanky/reklama-ze-zahranici.html', icon: '📣', category: 'pravo',
    title: 'Daň z reklamy ze zahraničí (Facebook, Google)', desc: 'Proč musíš danit reklamu na FB a Googlu i jako neplátce DPH. Identifikovaná osoba.',
    status: 'published', date: '2026-05-30',
    tags: ['reklama','facebook','google','dph','identifikovaná osoba','reverse charge'] },
  { slug: 'klient-nezaplatil', url: 'clanky/klient-nezaplatil.html', icon: '🚫', category: 'pravo',
    title: 'Jak řešit, když klient nezaplatí', desc: 'Prevence (záloha, fotky po platbě) i postup od upomínky po výzvu.',
    status: 'published', date: '2026-05-30',
    tags: ['neplatič','vymáhání','faktura','záloha','upomínka'] }
];

// --- PŘÍSTUP / PAYWALL ---
// Slugy článků ZDARMA (vidí je i nečlen). Vše ostatní = PREMIUM (~75 % zamčeno).
// Free články jsou lákadlo do placené Kenji Academy.
const KENJI_FREE_SLUGS = [
  'expozice',                 // základ, bez kterého se člověk nechytí
  'svetlo',                   // velké "aha", které hned zlepší fotky
  'kompozice',                // rychlá hodnota i bez nové techniky
  'ohnisko',                  // základ techniky, free
  'white-balance',            // základ techniky, free
  'jak-vybrat-fotak',         // šetří peníze při prvním nákupu
  'jaky-objektiv',            // konkrétní výběr podle oboru a rozpočtu
  '5-chyb-fotografu',         // silný byznysový teaser
  'cenik-ktery-prodava',      // ukazuje, že knihovna vydělává peníze
  'konkurence-pozice',        // strategická hodnota proti soutěžení cenou
  'cold-outreach',            // konkrétní akvizice klientů
  'portfolio',                // praktický audit prodejního webu
  'prehled-oboru',            // mapa, kde jsou ve foto-video peníze
  'obor-svatby',              // silný výdělečný obor
  'planovani-roku',           // řízení byznysu, ne jen mindset
  'smlouvy-pro-fotografy',    // vysoká důvěra a profesionalita
  'klient-nezaplatil'         // bolestivý problém s okamžitou hodnotou
];

// --- VIDEA V AKADEMII (zamčený video player na konci článku) ---
// U článků, ke kterým máš v placené Kenji Academy video, přidej záznam.
// nav.js pak na konci článku automaticky vykreslí zamčený "přehrávač",
// po kliknutí odkáže do akademie. Článek BEZ záznamu nic nepřidá.
//
// Záznam (vše kromě title je volitelné):
//   'slug-clanku': {
//     title:     'Název videa',        // co se ukáže
//     placement: 'mid' | 'end',        // 'mid' = za 1. blok karet, jinak konec (default)
//     duration:  '18 min',             // volitelně délka
//     thumb:     'assets/...jpg',       // volitelně vlastní náhled (jinak _defaultThumb)
//     url:       'https://...'          // volitelně vlastní odkaz (jinak _academyUrl)
//   }
const KENJI_VIDEOS = {
  // Společný odkaz do akademie (když video nemá vlastní url)
  _academyUrl: 'academy.html',
  // Společný náhled (fotka Kenjiho 16:9) — rozmaže se a ztmaví automaticky (CSS)
  _defaultThumb: 'assets/kenji-video.webp',

  // course = slug videokurzu (kurz.html?slug=…), kam členské video patří.
  // Napárováno podle názvů lekcí v assets/courses.js.

  // ── 🎓 ZÁKLADY & TECHNIKA → kurz „zaklady-technika" ──
  'expozice':            { title: 'Expozice', duration: '14 min', placement: 'mid', course: 'zaklady-technika' },
  'hloubka-ostrosti':    { title: 'Jak zmáknout clonu', duration: '11 min', placement: 'mid', course: 'zaklady-technika' },
  'autofocus':           { title: 'Autofocus', duration: '12 min', course: 'zaklady-technika' },
  'raw-vs-jpeg':         { title: 'RAW vs JPG', duration: '9 min', course: 'zaklady-technika' },
  'kompozice':           { title: 'Potřebuješ fotografické oko?', duration: '13 min', course: 'zaklady-technika' },
  'svetlo':              { title: 'Základy svícení', duration: '16 min', placement: 'mid', course: 'zaklady-technika' },
  'jak-vybrat-fotak':    { title: 'Potřebuju lepší techniku?', duration: '18 min', placement: 'mid', course: 'zaklady-technika' },
  'jak-funguji-objektivy': { title: 'Objektivy', duration: '15 min', course: 'zaklady-technika' },
  'druhy-svetel':        { title: 'Základy svícení', duration: '16 min', course: 'zaklady-technika' },

  // ── 🎨 EDITACE → kurz „zaklady-technika" (modul Úprava fotek) ──
  'top-nastroje':        { title: 'Masterclass úpravy fotek', duration: '23 min', placement: 'mid', course: 'zaklady-technika' },
  'skin-tones':          { title: 'Color grading v Lightroomu a Photoshopu', duration: '19 min', course: 'zaklady-technika' },

  // ── 💼 BYZNYS & KLIENTI → kurz „foceni-jako-byznys" ──
  // 🎁 UKÁZKA ZDARMA (reciprocita — dáme hodnotu dřív, než chceme registraci/platbu).
  // Doplň `youtube: 'VIDEO_ID'` a video se přehraje přímo v článku i nečlenům.
  'cenik-ktery-prodava': { title: 'Úvod do cenotvorby', duration: '21 min', placement: 'mid', course: 'foceni-jako-byznys', free: true, youtube: null },
  'cenove-urovne':       { title: 'Cenotvorba', duration: '17 min', course: 'foceni-jako-byznys' },
  '5-chyb-fotografu':    { title: 'Podhodnocování zakázek', duration: '24 min', course: 'foceni-jako-byznys' },
  'prehled-oboru':       { title: 'Zvol si obor', duration: '15 min', course: 'foceni-jako-byznys' },
  'prvni-klienti':       { title: 'Jak získávat klienty?', duration: '22 min', placement: 'mid', course: 'foceni-jako-byznys' },
  'portfolio':           { title: 'Jak postavit prodejní web', duration: '19 min', course: 'foceni-jako-byznys' },
  'doporucovaci-system': { title: 'Doporučení, follow-up a upsell', duration: '18 min', course: 'foceni-jako-byznys' },
  'follow-up':           { title: 'Doporučení, follow-up a upsell', duration: '18 min', course: 'foceni-jako-byznys' },
  'upsell':              { title: 'Doporučení, follow-up a upsell', duration: '18 min', course: 'foceni-jako-byznys' },
  'cold-outreach':       { title: 'Oslovuj svoje klienty', duration: '16 min', placement: 'mid', course: 'foceni-jako-byznys' },
  'konkurence-pozice':   { title: 'Odliš se', duration: '14 min', course: 'foceni-jako-byznys' },
  'networking':          { title: 'Využívej networking', duration: '13 min', course: 'foceni-jako-byznys' },
  'discovery-call':      { title: 'Začni prodávat řešení', duration: '20 min', course: 'foceni-jako-byznys' },
  'prezentace-ceniku':   { title: 'Síla prezentace', duration: '15 min', course: 'foceni-jako-byznys' },
  'spoluprace-partneri': { title: 'Začni využívat barterové spolupráce', duration: '17 min', course: 'foceni-jako-byznys' },
  'storytelling':        { title: 'Síla osobní značky', duration: '19 min', course: 'foceni-jako-byznys' },
  'seo':                 { title: 'Optimalizuj si SEO', duration: '21 min', placement: 'mid', course: 'foceni-jako-byznys' },
  'onboarding':          { title: 'Organizace a automatizace zakázek', duration: '16 min', course: 'foceni-jako-byznys' },

  // ── 🎬 VÝDĚLEČNÉ OBORY ──
  'obor-svatby':         { title: 'Svatební masterclass', duration: '27 min', placement: 'mid', course: 'svatebni-masterclass' },
  'obor-architektura':   { title: 'Realitní fotografie — úvod', duration: '18 min', placement: 'mid', course: 'kenji-v-akci' },
  'obor-sport':          { title: 'Fotíme hokejový banner', duration: '12 min', course: 'kenji-v-akci' },
  'obor-moda':           { title: 'Z pohledu modelky', duration: '14 min', course: 'zaklady-technika' },
  'obor-niche':          { title: 'Spolupráce s influencery', duration: '13 min', course: 'foceni-jako-byznys' },

  // ── ⚖️ PRÁVO & ÚČETNICTVÍ → kurz „foceni-jako-byznys" (modul Účetnictví a právo) ──
  'fakturace':              { title: 'Účetnictví pro tvůrce', duration: '25 min', placement: 'mid', course: 'foceni-jako-byznys' },
  'pausal-vs-vydaje':       { title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'socialni-zdravotni-osvc':{ title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'danove-naklady':         { title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'hlavni-vedlejsi-cinnost':{ title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'fakturace-do-zahranici': { title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'reklama-ze-zahranici':   { title: 'Účetnictví pro tvůrce', duration: '25 min', course: 'foceni-jako-byznys' },
  'smlouvy-pro-fotografy':  { title: 'Právo pro tvůrce', duration: '23 min', placement: 'mid', course: 'foceni-jako-byznys' },
  'autorska-prava':         { title: 'Právo pro tvůrce', duration: '23 min', course: 'foceni-jako-byznys' },
  'souhlas-foceni':         { title: 'Právo pro tvůrce', duration: '23 min', course: 'foceni-jako-byznys' },
  'gdpr':                   { title: 'Právo pro tvůrce', duration: '23 min', course: 'foceni-jako-byznys' },
  'klient-nezaplatil':      { title: 'Právo pro tvůrce', duration: '23 min', course: 'foceni-jako-byznys' }
};

// --- PROMO BANNER: KENJI PRESETY (na editačních článcích) ---
// Ostrá fotka na pozadí (NErozmazaná) + text + tlačítko bez ceny.
// Ukáže se na článcích v `slugs` (hodnota = umístění 'mid' | 'end'),
// renderuje nav.js přes renderPresetPromo().
const KENJI_PRESET_PROMO = {
  url:    'preset.html',                 // interní landing page (koupě vede ven přes CTA)
  image:  'assets/preset.webp',          // ostrá, NErozmazaná
  kicker: 'KENJIHO PRESETY',
  title:  '10+ let laděné k dokonalosti.',
  text:   'Tyhle presety jsou moje nejaktuálnější — barvy a nálada, co tvoje fotky posunou na první dobrou. 🔥',
  bonus:  '+ BONUS: video, jak je nainstalovat a používat 📚',
  button: 'Koupit Kenjiho presety',
  // kde se ukáže + jak umístit (vyhýbá se kolizi s video playerem na témže článku)
  slugs: {
    'top-nastroje': 'end',   // video je 'mid' → banner na konec
    'skin-tones':   'mid',   // video je 'end' → banner doprostřed
    'raw-vs-jpeg':  'mid',
    // + náhodně rozeseté napříč knihovnou (články bez video playeru → bez kolize)
    'instagram':    'mid',   // byznys
    'obor-portret': 'end',   // obory
    'obor-newborn': 'mid'    // obory
  }
};

// Export do globálu (žádný bundler, čistý prohlížeč)
window.KENJI_CATEGORIES = KENJI_CATEGORIES;
window.KENJI_ARTICLES = KENJI_ARTICLES;
window.KENJI_FREE_SLUGS = KENJI_FREE_SLUGS;
window.KENJI_VIDEOS = KENJI_VIDEOS;
window.KENJI_PRESET_PROMO = KENJI_PRESET_PROMO;
