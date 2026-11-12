const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/validate');

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 64 || /change-this|dev-only/i.test(SECRET)) {
  throw new Error('Set JWT_SECRET to a random value of at least 64 characters. Run npm run setup in backend.');
}

const sign = (user) => jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '8h' });

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Authentication required. Please log in.');
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { throw new HttpError(401, 'Session expired or invalid. Please log in again.'); }
}

// authorize('Administrator') or authorize('Administrator','Sales')
const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) throw new HttpError(403, `Your role (${req.user.role}) is not allowed to do this.`);
  next();
};

module.exports = { sign, authenticate, authorize };
