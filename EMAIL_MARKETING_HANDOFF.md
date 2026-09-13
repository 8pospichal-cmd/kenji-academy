# Kenji Academy - e-mail marketing handoff

Aktualizovano: 10. 9. 2026

## Pravidla pro pokracovani

- Nejdrive precist cely `STAV_PROJEKTU.md` a tento soubor.
- Pracovat ve stavajici slozce `kenji-knihovna` a respektovat existujici architekturu a design.
- Nic necommitovat, nepushovat, nenasazovat ani neposilat pres Ecomail, dokud to uzivatel vyslovne nepovoli.
- `kenji-deploy/` je odvozena kopie a nema se rucne upravovat.
- Resend zustava pouze pro prihlasovaci a dalsi transakcni e-maily. Marketing obsluhuje Ecomail.

## Cil

Propojit Kenji Academy s Ecomailem a vytvorit prehlednou administraci pro pripravu, nahled a vyhodnocovani marketingovych e-mailu. Prvni kampan je sedmidenni value-first sekvence pro aktivni kontakty, ktere nejsou cleny Academy. Kazdy e-mail ma dat jeden konkretni ukol a hmatatelnou hodnotu.

## Co je pripraveno lokalne

- Netlify promenne podle uzivatele:
  - `ECOMAIL_API_KEY`
  - `ECOMAIL_LIST_ID=4` pro seznam Fotografove
  - `ECOMAIL_WEBHOOK_SECRET`
- Nova migrace `supabase/migrations/20260910120000_email_marketing.sql`:
  - marketingove souhlasy a preference v `users`,
  - stav synchronizace a odhlaseni,
  - tabulka udalosti doruceni,
  - tabulka `email_sequences`,
  - admin RPC pro emailing,
  - vychozi sedmidenni sekvence se sedmi e-maily.
- Nove Netlify funkce:
  - `netlify/functions/_ecomail.js`
  - `netlify/functions/ecomail-event.js`
  - `netlify/functions/ecomail-admin.js`
  - `netlify/functions/ecomail-webhook.js`
- Ecomail synchronizace:
  - posila pouze uzivatele s dolozenym souhlasem,
  - pouziva davky po 100 kontaktech,
  - pouziva `resubscribe: false`,
  - neprepisuje existujici Ecomail tagy,
  - produktove udalosti posila serverove.
- Admin `Emailing`:
  - stav propojeni a kontaktu,
  - webhook a statistiky za 30 dni,
  - seznam Ecomail automatizaci,
  - editor sedmidenní sekvence,
  - uprava predmetu, preheaderu, nadpisu, tela, CTA a prodlevy,
  - nastaveni publika, odesilatele a ID automatizace,
  - zivy vizualni nahled e-mailu,
  - ulozeni konceptu do Supabase,
  - vytvoreni nebo aktualizace jednotlive sablony v Ecomailu bez rozeslani.
- Nastaveni uzivatele obsahuje dobrovolne preference pro tydenni vyzvy, komunitni souhrny, webinare a novinky.
- Pri registraci je marketingovy souhlas dobrovolny a oddeleny od povinneho zpracovani udaju pro ucet.
- Stripe webhook po nakupu aktualizuje Ecomail profil jen pri existujicim marketingovem souhlasu a nikdy neblokuje prideleni pristupu.
- Zasady ochrany osobnich udaju rozlisuji Resend a Ecomail.

## Overeni, ktere probehlo

- JavaScriptove soubory pro admin a Ecomail prosly `node --check`.
- `git diff --check` nehlasi chyby.
- Seed sekvence obsahuje sedm validnich e-mailu a vsechny CTA cili na existujici lokalni stranky.
- Serverovy generator sablony obsahuje Ecomail odhlasovaci tag `*|UNSUB|*`.
- Mock test davkove synchronizace a HTML sablony prosel.
- Admin editor byl vizualne overen lokalne na desktopu.
- Zivy nahled okamzite reaguje na upravu predmetu.

## Co jeste neni hotove

1. Migrace zatim nebyla aplikovana v produkcnim Supabase.
2. Lokalni zmeny nejsou commitnute, pushnute ani nasazene.
3. Produkcni Netlify funkce a promenne proto jeste nebyly end-to-end overeny.
4. Ecomail statisticky webhook zatim nebyl nastaven z produkcniho adminu.
5. Odesilaci domena a adresa `ahoj@kenji.cz` musi byt v Ecomailu overena.
6. Sedm sablon zatim nebylo vytvoreno v Ecomailu.
7. Samotnou automatizaci je nutne sestavit v editoru Ecomailu: vstup, sedm e-mailu a jednodenní prodlevy. Ecomail API umi automatizaci nacist a spustit, ale ne sestavit jeji strukturu.
8. Je nutne vytvorit bezpecne publikum, ktere vyradi cleny Academy a vsechny odhlasene, bounced a spam kontakty.
9. Pred ostrym spustenim je nutny interni test a maly testovaci segment.
10. Mobilní kontrola lokálního editoru a HTML šablon je dokončená; skutečný iOS/Android a e-mailové klienty ověřit při interním testu.
11. Pozdeji pripravit samostatne automatizace pro tydenni vyzvu, komunitni souhrn a webinare.

## Stav Ecomail seznamu z posledniho screenshotu

- Seznam: Fotografove, ID 4
- Aktivni: 949
- Odhlaseni: 307
- Vracene / bounced: 55
- Spam: 1
- Odhlasene, bounced a spam kontakty se nesmi znovu aktivovat.

## Oprava plánu 13. 9. 2026 — nejdřív publikum, pak texty

Předchozí pořadí („zbývá schválit texty“) bylo špatně. Před schválením textů, nasazením i vytvořením segmentu musí být jasné, **komu přesně** se první sekvence pošle. Důvody:

- Číslo 949 aktivních kontaktů bylo ze staršího screenshotu a v lokálním demu je natvrdo (`assets/admin.js`, `demoData`). Skutečný počet se čte živě z Ecomailu. Nepoužívat z hlavy.
- Účtů v Academy je 195 celkem (144 free, 6 databáze, 45 academy) — ne 195 členů Academy.
- `ACTIVE` v Supabase znamená aktivní účet, ne marketingový souhlas. „Aktivní“ v Ecomailu znamená stav v seznamu, ne prokázaný původ souhlasu.
- Seznamy se překrývají; 250 + 195 se nesčítá.

### Co bylo přidáno

- `netlify/functions/_ecomail.js`: `listSubscribers(status)` (stránkované čtení seznamu), `auditAudience()` (srovnání Ecomail × Supabase a klasifikace každého aktivního kontaktu), `tagSafeAudience(tag)` (označení bezpečného segmentu štítkem; štítky se slučují s existujícími, `trigger_autoresponders: false`, `resubscribe: false`).
- `netlify/functions/ecomail-admin.js`: akce `audience-audit` (jen čtení) a `tag-audience` (štítek; srovnání se před označením přepočítá na serveru, klientský seznam se nikdy nepoužije).
- Admin → Emailing → sekce **Publikum pro první sekvenci**: tlačítko Srovnat publikum, KPI, rozpad vyřazených podle důvodu, tabulka vyřazených adres ke kontrole (překlepy s návrhem opravy), CSV bezpečného segmentu i vyřazených, označení štítkem (výchozí `7dni-ok`).

### Pravidla klasifikace (pořadí = priorita)

neplatný tvar → duplicita → testovací adresa (test/demo/example/mailinator…) → překlep domény (gmial.com, seznam.com…) → správce → člen Academy (`tier = academy`) → v Academy odhlášen / bounced / complained → tvrdý bounce v Ecomailu → blokovaný účet → **pošle se**. Databáze (`knihovna`) se posílá a je jen spočítaná zvlášť.

### Opravené pořadí

1. Nasadit propojení (migrace + push) — bez toho admin Ecomail nevidí. Nic se tím neposílá.
2. Admin → Emailing → **Srovnat publikum**. Projít vyřazené adresy, opravit překlepy ručně v Ecomailu, případně doplnit pravidla.
3. Získat přesný počet příjemců. Teprve pak schválit texty.
4. **Označit štítkem** `7dni-ok`. V Ecomailu založit segment „štítek = 7dni-ok“.
5. Vytvořit 7 šablon z adminu, ověřit doménu `kenji.cz` a adresu `ahoj@kenji.cz`.
6. Sestavit automatizaci v Ecomailu se vstupem přes segment (ne přes štítek, jinak by ji označování spouštělo), uložit ID do adminu.
7. Interní test na sebe + 5 lidí. Zkontrolovat Gmail, Outlook, Apple Mail.
8. Ostré spuštění po dávkách.

## Doporucene dalsi poradi

1. Hotovo: zkontrolován lokální editor, mobilní rozložení a připraveny návrhy ke schválení.
2. Nechat uzivatele schvalit vzhled a texty sedmi e-mailu.
3. Po povoleni aplikovat Supabase migraci a pushnout kod.
4. Po deployi overit Ecomail spojeni a nastavit webhook v adminu.
5. Vytvorit sedm Ecomail sablon z adminu.
6. Rucne sestavit Ecomail automatizaci a ulozit jeji ID do adminu.
7. Pripravit testovaci segment, odeslat test a vyhodnotit dorucitelnost.
8. Teprve potom spustit kampan ve vetsich davkach.


## Navazující kontrola 10. 9. 2026

- Náhled ke schválení: `http://localhost:4321/.claude/email-review/index.html`; texty: `.claude/email-review/TEXTY_KE_SCHVALENI.md`. Přehled generuje `.claude/email-review/build.cjs` přímo ze seed sekvence a serverového generátoru HTML. Jde o lokální pracovní podklady, nepřidávat do deploye.
- Lokální demo nyní obsahuje stejné plné texty jako SQL seed. Den 3 opravuje výpočet (cena minus přímé náklady, pak dělit hodinami) a CTA vede na Free audit. Den 5 má věcnější předmět a CTA na Free Kenji AI místo zamčeného follow-up článku. Den 7 nepředpokládá splnění úkolů a odkazuje na dashboard bez resetu onboardingu.
- `delay_days` v návrhu znamená počet dnů od začátku (0–6), ne prodlevu od předchozí zprávy. V Ecomailu sestavit šest jednodenních prodlev.
- Mobilní pole mají 16px text, tlačítka a časování se zalamují, předměty v seznamu se nezkracují. Opraveno přetékání na 768px. Šablona má mobilní padding a zalamování dlouhých slov.
- Všech 7 položek editoru i výsledných HTML ověřeno na 320, 375, 390, 430, 768 a 1440 px bez horizontálního přetékání po opravách. Dvojnásobný text editoru simulován na 320 a 768 px; nejde o test na fyzickém iOS/Android zařízení.
- Živý náhled reaguje na změnu předmětu a změna zůstává při přepnutí mezi dny. Lokální Uložit koncept výslovně hlásí dočasný náhled; neukládá trvale. Ecomail mutační tlačítka jsou v lokálním demu zakázaná.
- Prošly kontroly syntaxe, `git diff --check`, shoda demo/SQL textů, existence všech cílových CTA souborů a odhlašovacího tagu ve všech 7 šablonách.
- Adminský náhled zůstává kompaktní ilustrací; schvalovací přehled používá skutečný serverový HTML generátor.
- Nic nebylo commitnuto, pushnuto, nasazeno ani odesláno do Ecomailu. Další krok: schválení vzhledu a textů uživatelem.

## Hlavní seznam sestaven 13. 9. 2026 (CRM + Kenji + Ecomail export)

- Zdroje: CRM `KA_CRM - KA CRM.csv` (798 řádků, 322 s e-mailem), export `public.users` (195 účtů), export Ecomail seznamu Fotografové (949 subscribed).
- Unikátních adres celkem **1 222**. Verdikty: **POSLAT 1 118** (908 už v Ecomailu, 210 nový import), POČKAT 50 (běží ruční DM z CRM), ČLEN 39 (Academy), VYŘADIT 15 (vlastní/testovací/překlepy/duplicitní účty — seznam v `HLAVNI_SEZNAM_v2_final.csv`).
- Vlny pro rozeslání: vlna 1 = 750 (gumroad zákazníci, Ecomail rating ≥ 3, CRM zákazníci, Databáze), vlna 2 = 305 (Kenji free, zapojení z CRM, rating 1–2), vlna 3 = 63 (studené).
- Soubory v `~/Downloads`: `HLAVNI_SEZNAM_v2_final.csv` (přehled), `IMPORT_do_Ecomailu.csv` (1 207 řádků: noví i existující se sloučenými štítky — importovat s volbou „aktualizovat existující“).
- Štítky: `7dni-ok` = smí dostat sekvenci; `vlna-1/2/3`; `clen-academy` = vyloučit; `crm-dm-aktivni` = počkat; zdroje `zdroj-crm-2026-09`, `zdroj-kenji-2026-09`; role `kenji-free`, `kenji-databaze`, `crm-zakaznik`, `crm-zapojeny`, `crm-studeny`.
- Rozhodnutí uživatele: posílat všem bez ohledu na doložený souhlas; odhlášení řeší příjemce. Pojistky zůstávají: odhlášení v každém e-mailu, nikdy nereaktivovat odhlášené/bounced, členům Academy a lidem v ručním DM sekvenci neposílat.
- Migrace `20260910120000_email_marketing.sql` je v produkci aplikovaná (export obsahoval sloupec `marketing_consent_at`).
