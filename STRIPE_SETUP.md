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

