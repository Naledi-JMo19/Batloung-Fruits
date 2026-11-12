// Run explicitly after importing schema.sql. Creates private credentials locally.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) fs.copyFileSync(path.join(root, '.env.example'), envPath);
let env = fs.readFileSync(envPath, 'utf8');
const parsed = dotenv.parse(env);
const reset = process.argv.includes('--reset-users');
if (reset || !parsed.JWT_SECRET || parsed.JWT_SECRET.length < 64 || /change-this|dev-only/i.test(parsed.JWT_SECRET)) {
  const line = `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`;
  env = /^JWT_SECRET=.*$/m.test(env) ? env.replace(/^JWT_SECRET=.*$/m, line) : `${env}\n${line}\n`;
  fs.writeFileSync(envPath, env, { mode: 0o600 });
}
dotenv.config({ path: envPath, override: true });
const db = require('../db');
const bcrypt = require('bcryptjs');
async function main() {
  const conn = await db.getConnection();
  const filename = path.join(root, '.local-accounts.txt');
  try {
    await conn.beginTransaction();
    const credentials = [];
    for (const [username, role] of [['admin', 'Administrator'], ['sales', 'Sales']]) {
      const [[old]] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
      if (old && !reset) continue;
      const password = crypto.randomBytes(18).toString('base64url');
      const hash = await bcrypt.hash(password, 12);
      if (old) await conn.query('UPDATE users SET password_hash = ?, role = ? WHERE id = ?', [hash, role, old.id]);
      else await conn.query('INSERT INTO users (username, password_hash, role) VALUES (?,?,?)', [username, hash, role]);
      credentials.push(`${username}: ${password}`);
    }
    if (credentials.length) {
      // Do not print passwords to logs or ship this generated file.
      const previous = !reset && fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
      fs.writeFileSync(filename, `${previous}${credentials.join('\n')}\n`, { mode: 0o600 });
    }
    await conn.commit();
    console.log(credentials.length ? 'Accounts created. Open backend/.local-accounts.txt for your unique passwords. Keep this file private.' : 'Accounts already exist. Existing passwords were preserved.');
    console.log('JWT signing secret configured. Start the API with npm start.');
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
main().catch((e) => { console.error('Setup failed:', e.message, '\nCheck backend/.env and import database/schema.sql first.'); process.exitCode = 1; }).finally(() => db.end());
