// Small server-side validation helpers. Each returns an error string or null.
const PROVINCES = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'];
const FRUITS = ['Apples','Bananas','Oranges','Mangoes','Grapes'];
const STATUSES = ['Pending','Confirmed','Processing','Ready for Collection/Delivery','Completed','Cancelled'];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v) => /^[+]?[0-9 ()-]{7,20}$/.test(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isPosInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;
const isPosNum = (v) => v !== '' && v !== null && Number.isFinite(Number(v)) && Number(v) > 0;

// Collects errors and throws one 400 with a list of messages.
function check(rules) {
  const errors = rules.filter(Boolean);
  if (errors.length) { const e = new HttpError(400, errors.join('; ')); e.details = errors; throw e; }
}

module.exports = { PROVINCES, FRUITS, STATUSES, HttpError, str, isEmail, isPhone, isDate, isPosInt, isPosNum, check };
