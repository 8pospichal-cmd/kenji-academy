# Stav projektu Kenji Academy

> **Aktualizováno:** 2. 9. 2026  
> Tento dokument je aktuální zdroj pravdy pro další práci. Starší soubory `README.md` a `CONTEXT.md` popisují dřívější MVP a nemusí odpovídat současnému stavu.

## Přehled projektu

Kenji Academy předěláváme z původní databáze a obsahu z Flixy na vlastní plnohodnotnou vzdělávací platformu pro fotografy, kameramany a další vizuální tvůrce. Platforma má člověka provést od technických základů přes kvalitnější tvorbu až k získávání klientů a fungujícímu kreativnímu podnikání.

Projekt dnes spojuje:

- veřejnou prodejní stránku Kenji Academy,
- bezplatný vstup do aplikace,
- databázi odborných článků,
- strukturované videokurzy a lekce,
- osobní dashboard a ukládání postupu,
- kvíz s odměnou v podobě pracovních listů k 90denní výzvě,
- audit pro tvůrce,
- komunitní příspěvky a kanály,
- Kenji AI,
- placené nástroje a materiály,
- připravenou integraci Stripe a Supabase.

### Produktové úrovně

- **Free:** vybrané články, kvíz a odměna, audit, dashboard, Kenji AI s limitem 5 dotazů za klouzavých 24 hodin a veřejné komunitní kanály `foto-feedback` a `tydenni-vyzva`.
- **Databáze:** celý obsah databáze a vše z Free. Interní identifikátor této úrovně zatím zůstává `knihovna` kvůli zpětné kompatibilitě.
- **Academy:** kompletní platforma včetně kurzů a prémiových komunitních kanálů.

V uživatelském rozhraní používáme slovo **databáze**, nikoliv **knihovna**. Hlavním obchodním cílem je dát uživateli dostatečnou hodnotu už ve Free verzi, vytvořit pravidelný důvod k návratu a přirozeně ukázat hodnotu placené Databáze a celé Academy.

## Použité technologie

### Frontend

- HTML5
- CSS3 v jednom hlavním souboru `assets/styles.css`
- Vanilla JavaScript bez frontendového frameworku a bez povinného build kroku
- Google Fonts: Bebas Neue, Inter a JetBrains Mono
- responzivní rozvržení pro desktop, Android a iPhone
- stav uživatele a některá lokální data přes `localStorage`

### Backend a služby

- **Supabase** pro databázi, autentizaci, ukládání postupu, komunitní obsah a Storage
- **Supabase Edge Function** pro Kenji AI
- **Netlify Functions** pro vytvoření Stripe Checkout Session a zpracování webhooku
- **Stripe** pro připravované platby Databáze a Academy
- **Netlify** jako cílový hosting

### Lokální vývoj a nástroje

- lokální server v `.claude/serve.js`
- výchozí lokální URL `http://localhost:4321/`
- pomocné Node.js skripty ve složce `tools/`
- Supabase CLI pro migrace, funkce a bezpečnostní kontroly

Projekt nemá `package.json` ani klasický bundler. Při změnách je proto nutné hlídat pořadí `<script>` tagů, cache-busting parametrů a kompatibilitu přímo v prohlížeči.

Primární HTML stránky používají explicitní cache verze u sdílených assetů. Hlavní CSS, `auth.js` a `nav.js` aktuálně používají `20260902-legal-v1` a komunitní `feed.js` na `prispevky.html` používá `20260825-intro-v2`; ostatní datové a stránkové skripty mají vlastní verze podle poslední změny. Při úpravě assetu je nutné jeho parametr aktualizovat na všech stránkách, které jej načítají, jinak prohlížeč může podržet starou verzi.

## Struktura složek a souborů

### Hlavní stránky

- `index.html` - hlavní aplikace a databáze článků.
- `academy.html` - nová veřejná prodejní stránka Academy; nyní rozpracovaná.
- `academy-b.html` - starší nebo alternativní varianta prodejní stránky, ne hlavní zdroj.
- `pristup.html` - přehled úrovní přístupu a nákupní nabídky.
- `kurzy.html` - katalog kurzů včetně stavů zamčení.
- `kurz.html` - univerzální detail kurzu a přehrávač lekcí.
- `prispevky.html` - komunitní feed, kategorie, vyhledávání a tvorba příspěvků.
- `kviz.html` - čtyřúrovňový kvíz.
- `odmena.html` - odemknutí a stažení odměny po dokončení kvízu.
- `audit.html` - bezplatný audit pro tvůrce.
- `kenji-ai.html` - rozhraní asistenta Kenji AI.
- `nastaveni.html` - nastavení uživatelského účtu a kompaktní vstup pro admina.
- `admin.html` - samostatný zabezpečený pracovní prostor administrace.
- `preset.html`, `sablony.html`, `hodinovka.html` - doplňkové nástroje a materiály.
- `platba-uspesna.html`, `platba-zrusena.html` - návratové stránky Stripe Checkout.
- `zasady-ochrany-udaju.html`, `obchodni-podminky.html`, `cookies.html` - právní dokumenty.
- `404.html` - chybová stránka.

### Sdílené assety a datové zdroje

- `assets/styles.css` - centrální design systém a styly všech stránek.
- `assets/articles.js` - hlavní zdroj pravdy pro články, kategorie, pořadí, publikaci a Free výběr.
- `assets/courses.js` - hlavní zdroj pravdy pro 5 kurzů a jejich strom 70 lekcí.
- `assets/course-content.js` - videa, popisy a další obsah jednotlivých lekcí.
- `assets/nav.js` - navigace, sidebar, vyhledávání, zamčené stavy a části hlavní stránky.
- `assets/auth.js` - uživatelský stav, přístupové úrovně a kontrola funkcí.
- `assets/dashboard.js` - stav a vykreslení dashboardu.
- `assets/feed.js` - komunitní feed, filtrování, vyhledávání, příspěvky, lajky a média.
- `assets/leaderboard.js` - samostatný komunitní žebříček a napojení vlastních lokálních KP.
- `assets/kenji-ai.js` - klientská logika Kenji AI a průběhové stavy odpovědi.
- `assets/admin.js`, `assets/admin.css` - přehled, CRM, nástroje, obsah a kupóny pro admina.
- `assets/quiz.js` - logika kvízu a odemykání odměny.
- `assets/90VYZVA-LISTY.pdf` - odměna, pracovní listy k 90denní výzvě.
- `assets/legacy-posts.js` - importované příspěvky z předchozí platformy.
- `assets/legacy-predstav-se.js` - importované představovací příspěvky.
- `assets/legacy-uspechy.js` - importované úspěchy členů.
- další podsložky `assets/` - loga, fotografie, avatary, exportovaná média a vizuály kurzů.

### Články

- `clanky/` obsahuje 81 samostatných HTML článků.
- Všech 81 článků je evidováno jako publikovaných v `assets/articles.js`.
- Aktuálně je 17 článků označeno jako Free.
- Každý článek má být napojený na manifest, správnou kategorii, navigaci předchozí/další a nabídku odemčení Databáze.

### Komunita a importy

- `_source/` obsahuje původní JSON exporty příspěvků, představení a úspěchů z Flixy/Whop.
- Profilové fotografie a přílohy jsou uložené v assetech a napojené na importovaný obsah.
- Staré příspěvky jsou read-only kromě možnosti přidat lajk; nové komentáře a plná interakce jsou určeny pro nově vznikající příspěvky.

### Serverová část

- `netlify/functions/create-checkout-session.js` - zakládá Stripe Checkout Session.
- `netlify/functions/stripe-webhook.js` - přijímá potvrzení platby a mění přístup.
- `supabase/functions/kenji-ai/index.ts` - serverová funkce Kenji AI.
- `supabase/migrations/20260824090000_ai_user_quota.sql` - serverově vynucený uživatelský limit Kenji AI v klouzavém 24hodinovém okně.
- `supabase/migrations/20260824150000_ai_lead_quota.sql` - rozšíření kvóty Kenji AI o oddělenou neprůhlednou identitu pro Free lead relaci bez zpřístupnění účtu, profilu nebo placeného tieru.
- `supabase/migrations/20260822_free_community.sql` - přístup Free uživatelů do veřejné komunity.
- `supabase/migrations/20260823_secure_post_media.sql` - zabezpečení komunitních médií a práce s identitou uživatele.
- `supabase/migrations/20260823113000_community_publish_fix.sql` - vytvoření a limity bucketu `post-media`, finální pravidla uploadu a autoritativní oprava publikování Free/Academy.
- `supabase/migrations/20260823124500_weekly_challenge_channel.sql` - veřejný kanál týdenní výzvy včetně serverového čtení, publikování, komentářů a lajků pro všechny ověřené tiery.
- `supabase/migrations/20260823163000_admin_workspace.sql` - zabezpečené admin RPC, produktová analytika, výsledky nástrojů a centrální plánování obsahu.
- `supabase/community-pinning.sql` - podpora připínání komunitních příspěvků.
- `netlify.toml` - funkce, přesměrování, hlavičky a hostingová konfigurace.

### Pomocné a provozní soubory

- `.claude/serve.js` a `.claude/launch.json` - lokální preview na portu 4321.
- `tools/build-course-content.mjs` - pomocná tvorba dat kurzového obsahu.
- `tools/enrich-course-descriptions.mjs` - pomocné doplnění popisů lekcí.
- `kenji-deploy/` - odvozená nasazovací kopie; neupravovat ji jako primární zdroj.
- `README.md` a `CONTEXT.md` - historická dokumentace původního MVP.

## Hotové části

### Obsah a databáze

- Je vytvořen a publikován manifest 81 odborných článků.
- Články jsou rozdělené do tematických kategorií a 17 z nich je vybraných pro Free tier.
- V levé navigaci je vizuálně rozlišeno, co je dostupné a co je zamčené.
- Jsou opravené klíčové odkazy mezi články a výzvy k odemčení Databáze.
- U vybraných článků jsou hodnotné akční checklisty.
- Terminologie v hlavním uživatelském toku používá Databázi místo Knihovny.

### Kvíz, odměna a audit

- Certifikát byl nahrazen odměnou.
- Po dokončení čtyř levelů se odemknou pracovní listy k 90denní výzvě.
- PDF je součástí projektu a je připravené ke stažení.
- Audit pro tvůrce je dostupný ve Free tieru.
- Kvíz a odměna jsou funkčně zahrnuté do Free přístupu, i když některé starší preview parametry mohou simulovat zamčený stav.

### Komunita

- Importované příspěvky mají autory, avatary, média, kategorie, lajky a realistické počty komentářů.
- Všech 51 importovaných příspěvků v rubrice `Představ se` se vykresluje jako přirozený bílý text rozdělený do odstavců. Očíslované šablonové otázky mohou být tučně na začátku odstavce, ale nepoužívají barevné nadpisy, rámečky ani oranžovou linku; původní texty a emoji zůstávají zachované.
- Počty importovaných reakcí respektují nastavené limity: 18-40 lajků a nejvýše 14 komentářů na příspěvek.
- Feed umí filtrovat podle kategorií a vyhledávat podle klíčových slov v názvu i textu.
- Dlouhé příspěvky používají rozbalení „Zobrazit více“.
- První příspěvky lze evidovat jako připnuté a databázová podpora pro připínání je připravená.
- Kanály `foto-feedback` a `tydenni-vyzva` jsou dostupné uživatelům Free a Databáze; prémiové kanály zůstávají viditelné, ale zamčené.
- Free komunita vyžaduje ověřenou Supabase magic-link relaci.
- Databázové funkce odvozují identitu z podepsaného JWT a nedůvěřují e-mailu poslanému z prohlížeče.
- Komunitní editor se i v lokálním náhledu zpřístupní až po ověření relace; nemůže se proto tvářit jako funkční před přihlášením, které vyžaduje zabezpečený upload a RPC.
- Upload komunitních médií používá cestu navázanou na ID uživatele, přijímá JPG, PNG a WebP do 6 MB a bucket `post-media` vytváří databázová migrace.
- Publikování fotografie není povinnou součástí onboardingu. Zůstává samostatným úkolem za XP a běžný textový příspěvek lze odeslat i bez média.
- Týdenní výzva se přednostně načítá z centrálního adminského obsahu; `assets/challenges.js` zůstává bezpečnou lokální zálohou. Dashboard i komunita ukazují stejné zadání. +50 XP se připíše jednou týdně až po úspěšném publikování odpovědi v kanálu `tydenni-vyzva`, ne po pouhém kliknutí na CTA.
- Leaderboard už nezabírá místo na dashboardu. Je samostatným pohledem Komunity dostupným přes horní přepínač i levé menu; používá stejný stav KP jako dashboard.
- Supabase lint po bezpečnostních migracích nehlásil chyby; anonymní čtení příspěvků ani upload médií nejsou povolené.
- Migrace komunity, AI kontextu i administrace jsou aplikované v produkčním Supabase. Anonymní volání admin RPC vrací `401`, veřejné čtení publikované výzvy funguje.

### Administrace a produktová data

- Admin má v Nastavení pouze kompaktní tlačítko „Přepnout do administrace“. Správa uživatelů už není vložená mezi běžné profilové volby.
- `admin.html` obsahuje pracovní přehled, seznam lidí s tierem, rolí, stavem a aktivitou, detail člověka, dokončení nástrojů, správu výzev, novinek, webinářů a kupónů.
- Přístup odvozuje administrátora výhradně z ověřeného Supabase JWT. Znalost nebo podvržení e-mailu nestačí.
- Kvíz, audit a kalkulačka hodinovky zapisují dokončení do `tool_submissions`; přehled počítá unikátní lidi za posledních 30 dní. Audit uchovává segmentační výsledek, kalkulačka pouze odvozenou sazbu, režim, hodiny, obrat a odvody, nikoliv detailní osobní výdaje.
- Běžné návštěvy se zapisují do `analytics_events` s anonymním identifikátorem nebo ověřeným uživatelem. Tabulky mají RLS a klient nemá přímý čtecí přístup.
- Lokální administrace používá jasně označená ukázková data, protože lokální admin bypass není podepsaná produkční relace.
- Admin rozhraní bylo ověřeno na desktopu a šířkách 320, 375, 390 a 430 px bez horizontálního přetékání důležitého obsahu; na 320 px se horní navigace záměrně posouvá vodorovně.

### Přístupy a navigace

- `assets/auth.js` obsahuje jednotnou capability matrix pro Free, Databázi a Academy.
- Free má vybrané články, kvíz, odměnu, audit, dashboard, AI, Foto feedback a Týdenní výzvu.
- Databáze má celý obsah článkové databáze.
- Academy odemyká kurzy a prémiovou komunitu.
- Kurzy i komunitní kanály se zobrazují i nižším tierům jako zamčené místo toho, aby zmizely.
- Pro lokální testování fungují preview parametry `?tier=free`, `?tier=knihovna` a `?tier=academy`.

### Kurzy

- Datová struktura obsahuje 5 kurzů a celkem 70 lekcí.
- Katalog, detail kurzu, moduly, přehrávač a ukládání postupu jsou připravené.
- U chybějících kurzových popisů byly doplněny konkrétní úvodní texty.
- Neaktuální výzva k vyplnění dotazníku byla z úvodu kurzu odstraněna a nahrazena smysluplným úvodem.
- Kurzy jsou pro Free a Databázi viditelné pod zámkem a pro Academy dostupné.

### Kenji AI a rozhraní

- Plovoucí tlačítko „Mám dotaz?“ bylo nahrazeno minimalistickým glass tlačítkem Kenji AI.
- Samostatné AI rozhraní a serverová Edge Function jsou připravené.
- Čekání na odpověď používá profesionálnější průběhové texty místo samotných tří teček.
- Kenji AI dostává oddělený strukturovaný kontext z osobního profilu a onboardingu: jméno, bio, obory, fázi podnikání, příjmové pásmo, cíl, hlavní překážku a aktuální úkoly. Přihlášenému uživateli se byznysový kontext ukládá do `users.ai_context` pro použití napříč zařízeními; Edge Function načítá profil podle ověřené Supabase relace, sanitizuje všechna pole a aktuální dotaz má vždy přednost před staršími profilovými údaji. E-mail ani avatar se do AI promptu neposílají.
- Free a Databáze mají serverově vynucený limit 5 přijatých dotazů za klouzavých 24 hodin; Academy má Kenji AI bez uživatelského limitu. U ověřeného účtu se počet váže na Supabase `user_id`. Do dokončení finální autentizace dostává neověřený Free lead oddělenou serverově odvozenou identitu z lokálního anonymního ID a síťového kontextu; tato relace je vždy Free, nenačítá serverový profil a nemůže získat placený tier. Smazání dat nebo změna zařízení proto může Free kvótu obnovit a je to vědomé přechodové omezení do dokončení produkční autentizace. Rozhraní ukazuje zbývající počet u historie a na mobilu nad chatem; po vyčerpání uzamkne vstup a nabídne plný přístup do Academy.
- Pod poslední uživatelskou otázkou je malé ikonové opakování odpovědi. Nový pokus zachová otázku, nahradí původní odpověď bez duplikace zprávy a u omezeného tieru se počítá jako další AI dotaz.
- Prázdný stav Kenji AI je bez dekorativní ilustrace a používá lidské oslovení „Čau, rád ti poradím.“
- Dashboard nepoužívá samostatný velký formulář „Zeptej se Kenji AI“. První aktivní úkol je zobrazený jako jediná priorita s odkazem na AI; další úkoly jsou kompaktní. Úkol se dokončuje pouze checkboxem.
- Pokračování v článku, personalizované doporučení a mapa vzdělávací cesty jsou sloučené do jednoho obsahového bloku. Týdenní výzva a poslední komunitní úspěchy tvoří jeden společný komunitní blok.
- Rozhraní má globální tmavý vizuální styl Kenji Academy.

### Výkon a plynulost

- Sdílené CSS a základní JavaScript mají na všech primárních stránkách jednotný cache parametr. Přechody mezi dashboardem, databází, kurzy, komunitou, AI a články proto znovu nestahují stejný fyzický soubor pod různými verzemi URL.
- Netlify posílá pro `/assets/*` týdenní browser cache se `stale-while-revalidate`; nový deploy zůstává na CDN invalidovaný standardním mechanismem Netlify. HTML se dlouhodobě necachuje v prohlížeči.
- Dokončený nebo uživatelem ukončený produktový průvodce se na každé další stránce znovu nestahuje. Rozpracovaný statický průchod a ruční spuštění přes `?tour=1` se načtou jen tam, kde jsou potřeba.
- Dlouhé prodejní sekce a komunitní příspěvky používají `content-visibility: auto`, takže prohlížeč nevykresluje vzdálený obsah mimo obrazovku. V nepodporovaných prohlížečích se deklarace bezpečně ignoruje.
- Automatické pásy recenzí a výsledků na prodejní stránce se mimo viewport pozastaví a po návratu pokračují bez změny vzhledu nebo ovládání.
- Dashboardový vizuál webináře používá `assets/kenjimen.webp` místo PNG. Zachovává 1025 × 576 px a průhlednost; velikost klesla přibližně z 472 KB na 35 KB.

### Value-first onboarding a aktivace

- Bezplatný vstup z `academy.html` vede na osobní plán přes `index.html?start=1`.
- Nový návštěvník nejprve projde třemi krátkými kroky „Čemu se věnuješ?“, „Kde jsi teď?“ a „Co teď nejvíc řešíš?“; v prvním kroku lze vybrat více oborů a příjmové pásmo ve třetím kroku je nepovinné.
- Onboarding před registrací vytvoří konkrétní mini-plán se třemi doporučenými kroky. Poté následuje povinný e-mailový modal „Uložit plán zdarma“ bez možnosti zavření nebo přeskočení; návštěvník si vytvoří bezplatný profil, případně se přepne na přihlášení.
- Rozpracovaný onboarding se ukládá lokálně a po obnovení pokračuje ve stejném kroku.
- Po uložení se na dashboardu zobrazí samostatná aktivační cesta s pěti reálnými úkoly: kompletní profil, první článek, první dotaz do Kenji AI, představení v komunitě a Foto feedback. Dashboard zdůrazňuje vždy jen jeden aktuální krok; hotové a následující kroky jsou zobrazené v kompaktní mapě bez opakovaných popisů.
- Aktivační úkoly se dokončují podle skutečné uložené akce, ne pouhým ručním odškrtnutím, a XP používá jednorázové klíče.
- Registrace i přihlášení začínají pouze e-mailem. Instagram je povinný až při dokončení profilu společně se jménem, bio a profilovou fotografií; komunitní úkol vyžaduje úspěšně publikovaný příspěvek s médiem ve Free kanálu `foto-feedback`.
- Současné e-mailové uložení stále představuje Free lead profil. Ověřený produkční účet, obnova relace a finální magic-link tok zůstávají součástí závěrečné autentizační práce.
- Po prvním přihlášení navazuje statický produktový průvodce vedený Kenjim. Má osm krátkých obrazovek: přivítání, dashboard, databázi, kurzy, Kenji AI, komunitu, profil a dokončení.
- Průvodce přechází mezi skutečnými stránkami aplikace, ale nevyžaduje scrollování, vyplnění formuláře, dotaz do AI ani jiný checkpoint. Stránka zůstává úplně ostrá, nezatmavená a pouze neaktivní; vysvětlovaný prvek zvýrazňuje tenký oranžový obrys. Uživatel pokračuje jen tlačítky Zpět/Další nebo šipkami na klávesnici.
- Panel je kompaktní floating karta. Na desktopu se podle kroku přesouvá do vhodného rohu; na telefonu je většinou pod hlavičkou a u profilu nad spodní navigací, aby nikdy nezakryl právě vysvětlovaný prvek ani hlavní navigaci. Na každém kroku lze průvodce ukončit tlačítkem vpravo nahoře.
- Stav rozpracovaného průchodu se ukládá lokálně a po přechodu na další stránku pokračuje správným krokem. Dokončení i ukončení zabrání automatickému opakování; z Nastavení lze průvodce kdykoli spustit znovu.
- Produktový průvodce pouze vysvětluje platformu. Aktivační cesta na dashboardu zůstává oddělená a úkoly i XP dokončuje až podle skutečně provedených akcí.

### Platby a nasazení

- Kód pro Stripe Checkout i webhook je připravený.
- Jsou připravené návratové stránky pro úspěšnou a zrušenou platbu.
- Základní ceny v projektu počítají s Databází za 1 497 Kč a Academy za 24 997 Kč.
- Klíčové stránky byly při poslední kontrole dostupné přes lokální server s HTTP 200.
- Produkční platby a kompletní přihlášení ale zatím nelze považovat za dokončené, dokud neproběhne nastavení a end-to-end test v produkci.

### Právní dokumenty

- Provozovatelem Kenji Academy je Daniel Pospíchal, IČO 19079583, se sídlem Práčat 1886, 580 01 Havlíčkův Brod; Kenji Academy je obchodní označení, nikoli samostatná právnická osoba.
- Obchodní podmínky a zásady ochrany osobních údajů jsou samostatné veřejné stránky bez aplikační navigace, přihlášení a dashboardových skriptů. Používají jednoduchý textový layout a po otevření z registrační brány uživatele nepřenesou do aplikace.
- Podmínky pokrývají digitální obsah a služby, jednorázový i rozdělený způsob platby, technické požadavky, aktualizace, odstoupení, reklamace, komunitu, AI, licenci a aktuální ADR u České obchodní inspekce. Neobsahují zrušený evropský ODR odkaz.
- Zásady popisují skutečně používaná data a služby včetně Supabase, Netlify, Stripe, Resend, YouTube a externích poskytovatelů Kenji AI. Povinný registrační checkbox potvrzuje seznámení se zpracováním pro účet; nejde o vynucený souhlas s marketingem.
- Sdílená patička uvádí pouze `© [rok] Kenji`, nikoli dřívější společnost.

## Rozpracované a následující kroky

### 1. Dokončit prodejní stránku `academy.html`

Tato práce byla přerušena v průběhu úprav a je aktuálně nejbližším rozpracovaným úkolem.

- Zachovat nový směr a sekce, ale dokončit kontrolu celé stránky.
- Aktuální hlavní headline je „Proměň tvorbu v byznys, který vydělává.“
- Prodejní stránka má dvě jasné cesty. Bezplatná cesta vede z hlavičky, hero CTA „Jdu do toho“ a sekundárních odkazů „Vyzkoušet Kenji Academy zdarma“ na osobní plán přes `index.html?start=1`; po třech otázkách následuje e-mailové přihlášení a produktový průvodce. V cenové nabídce a závěrečné sekci má vyšší vizuální prioritu placené CTA „Získat plný přístup“ / „Plný přístup · 24 997 Kč“, zatímco bezplatné vyzkoušení je sekundární.
- Sekce praktických lekcí na `academy.html` používá kompaktní čtyřpoložkový přepínač místo čtyř vysokých karet. Každá volba mění konkrétní copy i optimalizovanou WebP fotografii z reálné výuky; ovládání funguje myší, dotykem i klávesnicí a zachovává positioning pro fotografy, kameramany a další vizuální tvůrce.
- Nabídka plného přístupu výslovně uvádí živé webináře a sekundární CTA komunikuje „Vyzkoušet Kenji Academy zdarma“. Hlavní partnerská sekce používá samostatná kontrastní loga přímo na tmavém pozadí bez bílých dlaždic; kompaktní partner strip zůstává také v patičce.
- Prodejní stránka obsahuje partnerskou sekci se značkami PIXIN, Manfrotto, Nikon a Kvalitní fotky. Stejná čtveřice je v kompaktním pruhu patičky bez světlých dlaždic; tmavá loga se na černém podkladu vykreslují bíle. Loga jsou uložená lokálně v `assets/partners/` a načítají se lazy.
- Sekce „Všechno důležité na jednom místě“ používá skutečný celoplošný náhled platformy místo stylizované záložkové makety. Optimalizovaný asset `assets/academy-platform.webp` má 1793 × 1003 px, zachovává celý obraz bez ořezu, na mobilu sahá od kraje ke kraji a kliknutím se otevírá ve společném lightboxu bez přechodu na jinou stránku.
- Sekce reálných výsledků obsahuje všech deset dostupných screenshotů z komunity. Pět starších výsledků z veřejné stránky je optimalizovaných do WebP v `assets/academy-wins/`; výsledky se plynule posouvají v horizontálním pásu, zastaví se při interakci a každý lze otevřít v responzivním lightboxu s rozmazaným pozadím, zavřením a navigací mezi winy. Při omezení animací lze pás posouvat ručně.
- Důsledně mluvit k fotografům, kameramanům a vizuálním tvůrcům; nepoužívat fotografickou formulaci tam, kde popisujeme všechny tvůrce.
- Opravit horizontální přetékání a ořezávání textu a CTA na mobilu.
- Projít všechny spodní sekce na desktopu i telefonu.
- Otestovat zvětšený systémový text na iOS a Androidu.
- Ověřit CTA, Stripe atributy, odkazy, FAQ a stavy bez JavaScriptu.
- Doplnit reálné fotografie do připravených míst, až budou finální assety k dispozici.
- Po dokončení odstranit nebo jasně označit nepoužívanou variantu `academy-b.html`.

Aktuální architektura prodejní stránky obsahuje hero, důkazní statistiky, problém s drahou technikou bez klientů, čtyřkrokovou cestu, ukázku platformy, reálnou lekci, tři pilíře, recenze, autoritu Kenjiho, návratnost investice, nabídku, FAQ a finální CTA. Je nutné ladit provedení, ne bezdůvodně měnit celý směr znovu.

### 2. Doplnit chybějící videa v kurzech

- Projít všech 70 lekcí v `assets/course-content.js` proti `assets/courses.js`.
- Vypsat a potvrdit lekce bez `videoId` nebo bez platného odkazu.
- Přiřadit dodané YouTube odkazy ke správným lekcím.
- Tam, kde video ještě neexistuje, zobrazit poctivý stav „Připravujeme“ místo nefunkčního přehrávače.
- Otestovat hlavní video každého kurzu i videa ve všech modulech.
- Ověřit, že popis odpovídá skutečnému obsahu videa a neslibuje něco jiného.

### 3. Mobilní přístupnost a zvětšení textu

- Otestovat hlavní stránky minimálně na šířkách 320, 375, 390, 430, 768 a desktopu.
- Otestovat iOS Larger Text/Dynamic Type a zvětšení textu v Androidu.
- Odstranit pevné výšky a šířky, které způsobují ořezávání nebo překryvy.
- Dovolit nadpisům, cenám, tlačítkům, badge prvkům a navigaci bezpečně zalamovat.
- Ověřit modaly, sidebar, course player, komunitní composer, AI a platební CTA.
- Zachovat minimální použitelné dotykové plochy a viditelný focus stav.

### 4. Produkční autentizace a účty

Tuto oblast chce zadavatel dokončovat až v závěru projektu.

- Rozhodnout finální přihlašovací tok a sjednotit lead gate, magic link a uživatelský účet.
- Doplnit obnovu relace, odhlášení, chybové stavy a práci s expirovaným odkazem.
- Ověřit správnou synchronizaci tieru po nákupu.
- Zabránit tomu, aby preview parametry mohly ovlivnit produkční oprávnění.
- Produkčně otestovat přihlášení admina magic linkem a všechny mutace pod jeho skutečnou relací.

### 5. Produkční Stripe

Také platby mají přijít až po dokončení hlavního obsahu a rozhraní.

- Nastavit produkční Stripe produkty, Price IDs, tajné klíče a webhook secret.
- Obchodní podmínky už výslovně říkají, že zaplacením digitálního produktu přes Stripe uživatel žádá okamžité zpřístupnění obsahu a bere na vědomí ztrátu práva odstoupit do 14 dnů. Technické doladění Stripe flow a případné ukládání potvrzení k objednávce zůstává na pozdější produkční dokončení.
- Ověřit cenu, měnu, text nabídky a přístup, který každý produkt skutečně odemyká.
- Otestovat úspěšnou platbu, zrušení, opakovaný webhook, chybu webhooku a neexistujícího uživatele.
- Ověřit, že webhook bezpečně aktualizuje tier v Supabase a že přístup nejde změnit z klienta.
- Doplnit produkční monitoring a srozumitelnou podporu při problému s platbou.

### 6. Komunitní administrace a aktivace Free uživatelů

- Rozšířit samostatný admin o připínání, editaci, skrytí a moderaci komunitních příspěvků.
- Dokončit rozlišení read-only importovaných komentářů a nových živých komentářů.
- Otestovat lajkování bez možnosti uměle navyšovat počty opakovaným klikáním.
- Doplnit prázdné, loading a error stavy feedu a uploadu.
- Nastavit jednoduché produktové momenty, které po reálné hodnotě ukážou výhodu placeného přístupu, bez agresivního blokování Free uživatelů.
- Ověřit, že vyhledávání řadí nejrelevantnější příspěvky a funguje i s českou diakritikou.

### 7. Obsahová a technická kontrola

- Projít všechny články, jejich kategorie, Free stav, interní odkazy a navigaci předchozí/další.
- Prověřit, že akční checklisty jsou konkrétní, odborně správné a odpovídají článku.
- Opravit případné zbytky slova „knihovna“ v uživatelském copy; interní technický tier lze zatím ponechat.
- Ověřit všechny obrázky, alt texty, videa, PDF a externí odkazy.
- Doplnit automatickou kontrolu neexistujících lokálních odkazů a chybějících assetů.
- Projít právní texty před produkčním spuštěním s kvalifikovaným právníkem.

### 8. Výkon, SEO a dokončení nasazení

- Optimalizovat velké obrázky a používat správné rozměry/formáty.
- Doplnit nebo ověřit metadata, Open Graph obrázky, canonical URL, sitemap a robots.txt.
- Zkontrolovat Core Web Vitals, zejména pro prodejní stránku, feed a kurzový přehrávač.
- Projít produkční Content Security Policy a bezpečnostní hlavičky.
- Nasazovací kopii generovat až z ověřeného hlavního zdroje.
- Před spuštěním provést kompletní smoke test rolí Free, Databáze, Academy a anonymního návštěvníka.

## Pravidla pro kód

### Zdroj pravdy a architektura

- Upravovat hlavní projekt, ne ručně `kenji-deploy/` ani jinou odvozenou kopii.
- Články a jejich metadata spravovat v `assets/articles.js`.
- Kurzy a strom lekcí spravovat v `assets/courses.js`.
- Videa a popisy lekcí spravovat v `assets/course-content.js`.
- Sdílenou navigaci, zámky a vyhledávání držet v `assets/nav.js`.
- Přístupová pravidla držet centrálně v `assets/auth.js`; nekopírovat logiku tierů do každé stránky.
- Sdílené styly držet v `assets/styles.css`; nepřidávat inline styly bez skutečně nutného důvodu.
- Zachovat správné pořadí skriptů: datové soubory před komponentami, které je používají, a `auth.js` tam, kde se vyhodnocuje přístup.

### Přístupy a bezpečnost

- Viditelnost v UI není bezpečnostní hranice. Prémiový obsah a mutace musí kontrolovat oprávnění i na serveru/Supabase.
- Nikdy nevěřit e-mailu, tieru ani user ID poslanému z klientského JavaScriptu.
- Účet, placený tier, serverový profil a oprávnění odvozovat výhradně z ověřeného Supabase JWT. Přechodová anonymní identita Kenji AI smí řídit pouze Free kvótu a nesmí zpřístupnit účetní data ani placené schopnosti.
- Storage cesty vázat na ID přihlášeného uživatele.
- Nepoužívat query parametr `tier` jako produkční autorizaci; slouží jen pro lokální preview.
- Tajné Stripe, Supabase service-role ani AI klíče nikdy nevkládat do HTML nebo veřejného JavaScriptu.
- Databázové změny dělat migrací, ne pouze ručním klikáním v dashboardu.

### Design a UX

- Bez výslovného zadání neměnit zavedený vizuální směr ani funkčnost.
- Základ značky je černé/tmavé pozadí, bílý a šedý text a oranžový akcent přibližně `#ff6b1a`.
- Typografie používá Bebas Neue pro výrazné titulky, Inter pro rozhraní a JetBrains Mono pro technické drobnosti.
- Rozhraní má být moderní, prémiové, minimalistické a funkční, ne dekorativní samo pro sebe.
- Preferovat grafické a interaktivní znázornění tam, kde zvyšuje pochopení; nepřidávat efekty bez informační hodnoty.
- Nepřidávat zbytečné karty, gradienty, obří mezery ani složité animace.
- Každý stav musí mít loading, empty, error, locked a disabled variantu, pokud je relevantní.
- Na mobilu se obsah musí přirozeně přelévat do více řádků. Žádný důležitý text, cena ani CTA nesmí být oříznuté.
- Počítat se systémovým zvětšením textu na iOS a Androidu; nepoužívat pevnou výšku tam, kde je textový obsah.

### Copy a obsah

- Psát česky, přímo, lidsky a v Kenjiho stylu; používat tykání.
- Vyhnout se korporátním formulacím, obecným motivačním frázím a textu, který působí generovaně.
- Platforma je pro fotografy, kameramany a další vizuální tvůrce. Fotografii lze použít jako konkrétní příklad, ale ne jako jedinou definici produktu.
- V uživatelském textu používat **Databáze**, ne **Knihovna**.
- Neuvádět smyšlené výsledky, recenze, počty, časový tlak ani garance.
- Aktuálně používané důvěryhodné údaje jsou: hodnocení 4,65, více než 150 hodnocení, 20+ hodin videí, 75+ článků a 5 kurzů. Před publikací je znovu ověřit proti reálným datům.
- Hodnotné texty mají být konkrétní: postup, rozhodovací kritéria, časté chyby a další praktický krok.
- U videa nesmí popis tvrdit něco, co ve videu není.

### Změny a kontrola kvality

- Dělat úzce zaměřené změny a neprovádět nesouvisející refaktoring.
- Neničit existující lokální změny ani funkce, které s úkolem nesouvisejí.
- Nový článek zaregistrovat v manifestu, zařadit do kategorie a ověřit předchozí/další navigaci.
- Po změně sdíleného JavaScriptu nebo CSS aktualizovat cache-busting parametr na stránkách, které soubor načítají.
- Každou vizuální změnu ověřit v reálném prohlížeči minimálně na desktopu a telefonu.
- U mobilních změn kontrolovat i horizontální overflow, modaly, sidebar a zvětšený text.
- U přístupových změn testovat anonymního uživatele, Free, Databázi i Academy.
- U serverových změn kontrolovat nejen úspěšný průchod, ale také odmítnutý anonymní požadavek a chybný vstup.
- Před označením práce za dokončenou ověřit odkazy, konzoli prohlížeče, HTTP odpovědi a chybějící assety.
