#!/usr/bin/env python3
"""Sestaví statickou prodejní stránku academy.html z návrhu „Varianta B" (B-Web.dc.html).

Použití:
  python3 tools/build-academy-b.py <cesta k B-Web.dc.html> [--out academy.html]

Šablonu z plátna vykreslí headless Chrome přes assets/dc-mini.js (stejný runtime jako
onboarding), takže stránka je v HTML celá i bez JavaScriptu. Interakce (brzdy, filtr
kurzů, zvětšení úspěchů, FAQ) potom obstará assets/academy-b.js.
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ASSET_DIR = 'assets/academy-b'
ONBOARDING_URL = 'plan-na-miru.html'
ARROW = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>')


def die(msg):
    sys.exit('build-academy-b: ' + msg)


def sub1(text, old, new, count=1, first=False):
    """Nahradí přesně `count` výskytů (s first=True jen první), jinak skončí —
    návrh se nesmí tiše rozejít se skriptem."""
    found = text.count(old)
    if found != count:
        die('čekal jsem %d× „%s…", našel jsem %d×' % (count, old[:70], found))
    return text.replace(old, new, 1) if first else text.replace(old, new)


def blob_map():
    out = {}
    for name in os.listdir(os.path.join(ROOT, ASSET_DIR)):
        out[name.split('.')[0]] = ASSET_DIR + '/' + name
    return out


def localize(text):
    """Odkazy na obrázky z plátna (/_blob/<id>) přepíše na soubory v ASSET_DIR."""
    blobs = blob_map()

    def repl(m):
        if m.group(1) not in blobs:
            die('chybí obrázek %s v %s' % (m.group(1), ASSET_DIR))
        return blobs[m.group(1)]
    return re.sub(r'/_blob/([0-9a-f]{32})', repl, text)


def patch_template(tpl):
    blobs = blob_map()
    tpl = localize(tpl)

    # Hlavička: odkaz na web, skutečné přihlášení a mobilní menu.
    tpl = sub1(tpl, '<img src="%s" alt="Kenji Academy" style="height:22px;width:auto;filter:invert(1)">' % blobs['aee35dd3d3e235f23718328156323fe9'],
               '<a href="index.html" aria-label="Kenji Academy – hlavní stránka" style="display:flex"><img src="%s" alt="Kenji Academy" width="132" height="22" style="height:22px;width:auto;filter:invert(1)"></a>' % blobs['aee35dd3d3e235f23718328156323fe9'])
    tpl = sub1(tpl, '<a href="#" class="hide-m" style="font-size:15px;font-weight:600;text-decoration:none;color:#0E0E10;padding:12px 14px">Přihlásit se</a>',
               '<a href="preset.html" class="hide-m" style="font-size:15px;font-weight:600;text-decoration:none;color:#55555C;padding:12px 10px">Presety</a>'
               '<button type="button" id="academy-login-btn" style="font:inherit;font-size:15px;font-weight:600;color:#0E0E10;background:none;border:0;cursor:pointer;padding:12px 12px;min-height:44px">Přihlásit se</button>')
    tpl = sub1(tpl, '<a href="#b-cena" class="cta-k">Jdu do toho</a>',
               '<a href="#b-cena" class="cta-k" data-checkout-product="academy" data-cta-location="header">Jdu do toho</a>')

    # Úvod: hlavní CTA a cesta pro nerozhodnuté.
    tpl = sub1(tpl, '<a href="#b-cena" class="cta-g goldbg">Jdu do toho',
               '<a href="#b-cena" class="cta-g goldbg" data-cta-location="hero">Jdu do toho')
    tpl = sub1(tpl, '<a href="#" class="cta-gl glass">Zjistit, jestli je to pro mě</a>',
               '<a href="%s?od=hero" class="cta-gl glass" data-cta-location="hero-plan">Zjistit, jestli je to pro mě</a>' % ONBOARDING_URL, count=2, first=True)
    tpl = sub1(tpl, '<a href="#" class="cta-gl glass">Zjistit, jestli je to pro mě</a>',
               '<a href="%s?od=zaver" class="cta-gl glass" data-cta-location="final-plan">Zjistit, jestli je to pro mě</a>' % ONBOARDING_URL)
    tpl = sub1(tpl, '<span style="display:inline-flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A87420" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>Osobní plán za minutu</span>',
               '<span style="display:inline-flex;align-items:center;gap:7px"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A87420" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>Přístup navždy</span>')

    # „Bez platební karty" patřilo k bezplatnému účtu, který už nenabízíme.
    tpl = sub1(tpl, '<path d="M20 6 9 17l-5-5"></path></svg>Bez platební karty</span>',
               '<path d="M20 6 9 17l-5-5"></path></svg>Žádné předplatné</span>')

    # Brzdy: přepínání obslouží academy-b.js.
    tpl = sub1(tpl, '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">\n      <sc-for list="{{blockers}}"',
               '<div id="bk-chips" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">\n      <sc-for list="{{blockers}}"')
    tpl = sub1(tpl, '<div style="font-size:12px;font-weight:800;letter-spacing:.16em;color:#8A8A92">{{cur.kicker}}</div>',
               '<div id="bk-kicker" style="font-size:12px;font-weight:800;letter-spacing:.16em;color:#8A8A92">{{cur.kicker}}</div>')
    tpl = sub1(tpl, '<div style="font-size:clamp(26px,3vw,36px);line-height:1.12;font-weight:800;letter-spacing:-.035em;margin-top:10px">{{cur.title}}</div>',
               '<div id="bk-title" style="font-size:clamp(26px,3vw,36px);line-height:1.12;font-weight:800;letter-spacing:-.035em;margin-top:10px">{{cur.title}}</div>')
    tpl = sub1(tpl, '<p style="margin:12px 0 0;font-size:17px;line-height:1.55;color:#55555C">{{cur.text}}</p>',
               '<p id="bk-text" aria-live="polite" style="margin:12px 0 0;font-size:17px;line-height:1.55;color:#55555C">{{cur.text}}</p>')
    tpl = sub1(tpl, 'Odcházíš s: {{cur.out}}', '<span>Odcházíš s: <span id="bk-out">{{cur.out}}</span></span>')

    # Filtr kurzů.
    tpl = sub1(tpl, '<div class="wrap" style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:34px">\n    <sc-for list="{{cats}}"',
               '<div id="kat-chips" class="wrap" style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:34px">\n    <sc-for list="{{cats}}"')
    tpl = sub1(tpl, '<article class="kcard" style="flex:none;width:300px;',
               '<article class="kcard" data-cat="{{k.cat}}" style="flex:none;width:300px;')
    tpl = sub1(tpl, '<div class="shelf" style="margin-top:6px">', '<div id="kat-shelf" class="shelf" style="margin-top:6px">')

    # Úspěchy: zvětšení obrázku.
    tpl = sub1(tpl, '<button type="button" onClick="{{w.open}}" aria-label="{{w.aria}}" class="glass kcard"',
               '<button type="button" data-win="{{w.img}}" aria-label="Zvětšit screenshot: {{w.title}}" class="glass kcard"')
    tpl = sub1(tpl, '<img src="{{w.img}}" alt="" style="display:block;width:100%;height:auto;border-radius:16px">',
               '<img src="{{w.img}}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;border-radius:16px">')
    start = tpl.index('<sc-if value="{{zoomOpen}}"')
    end = tpl.index('</sc-if>', start) + len('</sc-if>')
    lightbox = tpl[start:end]
    lightbox = lightbox.replace('<sc-if value="{{zoomOpen}}" hint-placeholder-val="{{false}}">', '').replace('</sc-if>', '')
    lightbox = sub1(lightbox, '<div role="dialog" aria-modal="true" aria-label="{{zoom.aria}}"',
                    '<div id="win-box" hidden role="dialog" aria-modal="true" aria-label="Screenshot od člena Academy"')
    lightbox = sub1(lightbox, 'onClick="{{closeZoom}}" aria-label="Zavřít" style="position:absolute;inset:0',
                    'data-win-close aria-label="Zavřít" style="position:absolute;inset:0')
    lightbox = sub1(lightbox, '<img src="{{zoom.img}}" alt="{{zoom.aria}}"', '<img id="win-img" alt="Screenshot od člena Academy"')
    lightbox = sub1(lightbox, 'onClick="{{prevZoom}}"', 'data-win-prev')
    lightbox = sub1(lightbox, 'onClick="{{nextZoom}}"', 'data-win-next')
    lightbox = sub1(lightbox, 'onClick="{{closeZoom}}"', 'data-win-close')
    tpl = tpl[:start] + lightbox + tpl[end:]

    # Cena: rovnou do Stripe, slevový kód přes stávající kenjiCoupon().
    tpl = sub1(tpl, '<a href="#" class="cta-g goldbg" style="width:100%;margin-top:30px">Přidat se do Academy',
               '<a href="#" class="cta-g goldbg" data-checkout-product="academy" data-cta-location="pricing" style="width:100%;margin-top:30px">Přidat se do Academy')
    tpl = sub1(tpl, '<div style="display:flex;justify-content:center;gap:18px;margin-top:12px;font-size:13px;color:#6A6A72"><span>Faktura i na firmu</span><a href="#" style="font-weight:600">Mám slevový kód</a></div>',
               '<div style="display:flex;justify-content:center;gap:18px;margin-top:12px;font-size:13px;color:#6A6A72"><span>Faktura i na firmu</span>'
               '<button type="button" id="coupon-toggle" aria-expanded="false" aria-controls="coupon-box" style="font:inherit;font-weight:600;color:#0E0E10;background:none;border:0;padding:0;text-decoration:underline;cursor:pointer">Mám slevový kód</button></div>'
               '<div id="coupon-box" hidden style="margin-top:10px"><label for="kenji-coupon" style="display:block;font-size:13px;font-weight:700;margin-bottom:6px">Slevový kód</label>'
               '<input id="kenji-coupon" type="text" autocomplete="off" autocapitalize="characters" placeholder="NAPŘ. KENJI10" style="width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:13px 16px;border-radius:14px;border:1px solid #E2DCCF;background:#FFFFFF;min-height:44px;text-transform:uppercase">'
               '<p style="margin:6px 0 0;font-size:12px;color:#6A6A72">Sleva se započítá v pokladně Stripe.</p></div>')
    tpl = sub1(tpl, '<a href="#" style="position:relative;margin-top:auto;display:flex;',
               '<a href="%s?od=cenik" data-cta-location="pricing-plan" style="position:relative;margin-top:auto;display:flex;' % ONBOARDING_URL)
    tpl = sub1(tpl, '<a href="#b-cena" class="cta-g goldbg">Plný přístup · 24 997 Kč</a>',
               '<a href="#b-cena" class="cta-g goldbg" data-cta-location="final">Plný přístup · 24 997 Kč</a>')

    tpl = sub1(tpl, '<div style="display:flex;align-items:baseline;gap:10px;margin-top:10px"><span class="bebas" style="font-size:clamp(68px,8vw,92px);line-height:.85">24 997</span>',
               '<div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin-top:10px"><span class="bebas" style="font-size:clamp(68px,8vw,92px);line-height:.85;white-space:nowrap">24 997</span>')

    # FAQ: odpovědi jsou v HTML všechny, přepínání obslouží academy-b.js.
    tpl = sub1(tpl, '<button type="button" onClick="{{f.toggle}}" aria-expanded="{{f.expanded}}"',
               '<button type="button" class="faq-q" aria-expanded="{{f.expanded}}"')
    tpl = sub1(tpl, '<span style="{{f.signStyle}}">+</span>', '<span class="faq-sign" aria-hidden="true">+</span>')
    tpl = sub1(tpl, '<sc-if value="{{f.open}}" hint-placeholder-val="{{false}}">\n          <p style="margin:0;padding:0 26px 24px;font-size:16px;line-height:1.65;color:#55555C">{{f.a}}</p>\n        </sc-if>',
               '<p class="faq-a" hidden="{{f.hidden}}" style="margin:0;padding:0 26px 24px;font-size:16px;line-height:1.65;color:#55555C">{{f.a}}</p>')

    # Patička.
    tpl = sub1(tpl, '<a href="#" style="color:#6A6A72">Obchodní podmínky</a>', '<a href="obchodni-podminky.html" style="color:#6A6A72">Obchodní podmínky</a>')
    tpl = sub1(tpl, '<a href="#" style="color:#6A6A72">Ochrana osobních údajů</a>', '<a href="zasady-ochrany-udaju.html" style="color:#6A6A72">Ochrana osobních údajů</a>')
    tpl = sub1(tpl, '<a href="#" style="color:#6A6A72">Cookies</a>', '<a href="cookies.html" style="color:#6A6A72">Cookies</a>')

    # Zbylé obrázky pod ohybem stránky se načítají líně.
    def lazy(m):
        tag = m.group(0)
        if 'loading=' in tag or 'academy-b/aee35' in tag or 'academy-b/7cfd7' in tag:
            return tag
        return tag.replace('<img ', '<img loading="lazy" decoding="async" ', 1)
    tpl = re.sub(r'<img [^>]*>', lazy, tpl)

    if '/_blob/' in tpl or 'href="#" ' in tpl.replace('href="#" class="cta-g goldbg" data-checkout-product', ''):
        die('v šabloně zůstal nedořešený odkaz nebo obrázek')
    return tpl


def patch_script(script):
    script = localize(script)
    script = sub1(script, "{ q: 'Můžu si platformu nejdřív prohlédnout zdarma?', a: 'Ano. Free účet ti zpřístupní vybrané články, kvíz s odměnou, audit pro tvůrce, dashboard, Foto feedback a Týdenní výzvu. Plné kurzy a prémiová komunita se odemknou v Academy.' }",
                  "{ q: 'Nevím, jestli je Academy pro mě. Co s tím?', a: 'Klikni na „Zjistit, jestli je to pro mě“. Naklikáš pár otázek o svém focení, dostaneš osobní plán a ozveme se ti s upřímnou odpovědí, jestli ti Academy pomůže a čím začít. Zdarma a bez platební karty.' }")
    script = sub1(script, "expanded: open === i ? 'true' : 'false',", "expanded: open === i ? 'true' : 'false',\n        hidden: open !== i,")
    return script


def render(tpl, script):
    page = """<!doctype html><html><head><meta charset="utf-8"></head><body>
<template id="t">%s</template><div id="root"></div>
<script src="file://%s/assets/dc-mini.js"></script>
<script>%s
DCMini.renderInto(document.getElementById('root'), document.getElementById('t'), new Component({ animace: true }).renderVals());
document.getElementById('t').remove();
</script></body></html>""" % (tpl, ROOT, script)
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False, encoding='utf-8') as fh:
        fh.write(page)
        path = fh.name
    try:
        dom = subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
                              '--virtual-time-budget=4000', '--dump-dom', 'file://' + path],
                             capture_output=True, text=True, timeout=90).stdout
    finally:
        os.unlink(path)
    m = re.search(r'<div id="root">(.*)</div>\s*<script src=', dom, re.S)
    if not m:
        die('Chrome nevrátil vykreslenou stránku')
    return m.group(1)


HEAD = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kenji Academy — z tvorby fungující byznys</title>
<link rel="canonical" href="https://kenjiacademy.cz/academy">
<meta name="description" content="Videokurzy, komunita, nástroje a byznys know-how pro fotografy a kameramany. Nauč se získávat klienty a říkat si o správnou cenu. 4,65 ze 173+ hodnocení.">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="48x48" href="assets/favicon-48.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="Kenji Academy — z tvorby fungující byznys">
<meta property="og:description" content="Videokurzy, komunita, nástroje a byznys know-how pro fotografy a kameramany. Nauč se získávat klienty a říkat si o správnou cenu.">
<meta property="og:image" content="https://kenjiacademy.cz/assets/og-image.jpg">
<meta name="theme-color" content="#FBFAF6">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="assets/academy-b/7cfd7d4f840f9d383ffebb204b21b1af.webp">
<link rel="preload" as="style" href="assets/styles.css?v=20260926-login-v1" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="assets/styles.css?v=20260926-login-v1"></noscript>
<style>
/* Stejný reset jako styles.css: ten se kvůli velikosti (440 kB, jen pro přihlášení) načítá až po vykreslení. */
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%%;text-size-adjust:100%%}
body{overflow-x:hidden}
%s
/* Sdílený styles.css nastavuje tmavé téma a globální reset — prodejní stránka B je světlá. */
html,body.academy-b-body{background:#FBFAF6;color:#0E0E10}
body.academy-b-body{line-height:normal}
.b-root button{font-family:inherit}
.faq-sign{flex:none;width:34px;height:34px;border-radius:50%%;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;transition:transform .25s ease;background:rgba(255,255,255,.75);color:#0E0E10}
.faq-q[aria-expanded="true"] .faq-sign{transform:rotate(45deg);background:#0E0E10;color:#FFFFFF}
.b-root [hidden]{display:none !important}
:focus-visible{outline:3px solid #B07A22;outline-offset:3px}
#academy-login-btn,.b-root header .cta-k{white-space:nowrap}
#b-cena span[style*="#E6E1D6"]{white-space:nowrap}
@media (max-width:520px){.b-root header{padding:8px 8px 8px 16px !important}.b-root header img{height:18px !important}#academy-login-btn{font-size:14px !important;padding:10px 6px !important}.b-root header .cta-k{font-size:14px;padding:10px 14px}}
</style>
</head>
<body class="academy-b-body">
"""

TAIL = """
<script defer src="assets/auth.js?v=20260926-public-articles-v1"></script>
<script defer src="assets/script.js?v=20260907-email-v1"></script>
<script defer src="assets/academy-b.js?v=%s"></script>
</body>
</html>
"""


def image_size(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path], capture_output=True, text=True).stdout
    w = re.search(r'pixelWidth: (\d+)', out)
    h = re.search(r'pixelHeight: (\d+)', out)
    return (int(w.group(1)), int(h.group(1))) if w and h else None


def add_dimensions(body):
    """Doplní width/height podle skutečného souboru (prohlížeč si rezervuje místo
    a stránka při načítání neposkakuje); hlavní fotce v úvodu dá přednost."""
    cache = {}

    def fix(m):
        tag = m.group(0)
        src = re.search(r'src="(%s/[^"]+)"' % re.escape(ASSET_DIR), tag)
        if not src:
            return tag
        if src.group(1).endswith('.svg'):
            return tag
        if src.group(1) not in cache:
            cache[src.group(1)] = image_size(os.path.join(ROOT, src.group(1)))
        size = cache[src.group(1)]
        if size and ' width=' not in tag:
            tag = tag.replace('<img ', '<img width="%d" height="%d" ' % size, 1)
        if '7cfd7d4f840f9d383ffebb204b21b1af' in tag and 'aria-hidden' not in tag:
            tag = tag.replace('<img ', '<img fetchpriority="high" ', 1)
        return tag
    return re.sub(r'<img [^>]*>', fix, body)


def main():
    if len(sys.argv) < 2:
        die(__doc__)
    src = open(sys.argv[1], encoding='utf-8').read()
    out = os.path.join(ROOT, sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else 'academy.html')
    style = re.search(r'<helmet>.*?<style>(.*?)</style>', src, re.S).group(1).strip()
    tpl = src[src.index('<x-dc>') + 6:src.index('</x-dc>')]
    tpl = re.sub(r'<helmet>.*?</helmet>', '', tpl, flags=re.S)
    script = re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>', src, re.S).group(1)
    tpl = patch_template(tpl)
    script = patch_script(script)
    body = render(tpl, script)
    body = body.replace('{{', '').replace('}}', '')
    style = style.replace('body{margin:0;background:#FBFAF6}\n', '')
    import time
    body = add_dimensions(body.strip())
    html = HEAD % style + body + TAIL % time.strftime('%Y%m%d%H%M')
    if '{{' in html or 'onclick=' in html.lower() or '/_blob/' in html:
        die('ve výstupu zůstaly nevyplněné značky nebo inline handlery')
    open(out, 'w', encoding='utf-8').write(html)
    print('Zapsáno %s (%d kB)' % (os.path.relpath(out, ROOT), len(html.encode('utf-8')) // 1024))


if __name__ == '__main__':
    main()
