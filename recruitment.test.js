import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAppServer } from '../server.js';

const dummyWebhook = 'https://discord.com/api/webhooks/1234567890/dummy_token_for_local_tests';
const valid = {
  callsign: 'RangerOne', discordHandle: 'RangerOne',
  regiment: '48th Ranger Regiment', experience: 'Some experience',
  availability: 'Weekends (CET)', motivation: 'I enjoy coordinated BRM5 missions with friends.', website: ''
};

async function withServer(opts, cb) {
  const server = createAppServer(opts);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await cb(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())); }
}

const apply = (base, value = valid, options = {}) => fetch(`${base}/api/apply`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers }, body: JSON.stringify(value)
});

test('front page serves all original content and SUPERVISOR labels', async () => {
  await withServer({ webhookUrl: dummyWebhook }, async base => {
    const resp = await fetch(base);
    const html = await resp.text();
    assert.equal(resp.status, 200);
    assert.ok(html.includes('Discord Dispatch'));
    assert.ok(html.includes('SEND APPLICATION TO DISCORD'));
    assert.ok(html.includes('https://discord.gg/nuJADnwtdk'));
    assert.ok(html.includes('SUPERVISOR'));
    assert.ok(!html.includes('NON-COMMISSIONED'));
    assert.ok(!html.includes(dummyWebhook));
  });
});

test('valid form is forwarded to Discord with mentions disabled', async () => {
  const requests = [];
  await withServer({ webhookUrl: dummyWebhook, discordFetch: async (url, options) => {
    requests.push({ url, payload: JSON.parse(options.body) });
    return { ok: true };
  } }, async base => {
    const resp = await apply(base, { ...valid, motivation: 'Looking forward to playing with @everyone' });
    assert.equal(resp.status, 200);
    assert.deepEqual(await resp.json(), { ok: true });
  });
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.endsWith('?wait=true'));
  assert.deepEqual(requests[0].payload.allowed_mentions, { parse: [] });
  assert.equal(requests[0].payload.embeds[0].fields[0].value, 'RangerOne');
  assert.ok(requests[0].payload.embeds[0].description.includes('@everyone'));
});

test('invalid regiment is rejected and not forwarded', async () => {
  let count = 0;
  await withServer({ webhookUrl: dummyWebhook, discordFetch: async () => { count++; return { ok: true }; } }, async base => {
    const resp = await apply(base, { ...valid, regiment: 'not a real regiment' });
    assert.equal(resp.status, 400);
    assert.equal((await resp.json()).ok, false);
  });
  assert.equal(count, 0);
});

test('missing webhook configuration is reported, never claimed as sent', async () => {
  await withServer({ webhookUrl: '' }, async base => {
    const resp = await apply(base);
    assert.equal(resp.status, 503);
    assert.equal((await resp.json()).ok, false);
  });
});

test('Discord error is not reported as success', async () => {
  await withServer({ webhookUrl: dummyWebhook, discordFetch: async () => ({ ok: false }) }, async base => {
    const resp = await apply(base);
    assert.equal(resp.status, 502);
    assert.equal((await resp.json()).ok, false);
  });
});

test('other origin is blocked', async () => {
  await withServer({ webhookUrl: dummyWebhook }, async base => {
    const resp = await apply(base, valid, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(resp.status, 403);
  });
});

test('limits to eight requests per 10 minutes from one IP', async () => {
  let count = 0;
  await withServer({ webhookUrl: dummyWebhook, discordFetch: async () => { count++; return { ok: true }; } }, async base => {
    for (let i = 0; i < 8; i++) assert.equal((await apply(base)).status, 200);
    assert.equal((await apply(base)).status, 429);
  });
  assert.equal(count, 8);
});

test('existing HTML is a complete stand-alone page', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['home','about','units','ranks','identity','operations','training','code','intel','discord','stats','faq','recruit']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.equal((html.match(/id="discord"/g) || []).length, 1);
});


test('out-of-box webhook is configured server-side and not included in HTML', async () => {
  let delivered = false;
  await withServer({ discordFetch: async (url, options) => {
    delivered = true;
    assert.ok(url.startsWith('https://discord.com/api/webhooks/'));
    assert.equal(options.method, 'POST');
    return { ok: true };
  } }, async base => {
    const response = await apply(base);
    assert.equal(response.status, 200);
    const home = await (await fetch(base)).text();
    assert.ok(!home.includes('/api/webhooks/'));
  });
  assert.equal(delivered, true);
});

test('Render health endpoint returns OK', async () => {
  await withServer({ webhookUrl: '' }, async base => {
    const response = await fetch(base + '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});
