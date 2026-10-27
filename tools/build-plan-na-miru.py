#!/usr/bin/env python3
"""Sestaví plan-na-miru.html (plán na míru pro nerozhodnuté zájemce) z návrhu
Onboarding.dc.html. Stránka běží na assets/dc-mini.js; odpovědi odesílá do
netlify/functions/plan-request.js a nákup jde přes create-checkout-session.

Použití:
  python3 tools/build-plan-na-miru.py _source/academy-b/Onboarding.dc.html
"""
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from importlib import import_module

academy = import_module('build-academy-b')
sub1, die, localize, ROOT = academy.sub1, academy.die, academy.localize, academy.ROOT


def patch_template(tpl):
    tpl = localize(tpl)
    tpl = sub1(tpl, '<img src="assets/academy-b/aee35dd3d3e235f23718328156323fe9.png" alt="Kenji Academy" style="height:20px;width:auto;filter:invert(1);flex:none">',
               '<a href="academy.html" aria-label="Zpět na Kenji Academy" style="display:flex;flex:none"><img src="assets/academy-b/aee35dd3d3e235f23718328156323fe9.png" alt="Kenji Academy" width="119" height="20" style="height:20px;width:auto;filter:invert(1)"></a>')

    # Každý krok má vlastní klíč: při přechodu se sekce vymění (a přehraje se animace),
    # v rámci kroku se jen upraví to, co se změnilo.
    parts = tpl.split('<section class="fade"')
    tpl = parts[0] + ''.join('<section class="fade" data-k="krok%d"%s' % (i, part) for i, part in enumerate(parts[1:], 1))

    # Na telefonu dvě dlaždice oborů vedle sebe a náhledy lekcí do více řádků.
    tpl = sub1(tpl, '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-top:30px">',
               '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:30px">')
    tpl = sub1(tpl, '<div style="display:flex;justify-content:center;gap:10px;margin-top:20px;min-height:52px">',
               '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:20px;min-height:52px">')

    # Kontakt: odeslání na server, souhlas, skryté pole proti robotům.
    tpl = sub1(tpl, 'Kam ti ho máme poslat? Uvidíš ho hned a pošleme ti ho i e-mailem. Instagram potřebujeme, abychom plán sladili s tvým portfoliem.',
               'Kam ti ho máme poslat? Plán ti přijde e-mailem a do dvou pracovních dnů ti napíšeme na Instagram. Podle něj se podíváme, kde teď s portfoliem jsi.')
    tpl = sub1(tpl, '<input id="ob-ig" type="text" placeholder="@tvujprofil" value="{{ig}}" onInput="{{setIg}}"',
               '<input id="ob-ig" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@tvujprofil" value="{{ig}}" onInput="{{setIg}}"')
    tpl = sub1(tpl, '<input type="checkbox" onChange="{{toggleMkt}}"', '<input type="checkbox" checked="{{mkt}}" onChange="{{toggleMkt}}"')
    tpl = sub1(tpl, '''          <button type="button" class="btn gold" onClick="{{unlock}}" aria-disabled="{{contactDisabled}}" style="color:#0E0E10;margin-top:6px;{{contactBtnStyle}}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2.5"></rect><path d="M8 11V7a4 4 0 0 1 7.5-2"></path></svg>
            Odemknout můj plán
          </button>''', '''          <div aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"><label for="ob-web">Web</label><input id="ob-web" type="text" tabindex="-1" autocomplete="off" value="{{hp}}" onInput="{{setHp}}"></div>
          <button type="button" class="btn gold" onClick="{{unlock}}" aria-disabled="{{contactDisabled}}" style="color:#0E0E10;margin-top:6px;{{contactBtnStyle}}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2.5"></rect><path d="M8 11V7a4 4 0 0 1 7.5-2"></path></svg>
            {{unlockLabel}}
          </button>
          <sc-if value="{{sendError}}" hint-placeholder-val="{{false}}"><p role="alert" style="margin:0;font-size:14px;font-weight:600;color:#B42318">{{sendError}}</p></sc-if>
          <p style="margin:2px 0 0;font-size:12.5px;line-height:1.5;color:#8A8A92">Údaje použijeme jen k tomu, abychom ti poslali plán a ozvali se ti k němu. Víc v <a href="zasady-ochrany-udaju.html" target="_blank" rel="noopener" style="color:#55555C">zásadách ochrany osobních údajů</a>.</p>''')

    # Po odeslání: plán se na stránce neukazuje, přijde osobním e-mailem od Kenjiho
    # a do dvou pracovních dnů následuje DM na Instagramu.
    start = tpl.index('    <!-- 8 · PLÁN -->')
    end = tpl.index('    <!-- 9 · TERMÍN HOVORU -->')
    step = '<span style="flex:none;width:30px;height:30px;border-radius:50%%;background:#0E0E10;color:#E2B55E;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">%d</span>'
    tpl = tpl[:start] + '''    <!-- 8 · HOTOVO -->
    <sc-if value="{{s8}}" hint-placeholder-val="{{false}}">
      <section class="fade" data-k="hotovo" style="max-width:560px;margin:0 auto">
        <span class="gold" style="width:60px;height:60px;border-radius:18px;display:flex;align-items:center;justify-content:center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0E0E10" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>
        </span>
        <h1 style="margin:22px 0 0;font-size:clamp(34px,5vw,52px);line-height:1.04;font-weight:900;letter-spacing:-.05em">{{doneTitle}}<br>Mrkni do e-mailu.</h1>
        <p style="margin:14px 0 0;font-size:17px;line-height:1.55;color:#55555C">Tvůj plán ti právě odešel na <strong style="color:#0E0E10">{{emailShown}}</strong>. Napsal jsem ti k němu pár řádků.</p>
        <ol class="glass" style="list-style:none;margin:26px 0 0;padding:22px;display:flex;flex-direction:column;gap:18px">
          <li style="display:flex;gap:14px;align-items:flex-start">%s<span style="font-size:16px;line-height:1.45"><strong>Otevři e-mail od Kenjiho</strong><br><span style="color:#55555C">Nevidíš ho? Koukni do Promoakcí nebo spamu.</span></span></li>
          <li style="display:flex;gap:14px;align-items:flex-start">%s<span style="font-size:16px;line-height:1.45"><strong>Do 2 pracovních dnů ti napíšu na Instagram</strong><br><span style="color:#55555C">na {{igShown}} · mrkni i do Žádostí o zprávy</span></span></li>
          <li style="display:flex;gap:14px;align-items:flex-start">%s<span style="font-size:16px;line-height:1.45"><strong>Probereme, co dál</strong><br><span style="color:#55555C">jestli ti Academy pomůže, nebo co dělat i bez ní</span></span></li>
        </ol>
        <a class="btn" href="https://www.instagram.com/kenjiacademycz/" target="_blank" rel="noopener" style="margin-top:22px;width:100%%;justify-content:center;background:#0E0E10;color:#FFFFFF;text-decoration:none">Sledovat @kenjiacademycz</a>
        <p style="margin:10px 0 0;text-align:center;font-size:14px;color:#6A6A72">Když nás sleduješ, zpráva ti přijde rovnou do DM.</p>
        <p style="margin:26px 0 0;text-align:center"><a href="academy.html" style="color:#8A5A14;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;min-height:44px;line-height:44px">Mezitím se podívat, co je v Academy →</a></p>
      </section>
    </sc-if>

''' % (step % 1, step % 2, step % 3) + tpl[end:]

    # Během otázek: rychlá cesta pro ty, kdo se mezitím rozhodli koupit.
    tpl = sub1(tpl, '  </main>', '''    <sc-if value="{{showQuickBuy}}" hint-placeholder-val="{{true}}">
      <aside aria-label="Rychlý nákup" style="--kw:clamp(150px,22vw,190px);position:relative;max-width:720px;margin:calc(var(--kw) * .555 + 44px) auto 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px 20px;padding:18px 18px 18px 22px;border-radius:24px;background:rgba(255,255,255,.7);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border:1px solid rgba(200,145,58,.35);box-shadow:0 18px 44px -30px rgba(110,72,16,.45)">
        <div aria-hidden="true" style="position:absolute;left:22px;bottom:100%;width:var(--kw);pointer-events:none">
          <img src="assets/academy-b/683252f56d8eabb83e7f458a2dddc882.webp" alt="" width="1122" height="700" loading="lazy" style="display:block;width:100%;height:auto;margin-bottom:-6.95%">
        </div>
        <div style="flex:1 1 260px;min-width:0">
          <div style="font-size:16px;font-weight:800;letter-spacing:-.02em">Už víš, že do toho jdeš?</div>
          <div style="font-size:14px;line-height:1.45;color:#55555C;margin-top:3px">Přeskoč otázky a přidej se rovnou. Jednorázově, přístup navždy.</div>
        </div>
        <button type="button" class="btn gold" onClick="{{buyAcademy}}" aria-disabled="{{buyDisabled}}" style="flex:none;color:#0E0E10;min-height:48px;padding:0 22px;font-size:15px">{{quickBuyLabel}}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
        </button>
        <sc-if value="{{buyError}}" hint-placeholder-val="{{false}}"><p role="alert" style="flex:1 1 100%;margin:0;font-size:13px;font-weight:600;color:#B42318">{{buyError}}</p></sc-if>
        <div style="flex:1 1 100%;display:flex;align-items:center;gap:6px;font-size:12px;color:#8A8A92"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2.5"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>Zabezpečená platba přes Stripe</div>
      </aside>
    </sc-if>
  </main>''')

    # Rezervace hovoru se na webu nepoužívá.
    start = tpl.index('    <!-- 9 · TERMÍN HOVORU -->')
    end = tpl.index('    <!-- navigace -->')
    tpl = tpl[:start] + tpl[end:]
    if '/_blob/' in tpl or '{{toCall}}' in tpl:
        die('v šabloně onboardingu zůstal nedořešený odkaz')
    return tpl


def patch_script(script):
    script = localize(script)
    script = sub1(script, "ig: '', tel: '', mkt: false, day: null, slot: null, gen: 0 };",
                  "ig: '', tel: '', mkt: false, gen: 0, hp: '', sending: false, sendError: '', buying: '', buyError: '' };\n"
                  "    try { this.source = (new URLSearchParams(location.search).get('od') || '').slice(0, 40); } catch (e) { this.source = ''; }")

    # Odeslání odpovědí a nákup.
    script = sub1(script, "  startGen() {", """  async submit() {
    const S = this.state;
    this.setState({ sending: true, sendError: '' });
    try {
      const res = await fetch('/.netlify/functions/plan-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: S.name.trim(), email: S.email.trim(), phone: S.tel.trim(), instagram: S.ig.trim(),
          obory: S.obory, level: S.years, jobs: S.jobs, price: S.price, blockers: S.blockers,
          goal: S.goal, hours: S.hours, marketing: S.mkt, source: this.source, web: S.hp,
          plan: this._plan || {}
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Odeslání se nepovedlo. Zkus to prosím znovu.');
      this.setState({ sending: false, step: 8 });
      try { window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'plan_request', source: this.source }); } catch (e) {}
    } catch (e) {
      this.setState({ sending: false, sendError: e.message || 'Odeslání se nepovedlo. Zkus to prosím znovu.' });
    }
  }
  async checkout(product) {
    if (this.state.buying) return;
    this.setState({ buying: product, buyError: '' });
    try {
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, source: 'plan-na-miru', email: this.state.email.trim() || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || 'Platbu se nepodařilo připravit.');
      if (data.testMode && !confirm('POZOR: Platební brána běží v TESTOVACÍM režimu — peníze se nestrhnou.\\n\\nPokračovat?')) {
        this.setState({ buying: '' });
        return;
      }
      location.href = data.url;
    } catch (e) {
      this.setState({ buying: '', buyError: e.message || 'Platbu se nepodařilo připravit. Zkus to prosím znovu.' });
    }
  }
  startGen() {""")

    # Plán si komponenta zapamatuje, ať ho submit může poslat do e-mailu.
    script = sub1(script, "    const planSec = ph1.concat(ph2, ph3).reduce((a, t) => a + B[t][0], 0);",
                  "    const planSec = ph1.concat(ph2, ph3).reduce((a, t) => a + B[t][0], 0);\n"
                  "    this._plan = { phases: phases.map((p) => ({ title: p.title, items: p.items.map((i) => i.title) })), weeks: Math.max(1, Math.ceil(planSec / 3600 / (S.hours || 5))) };")

    # Rezervace termínu pryč.
    start = script.index('    // --- 9 termín ---')
    end = script.index('    // --- průběh ---')
    script = script[:start] + script[end:]
    script = sub1(script, "      unlock: () => { if (contactOk) go(8); },",
                  "      unlock: () => { if (contactOk && !S.sending) this.submit(); },\n"
                  "      unlockLabel: S.sending ? 'Odesílám…' : 'Poslat mi plán',\n"
                  "      doneTitle: (S.name.trim() ? 'Hotovo, ' + S.name.trim() + '.' : 'Hotovo.'), igShown: S.ig.trim() ? '@' + S.ig.trim().replace(/^@/, '') : 'tvůj Instagram',\n"
                  "      hp: S.hp, setHp: (e) => set({ hp: e.target.value }), mkt: S.mkt, sendError: S.sendError,\n"
                  "      buyAcademy: () => this.checkout('academy'), buyDatabaze: () => this.checkout('databaze'),\n"
                  "      buyLabel: S.buying === 'academy' ? 'Připravuju platbu…' : 'Začít podle plánu · 24 997 Kč', buyDisabled: S.buying ? 'true' : 'false', buyError: S.buyError,\n"
                  "      showQuickBuy: S.step >= 1 && S.step <= 7, quickBuyLabel: S.buying === 'academy' ? 'Připravuju platbu…' : 'Koupit Academy · 24 997 Kč',")
    script = sub1(script, "contactBtnStyle: contactOk ? 'box-shadow:0 16px 36px -14px rgba(154,100,24,.7)' : disabledStyle,",
                  "contactBtnStyle: contactOk && !S.sending ? 'box-shadow:0 16px 36px -14px rgba(154,100,24,.7)' : disabledStyle,")
    for key in ['      toCall: () => go(9),\n', '      days, slots,\n']:
        script = sub1(script, key, '')
    script = re.sub(r"      bookDisabled:.*\n", '', script)
    script = re.sub(r"      book: .*\n", '', script)
    script = re.sub(r"      nameShown: .*\n", '', script)
    script = re.sub(r"      bookedText: .*\n", '', script)
    script = sub1(script, "showNav: S.step >= 1 && S.step <= 9 && S.step !== 8,", "showNav: S.step >= 1 && S.step <= 7,")
    script = sub1(script, "go(S.step === 9 ? 8 : (S.step === 11 ? 6 : Math.max(1, S.step - 1)));", "go(S.step === 11 ? 6 : Math.max(1, S.step - 1));")
    for gone in ['daysArr', 'bookedText', 'SL[', 'toCall']:
        if gone in script:
            die('ve skriptu onboardingu zůstalo „%s"' % gone)
    return script


PAGE = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Zjisti, jestli je Academy pro tebe — Kenji Academy</title>
<meta name="description" content="Naklikej pár otázek o svém focení a dostaneš osobní plán, čím začít. Zdarma a bez platební karty.">
<meta name="robots" content="noindex">
<link rel="canonical" href="https://www.kenjiacademy.cz/plan-na-miru">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
<meta name="theme-color" content="#FBFAF6">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
%s
*{box-sizing:border-box}
:focus-visible{outline:3px solid #B07A22;outline-offset:3px}
</style>
</head>
<body>
<div id="app"></div>
<noscript><p style="font-family:Inter,sans-serif;padding:40px 24px;text-align:center">Plán na míru potřebuje zapnutý JavaScript. Případně nám napiš na <a href="https://www.instagram.com/kenjiacademycz">Instagram @kenjiacademycz</a>.</p></noscript>
<template id="plan-tpl">%s</template>
<script src="assets/dc-mini.js?v=%s"></script>
<script>
%s
(function () {
  var inst = DCMini.mount(document.getElementById('app'), document.getElementById('plan-tpl'), Component, {});
  var set = inst.setState;
  // Při přechodu na další krok vždy nahoru, ať člověk nezačíná uprostřed obrazovky.
  inst.setState = function (patch) {
    var before = inst.state.step;
    set(patch);
    if (inst.state.step !== before) window.scrollTo(0, 0);
  };
})();
</script>
</body>
</html>
"""


def main():
    if len(sys.argv) < 2:
        die(__doc__)
    src = open(sys.argv[1], encoding='utf-8').read()
    style = re.search(r'<helmet>.*?<style>(.*?)</style>', src, re.S).group(1).strip()
    tpl = src[src.index('<x-dc>') + 6:src.index('</x-dc>')]
    tpl = re.sub(r'<helmet>.*?</helmet>', '', tpl, flags=re.S).strip()
    script = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1)
    html = PAGE % (style, patch_template(tpl), time.strftime('%Y%m%d%H%M'), patch_script(script).strip())
    out = os.path.join(ROOT, 'plan-na-miru.html')
    open(out, 'w', encoding='utf-8').write(html)
    print('Zapsáno plan-na-miru.html (%d kB)' % (len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()
