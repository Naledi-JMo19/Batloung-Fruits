const router = require('express').Router();
const db = require('../db');

router.get('/', async (_req, res) => {
  const one = async (sql) => Object.values((await db.query(sql))[0][0])[0];
  const [totalFruits, totalSuppliers, totalVendors, availableStock, totalOrders, pendingOrders, completedOrders, salesValue] = await Promise.all([
    one('SELECT COUNT(*) FROM fruits WHERE is_active = 1'),
    one('SELECT COUNT(*) FROM suppliers'),
    one('SELECT COUNT(*) FROM street_vendors'),
    one('SELECT COALESCE(SUM(quantity),0) FROM stock'),
    one('SELECT COUNT(*) FROM orders'),
    one("SELECT COUNT(*) FROM orders WHERE status = 'Pending'"),
    one("SELECT COUNT(*) FROM orders WHERE status = 'Completed'"),
    one("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status = 'Completed'"),
  ]);
  const [fixed] = await db.query(`
    SELECT f.name AS fruit, COALESCE(SUM(CASE WHEN o.status='Completed' THEN oi.subtotal END),0) AS sales_value
    FROM fruits f LEFT JOIN products p ON p.fruit_id = f.id
    LEFT JOIN order_items oi ON oi.product_id = p.id LEFT JOIN orders o ON o.id = oi.order_id
    GROUP BY f.id, f.name ORDER BY f.id`);
  const [ordersByStatus] = await db.query('SELECT status, COUNT(*) AS count FROM orders GROUP BY status');
  const [stockByFruit] = await db.query(`
    SELECT f.name AS fruit, COALESCE(SUM(s.quantity),0) AS boxes FROM fruits f
    LEFT JOIN products p ON p.fruit_id = f.id LEFT JOIN stock s ON s.product_id = p.id GROUP BY f.id, f.name ORDER BY f.id`);
  res.json({ totalFruits, totalSuppliers, totalVendors, availableStock, totalOrders, pendingOrders, completedOrders, salesValue,
             salesByFruit: fixed, ordersByStatus, stockByFruit });
});

module.exports = router;
