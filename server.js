/**
 * RHMF recruitment gateway (Node.js 22+, no third-party dependencies).
 * The real Discord webhook is read from DISCORD_WEBHOOK_URL, never from public HTML.
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(root, '.env'))) {
  // Built into Node.js 22. Values are held server-side only.
  process.loadEnvFile(join(root, '.env'));
}
const html = readFileSync(join(root, 'public', 'index.html'));
const ALLOWED_REGIMENTS = new Set([
  '48th Ranger Regiment', '78th Paratroopers Regiment',
  '12th Airborne Regiment', '58th Support Regiment',
  'Undecided / Open to suggestions'
]);
const ALLOWED_EXPERIENCE = new Set(['New player', 'Some experience', 'Experienced player']);
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT_PER_IP = 8;

function json(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function cleanField(value, max, required = false) {
  if (typeof value !== 'string') return required ? null : '';
  const text = value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (text.length > max || (required && text.length === 0)) return null;
  return text;
}

export function createAppServer({ webhookUrl = process.env.DISCORD_WEBHOOK_URL, discordFetch = globalThis.fetch } = {}) {
  const attempts = new Map();
  return http.createServer(async (req, res) => {
    const baseHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'DENY',
    };
    try {
      const route = new URL(req.url || '/', 'http://localhost').pathname;
      if (req.method === 'GET' && (route === '/' || route === '/index.html')) {
        res.writeHead(200, { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        res.end(html);
        return;
      }
      if (req.method === 'GET' && route === '/favicon.ico') {
        res.writeHead(204, baseHeaders); res.end(); return;
      }
      if (req.method !== 'POST' || route !== '/api/apply') {
        json(res, 404, { ok: false, error: 'Not found.' }, baseHeaders);
        return;
      }
      if (req.headers.origin) {
        let hostMatches = false;
        try {
          const origin = new URL(req.headers.origin);
          hostMatches = ['https:', 'http:'].includes(origin.protocol) && origin.host === req.headers.host;
        } catch (_) { /* Invalid Origin */ }
        if (!hostMatches) {
          json(res, 403, { ok: false, error: 'Cross-origin requests are not permitted.' }, baseHeaders);
          return;
        }
      }
      if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        json(res, 415, { ok: false, error: 'Expected a JSON application.' }, baseHeaders);
        return;
      }
      const ip = req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      let dates = (attempts.get(ip) || []).filter(time => now - time < WINDOW_MS);
      if (attempts.size > 2000) {
        for (const [key, records] of attempts) {
          const recent = records.filter(time => now - time < WINDOW_MS);
          if (recent.length) attempts.set(key, recent);
          else attempts.delete(key);
        }
      }
      if (dates.length >= LIMIT_PER_IP) {
        json(res, 429, { ok: false, error: 'Too many applications from this connection. Please try again later.' }, { ...baseHeaders, 'Retry-After': '600' });
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) {
          json(res, 413, { ok: false, error: 'Application is too long.' }, baseHeaders);
          return;
        }
        chunks.push(chunk);
      }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch (_) { json(res, 400, { ok: false, error: 'Invalid application format.' }, baseHeaders); return; }
      if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
        json(res, 400, { ok: false, error: 'Invalid application format.' }, baseHeaders); return;
      }
      if (payload.website) { // Honeypot: bots fill this invisible field.
        json(res, 200, { ok: true }, baseHeaders);
        return;
      }
      const callsign = cleanField(payload.callsign, 50, true);
      const discordHandle = cleanField(payload.discordHandle, 60);
      const regiment = cleanField(payload.regiment, 60, true);
      const experience = cleanField(payload.experience, 30, true);
      const availability = cleanField(payload.availability, 100);
      const motivation = cleanField(payload.motivation, 1200, true);
      if ([callsign, discordHandle, regiment, experience, availability, motivation].some(x => x === null)
        || !ALLOWED_REGIMENTS.has(regiment) || !ALLOWED_EXPERIENCE.has(experience)) {
        json(res, 400, { ok: false, error: 'Please check the form fields and try again.' }, baseHeaders);
        return;
      }
      if (!webhookUrl) {
        json(res, 503, { ok: false, error: 'Recruitment delivery is not configured yet. Contact RHMF staff on Discord.' }, baseHeaders);
        return;
      }
      let destination;
      try {
        destination = new URL(webhookUrl);
        if (destination.protocol !== 'https:' || destination.hostname !== 'discord.com'
          || !/^\/api\/webhooks\/\d+\/[A-Za-z0-9_.-]+$/.test(destination.pathname)) throw new Error('Invalid webhook');
        destination.searchParams.set('wait', 'true');
      } catch (_) {
        json(res, 503, { ok: false, error: 'Recruitment delivery is not configured correctly. Contact RHMF staff.' }, baseHeaders);
        return;
      }
      dates.push(now); attempts.set(ip, dates);
      const msg = {
        username: 'RHMF Recruitment',
        allowed_mentions: { parse: [] },
        embeds: [{
          title: '📋 New RHMF Recruitment Application',
          color: 0xb51f24,
          description: motivation,
          fields: [
            { name: 'Roblox username / Callsign', value: callsign },
            { name: 'Discord handle', value: discordHandle || 'Not provided', inline: true },
            { name: 'Preferred regiment', value: regiment, inline: true },
            { name: 'BRM5 experience', value: experience, inline: true },
            { name: 'Usual play time', value: availability || 'Not provided' },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: 'Red Horizon Military Force • Website recruitment' },
        }],
      };
      try {
        const response = await discordFetch(destination.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          json(res, 502, { ok: false, error: 'Discord did not accept the application. Please contact RHMF staff or try later.' }, baseHeaders);
          return;
        }
      } catch (_) {
        json(res, 502, { ok: false, error: 'Discord delivery could not be confirmed. Please contact RHMF staff or try later.' }, baseHeaders);
        return;
      }
      json(res, 200, { ok: true }, baseHeaders);
    } catch (error) {
      console.error('Request handling failed:', error instanceof Error ? error.message : 'Unknown error');
      if (!res.headersSent) json(res, 500, { ok: false, error: 'Server error. Please try again later.' }, baseHeaders);
      else res.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  createAppServer().listen(port, host, () => {
    console.log(`RHMF site ready: http://localhost:${port}`);
    console.log(process.env.DISCORD_WEBHOOK_URL ? 'Discord webhook configured (value hidden).' : 'Discord webhook NOT configured. Add DISCORD_WEBHOOK_URL to .env.');
  });
}
