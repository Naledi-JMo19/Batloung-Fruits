const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { STATUSES, HttpError, isPosInt, isDate, check } = require('../utils/validate');

const A = authorize('Administrator');
const AS = authorize('Administrator', 'Sales');

const { canMove, SALES_ALLOWED } = require('../utils/orderFlow');

router.get('/', AS, async (_req, res) => {
  const [rows] = await db.query(`
    SELECT o.id, o.vendor_id, v.vendor_name, v.business_name, o.order_date, o.total_amount, o.status,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
           (SELECT GROUP_CONCAT(DISTINCT f.name ORDER BY f.name SEPARATOR ', ') FROM order_items oi
              JOIN products p ON p.id = oi.product_id JOIN fruits f ON f.id = p.fruit_id WHERE oi.order_id = o.id) AS fruits,
           (SELECT GROUP_CONCAT(DISTINCT b.size_name ORDER BY b.id SEPARATOR ',') FROM order_items oi
              JOIN products p ON p.id = oi.product_id JOIN box_sizes b ON b.id = p.box_size_id WHERE oi.order_id = o.id) AS box_sizes
    FROM orders o JOIN street_vendors v ON v.id = o.vendor_id ORDER BY o.id DESC`);
  res.json(rows);
});

router.get('/:id', AS, async (req, res) => {
  const [[order]] = await db.query(
    'SELECT o.*, v.vendor_name, v.business_name FROM orders o JOIN street_vendors v ON v.id = o.vendor_id WHERE o.id = ?', [req.params.id]);
  if (!order) throw new HttpError(404, 'Order not found');
  const [items] = await db.query(`
    SELECT oi.id, oi.product_id, f.name AS fruit_name, b.size_name, oi.quantity, oi.unit_price, oi.subtotal
    FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id
    WHERE oi.order_id = ?`, [order.id]);
  res.json({ ...order, items });
});

router.post('/', AS, async (req, res) => {
  const { vendor_id, order_date, items } = req.body;
  check([!isPosInt(vendor_id) && 'Choose a registered street vendor', !isDate(order_date) && 'Enter a valid order date',
         (!Array.isArray(items) || items.length === 0) && 'An order must contain at least one item']);
  // merge duplicate products, validate quantities
  const wanted = new Map();
  for (const it of items) {
    check([!isPosInt(it.product_id) && 'Each item needs a product', !isPosInt(it.quantity) && 'Quantity ordered must be a whole number above zero']);
    wanted.set(Number(it.product_id), (wanted.get(Number(it.product_id)) || 0) + Number(it.quantity));
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[vendor]] = await conn.query('SELECT id, status FROM street_vendors WHERE id = ?', [vendor_id]);
    if (!vendor) throw new HttpError(400, 'Vendor is not registered');
    if (vendor.status !== 'Active') throw new HttpError(400, 'Vendor is inactive');

    const lines = []; let total = 0;
    for (const [productId, qty] of wanted) {
      // Price and availability always come from the database, never from the browser.
      const [[p]] = await conn.query(`
        SELECT p.id, p.selling_price, f.name AS fruit_name, f.is_active, b.size_name, COALESCE(s.quantity, 0) AS available
        FROM products p JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id LEFT JOIN stock s ON s.product_id = p.id
        WHERE p.id = ?`, [productId]);
      if (!p) throw new HttpError(400, `Product ${productId} does not exist`);
      if (!p.is_active) throw new HttpError(400, `${p.fruit_name} is not currently sold`);
      if (qty > p.available) throw new HttpError(400, `Only ${p.available} boxes of ${p.fruit_name} (${p.size_name}) are in stock — you asked for ${qty}`);
      const subtotal = Math.round(qty * p.selling_price * 100) / 100;
      total += subtotal; lines.push([productId, qty, p.selling_price, subtotal]);
    }
    const [o] = await conn.query('INSERT INTO orders (vendor_id, order_date, total_amount, status, created_by) VALUES (?,?,?,?,?)',
      [vendor_id, order_date, Math.round(total * 100) / 100, 'Pending', req.user.id]);
    for (const l of lines) await conn.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)', [o.insertId, ...l]);
    await conn.commit();
    res.status(201).json({ id: o.insertId, total_amount: total, message: 'Order placed' });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
});

router.put('/:id', AS, async (req, res) => {
  const { status } = req.body;
  check([!STATUSES.includes(status) && `Status must be one of: ${STATUSES.join(', ')}`]);
  if (req.user.role === 'Sales' && !SALES_ALLOWED.includes(status)) throw new HttpError(403, 'Only an Administrator can mark an order as Completed.');

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [req.params.id]);
    if (!order) throw new HttpError(404, 'Order not found');
    if (!canMove(order.status, status)) throw new HttpError(409, `An order that is "${order.status}" cannot be changed to "${status}".`);

    if (status === 'Completed') {
      // Completing an order deducts stock; refuse if stock has dropped below what was ordered.
      const [items] = await conn.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
      for (const it of items) {
        const [[s]] = await conn.query('SELECT quantity FROM stock WHERE product_id = ? FOR UPDATE', [it.product_id]);
        if (!s || s.quantity < it.quantity) throw new HttpError(409, 'Not enough stock left to complete this order.');
        await conn.query('UPDATE stock SET quantity = quantity - ? WHERE product_id = ?', [it.quantity, it.product_id]);
      }
    }
    // Cancelled orders never touch stock.
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
    await conn.commit();
    res.json({ message: `Order is now ${status}` });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
});

router.delete('/:id', A, async (req, res) => {
  const [[order]] = await db.query('SELECT status FROM orders WHERE id = ?', [req.params.id]);
  if (!order) throw new HttpError(404, 'Order not found');
  if (!['Pending', 'Cancelled'].includes(order.status)) throw new HttpError(409, 'Only Pending or Cancelled orders can be deleted.');
  await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]); // order_items removed by ON DELETE CASCADE
  res.json({ message: 'Order deleted' });
});

module.exports = router;
