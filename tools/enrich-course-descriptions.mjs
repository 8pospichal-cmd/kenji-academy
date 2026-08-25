import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPORTS = path.join(ROOT, 'tools/course-exports');
const norm = (s) => String(s || '').replace(/^\s*\d+\.\s*/, '').toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const empty = (html) => !String(html || '').replace(/<p>\s*<\/p>/g, '').replace(/<[^>]+>/g, '').trim();
const text = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const note = (lead, points, task) =>
  `<blockquote><p>${lead}</p></blockquote><h3>Co si z lekce odnést</h3><ul>${points.map(([h, b]) => `<li><p><strong>${h}:</strong> ${b}</p></li>`).join('')}</ul><h3>Praktický krok</h3><p>${task}</p>`;

const NOTES = {
  // Základy a technika
  rawvsjpg: note('RAW a JPEG nejsou dvě úrovně kvality, ale dva rozdílné pracovní postupy. Volba formátu určuje, kolik prostoru budeš mít při úpravě a jak rychle dokážeš fotky odevzdat.', [
    ['RAW', 'Uchovává výrazně více obrazových dat. Hodí se pro placenou práci, náročné světlo, větší úpravy expozice a sjednocování barev celé série.'],
    ['JPEG', 'Je menší, hotový přímo z foťáku a rychlý na předání. Má ale menší rezervu ve světlech, stínech a vyvážení bílé.'],
    ['Rozhodovací pravidlo', 'Když výsledek musíš garantovat, foť RAW. JPEG používej tam, kde je důležitější okamžitá rychlost než rozsáhlá postprodukce.']
  ], 'Zapni na jednu zakázku RAW+JPEG. U stejné fotky stáhni expozici, vytáhni stíny a změň vyvážení bílé. Porovnej, kdy se JPEG začne rozpadat, a podle toho si nastav vlastní pravidlo.'),
  zakladysviceni: note('Dobré světlo nezačíná nákupem blesku. Začíná schopností rozpoznat jeho směr, velikost, tvrdost a poměr vůči okolnímu světlu.', [
    ['Směr', 'Boční světlo vytváří objem, čelní světlo vyhlazuje a protisvětlo odděluje objekt od pozadí. Nejdřív přesuň člověka, až potom techniku.'],
    ['Velikost zdroje', 'Čím větší je zdroj vzhledem k objektu a čím je blíž, tím měkčí budou přechody stínů. Proto funguje okno nebo softbox blízko obličeje.'],
    ['Kontrola', 'Odstraň rušivé směsi barev, hlídej přepaly na pleti a nastav expozici podle hlavního objektu, ne podle celé místnosti.']
  ], 'Vyfoť jeden portrét u okna ze tří pozic: čelem k oknu, bokem a v protisvětle. Neměň techniku, jen pozici. U každé varianty si napiš, co udělala s tvarem obličeje a náladou.'),
  objektivy: note('Objektiv vybírej podle výsledku a pracovního prostoru, ne podle toho, který má nejvyšší cenu nebo nejnižší clonové číslo.', [
    ['Ohnisko', 'Široké ohnisko zdůrazní prostor a perspektivu, delší ohnisko prostor stlačí a uklidí pozadí. U portrétu hlídej deformaci obličeje při focení zblízka.'],
    ['Světelnost', 'Nižší clona pomůže v šeru a oddělí pozadí, ale zmenší hloubku ostrosti. U skupin proto není nejnižší clona automaticky nejlepší volba.'],
    ['Praktická volba', 'Zoom dává rychlost a flexibilitu, pevné sklo bývá lehčí a nutí tě pracovat s pozicí. Rozhoduje typ zakázky, ne internetová tabulka.']
  ], 'Projdi posledních 100 povedených fotek a seřaď je podle použitého ohniska. Ohnisko, na kterém vzniká nejvíc tvých použitelných záběrů, je důležitější než sklo, které doporučuje někdo jiný.'),
  postprodukcefotekadobephotoshop: note('Photoshop používej na zásahy, které Lightroom nezvládne přesně nebo rychle: lokální retuš, složitější výběry, vrstvy a kontrolovanou změnu jednotlivých částí fotografie.', [
    ['Nedestruktivní práce', 'Pracuj s kopiemi vrstev, maskami a smart objekty. Úpravu musíš umět zeslabit nebo vrátit bez poškození originálu.'],
    ['Pořadí', 'Nejdřív oprav technické chyby, potom pleť a rušivé prvky, nakonec kontrast a barvu. Retuš bez pořadí vede k opakované práci.'],
    ['Míra retuše', 'Kontroluj fotku při 100 % i v cílové velikosti. Zachovej strukturu pleti a odstraňuj dočasné nedokonalosti, ne identitu člověka.']
  ], 'Vytvoř si jeden PSD vzor se skupinami „čištění“, „pleť“, „světlo“ a „barva“. Na další zakázce změř, kolik času ti konzistentní struktura ušetřila.'),
  upravujemepsifotesky: note('U zvířecích fotografií je nejdůležitější zachovat charakter, kresbu srsti a jasné oči. Úprava má zvýraznit výraz, ne udělat ze psa plastovou figurku.', [
    ['Srst', 'Zesvětluj stíny opatrně a pracuj lokálně. Plošné vytažení detailů často vytvoří šedou srst a nepřirozené halo kolem těla.'],
    ['Oči', 'Zvýrazni odlesk a lokální kontrast, ale zachovej tmavé části duhovky. Přehnané zesvětlení působí okamžitě uměle.'],
    ['Pozadí', 'Odstraň vodítko a rušivé světlé body jen tehdy, když odvádějí pozornost. Barvu pozadí slaď se srstí a náladou scény.']
  ], 'Uprav jednu fotku ve dvou verzích: přirozenou a výraznou. Po hodině se k nim vrať a zmenši je na velikost pro Instagram. Nech jen zásahy, které pomáhají výrazu i v malém náhledu.'),
  zpohledumodelkypokecomodelkovani: note('Silný portrét nevzniká jen nastavením foťáku. Model před objektivem potřebuje vědět, co se bude dít, proč po něm něco chceš a že nevypadá špatně mezi jednotlivými záběry.', [
    ['Bezpečí', 'Předem vysvětli účel, délku focení, použití fotografií a hranice. Souhlas není formalita a může se během focení změnit.'],
    ['Vedení', 'Nedávej abstraktní pokyny typu „buď přirozená“. Ukaž směr pohledu, práci rukou, přenos váhy a drobný pohyb, který člověk dokáže zopakovat.'],
    ['Zpětná vazba', 'Říkej, co funguje, a průběžně ukaž několik povedených záběrů. Ticho fotograf často vnímá jako soustředění, model jako nejistotu.']
  ], 'Před dalším portrétem si připrav pět konkrétních pohybových pokynů a tři věty pozitivní zpětné vazby. Po focení se modela zeptej, ve které části se cítil nejjistěji a proč.'),

  // Byznys a klienti
  uvoddocenotvorby: note('Cena nezačíná otázkou „kolik si bere konkurence“, ale výpočtem nákladů, kapacity a hodnoty výsledku pro klienta.', [
    ['Spodní hranice', 'Sečti čas komunikace, přípravy, focení, dopravy, výběru, editace a předání. Přidej provoz, daně, obnovu techniky a rezervu.'],
    ['Kapacita', 'Měsíční cíl neděl počtem pracovních hodin, ale počtem reálně prodejných zakázek. Administrativa a marketing nejsou fakturovatelné každou hodinu.'],
    ['Kontext', 'Stejný čas může mít jinou cenu podle licence, rozsahu použití, rychlosti dodání, rizika a obchodní hodnoty výstupu.']
  ], 'Spočítej úplnou časovou stopu posledních tří zakázek. Vyděl cenu skutečným počtem hodin a porovnej výsledek s hodinovkou, kterou potřebuješ pro svůj měsíční cíl.'),
  cenotvorba: note('Dobrá cenotvorba chrání tvoji marži a zároveň klientovi usnadňuje rozhodnutí. Cena nesmí být náhodné číslo vybrané podle pocitu.', [
    ['Balíčky', 'Postav tři jasné varianty podle výsledku, ne jen počtu hodin. Prostřední balíček by měl řešit nejběžnější potřebu a být nejsnáze porovnatelný.'],
    ['Rozsah', 'Přesně definuj počet výstupů, revize, termín, licenci, dopravu a co se účtuje navíc. Nejasný rozsah je nejčastější cesta k práci zdarma.'],
    ['Testování', 'Sleduj poměr poptávek, nabídek a objednávek. Jedno odmítnutí neznamená vysokou cenu; rozhoduj podle série dat, ne podle jedné emoce.']
  ], 'Přepiš hlavní nabídku do tří balíčků. Ke každému napiš výsledek pro klienta, jasný rozsah a zisk po odečtení nákladů. Balíček bez zdravé marže uprav nebo zruš.'),
  podhodnocovanizakazek: note('Podhodnocení není jen nízká částka na faktuře. Vzniká i neomezenými revizemi, dodatečnými výstupy, cestou nebo komunikací, které nejsou v nabídce.', [
    ['Rozpoznání', 'Varováním je plný kalendář bez peněz, odpor k editaci a zakázky, na kterých každá další prosba snižuje efektivní hodinovku.'],
    ['Hranice', 'Měj minimální cenu zakázky a nepřekračuj rozsah bez písemného potvrzení změny ceny nebo termínu.'],
    ['Zvyšování', 'Cenu zvedej nejdřív u nových klientů. Stávajícím změnu oznam dopředu a vysvětli ji lepším procesem nebo jasnějším rozsahem.']
  ], 'Najdi zakázku s nejnižší skutečnou hodinovkou. Sepiš, kde vznikla práce navíc, a doplň tyto body jako placené položky do nové nabídky a smlouvy.'),
  vytvorsikvalitniportfolio: note('Portfolio není archiv všeho, co se ti povedlo. Je to obchodní argument pro konkrétní typ klienta a musí během několika sekund ukázat, že umíš dodat jeho výsledek.', [
    ['Výběr', 'Nech pouze práci odpovídající zakázkám, které chceš získávat. Jedna slabá fotografie snižuje důvěru ve všechny silné kolem ní.'],
    ['Sekvence', 'Začni nejsilnějším výsledkem, ukaž konzistenci a zakonči jasnou výzvou ke kontaktu. Ucelená série prodává lépe než směs jednotlivých hitů.'],
    ['Důkaz', 'Přidej krátké případové studie: problém klienta, tvoje řešení, výsledek a reference. Klient tak vidí proces, ne jen estetiku.']
  ], 'Vyber 15 fotografií pro jeden konkrétní obor. Každou musíš obhájit větou „Tahle fotka klientovi dokazuje, že…“. Co nedokážeš obhájit, vyřaď.'),
  vyuzivejzakazkynamaximum: note('Jedna zakázka může přinést víc než jednorázovou fakturu: kvalitní případovou studii, doporučení, další výstupy i navazující spolupráci.', [
    ['Před zakázkou', 'Zjisti, kde klient výstupy použije a co bude potřebovat za měsíc nebo čtvrt roku. Díky tomu připravíš smysluplný rozsah místo náhodného upsellu.'],
    ['Během práce', 'Sbírej zákulisí, souhlas s publikací a podklady pro případovou studii. Nečekej, až bude projekt uzavřený a všichni se rozejdou.'],
    ['Po předání', 'Naplánuj žádost o referenci, doporučení a konkrétní follow-up. Nejlepší chvíle je po potvrzení, že výstup klientovi funguje.']
  ], 'U poslední zakázky napiš tři navazující nabídky, které klientovi reálně pomohou. Jednu pošli jako konkrétní doporučení s vysvětlením výsledku, ne jako obecné „nechcete ještě něco?“.'),
  vyuzivejnetworking: note('Networking není rozdávání vizitek. Je to dlouhodobé budování vztahů s lidmi, kteří mají přístup k tvým ideálním klientům nebo řeší doplňkovou část stejné zakázky.', [
    ['Správné prostředí', 'Choď tam, kde jsou klienti a jejich dodavatelé, ne jen další fotografové. Pro svatby to mohou být koordinátoři a místa, pro firmy marketéři a agentury.'],
    ['Hodnota první', 'Přines užitečný kontakt, nápad nebo malou pomoc dřív, než požádáš o zakázku. Důvěra roste z konkrétní zkušenosti.'],
    ['Follow-up', 'Do 48 hodin připomeň kontext setkání a navrhni jeden přirozený další krok. Bez follow-upu je většina networkingu jen příjemný rozhovor.']
  ], 'Vyber pět partnerů, kteří už obsluhují tvoji cílovku. U každého napiš, co mu můžeš přinést bez okamžitého prodeje, a oslov první dva konkrétní zprávou.'),
  doporucenifollowupaupsell: note('Doporučení, follow-up a upsell fungují nejlépe jako součást procesu, ne jako improvizovaná prosba ve chvíli, kdy nemáš práci.', [
    ['Doporučení', 'Žádej po potvrzení spokojenosti a usnadni klientovi předání kontaktu. Řekni přesně, komu umíš pomoct a s čím.'],
    ['Follow-up', 'Navazuj podle přirozeného cyklu služby: výročí, nová sezóna, další kampaň nebo obnova obsahu. Každý kontakt musí mít důvod.'],
    ['Upsell', 'Nabízej výstup, který zvyšuje hodnotu původní zakázky: tisk, album, krátké video, rychlé dodání, širší licenci nebo obsahový balíček.']
  ], 'Nastav si tři šablony: žádost o recenzi po předání, follow-up za 90 dní a nabídku jednoho logického rozšíření služby. U každé ponech místo pro osobní detail.'),
  silaprezentace: note('Klient nekupuje počet snímků ani seznam techniky. Kupuje jistotu, že rozumíš jeho situaci a dovedeš ho k požadovanému výsledku.', [
    ['Struktura', 'Začni problémem a cílem klienta, potom ukaž řešení, důkazy, proces, rozsah a investici. Cena bez kontextu vypadá vždy vyšší.'],
    ['Důkaz', 'Používej relevantní ukázky a krátké případové studie. Obecné portfolio je slabší než jeden podobný projekt s vysvětleným výsledkem.'],
    ['Rozhodnutí', 'Ukonči prezentaci konkrétním dalším krokem, termínem a tím, co potřebuješ od klienta. Nenechávej nabídku bez vedení.']
  ], 'Vezmi současné PDF nebo e-mail s nabídkou a přesuň cenu až za problém, řešení a důkaz. Smaž vše, co klientovi nepomáhá rozhodnout se.'),
  rozhovorsmarketackou: note('Marketér přemýšlí v cílech, publiku, kanálech a měřitelném výsledku. Fotograf, který umí mluvit stejným jazykem, přestává být dodavatelem obrázků a stává se partnerem kampaně.', [
    ['Brief', 'Ptej se na cílovou skupinu, sdělení, formáty, distribuční kanály, termíny a metriku úspěchu. Bez toho nevíš, co má fotografie udělat.'],
    ['Výstupy', 'Navrhni poměry stran, varianty s prostorem pro text, konzistentní sérii a licenční rozsah podle reálného použití.'],
    ['Spolupráce', 'Potvrď schvalovatele, počet kol připomínek a způsob předání. Marketingové projekty selhávají častěji na procesu než na fotografii.']
  ], 'Přepiš svůj poptávkový formulář tak, aby zjišťoval obchodní cíl, publikum, kanály a termín kampaně. Teprve potom se ptej na počet fotografií.'),
  eventyaverejnyakce: note('Eventová fotografie se prodává rychlostí, spolehlivostí a schopností zachytit důležité lidi i příběh akce bez narušení programu.', [
    ['Příprava', 'Vyžádej harmonogram, seznam klíčových osob, povinné záběry, branding a kontakt na člověka, který rozhoduje na místě.'],
    ['Pokrytí', 'Střídej celek, střední záběr a detail. Zachyť atmosféru, interakce, partnery i momenty dokazující návštěvnost a energii.'],
    ['Dodání', 'Nabídni rychlý výběr pro média a sociální sítě ještě během akce nebo následující ráno. Rychlost má pro organizátora přímou hodnotu.']
  ], 'Vytvoř jednostránkový event checklist: kontakty, harmonogram, VIP, partneři, povinné záběry, způsob zálohy a termín rychlého výběru.'),
  propagacezaznamzwebinare: note('Propagace není jeden příspěvek, ale opakovatelný systém, který propojí pozornost, důvěru a jasnou cestu k poptávce.', [
    ['Kanál', 'Vyber jeden hlavní akviziční kanál podle toho, kde cílovka skutečně hledá: doporučení, Google, sociální sítě, partneři nebo aktivní oslovení.'],
    ['Obsah', 'Kombinuj důkaz práce, vysvětlení procesu, zkušenost klienta a konkrétní nabídku. Samotné hezké fotografie často neřeknou, proč si tě objednat.'],
    ['Měření', 'Sleduj počet relevantních kontaktů, poptávek a objednávek. Dosah bez poptávek není obchodní výsledek.']
  ], 'Na 30 dní si zvol jeden kanál a jednu nabídku. Každý týden zapiš počet oslovení, odpovědí, poptávek a objednávek. Po měsíci uprav nejslabší část procesu.'),
  zacnivyuzivatbarterovespoluprace: note('Barter má smysl jen tehdy, když je výměna konkrétní, měřitelná a obě strany přesně vědí, co dostanou. „Uděláme si promo“ není dohoda.', [
    ['Hodnota', 'Porovnej běžnou cenu své práce s reálnou hodnotou protislužby. Sleva nebo neurčitý příslib zveřejnění nemusí pokrýt tvé náklady.'],
    ['Rozsah', 'Písemně stanov výstupy, termíny, licenci, počet úprav, označení a co se stane, když druhá strana svou část nesplní.'],
    ['Strategie', 'Preferuj barter, který vytváří portfolio pro cílový obor, přístup ke správnému publiku nebo dlouhodobé partnerství.']
  ], 'Před dalším barterem vyplň jednoduchou tabulku: moje cena, jejich hodnota, konkrétní výstupy, publikum, licence a termín. Pokud některé pole neznáš, dohodu ještě nepotvrzuj.'),
  spolupracesinfluencerynemusibytspatna: note('Počet sledujících není důkaz obchodní hodnoty. U spolupráce s influencerem rozhoduje shoda publika, důvěra a možnost změřit konkrétní výsledek.', [
    ['Audience fit', 'Ověř lokalitu, věk, zájmy a kvalitu komentářů. Menší relevantní publikum může přinést víc klientů než velký obecný profil.'],
    ['Dohoda', 'Urči počet výstupů, formát, termín, označení, dobu ponechání obsahu a licenci k dalšímu použití.'],
    ['Měření', 'Použij unikátní odkaz, kód nebo samostatný formulář. Bez měření nepoznáš, zda spolupráce přinesla poptávky, nebo jen lajky.']
  ], 'Vyber jednoho potenciálního partnera a spočítej cenu spolupráce na jednu relevantní poptávku, ne na jednoho sledujícího. Nastav měřitelný cíl ještě před focením.'),
  pripravanafoceniadulezitavybavaukazkafoceniakomunikace: note('Profesionální focení začíná před příjezdem na lokaci. Příprava snižuje technické riziko a zároveň dává klientovi pocit, že máš situaci pod kontrolou.', [
    ['Brief a plán', 'Potvrď účel, seznam výstupů, lokaci, harmonogram, kontaktní osobu a povinné záběry. Připrav si pořadí scén a variantu pro špatné počasí nebo světlo.'],
    ['Redundance', 'Měj nabité baterie, dvě karty, záložní tělo nebo jasný krizový plán, čistá skla a ověřenou synchronizaci času.'],
    ['Komunikace', 'Říkej klientovi, co právě děláš a co bude následovat. Průběžná jistota je stejně důležitá jako konečné fotografie.']
  ], 'Vytvoř předzakázkový checklist a použij ho třikrát beze změny. Potom doplň pouze chyby, které se skutečně opakovaly; tak vzniká funkční proces, ne nekonečný seznam.'),
  jakpostavitprodejniweb: note('Prodejní web musí během pěti sekund odpovědět: co děláš, pro koho, v jaké oblasti a jaký další krok má návštěvník udělat.', [
    ['První obrazovka', 'Ukaž relevantní práci, konkrétní nabídku a jedno hlavní CTA. Obecné věty o vášni návštěvníkovi nepomohou rozhodnout se.'],
    ['Důvěra', 'Doplň reference, známé klienty, popsaný proces, skutečnou tvář a odpovědi na největší obavy před objednávkou.'],
    ['Konverze', 'Formulář zkrať na informace potřebné k prvnímu rozhodnutí. Web musí být rychlý, dobře čitelný na mobilu a měřit odeslané poptávky.']
  ], 'Otevři web na telefonu a dej někomu pět sekund. Potom se zeptej, co nabízíš, komu a jak tě objednat. Každou odpověď, kterou nepoznal, oprav na první obrazovce.'),
  optimalizujsiseo: note('SEO pro fotografa stojí hlavně na tom, aby vyhledávač jasně pochopil službu, lokalitu a důvěryhodnost. Nestačí pojmenovat obrázky a čekat.', [
    ['Záměr', 'Vytvoř samostatné stránky pro reálně hledané kombinace služby a lokality. Každá stránka musí odpovědět na konkrétní potřebu, ne jen opakovat klíčové slovo.'],
    ['Lokální důvěra', 'Doplň Google Business Profile, konzistentní kontakty, reference, lokální ukázky a odkazy od relevantních partnerů.'],
    ['Technika', 'Komprimuj fotografie, používej popisné názvy a alt text, hlídej rychlost, mobilní zobrazení, titulky stránek a interní odkazy.']
  ], 'Vyber jednu službu a město. Zkontroluj první výsledky Googlu, sepiš otázky, které řeší, a vytvoř lepší stránku s vlastními ukázkami, procesem, referencí a kontaktem.'),
  hodnotimvaseportfoliaaweby: note('Audit portfolia není soutěž o nejhezčí design. Kontroluje, zda správný klient rychle pochopí nabídku, uvěří jí a bez tření odešle poptávku.', [
    ['Pětisekundový test', 'Návštěvník musí poznat obor, lokalitu a další krok. Pokud musí nejdřív rozluštit značku, web ztrácí poptávky.'],
    ['Kurátorství', 'Odstraň slabé, duplicitní a nerelevantní fotografie. Konzistentních patnáct snímků je silnějších než osmdesát různých experimentů.'],
    ['Cesta uživatele', 'Každá důležitá stránka má vést k ukázce práce, důkazu, procesu a kontaktu. Hlídej slepé konce a formuláře bez očekávaného dalšího kroku.']
  ], 'Nahraj obrazovku při průchodu vlastním webem na mobilu. Bez zastavení se pokus najít cenu nebo rozsah, reference a kontakt. Každé zaváhání označ jako bod k opravě.'),
  pravoprotvurce: note('Právní základ chrání očekávání obou stran. Nejde o strašení paragrafy, ale o jasnou dohodu, co dodáš, kdy, za kolik a jak mohou být výstupy použity.', [
    ['Smlouva', 'Definuj rozsah, cenu, splatnost, termín, storno, přesun, počet úprav, archivaci a odpovědnost za součinnost klienta.'],
    ['Licence a souhlas', 'Odděluj právo klienta fotografie používat od souhlasu lidí s publikací jejich podoby. U komerčního použití stanov média, území a dobu.'],
    ['Data', 'Chraň kontaktní údaje, galerie a zálohy. Sbírej jen to, co potřebuješ, a měj jasno, jak dlouho data držíš a komu je předáváš.']
  ], 'Projdi svou smlouvu na jedné skutečné zakázce a zvýrazni místo pro rozsah, licenci, storno a splatnost. Co nenajdeš, konzultuj s právníkem; tento přehled není náhradou právní rady.'),
  duleziteinfookf: note('Prodej fyzických fotografických produktů funguje tehdy, když máš pod kontrolou barvu, ořez, materiál, termín výroby a očekávání klienta.', [
    ['Příprava souboru', 'Použij správný barevný profil, dostatečné rozlišení a kontroluj ořez podle konkrétního formátu. Kritické prvky nenechávej těsně u hrany.'],
    ['Vzorek', 'Neprodávej produkt, který jsi fyzicky neviděl. Objednej si vzor a zkontroluj pleť, tmavé tóny, povrch, vazbu a odolnost.'],
    ['Proces', 'Stanov termín schválení návrhu, výroby, reklamace a doručení. U zakázek počítej s rezervou na sezónní špičky.']
  ], 'Vyber jeden produkt, který chceš nabízet pravidelně, objednej vzorek z vlastní fotografie a vytvoř kontrolní exportní preset přesně pro jeho rozměr a profil.'),
  zacnipouzivatpixinzvyssvetrzby: note('Tisk a fyzické produkty zvyšují hodnotu zakázky, protože klient dostává hotový výsledek, ne jen složku souborů, ke které se už nemusí vrátit.', [
    ['Nabídka', 'Ukaž produkty před focením nebo při výběru balíčku. Klient snáz koupí něco, co vidí v ruce a chápe v kontextu svého domova.'],
    ['Marže', 'Do ceny zahrň výrobu, návrh, komunikaci, kontrolu, balení, případnou reklamaci a zisk. Nepřeprodávej produkt jen s minimální přirážkou.'],
    ['Balíčky', 'Spoj digitální galerii s albem, obrazem nebo sadou tisků. Jasný balíček se prodává lépe než dlouhý ceník jednotlivostí.']
  ], 'Vytvoř tři produktové balíčky a u každého spočítej úplnou marži. Jeden vzorek vezmi na další konzultaci a sleduj, na co se klient ptá bez tvého vysvětlování.'),
  ukazkaadoporuceniproduktu: note('Produkt doporučuj podle způsobu použití, ne podle svého vkusu. Jiný materiál potřebuje rodinné album, výstavní fotografie a obraz do frekventované kanceláře.', [
    ['Album', 'Hlídej vazbu, gramáž, počet stran, konzistenci série a rytmus dvojstran. Méně dobře vybraných fotografií obvykle působí luxusněji.'],
    ['Obraz', 'Rozměr posuzuj podle stěny a pozorovací vzdálenosti. Připrav klientovi jednoduchou vizualizaci, aby se nebál většího formátu.'],
    ['Povrch', 'Mat omezuje odlesky, lesk zvýrazňuje kontrast a různé fine-art papíry mění vnímání detailu i barev. Rozhoduj podle prostoru a fotografie.']
  ], 'Připrav sadu tří fyzických vzorků nebo kvalitních maket. Ke každému napiš jednu situaci, pro kterou je nejlepší, a jednu, pro kterou ho nedoporučuješ.'),
  jaknaorganizaciaautomatizacizakazek: note('Automatizace má odstranit opakované přepisování a zapomínání, ne nahradit osobní komunikaci tam, kde klient potřebuje jistotu.', [
    ['Fáze zakázky', 'Definuj jednotný postup: poptávka, kvalifikace, nabídka, smlouva, záloha, příprava, focení, výběr, editace, předání a follow-up.'],
    ['Šablony', 'Připrav e-maily, dotazníky, smlouvy a checklisty pro opakované situace. Každou automatickou zprávu před odesláním personalizuj důležitým detailem.'],
    ['Spouštěče', 'Automatizuj připomenutí termínu, nezaplacenou fakturu, přípravu klienta a follow-up. Kritické kroky měj zároveň viditelné v jednom dashboardu.']
  ], 'Nakresli současnou cestu jedné zakázky a označ kroky, které děláš pokaždé stejně. Automatizuj nejdřív jeden častý a nízkorizikový krok, ne celý proces najednou.'),
  studioninjauvod: note('CRM má být jediným místem, kde vidíš stav zakázky, komunikaci, dokumenty a peníze. Pokud část držíš v hlavě, část v e-mailu a část v kalendáři, systém nefunguje.', [
    ['Databáze', 'Udržuj jednotný kontakt, typ zakázky, termín, hodnotu, zdroj poptávky a další krok. Díky tomu můžeš měřit, odkud přichází práce.'],
    ['Workflow', 'Vytvoř rozdílné šablony pro svatbu, portrét a firemní zakázku. Každý typ má jiné termíny, dokumenty a komunikaci.'],
    ['Migrace', 'Nejdřív přenes aktivní zakázky a otestuj proces na jedné nové. Historická data importuj až ve chvíli, kdy víš, že struktura funguje.']
  ], 'Nastav jedno testovací workflow od poptávky po předání a projdi ho s fiktivním klientem. Zapiš každý krok, který vyžadoval ruční obcházení systému.'),
  studioninjabookovani: note('Dobré online bookování zkracuje cestu od rozhodnutí k zaplacenému termínu, ale musí zároveň zabránit neúplným údajům a konfliktům v kalendáři.', [
    ['Pořadí', 'Nejdřív klient vybere službu a termín, potom doplní klíčové údaje, odsouhlasí smlouvu a zaplatí zálohu. Každý krok má jasně říct, co následuje.'],
    ['Dostupnost', 'Nastav pracovní dobu, rezervy mezi zakázkami, minimální předstih a synchronizaci kalendáře. Volný čas v kalendáři nemusí být prodejný termín.'],
    ['Tření', 'Požaduj jen údaje potřebné k rezervaci. Dlouhý kreativní brief pošli až po potvrzení, jinak zbytečně snižuješ dokončení objednávky.']
  ], 'Proveď rezervaci sám na mobilu jako nový klient. Změř čas a počet polí. Odstraň vše, co není nutné pro potvrzení termínu, smlouvu nebo platbu.'),
  hotseatzivepetrsimik: note('Hotseat má hodnotu v tom, že ukazuje způsob diagnostiky. Nehledej deset problémů najednou; najdi jedno úzké místo, které aktuálně brzdí celý systém.', [
    ['Čísla', 'Odděl nedostatek poptávek od slabé konverze a nízké hodnoty zakázky. Každý problém vyžaduje jiný zásah.'],
    ['Nabídka', 'Zkontroluj, zda je jasné komu pomáháš, s jakým výsledkem a proč má klient věřit právě tobě. Nejasnou nabídku nezachrání více obsahu.'],
    ['Priorita', 'Vyber experiment, který lze dokončit a vyhodnotit během jednoho až dvou týdnů. Dokud nemáš data, nepřestavuj celý byznys.']
  ], 'Udělej si vlastní hotseat: napiš počet oslovení, poptávek, nabídek a objednávek za posledních 30 dní. Největší procentní propad označ jako jedinou prioritu na další týden.'),
  webinar2372026: note('Záznam webináře sleduj jako pracovní sezení, ne jako další obsah do pozadí. Hodnota vznikne až převodem poznámek do konkrétní změny v praxi.', [
    ['Před sledováním', 'Napiš jednu otázku nebo problém, který chceš vyřešit. Bez cíle si zapamatuješ zajímavosti, ale nezměníš postup.'],
    ['Během záznamu', 'Zapisuj rozhodnutí a příklady, ne každou větu. U každé poznámky doplň, kde ji použiješ ve vlastním procesu.'],
    ['Po skončení', 'Vyber maximálně tři kroky, dej jim termín a první udělej do 24 hodin. Zbytek ulož mimo aktuální priority.']
  ], 'Do poznámek si vytvoř tři sloupce: „myšlenka“, „použití u mě“ a „termín“. Záznam nepovažuj za dokončený, dokud nemáš alespoň jeden splněný krok.'),

  // Svatební rozhovory
  budetohlebudoucnostsvateb: note('Budoucnost svatební fotografie není jeden nový trend, ale proměna očekávání klientů: rychlejší výstupy, kombinace fotografie a krátkého videa a osobnější způsob předání.', [
    ['Hybridní výstupy', 'Páry stále častěji chtějí vertikální obsah pro telefon vedle plnohodnotné galerie. Nabídka musí jasně říct, kdo a jak tyto výstupy vytvoří.'],
    ['Rychlost', 'Několik fotografií do 24 hodin má vysokou emoční hodnotu, ale nesmí ohrozit zálohování ani hlavní práci. Nastav přesný počet a termín.'],
    ['Nadčasovost', 'Trend používej jako doplněk. Klíčové momenty, konzistentní barva, bezpečné uložení a kvalitní komunikace zůstávají základem.']
  ], 'Navrhni jeden moderní doplněk ke stávajícímu balíčku a spočítej jeho čas, technické riziko a cenu. Přidej ho jen tehdy, když nezhorší hlavní službu.'),
  svatbyzpohledukoordinatorky: note('Koordinátorka vidí svatbu jako celek a fotograf musí být partner, který harmonogram chrání, ne další člověk, kterého je potřeba řídit.', [
    ['Před svatbou', 'Sdílej čas potřebný na skupiny, párové focení a přesuny. Potvrď kontakty, omezení lokace a variantu pro déšť.'],
    ['Na místě', 'Změny řeš přes koordinátorku a informuj ji dřív, než odvedeš pár nebo klíčové hosty. Tichá spolupráce snižuje stres všem.'],
    ['Doporučení', 'Po svatbě předej rychlý výběr relevantní i pro dodavatele a dodrž podmínky označení. Dobrá zkušenost může přinést opakovaná doporučení.']
  ], 'Připrav jednostránkový dokument pro koordinátorku: potřebné bloky focení, délky přesunů, seznam skupin, kontakty a krizový plán. Pošli ho před finálním harmonogramem.'),
  ceskopolskasvatebnicelebritavefotosvete: note('Silná pozice ve svatebním oboru vzniká spojením rozpoznatelné práce, důvěryhodného vystupování a dlouhodobých vztahů s páry i dodavateli.', [
    ['Rukopis', 'Konzistentní výběr, barva a způsob vyprávění pomáhají klientovi poznat tvoji práci bez loga. Rukopis ale nesmí být výmluva pro nezvládnuté světlo.'],
    ['Viditelnost', 'Ukazuj celý proces a kompletní příběhy, ne jen několik portrétů. Klient potřebuje vědět, že zvládneš i obřad, rodinu, večer a krizové podmínky.'],
    ['Síť', 'Pečuj o místa, koordinátory, vizážisty a další dodavatele. Dlouhodobá reputace stojí na spolehlivosti stejně jako na estetice.']
  ], 'Vyber tři vlastnosti, podle kterých má být tvoje svatební práce rozpoznatelná. U posledních pěti galerií ověř, zda jsou skutečně konzistentně vidět.'),
  realitasvatebnichfotografusvatebniduo: note('Práce ve dvojici přináší více úhlů a bezpečnost, ale pouze tehdy, když jsou předem rozdělené role, komunikace a standard výsledku.', [
    ['Role', 'Určete primární a sekundární pozici pro přípravy, obřad, skupiny a večer. Dva fotografové na stejném místě nepřidávají automaticky hodnotu.'],
    ['Synchronizace', 'Sjednoťte čas ve foťácích, základní nastavení, práci s bleskem, značení karet a způsob zálohy. To výrazně zrychlí třídění.'],
    ['Odevzdání', 'Jeden člověk musí mít finální odpovědnost za výběr a barevnou konzistenci. Klient má dostat jeden příběh, ne dvě nesourodé galerie.']
  ], 'Sepište před svatbou shot mapu s odpovědností každého fotografa. Po odevzdání vyhodnoťte duplicity, chybějící úhly a rozdíly v barvě.'),

  // Kenji v akci
  fotimehokejovybanner: note('Banner musí fungovat z dálky, v přesném formátu a často s místem pro text, loga a sponzory. Nestačí vytvořit dobrý samostatný portrét.', [
    ['Výstup první', 'Ještě před focením zjisti rozměr, poměr stran, bezpečné zóny, tiskové rozlišení a umístění grafiky. Kompozici stav podle finálního použití.'],
    ['Světlo a póza', 'U sportovce zvýrazni tvar těla a výstroje směrovým světlem. Hlídej odlesky, logo týmu, výraz a čitelnost vybavení.'],
    ['Kontrola na place', 'Foť s rezervou pro ořez a průběžně kontroluj ostrost, hrany výstroje a volný prostor. Ideální je tethering nebo alespoň náhled s maketou grafiky.']
  ], 'Vytvoř před focením prázdnou šablonu banneru s textem a logy. Každý klíčový záběr vlož do makety ještě na místě, ne až po odchodu sportovce.'),
  realitnifotografieuvod: note('Realitní fotografie má prostor vysvětlit a prodat, ne ho opticky falšovat. Cílem je čitelná dispozice, příjemné světlo a návaznost jednotlivých místností.', [
    ['Příprava prostoru', 'Ukliď rušivé drobnosti, rozsviť konzistentní světla, narovnej textilie a zkontroluj odrazy. Styling často ovlivní výsledek víc než technika.'],
    ['Perspektiva', 'Drž svislice rovně a foť z výšky, která přirozeně ukáže nábytek i prostor. Příliš široké ohnisko vytváří nereálná očekávání.'],
    ['Série', 'Vytvoř logickou prohlídku od hlavních prostor k detailům a exteriéru. Každý snímek má přidat novou informaci.']
  ], 'Projdi jednu nemovitost bez foťáku a napiš pořadí deseti záběrů, které nejlépe vysvětlí dispozici. Teprve potom začni stavět stativ.'),
  fotimenemovitost: note('Na lokaci pracuj systematicky, aby ses nemusel vracet do místností a aby všechny fotografie držely stejnou perspektivu, jas a barevnost.', [
    ['Pořadí', 'Začni exteriérem podle světla, potom hlavní obytnou částí a pokračuj vedlejšími místnostmi. Detaily foť až po povinných celcích.'],
    ['Expozice', 'Chraň výhled z oken a kresbu světel. Podle kontrastu použij bracketing nebo doplňkové světlo, ale zachovej přirozený dojem.'],
    ['Kontrola', 'Na každém záběru ověř svislice, rohy, odrazy fotografa, kabely, otevřené dveře a návaznost do další místnosti.']
  ], 'Připrav si pevný checklist místností a povinných záběrů. Na další zakázce označ každý hotový záběr ještě na místě a porovnej počet oprav proti předchozí práci.'),
  realitnifotografiemarketing: note('Realitce neprodáváš fotografie jako takové. Prodáváš rychlejší a důvěryhodnější prezentaci nemovitosti a konzistentní službu, na kterou se makléř může spolehnout.', [
    ['Nabídka', 'Balíček může spojit fotografie, půdorys, dron, krátké vertikální video a rychlé dodání. Každá položka musí řešit konkrétní část inzerce.'],
    ['Akvizice', 'Oslovuj makléře s krátkým auditem jejich současné prezentace a relevantní ukázkou. Obecná zpráva „jsem fotograf“ nedává důvod ke změně.'],
    ['Retence', 'Dodržuj termíny, jednotné pojmenování, jednoduché stažení a předvídatelnou cenu. Pro opakované klienty je proces často důležitější než jednorázová kreativita.']
  ], 'Vyber deset lokálních makléřů a u každého najdi jednu konkrétní slabinu prezentace. Oslov tři z nich s návrhem přesného zlepšení a ukázkou podobné práce.')
};

const kenjiIntro = note('Kenji v akci ukazuje reálné zakázky bez studiové jistoty a bez zpětného přepisování toho, co se na place skutečně stalo.', [
  ['Rozhodování', 'Sleduj hlavně důvod změny světla, pozice, komunikace nebo pořadí záběrů. Nastavení bez kontextu se na jiné zakázce kopíruje špatně.'],
  ['Proces', 'Všímej si přípravy, práce s klientem, kontroly výsledku a řešení situací, které nejsou podle plánu.'],
  ['Přenos do praxe', 'Po každé lekci vyber jednu věc, kterou otestuješ na nejbližší zakázce. Nesnaž se změnit celý proces najednou.']
], 'Připrav si poznámku se třemi sloupci: situace, Kenjiho rozhodnutí a moje použití. U každé lekce doplň alespoň jeden řádek.');

const basicsIntro = '<blockquote><p><strong>Tenhle kurz ti dá pevný základ, abys přestal jen mačkat spoušť a začal vědomě rozhodovat o výsledku.</strong> Nejde o memorování technických pojmů ani o nákup dražšího foťáku. Cílem je pochopit, proč fotografie vypadá určitým způsobem a jak toho dosáhnout opakovaně.</p></blockquote>' +
  '<h3>Co tě v kurzu čeká</h3><ol>' +
    '<li><p><strong>Ovládnutí foťáku:</strong> Clona, čas, ISO, expozice, ostření a rozdíl mezi manuálem a automatikou. Naučíš se zvolit nastavení podle pohybu, světla a výsledku, ne podle univerzálního čísla z internetu.</p></li>' +
    '<li><p><strong>Práce se světlem a technikou:</strong> Pochopíš směr a kvalitu světla, funkci různých objektivů a to, které vybavení ti skutečně pomůže. Zároveň poznáš, kdy tě další technika neposune a kdy je její nákup opodstatněný.</p></li>' +
    '<li><p><strong>Praktická postprodukce:</strong> Projdeš RAW a JPEG, Lightroom, Photoshop, color grading i práci s presety. Nejde o náhodné tahání posuvníků, ale o konzistentní postup od importu po správný export.</p></li>' +
    '<li><p><strong>Pohled z praxe:</strong> Uvidíš reálné úpravy, práci s konkrétními fotografiemi a také pohled člověka před objektivem. Díky tomu nebudeš řešit jen technickou stránku, ale i komunikaci a pocit při focení.</p></li>' +
  '</ol><h3>Jak z kurzu vytěžit maximum</h3><ul>' +
    '<li><p>Postupuj od základů v doporučeném pořadí. Clona, čas a ISO spolu souvisí; přeskakování vytváří zbytečné mezery.</p></li>' +
    '<li><p>Po každé lekci si vyzkoušej jednu konkrétní věc ještě před dalším videem. Bez fotografování zůstane technika jen teorií.</p></li>' +
    '<li><p>Používej nejdřív vybavení, které už máš. Nový nákup řeš až ve chvíli, kdy umíš přesně pojmenovat omezení současné techniky.</p></li>' +
  '</ul><h3>S čím máš kurz dokončit</h3><p>Na konci bys měl umět rychle nastavit foťák pro běžnou situaci, vědomě pracovat se světlem a hloubkou ostrosti, vybrat vhodný objektiv a dostat fotografii přes postprodukci do konzistentního finálního výsledku. Ne proto, že sis zapamatoval tabulku, ale protože rozumíš tomu, co jednotlivá rozhodnutí s fotografií udělají.</p>';

let filled = 0;
const used = new Set();
for (const file of fs.readdirSync(EXPORTS).filter((name) => name.endsWith('.json'))) {
  const target = path.join(EXPORTS, file);
  const data = JSON.parse(fs.readFileSync(target, 'utf8'));
  if (file === 'kenji-v-akci.json' && !(data.lessons || []).some((lesson) => lesson.type === 'INTRO')) {
    data.lessons.unshift({ type: 'INTRO', title: 'Kenji v akci', video: '', content: text(kenjiIntro), content_raw: kenjiIntro, status: 'PUBLISHED' });
  }
  if (file === 'zaklady-technika.json') {
    const intro = (data.lessons || []).find((lesson) => lesson.type === 'INTRO');
    if (intro) {
      intro.title = 'Základy, technika a vybavení';
      intro.content_raw = basicsIntro;
      intro.content = text(basicsIntro);
    }
  }
  for (const lesson of data.lessons || []) {
    if (lesson.type === 'INTRO') continue;
    const key = norm(lesson.title);
    const html = NOTES[key];
    if (html) used.add(key);
    if (html && empty(lesson.content_raw || lesson.content)) {
      lesson.content_raw = html;
      lesson.content = text(html);
      filled++;
    }
  }
  fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
}

const missing = Object.keys(NOTES).filter((key) => !used.has(key));
console.log(`Doplněno popisů: ${filled}`);
if (missing.length) {
  console.error('Nespárované popisy:', missing.join(', '));
  process.exitCode = 1;
}
