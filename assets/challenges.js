(function () {
  let remoteCurrent = null;
  const challenges = [
    { title: 'Ukaž svoji nejlepší práci tohoto týdne', description: 'Sdílej fotku, video nebo výstup, na který jsi tento týden nejvíc hrdý.' },
    { title: 'Řekl sis o cenu s klidem, nebo se ti klepal hlas? 😅', description: 'Sdílej moment, kdy sis řekl o víc, než bylo pohodlný — a jak to dopadlo.' },
    { title: 'Before / After', description: 'Ukaž původní materiál a výslednou úpravu. Připiš, co udělalo největší rozdíl.' },
    { title: 'Co ses naučil na poslední zakázce?', description: 'Napiš jednu konkrétní zkušenost, kterou příště využiješ jinak nebo lépe.' },
    { title: 'Jak teď získáváš klienty?', description: 'Sdílej jeden kanál nebo postup, který ti funguje, případně kde se právě zasekáváš.' },
    { title: 'Ukaž svůj největší fail', description: 'Co se nepovedlo a co ses z toho naučil? Konkrétní zkušenost pomůže celé komunitě.' },
    { title: 'Umíš svoji práci vysvětlit jednou větou?', description: 'Kdyby ses s klientem potkal ve výtahu — co řekneš, aby chtěl právě tebe? Zkus to tady.' },
    { title: 'Co jsi změnil ve svém portfoliu?', description: 'Ukaž nebo popiš jednu změnu, díky které je tvoje nabídka jasnější.' },
    { title: 'Slib komunitě jednu věc na tento týden 🤝', description: 'Jeden konkrétní krok, co konečně dotáhneš. Za týden se pochlubíš, jak to dopadlo.' },
    { title: 'Co ti dnes v podnikání bere nejvíc času?', description: 'Sdílej úzké místo a způsob, kterým ho zkoušíš zjednodušit.' },
    { title: 'Jak řešíš klienta, který smlouvá o cenu?', description: 'Co říkáš, když někdo chce slevu? Sdílej, co ti zabralo a co naopak ne.' },
    { title: 'Ukaž fotku, u které jsi nejvíc bojoval', description: 'Náročné světlo, těžký klient, technický oříšek — a jak jsi to nakonec vyřešil.' },
    { title: 'Nejlepší tip na focení, který jsi kdy dostal', description: 'Jedna věta nebo trik, který ti změnil výsledky. Předej ho dál komunitě.' },
    { title: 'Jak vypadá tvůj workflow od poptávky po předání?', description: 'Popiš svoje kroky. Ostatní ti řeknou, kde se dá ušetřit čas nebo co zautomatizovat.' },
    { title: 'Co tě letos posunulo nejvíc?', description: 'Kurz, člověk, rozhodnutí, chyba… Sdílej to, co reálně zafungovalo.' },
    { title: 'Kolik si účtuješ a jak jsi k tomu číslu došel?', description: 'Sdílej svoji cenu (klidně orientačně) a logiku za ní. Nejvíc to pomůže začátečníkům.' },
    { title: 'Co bys poradil sobě na začátku?', description: 'Jedna rada, kterou by sis dal, kdybys dneska začínal focení znovu od nuly.' },
    { title: 'Ukaž svůj setup / pracovní místo', description: 'Vyfoť, s čím pracuješ. Co ti sedí a co bys chtěl vylepšit?' },
    { title: 'Prozraď svůj edit trik, co jinak tajíš 🤫', description: 'Ten jeden krok v úpravách, po kterým fotka konečně sedí. Vysyp ho — ušetříš ostatním hodiny.' },
    { title: 'Na co jsi ve své tvorbě nejvíc pyšný?', description: 'Nemusí jít o peníze. Sdílej posun, rozhodnutí nebo výsledek, který je pro tebe důležitý.' }
  ];

  function isoWeek(date) {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (value.getDay() + 6) % 7;
    value.setDate(value.getDate() - day + 3);
    const first = new Date(value.getFullYear(), 0, 4);
    return 1 + Math.round(((value - first) / 86400000 - 3 + ((first.getDay() + 6) % 7)) / 7);
  }

  function weekKey(date) {
    const value = date || new Date();
    return value.getFullYear() + '-W' + isoWeek(value);
  }

  function current(date) {
    if (!date && remoteCurrent) return remoteCurrent;
    const value = date || new Date();
    const item = challenges[isoWeek(value) % challenges.length];
    return { key: weekKey(value), title: item.title, description: item.description };
  }

  async function loadRemote() {
    try {
      const auth = window.KenjiAuth;
      const sb = auth && auth.getSupabase ? await auth.getSupabase() : null;
      if (!sb) return;
      const result = await sb.rpc('list_published_content', { p_type: 'weekly_challenge' });
      if (result.error || !result.data || !result.data.length) return;
      const item = result.data[0];
      remoteCurrent = {
        key: item.id || weekKey(new Date()),
        title: item.title,
        description: item.body || '',
        xp: Number(item.xp || 50),
        linkUrl: item.link_url || ''
      };
      document.dispatchEvent(new CustomEvent('kenji:challenge-updated', { detail: remoteCurrent }));
    } catch (e) { console.warn('weekly challenge', e); }
  }

  window.KenjiWeeklyChallenge = { all: challenges, isoWeek, weekKey, current, refresh: loadRemote };
  document.addEventListener('kenji-auth-ready', loadRemote, { once: true });
  setTimeout(loadRemote, 1800);
})();
