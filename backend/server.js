require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { authenticate, authorize } = require('./middleware/auth');
const { HttpError } = require('./utils/validate');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Public
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { error: 'Too many login attempts. Try again later.' } }));
app.use('/api/auth', require('./routes/auth'));

// Everything below needs a valid token. Role checks are inside each route file.
app.use('/api', authenticate);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/fruits', authorize('Administrator', 'Sales'), require('./routes/fruits'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api', authorize('Administrator', 'Sales'), require('./routes/catalog')); // /box-sizes, /products, /provinces

app.use((_req, _res, next) => next(new HttpError(404, 'Route not found')));

// Central error handler: consistent JSON + correct HTTP status codes
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, details: err.details });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
  switch (err.code) {
    case 'ER_DUP_ENTRY': return res.status(409).json({ error: 'A record with the same unique value already exists.' });
    case 'ER_NO_REFERENCED_ROW_2': return res.status(400).json({ error: 'A linked record (supplier, vendor, product...) does not exist.' });
    case 'ER_ROW_IS_REFERENCED_2': return res.status(409).json({ error: 'This record is in use by other records and cannot be removed.' });
    case 'ER_CHECK_CONSTRAINT_VIOLATED': case 'ER_CONSTRAINT_FAILED': return res.status(400).json({ error: 'A value breaks a database rule (e.g. negative or zero quantity).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Accounts are explicitly provisioned using npm run setup; no default credentials.
const PORT = process.env.PORT || 5000;
async function start() {
  await db.query('SELECT 1');
  const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM users');
  if (!n) throw new Error('No users found. Run npm run setup in backend first.');
  return app.listen(PORT, () => console.log(`Batloung API running on http://localhost:${PORT}`));
}
if (require.main === module) start().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { app, start };
