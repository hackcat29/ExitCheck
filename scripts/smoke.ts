import assert from 'node:assert/strict';
const base = process.env.EXITCHECK_URL ?? 'http://127.0.0.1:3000';
for (const route of ['/', '/api/health']) {
  const r = await fetch(base + route);
  assert.equal(r.status, 200, route);
}
const r = await fetch(base + '/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mode: 'demo', obligation: '5000' }),
});
assert.equal(r.status, 200);
const result = await r.json();
assert.equal(result.envelope.report.snapshot.mode, 'demo');
assert.equal(result.stress.length, 4);
const verify = await fetch(base + '/api/verify', {
  method: 'POST',
  body: JSON.stringify(result.envelope),
});
assert.equal((await verify.json()).valid, true);
result.envelope.report.result.minimumProceeds = '999999999999';
const altered = await fetch(base + '/api/verify', {
  method: 'POST',
  body: JSON.stringify(result.envelope),
});
assert.equal((await altered.json()).valid, false);
const invalid = await fetch(base + '/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ mode: 'demo', obligation: '0' }),
});
assert.equal(invalid.status, 422);
console.log(
  'Core routes, analysis, verification and invalid-input smoke checks passed.',
);
