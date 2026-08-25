// ============================================
// KENJI KNIHOVNA — KVÍZ (DATA)
// ============================================
//
// 4 levely (pásky), každý 15 otázek napříč danou částí databáze.
// Na postup do dalšího levelu potřebuješ 12 z 15 (80 %).
// Když zvládneš všechny 4 → tajná odměna (pracovní listy k 90denní výzvě).
//
// FILOZOFIE OTÁZEK:
//   • Bílý pásek (technika) = LEHČÍ. Solidní základ, žádné chytáky,
//     ale odpovědi nejsou úplně obvious — musíš se zamyslet.
//   • Modrý / hnědý / černý = TĚŽKÉ a hlavně ROZHODOVACÍ. Otázky typu
//     „co je pro tebe jako tvůrce nejvýhodnější?" — ať si člověk odnese
//     použitelnou zásadu pro podnikání a růst, ne jen „odpověď je C".
//   • Vysvětlení (explain) předává hodnotu — proč to tak je a co s tím.
//   • Daňová/právní čísla ověřena pro rok 2026 (web, 5/2026).
//
// Struktura otázky:
//   { q, options: ['A','B','C','D'], correct: <index>, explain, slug }
//   Pořadí odpovědí se při hraní zamíchá (viz kviz.html), correct drží
//   v datech vždy index 0 pro přehlednost.
//
// Postup hráče → localStorage 'kenji_quiz_v1' (viz kviz.html),
// připraveno na pozdější sync přes Supabase.
// ============================================

const KENJI_QUIZ = {
  passRatio: 0.8,          // 12 z 15
  questionsPerLevel: 15,

  levels: [
    // ====================================================
    // LEVEL 1 — BÍLÝ PÁSEK: Základy & technika (LEHČÍ)
    // ====================================================
    {
      id: 'zaklady',
      order: 1,
      belt: 'Bílý pásek',
      icon: '🥋',
      name: 'Základy & technika',
      desc: 'Expozice, světlo, ohnisko, autofocus, foťáky a objektivy. Základ, na kterém stojí všechno ostatní. Lehčí level — žádné chytáky.',
      questions: [
        {
          q: 'Co udělá otevřená clona (nízké clonové číslo, např. f/1.8)?',
          options: [
            'Pustí do foťáku víc světla a víc rozmaže pozadí',
            'Pustí míň světla a zaostří celou scénu',
            'Zrychlí ostření',
            'Zvýší rozlišení fotky'
          ],
          correct: 0,
          explain: 'Nižší clonové číslo = větší otvor = víc světla a menší hloubka ostrosti (rozmazané pozadí). Proto se portréty fotí na nízká čísla a krajina na vyšší.',
          slug: 'expozice'
        },
        {
          q: 'Fotíš běžícího psa a chceš ho mít ostrého, zmrazit pohyb. Co nastavíš?',
          options: [
            'Krátkou (rychlou) závěrku, např. 1/1000 s',
            'Dlouhou závěrku, např. 1/15 s',
            'Co nejnižší ISO',
            'Co nejvyšší clonové číslo'
          ],
          correct: 0,
          explain: 'Krátká závěrka zmrazí pohyb, dlouhá by ho rozmazala. Na akci, sport a zvířata jdeš s časem 1/1000 s a kratším.',
          slug: 'expozice'
        },
        {
          q: 'K čemu slouží zvýšení ISO a jaká je jeho daň?',
          options: [
            'Zcitliví snímač (fotka je světlejší), ale přibývá šum',
            'Zostří fotku, ale ubere barvy',
            'Rozmaže pozadí bez vlivu na světlo',
            'Zrychlí autofocus'
          ],
          correct: 0,
          explain: 'ISO je třetí páka expozice. Zvedneš ho, když je málo světla — ale za cenu šumu (zrna). Pravidlo: drž ISO tak nízko, jak situace dovolí.',
          slug: 'expozice'
        },
        {
          q: 'Chceš portrét s pěkně rozmazaným pozadím (bokeh). Co pomůže nejvíc?',
          options: [
            'Otevřená clona (nízké číslo, např. f/1.8)',
            'Zavřená clona f/16',
            'Vysoké ISO',
            'Krátká závěrka'
          ],
          correct: 0,
          explain: 'Otevřená clona dává mělkou hloubku ostrosti = rozmazané pozadí. Pomůže i delší ohnisko a přiblížit se k objektu.',
          slug: 'hloubka-ostrosti'
        },
        {
          q: 'Fotíš interiér malé místnosti a chceš zabrat co nejvíc prostoru. Jaké ohnisko?',
          options: [
            'Široký úhel — malé ohnisko, např. 16–24 mm',
            'Teleobjektiv 200 mm',
            'Padesátka 50 mm',
            'Makro objektiv'
          ],
          correct: 0,
          explain: 'Širák zabere víc prostoru, proto se používá na interiéry a architekturu. Tele naopak „přiblíží" úzký výřez a hodí se na portrét, sport a detaily.',
          slug: 'jaky-objektiv'
        },
        {
          q: 'Které ohnisko se klasicky považuje za lichotivé na portrét obličeje (na full frame)?',
          options: [
            'Kolem 85 mm',
            '16 mm',
            '8 mm rybí oko',
            '12 mm'
          ],
          correct: 0,
          explain: 'Kolem 85 mm rysy nezkresluje a hezky odděluje od pozadí. Širáky obličej „nafouknou" a zkreslí — proto na portrét z blízka nejdou.',
          slug: 'jaky-objektiv'
        },
        {
          q: 'K čemu je vyvážení bílé (white balance)?',
          options: [
            'Aby bílá vypadala bíle a barvy seděly — ne moc do oranžova/modra',
            'Aby byla fotka ostřejší',
            'Aby se zmenšila velikost souboru',
            'Aby se rozmazalo pozadí'
          ],
          correct: 0,
          explain: 'WB říká foťáku, co je „neutrální bílá" podle světla. Špatné WB = fotka ujetá do oranžova nebo modra. Když fotíš RAW, doladíš to i potom.',
          slug: 'white-balance'
        },
        {
          q: 'Proč fotit do RAW, když plánuješ fotky upravovat?',
          options: [
            'RAW drží víc obrazové informace → větší prostor v úpravách',
            'RAW je menší a rychleji se nahraje na web',
            'RAW nejde pokazit špatnou expozicí',
            'RAW je rovnou hotový bez úprav'
          ],
          correct: 0,
          explain: 'RAW si nese maximum dat ze snímače — proto z něj zachráníš přepaly i stíny a doladíš barvy. JPEG je menší a hotový, ale na úpravy chudší.',
          slug: 'raw-vs-jpeg'
        },
        {
          q: 'Fotíš nehybný portrét. Jaký režim ostření je vhodný?',
          options: [
            'Jednorázové ostření (AF-S / One Shot)',
            'Plynulé sledování (AF-C / Servo)',
            'Vždy manuální ostření',
            'Ostření je u portrétu jedno'
          ],
          correct: 0,
          explain: 'Na statický objekt stačí AF-S: zaostří a drží. AF-C (plynulé doostřování) chceš na pohyb — děti, sport, zvířata. Vědět, kdy který, ti ušetří spoustu rozmazaných fotek.',
          slug: 'autofocus'
        },
        {
          q: 'Co dělá funkce Eye AF (detekce oka)?',
          options: [
            'Sama najde a zaostří na oko člověka nebo zvířete',
            'Změří vzdálenost pomocí blesku',
            'Vyrovná bílou podle barvy očí',
            'Rozmaže pozadí kolem obličeje'
          ],
          correct: 0,
          explain: 'Eye AF automaticky zamkne ostrost na oko — přesně tam, kde ji u portrétu chceš. Moderní těla to zvládají i u zvířat a v pohybu. Šetří čas i zmetky.',
          slug: 'autofocus'
        },
        {
          q: 'Chceš jemný, lichotivý portrét bez ostrých stínů. Jaké světlo zvolíš?',
          options: [
            'Měkké — velký zdroj blízko (softbox, okno, zataženo)',
            'Tvrdé — přímé polední slunce',
            'Holý blesk namířený přímo do tváře',
            'Malé bodové světlo z velké dálky'
          ],
          correct: 0,
          explain: 'Měkké světlo (velký zdroj blízko) dává plynulé přechody a hezkou pleť. Tvrdé světlo (malý/vzdálený zdroj, ostré slunce) dělá tvrdé stíny — někdy se hodí, na klasický portrét spíš ne.',
          slug: 'svetlo'
        },
        {
          q: 'Proč fotografové milují „zlatou hodinku" (po východu / před západem slunce)?',
          options: [
            'Světlo je měkké, teplé a nízké — lichotí a dělá atmosféru',
            'Je nejvíc světla, dá se fotit na nízké ISO',
            'Slunce je nejvýš a nedělá žádné stíny',
            'Je venku nejmíň lidí'
          ],
          correct: 0,
          explain: 'Nízké slunce dává měkké, teplé, podlouhlé světlo — pleť i krajina vypadají skvěle. Polední slunce je naopak tvrdé a shora (stíny pod očima). Načasování světla je půlka řemesla.',
          slug: 'svetlo'
        },
        {
          q: 'K čemu slouží „pravidlo třetin" v kompozici?',
          options: [
            'Pomáhá rozmístit prvky mimo střed, aby fotka působila vyváženě a živě',
            'Určuje správnou expozici',
            'Říká, jaké ohnisko použít',
            'Nastaví vyvážení bílé'
          ],
          correct: 0,
          explain: 'Rozdělíš záběr na třetiny a klíčové prvky dáš na linie či průsečíky — oko to baví víc než „terč" uprostřed. Je to vodítko pro start, ne povinnost.',
          slug: 'kompozice'
        },
        {
          q: 'Co znamená u objektivu označení „f/1.8" oproti „f/4"?',
          options: [
            'f/1.8 je světelnější — pustí víc světla a líp rozmaže pozadí',
            'f/1.8 je tmavší, ale ostřejší',
            'Je to ohnisko objektivu',
            'Je to hmotnost objektivu'
          ],
          correct: 0,
          explain: 'Menší clonové číslo = světelnější objektiv. f/1.8 nabere víc světla (líp do šera) a dá mělčí hloubku ostrosti než f/4. Proto jsou světelné objektivy dražší a oblíbené na portrét.',
          slug: 'jak-funguji-objektivy'
        },
        {
          q: 'Čím se zjednodušeně liší full frame od APS-C snímače?',
          options: [
            'Full frame má větší snímač — líp zvládá šero a snáz oddělí od pozadí',
            'APS-C má vždy víc megapixelů a lepší obraz',
            'Je to jen jiná značka výrobce',
            'Full frame nepotřebuje objektiv'
          ],
          correct: 0,
          explain: 'Větší (full frame) čip nabere víc světla → lepší výsledky v šeru a mělčí hloubka ostrosti. APS-C je menší, lehčí, levnější a má „crop" (delší dosah) — pro spoustu lidí bohatě stačí.',
          slug: 'aps-c-vs-full-frame'
        }
      ]
    },

    // ====================================================
    // LEVEL 2 — MODRÝ PÁSEK: Byznys & klienti (TĚŽKÉ)
    // ====================================================
    {
      id: 'byznys',
      order: 2,
      belt: 'Modrý pásek',
      icon: '🟦',
      name: 'Byznys & klienti',
      desc: 'Cenotvorba, akvizice, marketing a sales. Rozhodovací otázky — ať se umíš správně rozhodnout v reálných situacích a přestaneš soutěžit cenou.',
      questions: [
        {
          q: 'Jsi dobrý a rychlý a účtuješ od hodiny. Co se stane, když se zlepšíš a zrychlíš?',
          options: [
            'Vyděláš MÍŇ za stejný výsledek — hodinovka trestá rychlost',
            'Vyděláš víc, protože stihneš víc klientů',
            'Nezmění se nic',
            'Klient ti připlatí za rychlost'
          ],
          correct: 0,
          explain: 'Hodinovka spojuje příjem s časem, ne s hodnotou. Čím jsi lepší a rychlejší, tím míň účtuješ za stejný výstup. Proto účtuj za výsledek/balíček — jeden z nejdražších omylů začátečníků.',
          slug: 'hodina-vs-balicky'
        },
        {
          q: 'Stavíš nabídku. Jak nejspíš zvedneš průměrnou útratu klienta?',
          options: [
            'Nabídnout tři balíčky a vést klienta k prostřednímu (kotvení nejdražším)',
            'Dát jeden balíček za nejnižší možnou cenu',
            'Nechat klienta, ať si cenu nadiktuje',
            'Schovat ceny a říct je až úplně na konci'
          ],
          correct: 0,
          explain: 'Tři úrovně dávají referenci. Nejdražší balíček posune vnímání — prostřední pak vypadá rozumně a kupuje ho většina. Jediná „levná" varianta naopak stáhne všechny dolů.',
          slug: 'cenik-ktery-prodava'
        },
        {
          q: 'Klient: „Je to nad můj rozpočet." Co je dlouhodobě nejvýhodnější reakce?',
          options: [
            'Nabídnout menší balíček (míň výstupů), ne slevu na stejnou práci',
            'Hned slevit o 20 %, ať zakázku máš',
            'Obhájit cenu tím, kolik tě stálo vybavení',
            'Říct, že levněji to nikdo neudělá'
          ],
          correct: 0,
          explain: 'Sleva na stejnou práci ti sebere marži a naučí klienta smlouvat. Líp uber hodnotu (kratší focení, míň fotek) za nižší cenu — cena i rozsah klesnou společně a tvoje práce si drží hodnotu.',
          slug: 'namitky'
        },
        {
          q: 'Máš plný kalendář a musíš odmítat poptávky. Co je nejchytřejší krok?',
          options: [
            'Zdražit — poptávka přesahuje kapacitu, trh ti dává zelenou',
            'Nabrat ještě víc zakázek a nespat',
            'Držet cenu a nabrat levnou výpomoc',
            'Nedělat nic, ať klienty neodradíš'
          ],
          correct: 0,
          explain: 'Plno a odmítání je nejjasnější signál, že jsi pod cenou. Zdražením vyděláš víc za míň práce a odfiltruješ nejhůř platící. Vyšší cena = víc času i prostoru na kvalitu.',
          slug: 'kdy-zdrazit'
        },
        {
          q: 'Chceš ven z cenové války, kde každý podbízí cenu. Co funguje nejlíp?',
          options: [
            'Specializovat se a vybudovat rozpoznatelný styl/niku — přestaneš být srovnatelný',
            'Dát cenu o korunu pod konkurenci',
            'Fotit úplně všechno pro každého',
            'Kopírovat nejlevnějšího v okolí'
          ],
          correct: 0,
          explain: 'Když děláš to samé co všichni, klient rozhoduje jen podle ceny. Specializace a vlastní styl tě udělají nesrovnatelným — pak si účtuješ za to, že jsi ty, ne za „nejlevnější focení".',
          slug: 'konkurence-pozice'
        },
        {
          q: 'Začínáš a nemáš portfolio. Co je nejlepší první tah?',
          options: [
            'Nafotit pár řízených zakázek (známí, spolupráce, styled shoot) a získat ukázky + reference',
            'Hned platit reklamu a čekat, až přijdou zakázky',
            'Nabídnout nejnižší cenu ve městě',
            'Počkat, až budeš „připravený"'
          ],
          correct: 0,
          explain: 'Bez ukázek tě nikdo nenajme a podbízení cenou přitáhne nejhorší klienty. Vytvoř si materiál a první reference řízeným focením — pak máš co ukázat a od čeho šplhat s cenou nahoru.',
          slug: 'prvni-klienti'
        },
        {
          q: 'Chceš víc zakázek bez placené reklamy. Co má nejlepší poměr výsledek/náklady?',
          options: [
            'Systematicky si říkat o doporučení spokojeným klientům ve chvíli nadšení',
            'Kupovat sledující na Instagramu',
            'Rozhazovat letáky do schránek',
            'Dělat slevové akce každý měsíc'
          ],
          correct: 0,
          explain: 'Doporučení je nejlevnější a nejdůvěryhodnější kanál — chodí předem „prodaní" lidé. Klíč je o doporučení aktivně požádat (ne čekat náhodu), nejlíp hned po předání fotek.',
          slug: 'doporucovaci-system'
        },
        {
          q: 'Oslovuješ firmy cold e-mailem. Co rozhoduje o tom, jestli odepíšou?',
          options: [
            'Krátká osobní zpráva o hodnotě pro NĚ + follow-up, když neodepíšou',
            'Co nejdelší e-mail s ceníkem a životopisem',
            'Stejná hromadná zpráva na co nejvíc adres',
            'Poslat jen odkaz na Instagram bez textu'
          ],
          correct: 0,
          explain: 'Firmy řeší svůj problém, ne tvoje CV. Ukaž konkrétní přínos, drž to krátké a osobní. A většina obchodů se stane až ve follow-upu — jeden e-mail nestačí, vzdát to po prvním je chyba.',
          slug: 'cold-outreach'
        },
        {
          q: 'Chceš stabilní přísun svateb, aniž bys sháněl každého klienta zvlášť. Co dává největší páku?',
          options: [
            'Spojit se s wedding plannery a místy, co tě budou doporučovat dál',
            'Postovat víc na Instagram',
            'Snížit cenu pod konkurenci',
            'Rozdávat letáky na svatebním veletrhu'
          ],
          correct: 0,
          explain: 'Jeden dobrý partner (planner, místo, agentura) ti pošle klienty opakovaně — cizíma rukama plníš kalendář. Buduj win-win vztahy s lidmi, kteří mluví s tvými klienty dřív než ty.',
          slug: 'spoluprace-partneri'
        },
        {
          q: 'Lidé koukají na web, ale neobjednají hned (svatbu plánují za rok). Co s tím?',
          options: [
            'Získat kontakt (např. za užitečné PDF) a zůstat s nimi v kontaktu e-mailem',
            'Nedělat nic — kdo chce, ten napíše',
            'Otravovat je každý den v DM',
            'Smazat je ze statistik'
          ],
          correct: 0,
          explain: 'Většina lidí není připravená koupit teď hned. Když získáš kontakt a budeš dávat hodnotu e-mailem, zůstaneš první na řadě, až čas přijde. Seznam vlastníš — na rozdíl od sledujících na cizí platformě.',
          slug: 'lead-magnety'
        },
        {
          q: 'Poptávky ti chodí, ale málokdo nakonec podepíše. Kam zaměřit energii?',
          options: [
            'Na konverzi: rychlost reakce, jasná nabídka a vedení k podpisu',
            'Na ještě větší dosah a víc sledujících',
            'Na úplně nový web',
            'Na nákup lepšího foťáku'
          ],
          correct: 0,
          explain: 'Když poptávky chodí, dosah funguje — problém je dál ve funnelu. Pomalá odpověď nebo mlhavá nabídka tě stojí zakázky, co už máš skoro v kapse. Najdi, kde lidi odpadávají, a tam zaber.',
          slug: 'funnel'
        },
        {
          q: 'Chceš, aby ti Instagram nosil klienty, ne jen lajky. Co děláš?',
          options: [
            'Ukazuješ výsledky i proces a máš jasné CTA + snadnou cestu k poptávce',
            'Postuješ co nejčastěji cokoliv',
            'Dokoupíš sledující pro důvěryhodnost',
            'Pravidelně mažeš starší příspěvky'
          ],
          correct: 0,
          explain: 'Lajky nezaplatí faktury. Z dosahu se stane zakázka, až když je jasné, co nabízíš a jak si tě objednat — a když lidi vidí důkaz (výsledky) i lidskost (proces). Kupování sledujících dosah naopak zabíjí.',
          slug: 'instagram'
        },
        {
          q: 'Chceš, aby tě lokálně našli lidé, co aktivně hledají fotografa. Co má nejvyšší návratnost?',
          options: [
            'Založit a vyladit Google Business Profile a sbírat recenze',
            'Platit influencery v jiném městě',
            'Tlačit globální dosah na TikToku',
            'Měnit logo a barvy webu'
          ],
          correct: 0,
          explain: 'Kdo hledá „fotograf [město]", chce koupit hned. Google Business Profile + recenze tě dostanou do mapy a výsledků zdarma — nejlevnější horké leady, co existují. Lokální SEO je pro většinu fotografů zlatý důl.',
          slug: 'seo'
        },
        {
          q: 'Kdy nejlíp nabídnout klientovi vyšší balíček nebo album (upsell)?',
          options: [
            'Ve chvíli, kdy je nadšený z fotek — hodnota je nejvíc cítit',
            'Až po roce v chladném e-mailu',
            'Nikdy, působí to vlezle',
            'Hned na začátku místo focení'
          ],
          correct: 0,
          explain: 'Upsell není vnucování — je to nabídnout víc hodnoty, když po ní klient sám touží. Po předání fotek, kdy je dojatý, je ochota k albu/upgradu nejvyšší. Správné načasování zvedne hodnotu zakázky bez tlaku.',
          slug: 'upsell'
        },
        {
          q: 'Klient ještě před podpisem smlouvá o ceně, mění zadání a tlačí na termín. Co je nejvýhodnější?',
          options: [
            'Brát to jako varovný signál a klidně zakázku odmítnout',
            'Slevit a vyhovět, ať ho získáš',
            'Ignorovat to — po podpisu se to srovná',
            'Zvednout cenu a doufat, že odejde sám'
          ],
          correct: 0,
          explain: 'Jak se klient chová před podpisem je nejlepší ochutnávka toho, co přijde potom — obvykle se to jen zhorší. Problémový klient sežere čas, nervy i marži. Umět slušně říct ne uvolní místo pro lepší zakázky.',
          slug: 'difficult-clients'
        }
      ]
    },

    // ====================================================
    // LEVEL 3 — HNĚDÝ PÁSEK: Mindset & růst (TĚŽKÉ)
    // ====================================================
    {
      id: 'mindset',
      order: 3,
      belt: 'Hnědý pásek',
      icon: '🟫',
      name: 'Mindset & růst',
      desc: 'Imposter syndrom, burnout, srovnávání, disciplína a plánování. Otázky, co ti mají dát použitelný princip, jak focení ustát dlouhodobě a v hlavě.',
      questions: [
        {
          q: 'Nechce se ti tvořit ani makat. Na co se dá dlouhodobě spolehnout?',
          options: [
            'Na rutinu a systém — fungují i ve dnech bez nálady',
            'Počkat, až přijde motivace',
            'Koupit nové vybavení pro nakopnutí',
            'Dělat jen tehdy, když je chuť'
          ],
          correct: 0,
          explain: 'Motivace kolísá; kdo na ni čeká, nedělá nic. Výsledky drží rutina a systém, co jedou i v mizerný den. Disciplína > nálada — a chuť často přijde, až když začneš.',
          slug: 'motivace-slow'
        },
        {
          q: 'Posouváš se, a přesto si pořád připadáš jako podvodník. Co to nejspíš znamená?',
          options: [
            'Že rosteš — laťka se zvedá rychleji než sebevědomí (sedí to i na schopné)',
            'Že na to fakt nemáš a měl bys skončit',
            'Že máš málo lajků',
            'Že potřebuješ dražší techniku'
          ],
          correct: 0,
          explain: 'Imposter syndrom sedá na výkonné lidi: čím víc umíš, tím výš vidíš a tím snáz si přijdeš malý. Není to důkaz neschopnosti, spíš růstu. Když to poznáš, vezmeš mu půlku síly.',
          slug: 'imposter-syndrom'
        },
        {
          q: 'Vyschly ti nápady (tvůrčí blok). Co tě nejspíš rozhýbe?',
          options: [
            'Dát si omezení (jedno místo, jeden objektiv, jedno téma) a prostě začít',
            'Scrollovat cizí tvorbu, dokud nepřijde inspirace',
            'Počkat, až se vrátí muza',
            'Koupit nový objektiv'
          ],
          correct: 0,
          explain: 'Nekonečná svoboda blok prohlubuje, omezení kreativitu nastartuje. A pohyb dělá náladu, ne naopak — tvorba startuje akci. Scrollování cizích feedů blok spíš přiživí přes srovnávání.',
          slug: 'creative-block'
        },
        {
          q: 'Bereš všechny zakázky, co přijdou, a začínáš focení nesnášet. Co je nejlepší?',
          options: [
            'Nastavit hranice a vybírat zakázky — chránit čas i jiskru',
            'Zatnout zuby a makat ještě víc',
            'Přestat fotit úplně na celý rok',
            'Zvednout ceny a jet dál ve stejném tempu'
          ],
          correct: 0,
          explain: 'Burnout nepřichází z práce, ale z nedostatku hranic a kontroly. Vybírat zakázky a chránit volno je udržitelnost. Brát všechno tě dovede ke zdi; úplně přestat zase zabije rozjezd — hranice jsou střední cesta.',
          slug: 'burnout'
        },
        {
          q: 'Žiješ focením a tvoříš jen na zakázku. Proč si zachovat osobní projekty?',
          options: [
            'Drží radost a rozvíjejí tvůj styl — ten pak prodáváš klientům',
            'Je to luxus, který si nemůžeš dovolit',
            'Jen kvůli lajkům',
            'Aby sis ospravedlnil nákup techniky'
          ],
          correct: 0,
          explain: 'Jen cizí zadání řemeslo zúží a vyhasíná. Osobní tvorba je palivo stylu i motivace — a styl je přesně to, za co ti klienti platí. Není to únik od byznysu, je to údržba motoru.',
          slug: 'fotit-pro-sebe'
        },
        {
          q: 'Přišla ti veřejná ostrá recenze. Jak zareagovat?',
          options: [
            'Klidně, věcně a profesionálně — reakci vidí i ostatní čtenáři',
            'Smazat ji a autora zablokovat',
            'Veřejně se hádat a obhajovat do detailu',
            'Ignorovat a tvářit se, že neexistuje'
          ],
          correct: 0,
          explain: 'Část kritiky je užitečná, část jen jed — odděl to. Klidná věcná reakce působí profesionálně na všechny, kdo to čtou, líp než hádka nebo ticho. Recenze nečteš jen ty, ale i tví budoucí klienti.',
          slug: 'negativni-recenze'
        },
        {
          q: 'Instagram ti kazí radost z vlastní tvorby. Čím to nejspíš je?',
          options: [
            'Srovnáváš svoje zákulisí s cizí pečlivě vybranou výkladní skříní',
            'Algoritmus ti schválně bere dosah',
            'Máš horší foťák než ostatní',
            'Tvoje fotky tam nejdou vidět'
          ],
          correct: 0,
          explain: 'Vidíš cizí highlighty — to nejlepší z tisíce pokusů — a měříš to vlastním syrovým zákulisím. Nefér rovnice, co vždycky prohraješ. Není to o technice; je to o tom, co vlastně srovnáváš.',
          slug: 'srovnavani'
        },
        {
          q: 'Chceš příští rok vydělat víc. Čím začít, aby to nebylo jen přání?',
          options: [
            'Stanovit konkrétní příjmový cíl a rozpočítat ho zpět na počet zakázek a ceny',
            'Doufat, že přijde víc poptávek',
            'Koupit si hezký diář',
            'Počkat, jak rok dopadne, a pak to vyhodnotit'
          ],
          correct: 0,
          explain: '„Chci se mít líp" se neplní. Číslo rozpočítané na zakázky × cena ti řekne, co dělat každý měsíc — a jestli je cíl reálný, nebo je třeba zdražit. Tak řídíš byznys ty, ne on tebe.',
          slug: 'planovani-roku'
        },
        {
          q: 'Je mrtvá sezona a zakázky nejedou. Co je nejvýhodnější?',
          options: [
            'Investovat čas do webu, obsahu, vzdělávání a vztahů pro příští sezonu',
            'Jen čekat, až to přijde samo',
            'Zpanikařit a plošně shodit ceny',
            'Nedělat celé měsíce vůbec nic'
          ],
          correct: 0,
          explain: 'Slabší období je čas na věci, na které jindy není prostor — portfolio, web, učení, networking. Panika a slevy ti jen rozbijou pozici. (Kus řízeného odpočinku tam ale taky patří.)',
          slug: 'pomala-sezona'
        },
        {
          q: 'Práce se ti rozlévá do rodiny a příjem kolísá. Co pomůže nejvíc?',
          options: [
            'Jasné hranice práce/volno + finanční polštář na slabší měsíce',
            'Pracovat hlavně v noci, ať máš klid',
            'Vzdát se veškerého volna',
            'Přestat fotit, dokud děti nevyrostou'
          ],
          correct: 0,
          explain: 'Freelance nemá vypínač a příjem skáče. Hranice (kdy nepracuješ) a rezerva na hubené měsíce drží pohromadě byznys i vztahy. Bez nich se práce i pocit viny rozlijou do obojího.',
          slug: 'rodina-freelance'
        },
        {
          q: 'Dokonalost ti brání vydat práci včas. Co je zdravější přístup?',
          options: [
            'Vydat „dost dobré" a zlepšovat se v praxi — hotovo poráží dokonalé',
            'Ladit donekonečna, dokud to nebude perfektní',
            'Nevydat nic, dokud nejsi nejlepší v zemi',
            'Srovnávat každou fotku s top světovými autory'
          ],
          correct: 0,
          explain: 'Perfekcionismus se tváří jako vysoký standard, ale často je to strach schovaný za výmluvu. Vydaná práce učí a vydělává; ta „dokonalá" v šuplíku ne. Posouváš se děláním, ne nekonečným laděním.',
          slug: 'creative-block'
        },
        {
          q: 'Máš ušetřeno a chceš růst. Co obvykle vrátí víc — nový foťák, nebo vzdělání a marketing?',
          options: [
            'Vzdělání a marketing — klienty a cenu zvednou víc než nová technika',
            'Vždy nejdražší dostupné tělo',
            'Co nejvíc objektivů do zásoby',
            'Je to jedno, hlavně něco utratit'
          ],
          correct: 0,
          explain: 'Po určité úrovni ti lepší foťák klienty nepřinese — zvládne to i ten starý. Příjem zvedá lepší řemeslo, pozice a schopnost prodat. „Honba za technikou" je často útěk od těžší práce na sobě a byznysu.',
          slug: 'planovani-roku'
        },
        {
          q: 'Cítíš, že musíš být pořád zaneprázdněný, jinak „neděláš dost". Kde je past?',
          options: [
            'Zaměňuješ zaneprázdněnost za pokrok — záleží, NA ČEM děláš, ne kolik',
            'Čím víc hodin, tím líp — vždy',
            'Volno se rovná lenost',
            'Pauza znamená, že prohráváš'
          ],
          correct: 0,
          explain: 'Vytíženost není totéž co výsledek. Dá se být celý den „v jednom kole" a neposunout to, na čem fakt záleží (cena, klienti, styl). Měř pokrok podle dopadu, ne podle počtu odpracovaných hodin.',
          slug: 'burnout'
        },
        {
          q: 'Chceš se rychle zlepšovat. Co je cennější?',
          options: [
            'Konkrétní kritická zpětná vazba od lidí, kterým věříš',
            'Lajky a „nádhera!" v komentářích',
            'Vyhýbat se jakékoli kritice',
            'Srovnávat se jen s těmi horšími'
          ],
          correct: 0,
          explain: 'Chvála hřeje, ale neposouvá. Konkrétní kritika od někoho, kdo ví, ti ukáže slepá místa, co sám nevidíš. Hledej ji aktivně — je to zkratka, kterou si většina lidí kvůli egu odepře.',
          slug: 'negativni-recenze'
        },
        {
          q: 'Po roce focení nemáš žádný „velký průlom" a chceš to zabalit. Co je realističtější pohled?',
          options: [
            'Výsledky se sčítají roky — vytrvalost a zlepšování porazí rychlé vzplanutí',
            'Když to nevyšlo do roka, nevyjde to nikdy',
            'Úspěch je hlavně o štěstí a virálu',
            'Bez okamžitého úspěchu nemá smysl pokračovat'
          ],
          correct: 0,
          explain: 'Skoro každý „náhlý úspěch" stojí na letech tiché práce. Focení je dlouhá hra — kdo vydrží, zlepšuje se a buduje jméno, předběhne ty, co po prvním roce odpadnou. Trpělivost je konkurenční výhoda.',
          slug: 'motivace-slow'
        }
      ]
    },

    // ====================================================
    // LEVEL 4 — ČERNÝ PÁSEK: Právo & účetnictví (TĚŽKÉ, čísla 2026)
    // ====================================================
    {
      id: 'pravo',
      order: 4,
      belt: 'Černý pásek',
      icon: '⬛',
      name: 'Právo & účetnictví',
      desc: 'Smlouvy, autorská práva, GDPR, daně, fakturace a pojištění. Čísla ověřená pro 2026. Nejtěžší level — ale každá otázka ti ušetří peníze nebo průšvih.',
      questions: [
        {
          q: 'Klient zaplatil za focení. Komu patří autorství fotek a co z toho plyne?',
          options: [
            'Tobě (autorovi) — klient dostává licenci v dohodnutém rozsahu',
            'Klientovi, vždyť si je koupil',
            'Nikomu, jsou volné dílo',
            'Půl na půl mezi tebou a klientem'
          ],
          correct: 0,
          explain: 'Autorem jsi vždy ty a autorství je nepřevoditelné. Klient platí za užití — licenci. Proto rozsah licence (kde, jak dlouho, komerčně?) patří do smlouvy, jinak vznikají spory, kdo smí co.',
          slug: 'autorska-prava'
        },
        {
          q: 'Značka chce tvoje fotky „koupit napořád a na všechno". Co je pro tebe výhodnější nabídnout?',
          options: [
            'Licenci vymezenou rozsahem — a za širší/výhradní užití účtovat víc',
            'Prodat všechna práva za jednorázovou nízkou cenu',
            'Dát to zdarma za „zviditelnění"',
            'Odmítnout a vůbec to neřešit'
          ],
          correct: 0,
          explain: 'Čím širší užití (reklama, výhradnost, doba), tím vyšší cena — to je tvoje páka. „Všechno napořád" je nejdražší licence, ne nejlevnější. Kdo prodá práva paušálně lacino, přijde o opakovaný příjem i kontrolu.',
          slug: 'autorska-prava'
        },
        {
          q: 'Chceš fotku konkrétního člověka použít do reklamy. Co potřebuješ?',
          options: [
            'Souhlas s užitím podobizny (model release) pro komerční účel',
            'Nic — ve veřejném prostoru je vše dovoleno',
            'Stačí, že klient za focení zaplatil',
            'Souhlas jen v případě dětí'
          ],
          correct: 0,
          explain: 'Komerční/reklamní užití podobizny vyžaduje souhlas. Zpravodajská a umělecká výjimka na reklamu neplatí. Bez release riskuješ spor — proto patří ke každé práci, co může jít do marketingu.',
          slug: 'souhlas-foceni'
        },
        {
          q: 'Jak se nejlíp pojistit, aby tě klient nenechal ve štychu (zruší týden před svatbou)?',
          options: [
            'Nevratná záloha + jasné storno podmínky ve smlouvě',
            'Důvěřovat a papíry neřešit',
            'Vzít plnou platbu až po dodání fotek',
            'Nepodepisovat nic, ať klienta neodradíš'
          ],
          correct: 0,
          explain: 'Nevratná záloha ti pokryje rezervovaný termín, který jsi kvůli klientovi odmítl jiným. Storno podmínky řeknou, co se děje při zrušení. Smlouva nechrání před klientem — dělá jasno předem, a tím chrání vztah.',
          slug: 'smlouvy-pro-fotografy'
        },
        {
          q: 'Začínáš fotit a přivyděláváš si. Jaká forma je obvykle nejjednodušší start?',
          options: [
            'Živnost (OSVČ) — nejnižší administrativa a náklady na rozjezd',
            'Hned s.r.o. kvůli prestiži',
            'Akciová společnost',
            'Nepodnikat a fakturovat „na černo"'
          ],
          correct: 0,
          explain: 'Pro většinu fotografů je OSVČ ideální start — jednoduchá, levná, s paušály. S.r.o. dává smysl až při vyšších ziscích/riziku (oddělení majetku). Fakturovat bez živnosti je nelegální a stejně se nevyplatí.',
          slug: 'fakturace'
        },
        {
          q: 'Do jakého ročního obratu nemusíš řešit povinné plátcovství DPH?',
          options: [
            '2 000 000 Kč',
            '500 000 Kč',
            '1 000 000 Kč',
            '5 000 000 Kč'
          ],
          correct: 0,
          explain: 'Povinná registrace přichází při překročení 2 mil. Kč obratu za 12 měsíců (nad ~2,54 mil. se plátcem staneš hned automaticky). Pod limitem fakturuješ bez DPH — pro koncové klienty (svatby) je to výhoda, jsi levnější.',
          slug: 'fakturace'
        },
        {
          q: 'Fotograf (volná živnost) jede výdajový paušál. Kolik procent z příjmů si odečte?',
          options: [
            '60 % (max. 1,2 mil. Kč)',
            '80 %',
            '40 %',
            '30 %'
          ],
          correct: 0,
          explain: 'Fotografické služby jsou volná živnost → 60% paušál se stropem 1,2 mil. Kč. Vyplatí se, když máš reálné výdaje nižší než 60 % příjmů (po nákupu techniky to často nastane). A nemusíš schovávat účtenky.',
          slug: 'pausal-vs-vydaje'
        },
        {
          q: 'Letos jsi koupil techniku za 300 tisíc a vydělal 500 tisíc. Co se nejspíš vyplatí zvážit?',
          options: [
            'Reálné výdaje — velké nákupy můžou přebít 60% paušál a snížit daň víc',
            'Vždy paušál, je to jednodušší',
            'Nedanit, byl to přece nákup',
            'Rovnou přejít na paušální daň'
          ],
          correct: 0,
          explain: 'Paušál (60 % = 300 tis.) je super, dokud nemáš velké reálné výdaje. V roce velkých investic můžou skutečné výdaje (technika, nájem, cesty) převýšit paušál a snížit základ daně víc. Vyplatí se to spočítat, ne jet naslepo.',
          slug: 'pausal-vs-vydaje'
        },
        {
          q: 'Máš stabilní příjem pod milion, málo výdajů a nechceš papírování. Co zvážit?',
          options: [
            'Paušální daň — jedna platba měsíčně místo daně i pojistného, bez přehledů',
            'Dobrovolně se stát plátcem DPH',
            'Hned založit s.r.o.',
            'Nic nepřiznávat'
          ],
          correct: 0,
          explain: 'Paušální daň (2026: 1. pásmo 9 984 Kč/měs) spojí daň, sociální i zdravotní do jedné platby a zruší přehledy i přiznání. Vyplatí se při slušném příjmu a nízkých výdajích. Nevýhoda: neuplatníš slevy ani ztrátu — proto to spočítej.',
          slug: 'pausal-vs-vydaje'
        },
        {
          q: 'První rok jdeš do ztráty (nakoupil jsi techniku). Platíš jako OSVČ na hlavní činnost zálohy na pojištění?',
          options: [
            'Ano — zdravotní (2026 min. 3 306 Kč) i sociální (min. 5 720 Kč) platíš i ve ztrátě',
            'Ne, ve ztrátě se neplatí nic',
            'Platí se jen daň, pojistné ne',
            'Platí to za tebe stát'
          ],
          correct: 0,
          explain: 'U hlavní činnosti se minimálním zálohám nevyhneš ani v hubeném roce — to spoustu začátečníků překvapí (dohromady přes 9 000 Kč/měs). Odkládej si proto z každé faktury stranou. U vedlejší činnosti jsou pravidla mírnější.',
          slug: 'socialni-zdravotni-osvc'
        },
        {
          q: 'Máš zaměstnání a fotíš bokem za zhruba 80 tisíc ročně. Co platí?',
          options: [
            'Vedlejší činnost: sociální neplatíš (pod rozhodnou částkou 117 521 Kč), zdravotní z reálného zisku',
            'Platíš plné minimální zálohy jako u hlavní činnosti',
            'Nemusíš nic přiznávat',
            'Musíš dát výpověď v zaměstnání'
          ],
          correct: 0,
          explain: 'Při zaměstnání je focení vedlejší činnost — pojistné je kryté odjinud. Sociální platíš až nad rozhodnou částkou (2026: 117 521 Kč zisku), zdravotní z reálného zisku bez minima. Ideální nízkorizikový rozjezd. Daň ale přiznáváš vždy.',
          slug: 'hlavni-vedlejsi-cinnost'
        },
        {
          q: 'Co si jako fotograf typicky můžeš dát do daňových nákladů (při reálných výdajích)?',
          options: [
            'Techniku, software, nájem ateliéru, cesty za zakázkou, web a marketing',
            'Cokoliv osobního, i rodinnou dovolenou',
            'Nic, náklady se neuznávají',
            'Jen foťák, nic dalšího'
          ],
          correct: 0,
          explain: 'Uznatelné jsou výdaje související s podnikáním — technika (často přes odpisy), software, nájem, cestovné, web, marketing. Osobní spotřeba ne. Vést to pořádně se vyplatí: každá tisícovka v nákladech sníží základ daně.',
          slug: 'danove-naklady'
        },
        {
          q: 'Jsi neplátce DPH a platíš reklamu na Facebooku nebo Googlu. Co musíš udělat?',
          options: [
            'Registrovat se jako identifikovaná osoba a odvést z reklamy DPH',
            'Nic — neplátce DPH nic neřeší',
            'Stát se rovnou plnohodnotným plátcem DPH na všechno',
            'Nic — DPH za tebe odvede Facebook'
          ],
          correct: 0,
          explain: 'Přijetí služby z jiného státu EU (reklama Meta/Google) tě dělá identifikovanou osobou — registruješ se a odvádíš českou DPH z té reklamy. Plátcem pro tuzemské zakázky se tím ale nestáváš. Spousta lidí o tom neví a má pak problém.',
          slug: 'reklama-ze-zahranici'
        },
        {
          q: 'Fakturuješ focení firmě v EU (plátci DPH). Jak je to s DPH na faktuře?',
          options: [
            'Bez DPH v režimu reverse charge — daň přizná odběratel (ty musíš být aspoň identifikovaná osoba)',
            'Připočítáš českou DPH 21 %',
            'Připočítáš DPH té dané země',
            'Faktura se vůbec nevystavuje'
          ],
          correct: 0,
          explain: 'U B2B služby do jiného státu EU se uplatní reverse charge: fakturuješ bez DPH, daň vypořádá příjemce. Ty se k tomu musíš stát aspoň identifikovanou osobou a podat souhrnné hlášení. Klient mimo EU je zase jiný režim.',
          slug: 'fakturace-do-zahranici'
        },
        {
          q: 'Jak nejlíp předejít tomu, že ti klient nezaplatí?',
          options: [
            'Záloha předem + finální fotky předat až po doplacení',
            'Důvěřovat a poslat všechno předem',
            'Při zpoždění o den rovnou žalovat',
            'Nedělat smlouvu, ať to klienta neodradí'
          ],
          correct: 0,
          explain: 'Nejlevnější vymáhání je to, které nemusíš dělat. Záloha + dodání až po platbě drží páku u tebe. Smlouva ti navíc usnadní případné vymáhání. Vymáhat až po dodání všeho je ta nejhorší pozice.',
          slug: 'klient-nezaplatil'
        }
      ]
    }
  ]
};

window.KENJI_QUIZ = KENJI_QUIZ;
