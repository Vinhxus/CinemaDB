// Kết nối MySQL + hàm tiện ích gọi stored procedure
const mysql = require('mysql2/promise')
require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'cinema',
  dateStrings: true, // DATE trả về dạng 'YYYY-MM-DD', tránh lệch múi giờ
  charset: 'utf8mb4',
})

// callProc('sp_ListStaff', [a, b, c]) -> các dòng của kết quả đầu tiên
async function callProc(name, params = []) {
  const placeholders = params.map(() => '?').join(',')
  const [results] = await pool.query(`CALL ${name}(${placeholders})`, params)
  return Array.isArray(results[0]) ? results[0] : []
}

// Trả lỗi về cho frontend. Lỗi từ SIGNAL SQLSTATE '45000' -> gửi nguyên thông báo
function sendError(res, err) {
  console.error(err.code, err.sqlMessage || err.message)
  if (err.sqlState === '45000') return res.status(400).json({ error: err.sqlMessage })
  const messages = {
    ER_DUP_ENTRY: 'Dữ liệu bị trùng với một bản ghi đã có',
    ER_CHECK_CONSTRAINT_VIOLATED: 'Dữ liệu vi phạm ràng buộc: ' + err.sqlMessage,
    ER_ROW_IS_REFERENCED_2: 'Không thể xóa vì dữ liệu đang được bản ghi khác tham chiếu',
    ER_NO_REFERENCED_ROW_2: 'Dữ liệu tham chiếu tới bản ghi không tồn tại',
    ER_SP_DOES_NOT_EXIST: 'Thủ tục/hàm chưa được tạo trong database: ' + err.sqlMessage,
    ECONNREFUSED: 'Không kết nối được MySQL. Kiểm tra MySQL đã chạy chưa',
    ER_ACCESS_DENIED_ERROR: 'Sai tài khoản/mật khẩu MySQL. Kiểm tra file backend/.env',
    ER_BAD_DB_ERROR: 'Chưa có database cinema. Hãy chạy các file SQL trước',
  }
  if (messages[err.code]) return res.status(400).json({ error: messages[err.code] })
  res.status(500).json({ error: 'Lỗi máy chủ: ' + (err.sqlMessage || err.message) })
}

module.exports = { pool, callProc, sendError }
