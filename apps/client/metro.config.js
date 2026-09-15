const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// The development browser stays same-origin. Only the public reading is proxied;
// no admin requests, credentials or writes are forwarded.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  if (req.url?.split('?')[0] !== '/api/current') return middleware(req, res, next);
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  fetch('https://newsworthy-indol.vercel.app/api/current', { signal: AbortSignal.timeout(15000) })
    .then(async response => {
      res.writeHead(response.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(await response.text());
    }).catch(() => { if (!res.headersSent) res.writeHead(503); res.end('{"error":"Reading unavailable"}'); });
};
module.exports = config;
