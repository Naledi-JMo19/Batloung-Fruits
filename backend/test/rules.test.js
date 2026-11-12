const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { FLOW, canMove } = require('../utils/orderFlow');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const { authenticate, authorize, sign } = require('../middleware/auth');
test('orders progress one step; cancellation is allowed before completion', () => {
  for (let i = 0; i < FLOW.length - 1; i++) {
    assert.equal(canMove(FLOW[i], FLOW[i + 1]), true);
    assert.equal(canMove(FLOW[i], 'Cancelled'), true);
  }
  for (const [from, to] of [['Pending', 'Completed'], ['Confirmed', 'Ready for Collection/Delivery'], ['Processing', 'Confirmed'], ['Pending', 'Pending']]) assert.equal(canMove(from, to), false);
});
test('terminal or invalid statuses cannot change', () => {
  for (const from of ['Completed', 'Cancelled', 'invalid'])
    for (const to of [...FLOW, 'Cancelled']) assert.equal(canMove(from, to), false);
});
test('valid JWT required; roles enforced by API', () => {
  const req = { headers: { authorization: `Bearer ${sign({ id: 1, username: 'sales', role: 'Sales' })}` } };
  let next = false;
  authenticate(req, {}, () => { next = true; });
  assert.equal(next, true);
  assert.throws(() => authorize('Administrator')(req, {}, () => {}), (e) => e.status === 403);
  authorize('Sales')(req, {}, () => {});
  for (const headers of [{}, { authorization: 'Bearer altered' }]) assert.throws(() => authenticate({ headers }, {}, () => {}), (e) => e.status === 401);
});
test('server refuses missing or placeholder signing secrets', () => {
  const { spawnSync } = require('node:child_process');
  for (const secret of ['', 'dev-only-secret', 'change-this'.repeat(10)]) {
    const r = spawnSync(process.execPath, ['-e', "require('./middleware/auth')"], { cwd: require('node:path').join(__dirname, '..'), env: { ...process.env, JWT_SECRET: secret }, encoding: 'utf8' });
    assert.notEqual(r.status, 0); assert.match(r.stderr, /Set JWT_SECRET/);
  }
});
