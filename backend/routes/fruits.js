const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { FRUITS, HttpError, str, check } = require('../utils/validate');

const A = authorize('Administrator');

function parse(body) {
  const name = str(body.name), description = str(body.description);
  check([
    !name && 'Fruit name is required',
    name && !FRUITS.includes(name) && `Only these fruits may be sold: ${FRUITS.join(', ')}`,
    description.length > 255 && 'Description must be 255 characters or fewer',
  ]);
  return { name, description: description || null };
}

router.get('/', async (_req, res) => {
  const [rows] = await db.query('SELECT * FROM fruits ORDER BY id');
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [[row]] = await db.query('SELECT * FROM fruits WHERE id = ?', [req.params.id]);
  if (!row) throw new HttpError(404, 'Fruit not found');
  const [provinces] = await db.query(
    'SELECT p.id, p.name FROM fruit_source_provinces fsp JOIN provinces p ON p.id = fsp.province_id WHERE fsp.fruit_id = ?', [row.id]);
  res.json({ ...row, source_provinces: provinces });
});

router.post('/', A, async (req, res) => {
  const { name, description } = parse(req.body);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[existing]] = await conn.query('SELECT id, is_active FROM fruits WHERE name = ? FOR UPDATE', [name]);
    if (existing?.is_active) throw new HttpError(409, 'This fruit is already active. Edit its existing record.');
    let id = existing?.id;
    if (id) await conn.query('UPDATE fruits SET description = ?, is_active = 1 WHERE id = ?', [description, id]);
    else {
      const [r] = await conn.query('INSERT INTO fruits (name, description) VALUES (?, ?)', [name, description]);
      id = r.insertId;
    }
    const sources = {
      Apples: ['Western Cape', 'Free State', 'Mpumalanga'],
      Bananas: ['Limpopo', 'KwaZulu-Natal', 'Mpumalanga'],
      Oranges: ['Limpopo', 'Mpumalanga', 'Eastern Cape'],
      Mangoes: ['Limpopo', 'Mpumalanga', 'KwaZulu-Natal'],
      Grapes: ['Western Cape', 'Northern Cape', 'Limpopo'],
    };
    for (const province of sources[name]) await conn.query(
      'INSERT IGNORE INTO fruit_source_provinces (fruit_id, province_id) SELECT ?, id FROM provinces WHERE name = ?', [id, province]);
    const base = { Apples: 60, Bananas: 45, Oranges: 50, Mangoes: 70, Grapes: 80 }[name];
    await conn.query(`INSERT INTO products (fruit_id, box_size_id, selling_price, units_per_box)
      SELECT ?, id, ROUND(? * CASE size_name WHEN 'Small' THEN 1 WHEN 'Medium' THEN 1.8 ELSE 2.6 END, 2),
      CASE size_name WHEN 'Small' THEN 20 WHEN 'Medium' THEN 40 ELSE 70 END FROM box_sizes b
      WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.fruit_id = ? AND p.box_size_id = b.id)`, [id, base, id]);
    await conn.query(`INSERT INTO stock (product_id, quantity) SELECT p.id, 0 FROM products p
      WHERE p.fruit_id = ? AND NOT EXISTS (SELECT 1 FROM stock s WHERE s.product_id = p.id)`, [id]);
    await conn.commit();
    res.status(existing ? 200 : 201).json({ id, message: existing ? 'Fruit reactivated' : 'Fruit added with three box sizes' });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
});

router.put('/:id', A, async (req, res) => {
  const { name, description } = parse(req.body);
  const [[current]] = await db.query('SELECT name FROM fruits WHERE id = ?', [req.params.id]);
  if (!current) throw new HttpError(404, 'Fruit not found');
  if (current.name !== name) throw new HttpError(400, 'Fruit names identify the fixed catalogue and cannot be renamed.');
  const is_active = req.body.is_active === undefined ? 1 : (req.body.is_active ? 1 : 0);
  const [r] = await db.query('UPDATE fruits SET name=?, description=?, is_active=? WHERE id=?', [name, description, is_active, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Fruit not found');
  res.json({ message: 'Fruit updated' });
});

// Hard delete only works if nothing references the fruit (FK RESTRICT); otherwise deactivate instead.
router.delete('/:id', A, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM fruits WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Fruit not found');
    res.json({ message: 'Fruit deleted' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new HttpError(409, 'This fruit has products, purchases or orders linked to it. Deactivate it instead of deleting.');
    throw e;
  }
});

module.exports = router;
