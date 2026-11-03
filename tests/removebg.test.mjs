import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/removebg.js';
import { onRequest as authRequest } from '../functions/api/auth.js';

const bytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

function database() {
  const values = new Map();
  const db = {
    values,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              assert.match(sql, /^INSERT INTO usage_counters/);
              const [scope, token, period, limit] = args;
              const key = [scope, token, period].join('|');
              const current = values.get(key) || 0;
              if (current >= limit) return null;
              values.set(key, current + 1);
              return { used: current + 1 };
            },
            async run() {
              assert.match(sql, /^UPDATE usage_counters SET used = used - 1/);
              const [scope, token, period] = args;
              const key = [scope, token, period].join('|');
              values.set(key, Math.max(0, (values.get(key) || 0) - 1));
              return { success: true };
            },
          };
        },
      };
    },
  };
  return db;
}

function upload(ip = '203.0.113.1', content = bytes, type = 'image/png') {
  const form = new FormData();
  const image = new File([content], 'image.png', { type });
  form.append('image', image);
  return new Request('https://example.test/api/removebg', {
    method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: form,
  });
}

function env(db = database()) {
  return { DB: db, REMOVE_BG_API_KEY: 'unit-test-only-secret' };
}

async function withFetch(fake, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try { return await fn(); } finally { globalThis.fetch = original; }
}

const success = async () => new Response(bytes, {
  status: 200, headers: { 'Content-Type': 'image/png' },
});

test('rejects non-POST without invoking paid upstream', async () => {
  await withFetch(() => { throw Error('unexpected call'); }, async () => {
    const r = await onRequest({ request: new Request('https://example.test/api/removebg'), env: env() });
    assert.equal(r.status, 405);
    assert.equal(r.headers.get('allow'), 'POST');
  });
});

test('fails closed if API key or D1 binding is absent', async () => {
  await withFetch(() => { throw Error('unexpected call'); }, async () => {
    const missingDB = await onRequest({ request: upload(), env: { REMOVE_BG_API_KEY: 'key' } });
    const missingKey = await onRequest({ request: upload(), env: { DB: database() } });
    assert.equal(missingDB.status, 503);
    assert.equal(missingKey.status, 503);
  });
});

test('requires a trusted Cloudflare IP header', async () => {
  const form = new FormData();
  form.append('image', new File([bytes], 'image.png', { type: 'image/png' }));
  const request = new Request('https://example.test/api/removebg', { method: 'POST', body: form });
  const response = await onRequest({ request, env: env() });
  assert.equal(response.status, 403);
});

test('rejects a forged MIME type without calling upstream', async () => {
  await withFetch(() => { throw Error('unexpected call'); }, async () => {
    const response = await onRequest({ request: upload('203.0.113.1', 'not a png', 'image/png'), env: env() });
    assert.equal(response.status, 415);
  });
});

test('bounds per-IP daily usage to three upstream attempts', async () => {
  const e = env();
  let called = 0;
  await withFetch(async () => { called++; return success(); }, async () => {
    for (let i = 0; i < 3; i++) {
      const res = await onRequest({ request: upload(), env: e });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Cache-Control'), 'no-store');
    }
    const fourth = await onRequest({ request: upload(), env: e });
    assert.equal(fourth.status, 429);
    assert.equal(called, 3);
  });
});

test('bounds global monthly upstream attempts across many IPs', async () => {
  const e = env();
  let called = 0;
  await withFetch(async () => { called++; return success(); }, async () => {
    for (let i = 1; i <= 40; i++) {
      const res = await onRequest({ request: upload('198.51.100.' + i), env: e });
      assert.equal(res.status, 200, 'request #' + i);
    }
    const limited = await onRequest({ request: upload('198.51.100.41'), env: e });
    assert.equal(limited.status, 429);
    assert.equal(called, 40);
  });
});

test('counts upstream errors toward the cost budget to prevent retry abuse', async () => {
  const e = env();
  let called = 0;
  await withFetch(async () => {
    called++;
    return new Response('bad', { status: 500 });
  }, async () => {
    for (let i = 0; i < 3; i++) {
      const res = await onRequest({ request: upload(), env: e });
      assert.equal(res.status, 502);
      assert.doesNotMatch(await res.text(), /bad|secret/i);
    }
    const blocked = await onRequest({ request: upload(), env: e });
    assert.equal(blocked.status, 429);
    assert.equal(called, 3);
  });
});

test('legacy Google JWT endpoint is disabled, not decoded', async () => {
  const r = await authRequest({ request: new Request('https://example.test/api/auth', { method: 'POST' }) });
  assert.equal(r.status, 503);
});
