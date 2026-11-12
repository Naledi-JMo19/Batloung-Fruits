// Box sizes, products (fruit + box size + price) and provinces
const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { HttpError, str, isPosNum, isPosInt, check } = require('../utils/validate');

const A = authorize('Administrator');

router.get('/provinces', async (_req, res) => { const [r] = await db.query('SELECT * FROM provinces ORDER BY name'); res.json(r); });

router.get('/box-sizes', async (_req, res) => { const [r] = await db.query('SELECT * FROM box_sizes ORDER BY id'); res.json(r); });

router.put('/box-sizes/:id', A, async (req, res) => {
  const description = str(req.body.description);
  check([!description && 'Description is required']);
  const [r] = await db.query('UPDATE box_sizes SET description = ? WHERE id = ?', [description, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Box size not found');
  res.json({ message: 'Box size updated' });
});

router.get('/products', async (_req, res) => {
  const [rows] = await db.query(`
    SELECT p.id, p.fruit_id, f.name AS fruit_name, f.is_active, p.box_size_id, b.size_name, p.selling_price, p.units_per_box
    FROM products p JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id
    ORDER BY f.id, b.id`);
  res.json(rows);
});

router.put('/products/:id', A, async (req, res) => {
  const { selling_price, units_per_box } = req.body;
  check([!isPosNum(selling_price) && 'Selling price must be greater than zero', !isPosInt(units_per_box) && 'Units per box must be a whole number above zero']);
  const [r] = await db.query('UPDATE products SET selling_price = ?, units_per_box = ? WHERE id = ?', [selling_price, units_per_box, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Product not found');
  res.json({ message: 'Product price updated' });
});

module.exports = router;
