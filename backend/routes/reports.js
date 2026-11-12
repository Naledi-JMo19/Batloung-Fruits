const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { HttpError } = require('../utils/validate');

const SALES_FROM = `FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.status = 'Completed'
  JOIN products p ON p.id = oi.product_id JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id
  JOIN street_vendors v ON v.id = o.vendor_id`;

// "Sales" in every report means Completed orders only.
const REPORTS = {
  'stock': `SELECT f.name AS fruit, b.size_name AS box_size, s.quantity AS boxes_available, p.selling_price, (s.quantity * p.selling_price) AS stock_value
            FROM stock s JOIN products p ON p.id = s.product_id JOIN fruits f ON f.id = p.fruit_id JOIN box_sizes b ON b.id = p.box_size_id ORDER BY f.id, b.id`,
  'sales-by-fruit': `SELECT f.name AS fruit, SUM(oi.quantity) AS boxes_sold, SUM(oi.subtotal) AS sales_value ${SALES_FROM} GROUP BY f.id, f.name ORDER BY sales_value DESC`,
  'sales-by-box-size': `SELECT b.size_name AS box_size, SUM(oi.quantity) AS boxes_sold, SUM(oi.subtotal) AS sales_value ${SALES_FROM} GROUP BY b.id, b.size_name ORDER BY b.id`,
  'sales-by-vendor': `SELECT v.vendor_code, v.vendor_name, COUNT(DISTINCT o.id) AS orders, SUM(oi.quantity) AS boxes_bought, SUM(oi.subtotal) AS sales_value ${SALES_FROM} GROUP BY v.id, v.vendor_code, v.vendor_name ORDER BY sales_value DESC`,
  'purchases-by-province': `SELECT pr.name AS province, COUNT(pu.id) AS purchases, SUM(pu.quantity_boxes) AS boxes_bought, SUM(pu.quantity_boxes * pu.unit_cost) AS total_cost
            FROM purchases pu JOIN suppliers su ON su.id = pu.supplier_id JOIN provinces pr ON pr.id = su.province_id GROUP BY pr.id, pr.name ORDER BY total_cost DESC`,
  'pending-orders': `SELECT o.id AS order_id, v.vendor_name, o.order_date, o.total_amount, o.status FROM orders o JOIN street_vendors v ON v.id = o.vendor_id
            WHERE o.status NOT IN ('Completed','Cancelled') ORDER BY o.order_date, o.id`,
  'completed-orders': `SELECT o.id AS order_id, v.vendor_name, o.order_date, o.total_amount FROM orders o JOIN street_vendors v ON v.id = o.vendor_id
            WHERE o.status = 'Completed' ORDER BY o.order_date DESC, o.id DESC`,
  'sales-by-date': `SELECT o.order_date, COUNT(*) AS orders, SUM(o.total_amount) AS sales_value FROM orders o WHERE o.status = 'Completed' GROUP BY o.order_date ORDER BY o.order_date DESC`,
};

router.get('/', authorize('Administrator'), (_req, res) => res.json(Object.keys(REPORTS)));

router.get('/:name', authorize('Administrator'), async (req, res) => {
  const sql = REPORTS[req.params.name];
  if (!sql) throw new HttpError(404, 'Unknown report');
  const [rows] = await db.query(sql);
  res.json(rows);
});

module.exports = router;
