const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cinema',
  dateStrings: true,          // trả DATE dạng 'YYYY-MM-DD', tránh lệch múi giờ
  charset: 'utf8mb4',
});

// Gọi stored procedure: callProc('sp_ListStaff', [a, b, c]) -> mảng dòng của result set đầu tiên
async function callProc(name, params = []) {
  const placeholders = params.map(() => '?').join(',');
  const [results] = await pool.query(`CALL ${name}(${placeholders})`, params);
  return Array.isArray(results[0]) ? results[0] : [];
}

module.exports = { pool, callProc };
