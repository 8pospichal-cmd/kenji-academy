# KENJI KNIHOVNA — Kontext projektu pro Claude Code

> Tenhle soubor přečti jako první. Obsahuje vše, co potřebuješ vědět o projektu, brandu a další směřování.

---

## CO JE PROJEKT

**Kenji Knihovna** je vědomostní databáze **pro tvůrce** — fotografy, kameramany i tvůrce obsahu (UGC, marketing pro sociální sítě). Pozicování je záměrně otevřené, ne úzce „pro fotografy". Slouží placené komunitě Kenji Academy. Aktuálně je to statický HTML/CSS/JS web hostovaný na Netlify (zakzky.netlify.app), deployovaný drag & drop celé složky.

**Aktuální stav:** Funkční MVP — homepage + 2 články (5 chyb pod 2M ročně, Drony pro fotografy).

**Další směr:** Web aplikace s Google/YouTube přihlášením, paywall pro členy komunity. Cílem je největší česká databáze pro fotografy včetně sociálních článků.

---

## KDO JE KLIENT (Daniel)

- Provozovatel značky Kenji Academy + dalších byznys projektů
- Strategický operátor, ne vývojář
- Komunikační styl: přímý, žádné kecy, krátké věty, hovorová čeština
- Chce vidět akci, ne teorii
- Preferuje konkrétní doporučení nad "záleží na…"

---

## KDO JE KENJI (hlas projektu)

Reálný fotograf, mentor značky Kenji Academy. Tonalita všech textů:
- Lidský, přímý, vtipný, lehce drsný
- **Tykání** — Kenji mluví přímo k jednomu čtenáři ("ty"), jako kamarád mentor
- Hovorová čeština, krátké věty
- Občasná gramatická "nedokonalost" / hovorovost je OK a vítaná — ať to zní lidsky, ne učebnicově
- Žádné korporátní kecy, žádná AI omáčka, žádné "záleží na…"
- Konkrétní přínosy, ne teorie
- "Žádný kecy. Jen praxe." je tagline

**Příklad žádaného stylu:**
> „Hele, upřímně, pokud chceš začít fotit v roce 2026, tak se budeš muset odlišit
> od konkurence. Taková je realita. Takže pojďme se podívat na to, jaká doporučení
> a tipy pro tebe mám."

---

## TECHNICKÝ STACK (současný)

- Pure HTML/CSS/JS — bez frameworku, bez buildu
- Hosting: Netlify (drag & drop deploy)
- Fonty: Google Fonts (Bebas Neue, Inter, JetBrains Mono)
- Žádné externí JS knihovny

**Pro budoucí web aplikaci se zvažuje:** Next.js + Supabase (auth, databáze) + Vercel hosting.

---

## STRUKTURA SOUBORŮ

```
kenji-knihovna/
├── index.html              ← Hlavní rozcestník (homepage)
├── 404.html                ← Custom 404 stránka
├── netlify.toml            ← Konfigurace Netlify (redirects, headers, cache)
├── README.md               ← Návod pro Daniela jak to spravovat
├── CONTEXT.md              ← Tenhle soubor — projektový kontext
├── assets/
│   ├── articles.js         ← DATABÁZE článků + kategorií + free/premium (jediný zdroj pravdy)
│   ├── nav.js              ← Generuje sidebar, homepage a vyhledávání z databáze
│   ├── auth.js             ← Členství, Google login (Supabase), paywall, sběr dat
│   ├── styles.css          ← VŠECHEN sdílený styl (CSS proměnné nahoře)
│   ├── script.js           ← Mobile menu + reading progress bar + scrollspy
│   ├── favicon.svg         ← Ikonka v záložce prohlížeče
│   └── og-image.svg        ← Náhled při sdílení odkazů
└── clanky/
    ├── 5-chyb-fotografu.html
    └── drony.html
```

### Data-driven navigace (DŮLEŽITÉ)
Sidebar, dlaždice kategorií na homepage, seznam „Všechny články", počty u kategorií
i vyhledávání se **generují JavaScriptem z `assets/articles.js`** — ne ručně v HTML.
- `index.html` i články mají jen prázdný `<aside class="sidebar" id="sidebar">`,
  který naplní `nav.js`. Stejně tak `#category-grid` a `#articles-list` na homepage.
- Každý článek nese svůj TOC jako `window.KENJI_TOC` v `<script>` před `nav.js`.
- Pořadí skriptů: `articles.js` → `nav.js` → `script.js`.
- Pořád je to čisté HTML/CSS/JS bez buildu, deploy zůstává drag & drop.

---

## BRAND GUIDE

### Barvy (CSS proměnné v assets/styles.css)
- `--orange: #ff6b1a` — hlavní oranžová (CTA, akcenty, highlight)
- `--blue: #2a6fff` — modrá akcent (sekundární info)
- `--bg: #0a0a0a` — tmavé pozadí
- `--bg-card: #141414` — karty
- `--text: #f5f5f5` — hlavní text (bílá)
- `--text-dim: #9a9a9a` — sekundární text
- `--text-mute: #666` — terciární text, labely

### Fonty
- **Bebas Neue** — headlines (h1, h2, sekce, velká čísla)
- **Inter** — body text, navigace, UI
- **JetBrains Mono** — kicker labely, badge texty, breadcrumbs

### Vizuální principy
- Tmavé pozadí + kontrastní oranžová
- Glow efekty kolem highlightů
- Bílo-oranžové gradienty pro důležité headliny
- Pulsující dot u "EXCLUSIVE" labelu
- Hover efekty: lift + barevný accent line
- Sticky header s backdrop blur
- Generous spacing, žádný density overload

### Komponenty (existující v styles.css)
- `.article-hero` — hero v článku
- `.numbered-card` — číslované karty (chyby, kritéria, tipy)
- `.card-block.diagnosis/.fix/.reality` — barevné bloky uvnitř karet
- `.compare-grid + .compare-card` — porovnávací karty (A1/A2/A3)
- `.model-grid + .model-card` — showcase karty (drony)
- `.link-cards` — odkazy na oficiální zdroje
- `.callout.warning/.danger/.tip/.success` — alert boxy
- `.step-list` — procesní kroky
- `.stats` — KPI čísla
- `.checklist` — akční checklist
- `.quote-box` — citáty
- `.example-box` — praktické příklady s tag

---

## PRACOVNÍ KONVENCE

### Při tvorbě nového článku
1. Duplikuj existující článek (drony.html nebo 5-chyb-fotografu.html) jako šablonu — neměň strukturu od nuly
2. V článku uprav `window.KENJI_TOC` (anchory sekcí pro sidebar TOC + scrollspy)
3. **Přidej jeden záznam do `assets/articles.js`** (`KENJI_ARTICLES`) — tím se článek
   sám objeví v sidebaru, na homepage, v počtech kategorií i ve vyhledávání.
   Sidebar ani `index.html` už ručně NEUPRAVUJEŠ.
4. Footer-nav (předchozí/další) v článku zatím zůstává ruční — hlídej ho
5. U faktických článků (technika, legislativa, ceny) **ověř aktuálnost přes web search**, nehádej z paměti
6. Před psaním finálního textu **vždy navrhni strukturu**, ať Daniel schválí
7. Tonalita: tykání, Kenjiho hlas (viz sekce KDO JE KENJI)

### Při úpravě CSS
- Nikdy nepiš inline styly v HTML
- Vše do `assets/styles.css`
- Nové komponenty přidej před `RESPONSIVE` sekci
- Nezapomeň přidat i responsive pravidla

### Při úpravě JS
- `assets/script.js` je sdílený pro celý web
- Drž zpětnou kompatibilitu (mobile menu, progress bar, scrollspy musí pořád fungovat)

### Reading time
- Slov / 230 = minuty čtení
- Přidej do `.article-meta` pod breadcrumbs

---

## DEPLOYMENT

Daniel deployuje takhle:
1. Zazipuje celou složku `kenji-knihovna/`
2. Drag & drop na **app.netlify.com/drop** (nebo dashboard tohoto projektu)
3. Hotovo

**Nevyvíjej zatím Git/CI workflow** — to bude další fáze projektu.

---

## CO JE HOTOVÉ

- ✅ Homepage s rozcestníkem (7 kategorií, generuje se z manifestu)
- ✅ Členská vrstva: Google login (Supabase) + paywall — člen vs free, ~75 % premium (zatím DEMO režim, viz README + paměť)
- ✅ Data-driven navigace — sidebar + homepage z `assets/articles.js`
- ✅ Fulltextové vyhledávání v sidebaru (ignoruje diakritiku, zkratka `/`)
- ✅ Sidebar nav s aktivními stavy
- ✅ Sticky header s brandem
- ✅ Reading progress bar (jen v článcích)
- ✅ Scrollspy v sidebar TOC
- ✅ OG meta tagy + Twitter Card
- ✅ Favicon (SVG)
- ✅ OG sdílecí obrázek (1200×630)
- ✅ Custom 404 stránka
- ✅ Reading time + article meta
- ✅ Responsive design (desktop / tablet / mobil)
- ✅ Pretty URLs přes netlify.toml
- ✅ Security headers + cache

---

## KATEGORIE A PLÁNOVANÉ ČLÁNKY

### Aktuální kategorie (7, definované v assets/articles.js)
1. **🎓 Začátečník** (0) — fotoslovník a základy
2. **📸 Technika & výbava** (1: Drony)
3. **🎨 Nástroje & editace** (0)
4. **💼 Byznys & klienti** (1: 5 chyb) — největší kategorie, core brandu
5. **🎬 Výdělečné obory** (0) — dřív „Žánry & specializace"
6. **🧠 Mindset & růst** (0)
7. **⚖️ Právo & účetnictví** (0)

> Plná obsahová mapa (~77 článků rozepsaných po kategoriích) je odsouhlasená
> s Danielem (5/2026). Počty u kategorií se počítají automaticky z manifestu.

### Plánované články (priorita shora dolů)
- **Jak vybrat první foťák** (Technika) — bez marketingových keců
- **Lightroom workflow od A do Z** (Editace) — jak upravit 1000 fotek za 3 hodiny
- **Svatební den minutu po minutě** (Svatby) — kompletní plán dne
- **Cenotvorba pro fotografy** (Byznys) — jak postavit ceník, který prodává
- **Jak získat první klienty** (Byznys) — akviziční strategie

Další náměty: KenjiBot a AI nástroje, kompletní průvodce objektivy, jak natáčet svatební film, právo a smlouvy (k tomu už existuje obsah).

---

## DALŠÍ VELKÁ FÁZE — WEB APLIKACE

Daniel plánuje:
- Přihlášení přes Google / YouTube
- Paywall (registrovaní vidí celý obsah, neregistrovaní teaser)
- Možná: uživatelské profily, ukládání článků, history čtení, komentáře
- Cílem je největší česká databáze pro fotografy

**Doporučený stack** (zatím nestavíme, jen pro context):
- Next.js 14+ (App Router)
- Supabase (auth + databáze + storage)
- Vercel hosting
- Migrace existujícího HTML obsahu do MDX/Markdown souborů nebo databáze

**Důležité:** Před touto fází si Daniel chce ujasnit, zda to nepřesouvat do Whop (kde už komunita běží) nebo stavět samostatně.

---

## CO TEĎ DĚLAT

Když Daniel napíše s konkrétním úkolem:
1. Přečti tento soubor
2. Projdi `index.html` + `assets/styles.css` + jeden článek (drony.html) ať pochopíš konvence
3. Udělej **plán/strukturu před psaním kódu**
4. Schvaluj kroky s Danielem než commitneš velké změny

Když Daniel je nejasný:
- Zeptej se max na 1–3 konkrétní věci
- Nabídni 2–3 varianty s tvým doporučením
- Nedavej "záleží na…" odpovědi — operátor potřebuje konkrétní směr

---

**Konec briefu. Připravený pomáhat budovat Kenji Knihovnu dál.**
