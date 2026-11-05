// Minimální statický server jen pro lokální náhled (není součást deploye)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 4321;
const clients = new Set();
const liveReload = `<script data-kenji-live-reload>
(() => {
  const events = new EventSource('/__kenji_reload');
  events.addEventListener('change', () => location.reload());
})();
</script>`;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

http.createServer((req, res) => {
  if (req.url === '/__kenji_reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    clients.add(res);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
    return;
  }
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { res.writeHead(400); res.end('Bad request'); return; }
  if (urlPath === '/') urlPath = '/index.html';
  let filePath = path.resolve(ROOT, '.' + urlPath);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  // pretty URL: /clanky/slug -> /clanky/slug.html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) filePath += '.html';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.readFile(path.join(ROOT, '404.html'), (e, d) => res.end(d || 'Not found'));
      return;
    }
    const isHtml = path.extname(filePath) === '.html';
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    if (isHtml) {
      const html = data.toString('utf8');
      res.end(html.replace(/<\/body>/i, liveReload + '</body>'));
    } else {
      res.end(data);
    }
  });
}).listen(PORT, '127.0.0.1', () => console.log('Kenji náhled běží na http://localhost:' + PORT));

let reloadTimer;
fs.watch(ROOT, { recursive: true }, (_event, name) => {
  const changed = String(name || '').replace(/\\/g, '/');
  if (!changed || /^(?:\.git|graphify-out|scratchpad|node_modules|\.claude|supabase\/\.temp)(?:\/|$)/.test(changed)) return;
  if (!/\.(?:html|css|js|json|svg|png|jpe?g|webp|gif)$/i.test(changed)) return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const client of clients) client.write('event: change\ndata: reload\n\n');
  }, 200);
});
