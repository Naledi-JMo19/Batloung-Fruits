require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'batloung_fruits',
  waitForConnections: true,
  connectionLimit: 1,
  decimalNumbers: true,       // return DECIMAL columns as numbers, not strings
  dateStrings: true,          // return DATE columns as 'YYYY-MM-DD' (no timezone shifts)
});

module.exports = pool;
