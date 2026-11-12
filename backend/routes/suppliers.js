const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { PROVINCES, HttpError, str, isEmail, isPhone, check } = require('../utils/validate');

const A = authorize('Administrator');
const SELECT = `SELECT s.id, s.supplier_name, s.province_id, p.name AS province, s.contact_person, s.telephone, s.email, s.physical_address
                FROM suppliers s JOIN provinces p ON p.id = s.province_id`;

async function parse(body) {
  const d = {
    supplier_name: str(body.supplier_name), province: str(body.province), contact_person: str(body.contact_person),
    telephone: str(body.telephone), email: str(body.email), physical_address: str(body.physical_address),
  };
  check([
    !d.supplier_name && 'Supplier name is required',
    !PROVINCES.includes(d.province) && 'Choose one of the nine South African provinces',
    !d.contact_person && 'Contact person is required',
    !isPhone(d.telephone) && 'Enter a valid telephone number',
    !isEmail(d.email) && 'Enter a valid email address',
    !d.physical_address && 'Physical address is required',
  ]);
  const [[p]] = await db.query('SELECT id FROM provinces WHERE name = ?', [d.province]);
  return { ...d, province_id: p.id };
}

router.get('/', A, async (_req, res) => { const [rows] = await db.query(`${SELECT} ORDER BY s.supplier_name`); res.json(rows); });

router.get('/:id', A, async (req, res) => {
  const [[row]] = await db.query(`${SELECT} WHERE s.id = ?`, [req.params.id]);
  if (!row) throw new HttpError(404, 'Supplier not found');
  res.json(row);
});

router.post('/', A, async (req, res) => {
  const d = await parse(req.body);
  const [r] = await db.query(
    'INSERT INTO suppliers (supplier_name, province_id, contact_person, telephone, email, physical_address) VALUES (?,?,?,?,?,?)',
    [d.supplier_name, d.province_id, d.contact_person, d.telephone, d.email, d.physical_address]);
  res.status(201).json({ id: r.insertId, message: 'Supplier added' });
});

router.put('/:id', A, async (req, res) => {
  const d = await parse(req.body);
  const [r] = await db.query(
    'UPDATE suppliers SET supplier_name=?, province_id=?, contact_person=?, telephone=?, email=?, physical_address=? WHERE id=?',
    [d.supplier_name, d.province_id, d.contact_person, d.telephone, d.email, d.physical_address, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Supplier not found');
  res.json({ message: 'Supplier updated' });
});

router.delete('/:id', A, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Supplier not found');
    res.json({ message: 'Supplier deleted' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new HttpError(409, 'This supplier has recorded purchases and cannot be deleted.');
    throw e;
  }
});

module.exports = router;
