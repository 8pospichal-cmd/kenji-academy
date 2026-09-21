#!/usr/bin/env node
'use strict';
// Karusel pro Instagram z JSONu → PNG 1080×1350 podle Danielových pravidel:
//   text ve spodní třetině na středu · hlavní text → oranžová čára → text pod ním
//   žádné číslování, žádné štítky · oranžová jen výjimečně, na obálce nikdy
//   logo Kenji Academy z webu (černé na bílé) · maňásek malý, stojí na textu
// Renderuje lokální Chrome v headless režimu, žádné knihovny navíc.
//
//   node tools/slidy.js <karusel.json>            → PNG do složky vedle JSONu
//   node tools/slidy.js <karusel.json> --html     → jen HTML náhledy
//
// JSON: { "slug": "slidy", "theme": "light", "mascot": { "file": "maskot.png", "height": 250, "x": 60 },
//         "slides": [ { "title": "…", "body": "…", "big": "1", "cta": "…" } ] }
//   title   hlavní text (Bebas Neue); **slovo** = oranžově, ale na 1. slidu se ignoruje
//   body    text pod čarou (Inter), nepovinný
//   big     velké číslo nad nadpisem (číslované body), nepovinné
//   cta     text tlačítka (poslední slide), nepovinné
//   mascot  na kterých slidech: "slides": "all" | "first" | [1,3,5]; "x" = poloha v % šířky textu (kde stojí)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const file = process.argv[2];
if (!file || !file.endsWith('.json')) { console.error('Použití: node tools/slidy.js <karusel.json> [--html]'); process.exit(2); }
const htmlOnly = process.argv.includes('--html');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const outDir = path.join(path.dirname(file), data.slug || 'slidy');
fs.mkdirSync(outDir, { recursive: true });

const theme = data.theme === 'dark' ? 'dark' : 'light';
const T = theme === 'light'
  ? { bg: '#ffffff', strong: '#0a0a0a', body: '#3a3a3f', dot: 'rgba(0,0,0,.05)', logoFilter: 'invert(1)' }
  : { bg: '#0a0a0a', strong: '#ffffff', body: '#cfcfcf', dot: 'rgba(255,255,255,.045)', logoFilter: 'none' };

const logoPath = path.join(__dirname, '..', 'assets', 'logo-kenji.png');
const logoData = fs.existsSync(logoPath) ? 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64') : null;

const M = Object.assign({ file: 'maskot.png', height: 250, x: 60, slides: 'all' }, data.mascot || {});
const mascotPath = [path.join(path.dirname(file), M.file), path.join(path.dirname(file), '..', M.file)].find(function (p) { return fs.existsSync(p); }) || null;
const mascotData = mascotPath ? 'data:image/png;base64,' + fs.readFileSync(mascotPath).toString('base64') : null;
if (data.mascot && !mascotPath) console.warn('Maňásek nenalezen: ' + M.file);
function mascotOn(i) {
  if (!mascotData || M.slides === 'none') return false;
  if (M.slides === 'first') return i === 0;
  if (Array.isArray(M.slides)) return M.slides.includes(i + 1);
  return true;
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function lines(s) { return esc(s).replace(/\n/g, '<br>'); }

function slideHtml(slide, index) {
  const len = String(slide.title || '').replace(/\*\*/g, '').length;
  const titleSize = slide.titleSize || (len > 80 ? 72 : len > 50 ? 88 : len > 28 ? 104 : 124);
  // Oranžová jen tam, kde JSON výslovně chce — a na obálce nikdy.
  const title = index === 0
    ? lines(slide.title || '').replace(/\*\*(.+?)\*\*/g, '$1')
    : lines(slide.title || '').replace(/\*\*(.+?)\*\*/g, '<em>$1</em>');
  const showMascot = mascotOn(index);
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&display=swap">
<style>
  html,body{margin:0;width:1080px;height:1350px;overflow:hidden;background:${T.bg};font-family:'Inter',-apple-system,sans-serif;-webkit-font-smoothing:antialiased;}
  .s{position:relative;width:1080px;height:1350px;box-sizing:border-box;padding:84px 80px 110px;display:flex;flex-direction:column;
     background:radial-gradient(circle at 12px 12px, ${T.dot} 1.5px, transparent 1.5px) 0 0/44px 44px, ${T.bg};}
  .logo{height:44px;width:auto;align-self:flex-start;filter:${T.logoFilter};display:block;}
  .mid{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;text-align:center;}
  .block{position:relative;max-width:920px;}
  .big{font-family:'Bebas Neue',Impact,sans-serif;font-size:220px;line-height:.85;color:#ff6b1a;letter-spacing:2px;margin-bottom:6px;}
  .title{font-family:'Bebas Neue',Impact,sans-serif;font-size:${titleSize}px;line-height:.96;letter-spacing:1px;color:${T.strong};text-wrap:balance;}
  .title em{font-style:normal;color:#ff6b1a;}
  .rule{width:110px;height:6px;background:#ff6b1a;border-radius:3px;margin:30px auto 26px;}
  .body{font-size:40px;line-height:1.4;color:${T.body};max-width:860px;margin:0 auto;}
  .body b{color:${T.strong};font-weight:700;}
  .cta{margin:34px auto 0;display:inline-flex;align-items:center;gap:16px;background:#ff6b1a;color:#fff;font-weight:700;font-size:38px;padding:24px 40px;border-radius:14px;}
  .mascot{position:absolute;left:${Number(M.x)}%;bottom:calc(100% - 12px);transform:translateX(-50%);height:${Number(M.height)}px;width:auto;}
</style></head><body><div class="s">
  ${logoData ? `<img class="logo" src="${logoData}" alt="Kenji Academy">` : `<div style="font-weight:700;font-size:28px;color:${T.strong}">kenji academy</div>`}
  <div class="mid"><div class="block">
    ${showMascot ? `<img class="mascot" src="${mascotData}" alt="">` : ''}
    ${slide.big ? `<div class="big">${esc(slide.big)}</div>` : ''}
    <div class="title">${title}</div>
    ${slide.body ? `<div class="rule"></div><div class="body">${lines(slide.body).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</div>` : ''}
    ${slide.cta ? `<div class="cta">${esc(slide.cta)} →</div>` : ''}
  </div></div>
</div></body></html>`;
}

const made = [];
data.slides.forEach(function (slide, i) {
  const base = path.join(outDir, 'slide-' + String(i + 1).padStart(2, '0'));
  fs.writeFileSync(base + '.html', slideHtml(slide, i));
  if (htmlOnly) return;
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1080,1350', '--force-device-scale-factor=1',
    '--virtual-time-budget=6000', '--screenshot=' + base + '.png', 'file://' + base + '.html'], { stdio: 'ignore' });
  made.push(base + '.png');
});
console.log((htmlOnly ? 'HTML náhledy' : made.length + ' slidů') + ' → ' + outDir);
