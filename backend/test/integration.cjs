// Creates and drops its own randomly named database; never uses the application database.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

test('full API workflow against isolated MySQL database', async (t) => {
  const database = `batloung_test_${crypto.randomBytes(8).toString('hex')}`;
  const control = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true });
  let server, db;
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8').replace(/CREATE DATABASE batloung_fruits/g, `CREATE DATABASE ${database}`).replace(/USE batloung_fruits/g, `USE ${database}`);
    await control.query(schema);
    process.env.DB_NAME = database;
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    db = require('../db');
    const password = crypto.randomBytes(18).toString('hex');
    for (const [u, role] of [['admin', 'Administrator'], ['sales', 'Sales']]) await db.query('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)', [u, await bcrypt.hash(password, 4), role]);
    const { app } = require('../server');
    server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(url, method = 'GET', body, token) {
      const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: r.status, body: await r.json() };
    }
    const admin = (await call('/auth/login', 'POST', { username: 'admin', password })).body.token;
    const sales = (await call('/auth/login', 'POST', { username: 'sales', password })).body.token;
    assert.ok(admin); assert.ok(sales);
    const a = (url, method, body) => call(url, method, body, admin);
    const sa = (url, method, body) => call(url, method, body, sales);
    const products = (await a('/products')).body;
    const apple = products.find((p) => p.fruit_name === 'Apples' && p.size_name === 'Small');
    const supplier = (await a('/suppliers')).body.find((s) => s.province === 'Western Cape');
    const vendor = (await a('/vendors')).body[0];
    const date = '2026-11-05';
    const stock = async () => (await a('/stock')).body.find((s) => s.product_id === apple.id).quantity;
    const order = (quantity, extra = {}) => a('/orders', 'POST', { vendor_id: vendor.id, order_date: date, items: [{ product_id: apple.id, quantity, ...extra }] });
    await t.test('authentication and Sales restrictions', async () => {
      assert.equal((await call('/orders')).status, 401);
      for (const url of ['/suppliers', '/reports/stock']) assert.equal((await sa(url)).status, 403);
      assert.equal((await sa('/stock', 'POST', {})).status, 403);
    });
    await t.test('five fruits, nine provinces, three sizes, fifteen products', async () => {
      assert.equal(products.length, 15);
      for (const [url, n] of [['/fruits', 5], ['/provinces', 9], ['/box-sizes', 3]]) assert.equal((await a(url)).body.length, n);
    });
    await t.test('reactivation preserves products and prices; active duplicates rejected', async () => {
      assert.equal((await a(`/fruits/${apple.fruit_id}`, 'PUT', { name: 'Apples', is_active: false })).status, 200);
      assert.equal((await a('/fruits', 'POST', { name: 'Apples', description: 'Reactivated' })).status, 200);
      const list = (await a('/products')).body;
      assert.equal(list.length, 15);
      assert.equal(list.find((p) => p.id === apple.id).selling_price, apple.selling_price);
      assert.equal((await a('/fruits', 'POST', { name: 'Apples' })).status, 409);
      assert.equal((await a('/fruits', 'POST', { name: 'Pineapples' })).status, 400);
    });
    await t.test('adding a missing permitted fruit creates sizes, stock and sourcing links', async () => {
      await db.query('DELETE FROM products WHERE fruit_id = ?', [apple.fruit_id]);
      await db.query('DELETE FROM fruits WHERE id = ?', [apple.fruit_id]);
      assert.equal((await a('/fruits', 'POST', { name: 'Apples' })).status, 201);
      const list = (await a('/products')).body; assert.equal(list.length, 15);
      Object.assign(apple, list.find((p) => p.fruit_name === 'Apples' && p.size_name === 'Small'));
      assert.equal((await a(`/fruits/${apple.fruit_id}`)).body.source_provinces.length, 3);
      assert.equal(await stock(), 0);
    });
    await t.test('purchase updates stock and history atomically', async () => {
      const body = { supplier_id: supplier.id, product_id: apple.id, quantity_boxes: 20, unit_cost: 30, purchase_date: date };
      assert.equal((await a('/stock', 'POST', body)).status, 201);
      assert.equal(await stock(), 20);
      assert.equal((await a('/stock/purchases')).body.length, 1);
      assert.equal((await a('/stock', 'POST', { ...body, quantity_boxes: -1 })).status, 400);
      assert.equal(await stock(), 20);
    });
    await t.test('invalid orders rejected; totals use database price', async () => {
      for (const qty of [0, -2, 1.5, 21]) assert.equal((await order(qty)).status, 400);
      assert.equal((await a('/orders')).body.length, 0);
      const r = await order(2, { unit_price: 0.01 });
      assert.equal(r.status, 201); assert.equal(r.body.total_amount, apple.selling_price * 2);
      assert.equal(await stock(), 20);
    });
    await t.test('sequential statuses; admin completion deducts once; cancellation does not', async () => {
      const r = await order(3); const id = r.body.id;
      assert.equal((await a(`/orders/${id}`, 'PUT', { status: 'Completed' })).status, 409);
      for (const status of ['Confirmed', 'Processing', 'Ready for Collection/Delivery']) assert.equal((await sa(`/orders/${id}`, 'PUT', { status })).status, 200);
      assert.equal((await sa(`/orders/${id}`, 'PUT', { status: 'Completed' })).status, 403);
      assert.equal((await a(`/orders/${id}`, 'PUT', { status: 'Completed' })).status, 200);
      assert.equal(await stock(), 17);
      assert.equal((await a(`/orders/${id}`, 'PUT', { status: 'Completed' })).status, 409);
      assert.equal(await stock(), 17);
      const cancel = await order(2);
      assert.equal((await a(`/orders/${cancel.body.id}`, 'PUT', { status: 'Cancelled' })).status, 200);
      assert.equal(await stock(), 17);
      assert.equal((await a('/orders')).body.find((o) => o.id === id).box_sizes, 'Small');
      assert.equal((await a(`/orders/${id}`)).body.items[0].subtotal, apple.selling_price * 3);
    });
    await t.test('all reports and dashboard reflect completed sales', async () => {
      const names = (await a('/reports')).body; assert.equal(names.length, 8);
      for (const name of names) assert.equal((await a(`/reports/${name}`)).status, 200);
      const d = (await a('/dashboard')).body;
      assert.equal(d.availableStock, 17); assert.equal(d.completedOrders, 1); assert.equal(d.salesValue, apple.selling_price * 3);
    });
    await t.test('setup generates unique private passwords and supports explicit credential rotation', async () => {
      const os = require('node:os');
      const { spawnSync } = require('node:child_process');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'batloung-setup-'));
      try {
        fs.mkdirSync(path.join(dir, 'scripts'));
        fs.copyFileSync(path.join(__dirname, '../scripts/setup.js'), path.join(dir, 'scripts/setup.js'));
        fs.copyFileSync(path.join(__dirname, '../db.js'), path.join(dir, 'db.js'));
        const envText = `DB_HOST=${process.env.DB_HOST || 'localhost'}\nDB_PORT=${process.env.DB_PORT || 3306}\nDB_USER=${process.env.DB_USER || 'root'}\nDB_PASSWORD=${JSON.stringify(process.env.DB_PASSWORD || '')}\nDB_NAME=${database}\nJWT_SECRET=\n`;
        fs.writeFileSync(path.join(dir, '.env'), envText);
        await db.query('DELETE FROM users');
        const run = (args = []) => {
          const r = spawnSync(process.execPath, [path.join(dir, 'scripts/setup.js'), ...args], { env: { ...process.env, NODE_PATH: path.join(__dirname, '../node_modules') }, encoding: 'utf8' });
          assert.equal(r.status, 0, r.stderr);
        };
        run();
        const credentials = fs.readFileSync(path.join(dir, '.local-accounts.txt'), 'utf8');
        const lines = credentials.trim().split('\n');
        assert.equal(lines.length, 2);
        const passwords = lines.map((line) => line.split(': ')[1]);
        assert.notEqual(passwords[0], passwords[1]);
        assert.ok(passwords.every((p) => p.length >= 24));
        const [users] = await db.query('SELECT username, password_hash FROM users ORDER BY id');
        for (const user of users) assert.ok(await bcrypt.compare(lines.find((l) => l.startsWith(user.username + ': ')).split(': ')[1], user.password_hash));
        const firstEnv = fs.readFileSync(path.join(dir, '.env'), 'utf8');
        assert.match(firstEnv, /JWT_SECRET=[0-9a-f]{96}/);
        run(); assert.equal(fs.readFileSync(path.join(dir, '.local-accounts.txt'), 'utf8'), credentials);
        run(['--reset-users']);
        assert.notEqual(fs.readFileSync(path.join(dir, '.env'), 'utf8'), firstEnv);
        assert.notEqual(fs.readFileSync(path.join(dir, '.local-accounts.txt'), 'utf8'), credentials);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.end();
    await control.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await control.end();
  }
});
