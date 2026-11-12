const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, authenticate } = require('../middleware/auth');
const { HttpError, str, check } = require('../utils/validate');

router.post('/login', async (req, res) => {
  const username = str(req.body.username), password = req.body.password || '';
  check([!username && 'Username is required', !password && 'Password is required']);
  const [[user]] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new HttpError(401, 'Incorrect username or password.');
  res.json({ token: sign(user), user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
