const router = require('express').Router();
const db = require('../db');
const { authorize } = require('../middleware/auth');
const { HttpError, str, isPhone, isDate, check } = require('../utils/validate');

const A = authorize('Administrator');
const AS = authorize('Administrator', 'Sales');

const coord = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function parse(body) {
  const lat = coord(body.latitude), lng = coord(body.longitude);
  const d = {
    vendor_code: str(body.vendor_code).toUpperCase(), vendor_name: str(body.vendor_name), business_name: str(body.business_name) || null,
    telephone: str(body.telephone), location_area: str(body.location_area), registration_date: str(body.registration_date),
    status: body.status === 'Inactive' ? 'Inactive' : 'Active',
    latitude: lat, longitude: lng,
  };
  check([
    (lat === null) !== (lng === null) && 'A map location needs both latitude and longitude',
    lat !== null && !(Number.isFinite(lat) && lat >= -90 && lat <= 90) && 'Latitude must be between -90 and 90',
    lng !== null && !(Number.isFinite(lng) && lng >= -180 && lng <= 180) && 'Longitude must be between -180 and 180',
    !/^[A-Z0-9-]{3,20}$/.test(d.vendor_code) && 'Vendor ID must be 3-20 letters/digits (e.g. VND004)',
    !d.vendor_name && 'Vendor name is required',
    !isPhone(d.telephone) && 'Enter a valid telephone number',
    !d.location_area && 'Location/area in Maseru is required',
    !isDate(d.registration_date) && 'Registration date must be a valid date',
  ]);
  return d;
}

router.get('/', AS, async (_req, res) => { const [rows] = await db.query('SELECT * FROM street_vendors ORDER BY vendor_name'); res.json(rows); });

router.get('/:id', AS, async (req, res) => {
  const [[row]] = await db.query('SELECT * FROM street_vendors WHERE id = ?', [req.params.id]);
  if (!row) throw new HttpError(404, 'Vendor not found');
  res.json(row);
});

router.post('/', AS, async (req, res) => {
  const d = parse(req.body);
  const [r] = await db.query(
    'INSERT INTO street_vendors (vendor_code, vendor_name, business_name, telephone, location_area, latitude, longitude, registration_date, status) VALUES (?,?,?,?,?,?,?,?,?)',
    [d.vendor_code, d.vendor_name, d.business_name, d.telephone, d.location_area, d.latitude, d.longitude, d.registration_date, d.status]);
  res.status(201).json({ id: r.insertId, message: 'Vendor registered' });
});

router.put('/:id', A, async (req, res) => {
  const d = parse(req.body);
  const [r] = await db.query(
    'UPDATE street_vendors SET vendor_code=?, vendor_name=?, business_name=?, telephone=?, location_area=?, latitude=?, longitude=?, registration_date=?, status=? WHERE id=?',
    [d.vendor_code, d.vendor_name, d.business_name, d.telephone, d.location_area, d.latitude, d.longitude, d.registration_date, d.status, req.params.id]);
  if (!r.affectedRows) throw new HttpError(404, 'Vendor not found');
  res.json({ message: 'Vendor updated' });
});

router.delete('/:id', A, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM street_vendors WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) throw new HttpError(404, 'Vendor not found');
    res.json({ message: 'Vendor deleted' });
  } catch (e) {
    if (e.code === 'ER_ROW_IS_REFERENCED_2') throw new HttpError(409, 'This vendor has orders and cannot be deleted. Set the status to Inactive instead.');
    throw e;
  }
});

module.exports = router;
