# E-mailové šablony

Kam: Supabase → **Authentication** → **Emails** → záložka **Templates**.
Odesílá se přes Resend (custom SMTP), odesílatel `noreply@kenjiacademy.cz`.

## Které tři šablony vyměnit

| V dashboardu klikni na | Vlož obsah souboru | Do pole *Subject heading* dej | Kdy tenhle e-mail chodí |
|---|---|---|---|
| **Magic link or OTP** | `magic-link.html` | `Tvoje přihlášení do Kenji Academy` | Přihlášení **stávajícího** člena bez hesla |
| **Confirm sign up** | `confirm-signup.html` | `Vítej v Kenji Academy — potvrď e-mail` | **První** přihlášení nového e-mailu |
| **Reset password** | `reset-password.html` | `Nastavení nového hesla` | Kliknutí na „Zapomněl jsem heslo" |

Ostatní šablony v seznamu (Invite user, Change email address, Reauthentication
a celá sekce Security) web nepoužívá — nech je být.

**Důležité:** `signInWithOtp` posílá novým lidem šablonu **Confirm sign up**, ne
Magic link. Proto musí být hezky obě, jinak nováček dostane jiný e-mail než stálý člen.

## Nutné pro obnovu hesla

Authentication → **URL Configuration** → **Redirect URLs** → přidat:

```
https://kenjiacademy.cz/obnova-hesla.html
```

Bez toho Supabase odkaz z e-mailu odmítne a člověk skončí na chybové stránce.

## Proměnné v šablonách

`{{ .ConfirmationURL }}` — Supabase ji nahradí odkazem. Je v každé šabloně
dvakrát: v tlačítku a v záložním textovém odkazu pod ním.
Dál jdou použít `{{ .Email }}`, `{{ .Token }}` (šestimístný kód), `{{ .SiteURL }}`.
