# Kenji Academy — Stripe checkout setup

Tahle integrace je připravená pro Netlify Functions. Frontend nikdy nedrží Stripe secret key.

## Env proměnné v Netlify

V Netlify nastav:

```txt
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=https://tvoje-domena.cz

STRIPE_PRICE_ACADEMY=price_...
STRIPE_PRICE_DATABAZE=price_...
STRIPE_PRICE_PRESETS=price_...

SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

Volitelné:

```txt
STRIPE_AUTOMATIC_TAX=true
```

Zapínej jen pokud máš ve Stripe správně nastavené daně.

## Produkty

- `academy` → Kenji Academy, 24 997 Kč, tier `academy`
- `databaze` → Kenji Databáze, 1 497 Kč, tier `knihovna`
- `presets` → volitelný order bump, 1 050 Kč

Pokud `STRIPE_PRICE_*` proměnné nejsou vyplněné, funkce použije fallback `price_data`. Pro ostrý provoz je lepší mít produkty a ceny založené přímo ve Stripe a používat `price_...` ID.

## Webhook

Ve Stripe přidej endpoint:

```txt
https://tvoje-domena.cz/.netlify/functions/stripe-webhook
```

Posílej minimálně event:

```txt
checkout.session.completed
```

Webhook po úspěšné platbě zapíše do Supabase tabulky `users`:

- `email`
- `tier`
- `updated_at`

## Test

Lokálně nebo na deploy preview:

1. Otevři `/academy.html`.
2. Klikni na CTA.
3. Funkce vytvoří Stripe Checkout Session.
4. Po zaplacení Stripe vrátí uživatele na `/platba-uspesna.html`.
5. Webhook nastaví tier v Supabase.


## Prodejní odkaz `/koupit` (e-maily, Instagram, kamkoli)

`create-checkout-session.js` přijímá jen POST, takže se dá použít jen z webu.
Pro odkazy mimo web je `netlify/functions/koupit.js` — přijme **GET**, založí
Checkout Session a přesměruje rovnou do Stripu. Člověk nemusí mít účet: podle
e-mailu, který u platby zadá, mu `stripe-webhook.js` založí řádek v `users`
a přidělí tier.

| Odkaz | Co udělá |
| --- | --- |
| `kenjiacademy.cz/koupit` | Databáze · 1 497 Kč (tier `knihovna`) |
| `kenjiacademy.cz/koupit/academy` | Academy · 24 997 Kč (tier `academy`) |
| `kenjiacademy.cz/koupit/presety` | Presety · 982 Kč (odemkne stahování, tier nemění) |

Parametry (libovolně kombinovatelné):

| Parametr | K čemu |
| --- | --- |
| `?od=email-namitky` | zdroj prodeje — uloží se do metadat objednávky, ve Stripu pak vidíš, který e-mail nebo post prodal |
| `?email=*|EMAIL|*` | předvyplní e-mail; v Ecomailu se merge tag nahradí adresou příjemce |
| `?kod=PARTNER10` | partnerská sleva, ověří se proti Supabase stejně jako v nákupním modalu |

Příklad do e-mailu:
`https://kenjiacademy.cz/koupit?od=email-namitky&email=*|EMAIL|*`

### Proč je to postavené takhle

- **Ceny a tiery jsou na jednom místě** (`netlify/functions/_stripe.js`). Obě
  pokladny — web i odkaz — čtou stejnou tabulku, takže nemůže vzniknout stav,
  kdy se cena změní jen v jedné z nich. Tier Databáze je historicky `knihovna`,
  ne `databaze`; špatná hodnota v metadatech = platba projde, přístup ne.
- **Nenahrazený merge tag nic nerozbije.** Když do `?email=` dorazí `*|EMAIL|*`
  nebo nesmysl, e-mail se prostě nepředvyplní a nákup běží dál.
- **Výpadek Stripu nekončí chybou.** Když se session nezaloží, odkaz pošle
  člověka na prodejní stránku, ne na bílou stránku s chybou.
- **Roboti pokladnu neotvírají** — `/koupit` je v `robots.txt` zakázaný,
  jinak by každý průchod crawlera zakládal platební session.
- **Po platbě se e-mail neopisuje.** `platba-uspesna.html` si ho podle
  `session_id` vyzvedne přes `checkout-email.js` a předvyplní do přihlášení.
  Tím zmizí nejčastější důvod „zaplatil jsem a nic nemám“ — přihlášení jinou
  adresou, než pod kterou proběhla platba.

### Když se někdo přesto přihlásí jinou adresou

Tier je navázaný na e-mail z platby. Změníš ho v adminu (sekce Uživatelé,
výběr tieru u konkrétního člověka) nebo přímo v Supabase v tabulce `users`.
