# Pravidla práce a nasazování Kenji Academy

Tento dokument je závazný pro práci na projektu Kenji Academy, včetně Ecomail funkcí, administračního rozhraní a veřejného webu. Platí pro práci v Codexu i Claudeovi.

## Běžný pracovní postup

1. Všechny změny se nejdřív připravují pouze lokálně v tomto repozitáři.
2. Náhledy se spouštějí lokálně, standardně na `http://localhost:4321/`.
3. Před dokončením úkolu se změny lokálně otestují a uživateli se ukáže náhled nebo jiný kontrolovatelný výsledek.
4. Jednotlivé dokončené úpravy se průběžně shromažďují. Kvůli každé malé změně se nevytváří samostatný produkční deploy.

## Push a produkční nasazení

- Bez výslovného pokynu Daniela se nesmí spustit `git push`, produkční deploy na Netlify, Netlify build hook ani jiná forma publikování webu.
- Výzvy jako „udělej“, „oprav“, „přidej“ nebo „ukaž náhled“ povolují lokální práci a lokální kontrolu. Samy o sobě nepovolují push ani nasazení.
- Produkční změny se mají seskupit a odeslat nejvýše jednou za kalendářní měsíc.
- Měsíční nasazení není automatické. Proběhne pouze tehdy, když Daniel výslovně řekne, že se má připravený balík pushnout nebo nasadit.
- Častější mimořádné nasazení je možné jen na Danielův výslovný pokyn pro konkrétní změnu.
- Těsně před povoleným nasazením se zkontroluje celý připravený diff, relevantní testy a lokální náhled. Cílem je jeden společný produkční deploy.
- Po dokončení lokální práce se vždy jasně uvede, že změny zůstávají lokální a nebyly pushnuté ani nasazené.

## Ecomail a další externí služby

- Lokální vývoj Ecomail integrace, textů a náhledů se řídí stejným postupem.
- Nahrání nebo změna šablon v Ecomailu, synchronizace kontaktů, spuštění kampaně a odeslání e-mailů vyžadují samostatný výslovný pokyn Daniela.
- Úprava Supabase, Stripe nebo jiné produkční služby není součástí povolení k lokální úpravě kódu ani součástí povolení k Netlify deployi, pokud to Daniel výslovně neuvede.

## Důvod

Netlify na současném tarifu účtuje kredity za každý produkční deploy. Lokální náhledy a seskupování změn omezují spotřebu kreditů a současně dávají prostor vše zkontrolovat před zveřejněním.
