const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { HttpError, isPosInt, isPosNum, isDate, check } = require('../utils/validate');

const A = authorize('Administrator');
const AS = authorize('Administrator', 'Sales');

router.get('/', AS, async (_req, res) => {
  const [rows] = await db.query(`
    SELECT s.id, s.product_id, s.quantity, s.updated_at, f.id AS fruit_id, f.name AS fruit_name, f.is_active,
           b.id AS box_size_id, b.size_name, p.selling_price
    FROM stock s JOIN products p ON p.id = s.product_id JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id
    ORDER BY f.id, b.id`);
  res.json(rows);
});

router.get('/purchases', A, async (_req, res) => {
  const [rows] = await db.query(`
    SELECT pu.id, pu.purchase_date, su.supplier_name, pr.name AS province, f.name AS fruit_name, b.size_name,
           pu.quantity_boxes, pu.unit_cost, (pu.quantity_boxes * pu.unit_cost) AS total_cost
    FROM purchases pu JOIN suppliers su ON su.id = pu.supplier_id JOIN provinces pr ON pr.id = su.province_id
    JOIN products p ON p.id = pu.product_id JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id
    ORDER BY pu.purchase_date DESC, pu.id DESC`);
  res.json(rows);
});

// Record incoming stock: saves the purchase AND adds the boxes to available stock in one transaction.
router.post('/', A, async (req, res) => {
  const { supplier_id, product_id, quantity_boxes, unit_cost, purchase_date } = req.body;
  check([
    !isPosInt(supplier_id) && 'Choose a supplier', !isPosInt(product_id) && 'Choose a fruit and box size',
    !isPosInt(quantity_boxes) && 'Quantity must be a whole number above zero',
    !isPosNum(unit_cost) && 'Cost per box must be above zero', !isDate(purchase_date) && 'Enter a valid purchase date',
  ]);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[supplier]] = await conn.query('SELECT id, province_id FROM suppliers WHERE id = ?', [supplier_id]);
    const [[product]] = await conn.query('SELECT p.id, p.fruit_id, f.name, f.is_active FROM products p JOIN fruits f ON f.id = p.fruit_id WHERE p.id = ?', [product_id]);
    if (!supplier) throw new HttpError(400, 'Supplier not found');
    if (!product) throw new HttpError(400, 'Product not found');
    if (!product.is_active) throw new HttpError(400, `${product.name} is deactivated`);
    const [[ok]] = await conn.query('SELECT 1 AS ok FROM fruit_source_provinces WHERE fruit_id = ? AND province_id = ?', [product.fruit_id, supplier.province_id]);
    if (!ok) throw new HttpError(400, `${product.name} cannot be sourced from this supplier's province. Check the fruit's source provinces.`);

    await conn.query('INSERT INTO purchases (supplier_id, product_id, quantity_boxes, unit_cost, purchase_date) VALUES (?,?,?,?,?)',
      [supplier_id, product_id, quantity_boxes, unit_cost, purchase_date]);
    await conn.query('UPDATE stock SET quantity = quantity + ? WHERE product_id = ?', [quantity_boxes, product_id]);
    await conn.commit();
    res.status(201).json({ message: 'Stock received and available stock updated' });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
});

// Manual stock correction (e.g. spoilage / recount)
router.put('/:id', A, async (req, res) => {
  const q = Number(req.body.quantity);
  check([!(Number.isInteger(q) && q >= 0) && 'Quantity must be a whole number, zero or more']);
  const [r] = await db.query('UPDATE stock SET quantity = ? WHERE id = ?', [q, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Stock record not found');
  res.json({ message: 'Stock level updated' });
});

module.exports = router;
