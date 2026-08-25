# KENJI KNIHOVNA — Jak to funguje

## Struktura

```
kenji-knihovna/
├── index.html              ← Hlavní rozcestník
├── 404.html                ← Custom 404 stránka
├── netlify.toml            ← Konfigurace Netlify
├── assets/
│   ├── articles.js         ← DATABÁZE článků a kategorií (tady přidáváš články)
│   ├── nav.js              ← Generuje sidebar, homepage a vyhledávání z databáze
│   ├── styles.css          ← VŠECHEN styl (jedno místo na úpravy)
│   ├── script.js           ← Mobilní menu + progress bar + scrollspy
│   ├── favicon.svg         ← Ikonka v záložce prohlížeče
│   └── og-image.svg        ← Náhled při sdílení odkazů (FB/Slack/WA)
└── clanky/
    └── 5-chyb-fotografu.html
    └── drony.html
```

> **Důležité:** Sidebar, dlaždice kategorií na homepage, seznam článků i počty
> u kategorií se **negenerují ručně** — všechno se renderuje z `assets/articles.js`.
> Když přidáváš článek, upravuješ jen tenhle jeden soubor (+ napíšeš HTML článku).

## Jak nahrát na Netlify

1. Stáhni si celou složku `kenji-knihovna`
2. Jdi na **app.netlify.com/drop**
3. Přetáhni tam celou složku (ne soubory, ale složku)
4. Hotovo, dostaneš URL

Při další aktualizaci:
- Jdi na svůj site v Netlify dashboardu
- Sekce "Deploys" → "Drag and drop folder"
- Hoď tam aktualizovanou složku, přepíše to staré

## Features

- ✅ **Vyhledávání** — v sidebaru, hledá v názvech, popiscích i tagech (ignoruje diakritiku, zkratka `/`)
- ✅ **Data-driven navigace** — sidebar i homepage se generují z `articles.js`
- ✅ **Reading progress bar** — pruh nahoře ukazuje, kolik článku jsi přečetl
- ✅ **Scrollspy navigace** — aktivní sekce se podsvítí v sidebar
- ✅ **OG tagy** — odkazy v messengerech / Slacku ukáží náhled
- ✅ **Favicon** — ikonka v záložce prohlížeče
- ✅ **Custom 404 stránka** — pokud někdo zadá špatnou URL
- ✅ **Mobile responsive** — funguje na všech zařízeních
- ✅ **Reading time** — odhad času čtení u každého článku
- ✅ **Pretty URLs** — bez .html v adresním řádku (přes Netlify)

## Jak měnit barvy / fonty / styl

Otevři `assets/styles.css`, úplně nahoře jsou CSS proměnné:

```css
:root {
  --orange: #ff6b1a;    ← Hlavní oranžová
  --blue: #2a6fff;      ← Modrá akcent
  --bg: #0a0a0a;        ← Pozadí
  ...
}
```

Změníš tady, propíše se to do celého webu.

## Stav článků

- ✅ **5 chyb pod 2M ročně** (Byznys & klienti) — 5 min čtení
- ✅ **Drony pro fotografy** (Technika & výbava) — 12 min čtení
- 🚧 **Jak vybrat první foťák** (Technika) — připravujeme
- 🚧 **Lightroom workflow** (Editace) — připravujeme
- 🚧 **Svatební den minutu po minutě** (Svatby) — připravujeme

## Až bude víc článků

- Animace při scrollu (fade-in karet)
- Click-to-copy linky na sekce
- Print-friendly styly
- Filtrování článků podle kategorie přímo na homepage

## Jak přidat nový článek

1. **Napiš HTML** — zkopíruj `clanky/drony.html` jako šablonu a uprav:
   title, meta description, OG tagy, breadcrumbs, hero, obsah.
2. **Uprav `window.KENJI_TOC`** v `<script>` na konci článku — anchory sekcí
   pro „V tomto článku" (sidebar TOC + scrollspy).
3. **Přidej záznam do `assets/articles.js`** — jeden objekt do `KENJI_ARTICLES`
   (slug, url, icon, category, title, desc, `status: 'published'`, date, tags).
   Tím se článek automaticky objeví v sidebaru, na homepage, v počtech
   u kategorie i ve vyhledávání. **Nikde jinde nic neupravuješ.**
4. Reading time spočítej: (počet slov / 230) min.

> Sidebar ani homepage už ručně needituješ — to dělá `articles.js` + `nav.js`.

## Členství a přihlášení (paywall)

Web rozlišuje **ČLENA** (e-mail v akademii → vidí vše) a **FREE** uživatele
(vidí free články, premium je zamčené + bannery). Řeší to `assets/auth.js`.

**Co je zdarma a co premium:** seznam `KENJI_FREE_SLUGS` v `assets/articles.js`.
Co tam není, je premium (zamčené). Chceš článek odemknout všem? Přidej jeho slug do seznamu.

**Teď běží DEMO režim** — tlačítko „Přihlásit přes Google" otevře výběr ČLEN/FREE,
ať jde vyzkoušet oba pohledy bez backendu.

### Jak zapnout ostré přihlášení přes Google (Supabase)

1. Založ projekt na **supabase.com** (zdarma). Z `Project Settings → API` si zkopíruj
   **Project URL** a **anon public key**.
2. V Supabase `Authentication → Providers → Google` zapni Google (provede tě tím —
   potřebuje Google OAuth Client z `console.cloud.google.com`).
3. Vytvoř dvě tabulky:
   - `members` — sloupec `email` (sem nahraješ 50 e-mailů akademie, klidně importem CSV)
   - `visits` — `email`, `name`, `is_member`, `page`, `at` (sběr dat, kdo a co čte)
4. Otevři `assets/auth.js`, úplně nahoře v `CONFIG` vyplň `supabaseUrl` a `supabaseAnonKey`.
5. Hotovo — demo se samo vypne a naběhne reálný Google login. Logika zůstává stejná.

> Tohle je „měkký" paywall (obsah skrývá JavaScript). Pro neprůstřelnou ochranu
> (premium se k nečlenovi vůbec nestáhne) bude potřeba server-side verze (Next.js).
