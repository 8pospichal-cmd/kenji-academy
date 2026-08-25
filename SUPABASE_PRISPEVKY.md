# Komunitní příspěvky - nastavení Supabase

Komunita používá tabulky, RPC funkce, Supabase Auth a Storage. Zdroj pravdy jsou
SQL migrace v `supabase/migrations/`; staré ruční SQL skripty nespouštěj.

## Nasazení

1. Přihlas Supabase CLI a propoj projekt, pokud ještě není propojený.
2. Spusť `supabase db push`.
3. V Supabase ověř, že existuje veřejný bucket `post-media` s limitem 6 MB.
4. Otestuj magic-link přihlášení a publikování pro Free i Academy účet.

Migrace `20260823113000_community_publish_fix.sql` bucket sama vytvoří a nastaví:

- povolené formáty JPG, PNG a WebP,
- maximální velikost 6 MB,
- upload pouze pro ověřené uživatele,
- zápis jen do složky pojmenované podle `auth.uid()`,
- tier `academy` ve všech komunitních kanálech,
- `novinky` a `slevy` pouze pro administrátora.

Navazující migrace `20260823124500_weekly_challenge_channel.sql` přidává
ověřeným Free a Databáze účtům kanál `tydenni-vyzva` vedle `foto-feedback`.

Bezplatné účty mají ochranný limit 5 příspěvků a 30 komentářů za 24 hodin.

## Ověření uživatele

Komunitní čtení i zápis vyžadují platnou Supabase Auth session. E-mail předaný
z klientského JavaScriptu se vždy porovnává s e-mailem v podepsaném JWT, takže
ho nelze použít k obejití tieru. Stejné ověření platí i v lokálním náhledu;
editor se bez platné relace nezobrazí jako aktivní.

## Kontrolní scénáře

- Anonymní návštěvník: RPC zápis i Storage upload jsou odmítnuty.
- Free / Databáze: může číst, publikovat, komentovat a lajkovat v `foto-feedback` a `tydenni-vyzva`; ostatní kanály jsou zamčené.
- Academy: může číst a publikovat ve všech běžných kanálech.
- Neadmin Academy: nemůže publikovat do `novinky` ani `slevy`.
- Obrázek nad 6 MB nebo jiný typ než JPG, PNG či WebP je odmítnut.
- Uživatel nemůže zapisovat ani mazat soubory ve složce jiného uživatele.

Admin e-maily jsou zatím určené funkcí `public.is_admin`; při změně seznamu
uprav příslušnou migraci a nasaď ji standardním databázovým postupem.
